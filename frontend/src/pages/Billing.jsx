import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { FiCreditCard, FiPlus, FiCheck, FiArrowLeft, FiActivity } from 'react-icons/fi';
import config from '../config';
import './Billing.css';

const Billing = () => {
  const [credits, setCredits] = useState(0);
  const [currency, setCurrency] = useState('INR');
  const [isAdmin, setIsAdmin] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [packages, setPackages] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('');

  useEffect(() => {
    fetchCredits();
    fetchTransactions();
    fetchPackages();
  }, []);

  const fetchCredits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/credits', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setCredits(data.credits);
        // Don't override selected currency from user's choice
        if (!selectedCurrency) {
          setCurrency(data.currency);
          setSelectedCurrency(data.currency);
        }
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/credits/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchPackages = async (curr = null) => {
    try {
      const token = localStorage.getItem('token');
      const currencyToFetch = curr || selectedCurrency;
      const response = await fetch(config.getApiUrl(`/api/payments/packages?currency=${currencyToFetch}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setPackages(data.packages);
        // Only set currency/selectedCurrency if not already set by user
        if (!curr && !selectedCurrency) {
          setCurrency(data.currency);
          setSelectedCurrency(data.currency);
        }
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const handleStripeSuccess = async (sessionId) => {
    try {
      console.log('🔄 Verifying payment with session ID:', sessionId);
      const token = localStorage.getItem('token');
      
      // Verify the session and add credits
      const response = await fetch('/api/payments/stripe/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId })
      });
      
      const data = await response.json();
      console.log('Verification response:', data);
      
      if (data.success) {
        console.log(`✅ ${data.credits} credits added successfully!`);
        // Refresh credits and transactions
        await fetchCredits();
        await fetchTransactions();
        alert(`✅ Payment Successful! ${data.credits} credits added to your account.`);
      } else {
        console.error('❌ Session verification failed:', data.error);
        alert(`Payment verification failed: ${data.error}`);
      }
    } catch (error) {
      console.error('❌ Error handling Stripe success:', error);
      alert('Error verifying payment. Please contact support if credits were not added.');
    }
  };

  const handleCurrencyChange = (newCurrency) => {
    setSelectedCurrency(newCurrency);
    setCurrency(newCurrency);
    fetchPackages(newCurrency);
  };

  const handlePurchase = async (pkg) => {
    if (processing) return;
    
    setProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      
      if (currency === 'USD') {
        // Stripe payment
        await handleStripePayment(pkg, token);
      } else {
        // Razorpay payment
        await handleRazorpayPayment(pkg, token);
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleStripePayment = async (pkg, token) => {
    try {
      console.log('Creating Stripe checkout session...');
      
      // Create Stripe Checkout Session
      const response = await fetch('/api/payments/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          credits: pkg.credits,
          successUrl: window.location.origin + '/billing',
          cancelUrl: window.location.origin + '/billing'
        })
      });
      
      const data = await response.json();
      console.log('Checkout session response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (!data.clientSecret) {
        throw new Error('No client secret received from server');
      }

      console.log('Loading Stripe...');
      // Initialize Stripe with publishable key
      const stripe = await loadStripe('pk_test_51T6Xf3LvES8PMko0baM9OMHRtEyCU8OSJy1NEcdVXY4HW6rp1bUZakwg0WOdeJJFH9FIA8RlAHNQyVWj1Ni8eicr00tBmFv7D7');
      
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      console.log('Creating modal...');
      // Create modal container
      const modalOverlay = document.createElement('div');
      modalOverlay.className = 'stripe-modal-overlay';
      modalOverlay.innerHTML = `
        <div class="stripe-modal">
          <div class="stripe-modal-header">
            <h3>Complete Payment</h3>
            <button class="stripe-modal-close">&times;</button>
          </div>
          <div id="stripe-checkout-container"></div>
        </div>
      `;
      document.body.appendChild(modalOverlay);

      console.log('Initializing embedded checkout...');
      console.log('Session ID from backend:', data.sessionId);
      
      // Mount embedded checkout
      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: data.clientSecret,
        onComplete: async () => {
          console.log('🎉 Payment completed!');
          console.log('Verifying payment and adding credits...');
          
          // Close modal first
          checkout.destroy();
          document.body.removeChild(modalOverlay);
          
          // Verify payment and add credits
          await handleStripeSuccess(data.sessionId);
        }
      });
      
      console.log('Mounting checkout...');
      checkout.mount('#stripe-checkout-container');

      // Handle close button
      const closeBtn = modalOverlay.querySelector('.stripe-modal-close');
      closeBtn.onclick = () => {
        console.log('Closing modal...');
        checkout.destroy();
        document.body.removeChild(modalOverlay);
      };

      // Handle overlay click
      modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
          console.log('Overlay clicked, closing...');
          checkout.destroy();
          document.body.removeChild(modalOverlay);
        }
      };
      
      console.log('Stripe checkout initialized successfully');
    } catch (error) {
      console.error('Stripe checkout error:', error);
      alert(`Payment initialization failed: ${error.message}`);
      throw error;
    }
  };

  const handleRazorpayPayment = async (pkg, token) => {
    // Create order
    const response = await fetch('/api/payments/razorpay/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ credits: pkg.credits })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to create order');
    }

    // Load Razorpay with custom theme matching website
    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      name: 'Voice AI Platform',
      description: `Purchase ${pkg.credits} Credits`,
      order_id: data.orderId,
      handler: async function (response) {
        // Verify payment
        const verifyResponse = await fetch('/api/payments/razorpay/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature
          })
        });

        const verifyData = await verifyResponse.json();
        
        if (verifyData.success) {
          await fetchCredits();
          await fetchTransactions();
          alert(`✅ Payment Successful! ${pkg.credits} credits added to your account.`);
        }
      },
      prefill: {
        email: localStorage.getItem('userEmail') || '',
        contact: ''
      },
      notes: {
        credits: pkg.credits,
        package_type: 'credit_purchase'
      },
      theme: {
        color: '#54f5c4', // Teal accent for buttons and highlights
        backdrop_color: 'rgba(15, 15, 15, 0.95)', // Dark backdrop
        hide_topbar: false
      },
      modal: {
        ondismiss: function() {
          console.log('Payment cancelled by user');
        },
        escape: true,
        animation: true,
        confirm_close: true
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const formatCurrency = (amount) => {
      // Convert credits based on selected currency display
      if (selectedCurrency === 'USD') {
        // Convert INR credits to USD equivalent (approximately ₹83 = $1)
        const usdAmount = (amount / 83).toFixed(2);
        return `$${usdAmount}`;
      }
      return `₹${amount}`;
    };

  const formatPackagePrice = (price) => {
    // Package prices are already in correct currency, just add symbol
    if (selectedCurrency === 'USD') {
      return `$${price}`;
    }
    return `₹${price}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="billing-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="billing-container">
      <div className="billing-header">
        <h1>Billing & Credits</h1>
        <div className="currency-selector">
          <button 
            className={`currency-btn ${selectedCurrency === 'INR' ? 'active' : ''}`}
            onClick={() => handleCurrencyChange('INR')}
          >
            INR ₹
          </button>
          <button 
            className={`currency-btn ${selectedCurrency === 'USD' ? 'active' : ''}`}
            onClick={() => handleCurrencyChange('USD')}
          >
            USD $
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-label">Your Balance</div>
        <div className="balance-amount">
          {isAdmin ? '∞ Credits' : `${credits} Credits`}
        </div>
        {!isAdmin && (
          <div className="balance-value">
            {selectedCurrency === 'USD' ? `≈ $${(credits / 83).toFixed(2)}` : `≈ ₹${credits}`}
          </div>
        )}
        {!isAdmin && credits < 100 && (
          <div className="low-balance-warning">
            ⚠️ Low balance! Buy more credits to continue using the platform.
          </div>
        )}
      </div>

      {/* Credit Packages */}
      {!isAdmin && (
        <div className="packages-section">
          <h2>Buy Credits</h2>
          <div className="packages-grid">
            {packages.map((pkg) => (
              <div key={pkg.credits} className="package-card">
                <div className="package-credits">{pkg.credits} Credits</div>
                <div className="package-price">{formatPackagePrice(pkg.price)}</div>
                <button
                  className="package-button"
                  onClick={() => handlePurchase(pkg)}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Buy Now'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="transactions-section">
        <h2>Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="no-transactions">No transactions yet</div>
        ) : (
          <div className="transactions-list">
            {transactions.map((transaction) => (
              <div key={transaction._id} className="transaction-item">
                <div className="transaction-info">
                  <div className="transaction-description">
                    {transaction.description}
                  </div>
                  <div className="transaction-date">
                    {formatDate(transaction.createdAt)}
                  </div>
                </div>
                <div className={`transaction-amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}>
                  {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;
