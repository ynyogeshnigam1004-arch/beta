/**
 * Enhanced Authentication Routes
 * Supports 2FA, Google OAuth, and email verification
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const User = require('../models/UserEnhanced');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // 2 emails per minute
  message: { success: false, error: 'Too many email requests. Please wait before requesting another.' },
});

/**
 * POST /api/auth/signup
 * Enhanced signup with email verification
 */
router.post('/signup', [
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { fullName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Generate email verification code
    const verificationCode = authService.generateEmailVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new user (not verified yet)
    const isAdmin = email.toLowerCase() === 'ynyogeshnigam1008@gmail.com';
    
    const user = new User({
      fullName,
      email,
      password,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
      role: isAdmin ? 'admin' : 'user',
      credits: isAdmin ? 999999999 : 500 // Admin gets infinite credits, users get 500 bonus
    });

    await user.save();

    // Send verification email
    try {
      await authService.sendEmailVerificationCode(email, verificationCode, 'signup');
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Continue with signup even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email for verification code.',
      userId: user._id,
      requiresVerification: true
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with code
 */
router.post('/verify-email', emailLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('code').isLength({ min: 6, max: 6 }).withMessage('Verification code must be 6 digits'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { email, code } = req.body;

    const user = await User.findOne({
      email,
      emailVerificationCode: code,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    // Verify email and clear verification fields
    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: true
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email'
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend email verification code
 */
router.post('/resend-verification', emailLimiter, [
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, emailVerified: false });
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found or already verified'
      });
    }

    // Generate new verification code
    const verificationCode = authService.generateEmailVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    await authService.sendEmailVerificationCode(email, verificationCode, 'signup');

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification code'
    });
  }
});

/**
 * POST /api/auth/login
 * Enhanced login with 2FA support
 */
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { email, password, twoFactorCode } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Account temporarily locked due to too many failed attempts'
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before logging in',
        requiresVerification: true
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        return res.status(200).json({
          success: false,
          requires2FA: true,
          message: 'Please provide your 2FA code'
        });
      }

      const is2FAValid = authService.verify2FAToken(twoFactorCode, user.twoFactorSecret);
      if (!is2FAValid) {
        // Check backup codes
        const isBackupCodeValid = user.useBackupCode(twoFactorCode);
        if (!isBackupCodeValid) {
          await user.incLoginAttempts();
          return res.status(401).json({
            success: false,
            error: 'Invalid 2FA code'
          });
        }
        await user.save(); // Save used backup code
      }
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login'
    });
  }
});

/**
 * GET /api/auth/google
 * Initiate Google OAuth
 */
router.get('/google', (req, res) => {
  try {
    const state = Math.random().toString(36).substring(2, 15); // Simple short state
    const googleAuthURL = authService.generateGoogleOAuthURL(state);
    
    console.log('🔑 Google OAuth initiated');
    console.log('🔗 Auth URL:', googleAuthURL);
    
    res.json({
      success: true,
      authUrl: googleAuthURL
    });
  } catch (error) {
    console.error('❌ Google OAuth initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate Google OAuth'
    });
  }
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback (GET request from Google)
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    // Exchange code for user info
    const googleUser = await authService.exchangeGoogleCode(code);

    // Find or create user
    let user = await User.findOne({ 
      $or: [
        { email: googleUser.email },
        { googleId: googleUser.id }
      ]
    });

    if (user) {
      // Update existing user with Google info
      if (!user.googleId) {
        user.googleId = googleUser.id;
        user.profilePicture = googleUser.picture;
        user.emailVerified = googleUser.verified_email;
        await user.save();
      }
    } else {
      // Create new user
      const isAdmin = googleUser.email.toLowerCase() === 'ynyogeshnigam1008@gmail.com';
      
      user = new User({
        fullName: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.id,
        profilePicture: googleUser.picture,
        emailVerified: googleUser.verified_email,
        role: isAdmin ? 'admin' : 'user',
        credits: isAdmin ? 999999999 : 500
      });
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/google/callback?token=${token}&user=${encodeURIComponent(JSON.stringify({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture
    }))}`;

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

/**
 * POST /api/auth/google/callback
 * Handle Google OAuth callback (POST request from frontend)
 */
router.post('/google/callback', [
  body('code').notEmpty().withMessage('Authorization code is required'),
], async (req, res) => {
  try {
    const { code, state } = req.body;

    // Exchange code for user info
    const googleUser = await authService.exchangeGoogleCode(code);

    // Find or create user
    let user = await User.findOne({ 
      $or: [
        { email: googleUser.email },
        { googleId: googleUser.id }
      ]
    });

    if (user) {
      // Update existing user with Google info
      if (!user.googleId) {
        user.googleId = googleUser.id;
        user.profilePicture = googleUser.picture;
        user.emailVerified = googleUser.verified_email;
        await user.save();
      }
    } else {
      // Create new user
      const isAdmin = googleUser.email.toLowerCase() === 'ynyogeshnigam1008@gmail.com';
      
      user = new User({
        fullName: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.id,
        profilePicture: googleUser.picture,
        emailVerified: googleUser.verified_email,
        role: isAdmin ? 'admin' : 'user',
        credits: isAdmin ? 999999999 : 500 // Admin gets infinite credits, users get 500 bonus
      });
      await user.save();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({
      success: false,
      error: 'Google authentication failed'
    });
  }
});

module.exports = router;