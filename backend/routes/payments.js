/**
 * Payment Routes
 * Handles Stripe and Razorpay payments
 */

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const crypto = require('crypto');
const creditService = require('../services/creditService');
const User = require('../models/UserEnhanced');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Credit packages
const PACKAGES = {
  INR: [
    { credits: 500, price: 500, currency: 'INR' },
    { credits: 1000, price: 1000, currency: 'INR' },
    { credits: 2500, price: 2500, currency: 'INR' },
    { credits: 5000, price: 5000, currency: 'INR' }
  ],
  USD: [
    { credits: 500, price: 6, currency: 'USD' },
    { credits: 1000, price: 12, currency: 'USD' },
    { credits: 2500, price: 30, currency: 'USD' },
    { credits: 5000, price: 60, currency: 'USD' }
  ]
};

/**
 * GET /api/payments/packages
 * Get available credit packages
 */
router.get('/packages', async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    // Allow currency override from query parameter
    const currency = req.query.currency || user.currency || 'INR';
    const packages = PACKAGES[currency];

    res.json({
      success: true,
      packages,
      currency
    });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get packages'
    });
  }
});

/**
 * POST /api/payments/stripe/create-checkout
 * Create Stripe Checkout Session
 */
router.post('/stripe/create-checkout', async (req, res) => {
  try {
    const { credits, successUrl, cancelUrl } = req.body;
    const userId = req.userId;

    console.log('Creating Stripe checkout for:', { credits, userId });
    console.log('Success URL:', successUrl);
    console.log('Cancel URL:', cancelUrl);

    // Find package
    const pkg = PACKAGES.USD.find(p => p.credits === credits);
    if (!pkg) {
      console.error('Invalid package requested:', credits);
      return res.status(400).json({
        success: false,
        error: 'Invalid package'
      });
    }

    console.log('Package found:', pkg);

    const returnUrl = `${successUrl}?session_id={CHECKOUT_SESSION_ID}`;
    console.log('Return URL will be:', returnUrl);

    // Create Checkout Session with embedded UI mode
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${credits} Credits`,
              description: `Purchase ${credits} credits for Voice AI Platform`,
            },
            unit_amount: pkg.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: returnUrl,
      redirect_on_completion: 'if_required', // Allow onComplete callback to work
      client_reference_id: userId.toString(),
      metadata: {
        userId: userId.toString(),
        credits: credits.toString()
      }
    });

    console.log('Stripe session created:', session.id);
    console.log('Session return_url:', session.return_url);

    res.json({
      success: true,
      clientSecret: session.client_secret,
      sessionId: session.id
    });
  } catch (error) {
    console.error('Stripe create checkout error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create checkout session'
    });
  }
});

/**
 * POST /api/payments/stripe/create-intent
 * Create Stripe payment intent
 */
router.post('/stripe/create-intent', async (req, res) => {
  try {
    const { credits } = req.body;
    const userId = req.userId;

    // Find package
    const pkg = PACKAGES.USD.find(p => p.credits === credits);
    if (!pkg) {
      return res.status(400).json({
        success: false,
        error: 'Invalid package'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: pkg.price * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        userId: userId.toString(),
        credits: credits.toString()
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Stripe create intent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment'
    });
  }
});

/**
 * POST /api/payments/stripe/confirm
 * Confirm Stripe payment and add credits
 */
router.post('/stripe/confirm', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.userId;

    // Retrieve payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: 'Payment not successful'
      });
    }

    const credits = parseInt(paymentIntent.metadata.credits);
    const amount = paymentIntent.amount / 100;

    // Add credits
    const result = await creditService.addCredits(
      userId,
      credits,
      'Credit purchase',
      {
        type: 'purchase',
        paymentGateway: 'stripe',
        paymentId: paymentIntentId,
        amountPaid: amount,
        currency: 'USD'
      }
    );

    res.json({
      success: true,
      balance: result.balance,
      credits
    });
  } catch (error) {
    console.error('Stripe confirm error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm payment'
    });
  }
});

/**
 * POST /api/payments/stripe/verify-session
 * Verify Stripe session and add credits (for local testing without webhook)
 */
router.post('/stripe/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.userId;

    console.log('Verifying Stripe session:', sessionId);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('Session status:', session.payment_status);
    console.log('Session metadata:', session.metadata);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Payment not completed'
      });
    }

    const credits = parseInt(session.metadata.credits);
    const amount = session.amount_total / 100;

    // Add credits to user
    await creditService.addCredits(
      userId,
      credits,
      'Credit purchase',
      {
        type: 'purchase',
        paymentGateway: 'stripe',
        paymentId: session.payment_intent,
        amountPaid: amount,
        currency: 'USD'
      }
    );

    console.log(`✅ Added ${credits} credits to user ${userId}`);

    res.json({
      success: true,
      credits
    });
  } catch (error) {
    console.error('Stripe verify session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify session'
    });
  }
});

/**
 * POST /api/payments/stripe/webhook
 * Handle Stripe webhook events (for Checkout completion)
 */
router.post('/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const userId = session.metadata.userId;
    const credits = parseInt(session.metadata.credits);
    const amount = session.amount_total / 100;

    // Add credits to user
    try {
      await creditService.addCredits(
        userId,
        credits,
        'Credit purchase',
        {
          type: 'purchase',
          paymentGateway: 'stripe',
          paymentId: session.payment_intent,
          amountPaid: amount,
          currency: 'USD'
        }
      );
      console.log(`✅ Added ${credits} credits to user ${userId}`);
    } catch (error) {
      console.error('Error adding credits:', error);
    }
  }

  res.json({received: true});
});

/**
 * POST /api/payments/razorpay/create-order
 * Create Razorpay order
 */
router.post('/razorpay/create-order', async (req, res) => {
  try {
    const { credits } = req.body;
    const userId = req.userId;

    // Find package
    const pkg = PACKAGES.INR.find(p => p.credits === credits);
    if (!pkg) {
      return res.status(400).json({
        success: false,
        error: 'Invalid package'
      });
    }

    // Create order
    const order = await razorpay.orders.create({
      amount: pkg.price * 100, // Convert to paise
      currency: 'INR',
      notes: {
        userId: userId.toString(),
        credits: credits.toString()
      }
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Razorpay create order error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create order'
    });
  }
});

/**
 * POST /api/payments/razorpay/verify
 * Verify Razorpay payment and add credits
 */
router.post('/razorpay/verify', async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    const userId = req.userId;

    // Verify signature
    const text = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Fetch order details
    const order = await razorpay.orders.fetch(orderId);
    const credits = parseInt(order.notes.credits);
    const amount = order.amount / 100;

    // Add credits
    const result = await creditService.addCredits(
      userId,
      credits,
      'Credit purchase',
      {
        type: 'purchase',
        paymentGateway: 'razorpay',
        paymentId,
        amountPaid: amount,
        currency: 'INR'
      }
    );

    res.json({
      success: true,
      balance: result.balance,
      credits
    });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
});

module.exports = router;
