/**
 * Authentication Routes
 * Handles user signup, login, and Google OAuth authentication
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authService = require('../services/authService');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * POST /api/auth/signup
 * Create new user account with email verification
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, fullName, email, password } = req.body;
    const userName = fullName || name;

    if (!userName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Check if this is the admin email
    const isAdmin = email.toLowerCase() === 'ynyogeshnigam1008@gmail.com';

    // Create new user
    const user = new User({
      fullName: userName,
      email,
      password,
      role: isAdmin ? 'admin' : 'user',
      credits: isAdmin ? 999999999 : 500, // Admin gets infinite credits, users get 500 bonus
      emailVerified: isAdmin, // Admin email is pre-verified
      emailVerificationCode: isAdmin ? null : authService.generateEmailVerificationCode(),
      emailVerificationExpires: isAdmin ? null : new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await user.save();

    // Send verification email for non-admin users
    if (!isAdmin && user.emailVerificationCode) {
      try {
        await authService.sendEmailVerificationCode(email, user.emailVerificationCode, 'signup');
        console.log(`📧 Verification email sent to: ${email}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail signup if email fails
      }
    }

    // If admin, assign all existing data
    if (isAdmin) {
      const Assistant = require('../models/Assistant');
      const { getCollection } = require('../config/database');
      
      // Assign all assistants without userId to admin
      const assistantsCollection = getCollection('assistants');
      const assistantsResult = await assistantsCollection.updateMany(
        { userId: { $exists: false } },
        { $set: { userId: user._id } }
      );
      
      // Assign all call history without userId to admin
      const callsCollection = getCollection('call_history');
      const callsResult = await callsCollection.updateMany(
        { userId: { $exists: false } },
        { $set: { userId: user._id } }
      );
      
      console.log(`✅ Admin account created: ${email}`);
      console.log(`   Assigned ${assistantsResult.modifiedCount} assistants`);
      console.log(`   Assigned ${callsResult.modifiedCount} call records`);
    } else {
      // Give signup bonus to regular users
      const creditService = require('../services/creditService');
      const Transaction = require('../models/Transaction');
      const Assistant = require('../models/Assistant');
      
      const signupBonus = parseInt(process.env.SIGNUP_BONUS) || 500;
      
      const transaction = new Transaction({
        userId: user._id,
        type: 'bonus',
        amount: signupBonus,
        balance: user.credits,
        description: 'Signup bonus'
      });
      await transaction.save();
      
      // Create default assistant for new user
      try {
        const defaultConfig = {
          name: 'My First Assistant',
          model: 'llama-3.1-8b-instant',
          transcriber: 'deepgram-nova-2',
          voiceProvider: 'cartesia',
          voiceModel: 'sonic-english',
          voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
          elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
          elevenLabsModel: 'eleven_turbo_v2',
          elevenLabsSettings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true
          },
          useCustomVoiceId: false,
          customVoiceId: '',
          voice: 'Cartesia Sonic',
          status: 'active',
          firstMessageMode: 'assistant-speaks-first',
          firstMessage: 'Hello! How can I help you today?',
          systemPrompt: 'You are a helpful voice assistant. Be friendly and professional.',
          transferSettings: {
            enabled: false,
            phoneNumber: '',
            phrases: []
          }
        };
        
        const assistantData = {
          ...defaultConfig,
          userId: user._id
        };
        
        const newAssistant = await Assistant.createAssistant(assistantData);
        console.log(`✅ Created default assistant for new user: ${newAssistant.id}`);
        
      } catch (assistantError) {
        console.error('⚠️ Failed to create default assistant:', assistantError);
      }
      
      console.log(`✅ User account created: ${email} (₹${signupBonus} bonus)`);
    }

    // Generate JWT token (admin can login immediately, others need verification)
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: isAdmin ? 'Admin account created successfully' : 'Account created successfully. Please check your email for verification.',
      token: isAdmin ? token : undefined, // Only provide token for admin
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      },
      requiresVerification: !isAdmin
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
 * Verify email with verification code
 */
router.post('/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and verification code are required'
      });
    }

    const user = await User.findOne({ 
      email,
      emailVerificationCode: code,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    // Mark email as verified
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

    console.log(`✅ Email verified for user: ${email}`);

    res.json({
      success: true,
      message: 'Email verified successfully',
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
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const user = await User.findOne({ email, emailVerified: false });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'User not found or email already verified'
      });
    }

    // Generate new verification code
    user.emailVerificationCode = authService.generateEmailVerificationCode();
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send verification email
    try {
      await authService.sendEmailVerificationCode(email, user.emailVerificationCode, 'resend');
      console.log(`📧 Verification email resent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email'
      });
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email'
    });
  }
});

/**
 * POST /api/auth/login
 * Login user with email/password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

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
        error: 'Account temporarily locked due to too many failed login attempts',
        lockUntil: user.lockUntil
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if email is verified (except for admin)
    if (!user.emailVerified && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before logging in',
        requiresVerification: true
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
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

    console.log(`✅ User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
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
 * Initiate Google OAuth flow
 */
router.get('/google', (req, res) => {
  try {
    const state = authService.generateSessionToken();
    const authUrl = authService.generateGoogleOAuthURL(state);
    
    // Store state in session or return it for frontend to handle
    res.json({
      success: true,
      authUrl,
      state
    });
  } catch (error) {
    console.error('Google OAuth initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate Google authentication'
    });
  }
});

/**
 * POST /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.post('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    // Exchange code for user info
    const googleUser = await authService.exchangeGoogleCode(code);
    
    if (!googleUser) {
      return res.status(400).json({
        success: false,
        error: 'Failed to get user information from Google'
      });
    }

    // Check if user exists by email or googleId
    let user = await User.findOne({
      $or: [
        { email: googleUser.email },
        { googleId: googleUser.id }
      ]
    });

    const isAdmin = googleUser.email.toLowerCase() === 'ynyogeshnigam1008@gmail.com';

    if (user) {
      // Update existing user with Google info if not already set
      if (!user.googleId) {
        user.googleId = googleUser.id;
        user.profilePicture = googleUser.picture;
        user.emailVerified = true; // Google emails are verified
        await user.save();
      }
      
      console.log(`✅ Existing user logged in with Google: ${user.email}`);
    } else {
      // Create new user from Google OAuth
      const isAdmin = googleUser.email.toLowerCase() === 'ynyogeshnigam1008@gmail.com';
      
      user = new User({
        fullName: googleUser.name,
        email: googleUser.email,
        googleId: googleUser.id,
        profilePicture: googleUser.picture,
        emailVerified: true, // Google emails are verified
        role: isAdmin ? 'admin' : 'user',
        credits: isAdmin ? 999999999 : 500 // Admin gets infinite credits, users get 500 bonus
      });

      await user.save();

      // Handle admin data assignment
      if (isAdmin) {
        const Assistant = require('../models/Assistant');
        const { getCollection } = require('../config/database');
        
        const assistantsCollection = getCollection('assistants');
        const assistantsResult = await assistantsCollection.updateMany(
          { userId: { $exists: false } },
          { $set: { userId: user._id } }
        );
        
        const callsCollection = getCollection('call_history');
        const callsResult = await callsCollection.updateMany(
          { userId: { $exists: false } },
          { $set: { userId: user._id } }
        );
        
        console.log(`✅ Admin account created via Google: ${googleUser.email}`);
        console.log(`   Assigned ${assistantsResult.modifiedCount} assistants`);
        console.log(`   Assigned ${callsResult.modifiedCount} call records`);
      } else {
        // Create default assistant for new regular users
        try {
          const Assistant = require('../models/Assistant');
          const defaultConfig = {
            name: 'My First Assistant',
            model: 'llama-3.1-8b-instant',
            transcriber: 'deepgram-nova-2',
            voiceProvider: 'cartesia',
            voiceModel: 'sonic-english',
            voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
            voice: 'Cartesia Sonic',
            status: 'active',
            firstMessageMode: 'assistant-speaks-first',
            firstMessage: 'Hello! How can I help you today?',
            systemPrompt: 'You are a helpful voice assistant. Be friendly and professional.',
            transferSettings: { enabled: false, phoneNumber: '', phrases: [] }
          };
          
          const newAssistant = await Assistant.createAssistant({
            ...defaultConfig,
            userId: user._id
          });
          console.log(`✅ Created default assistant for Google user: ${newAssistant.id}`);
        } catch (assistantError) {
          console.error('⚠️ Failed to create default assistant:', assistantError);
        }
      }
      
      console.log(`✅ New user created via Google: ${googleUser.email}`);
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
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Google authentication failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        twilioPhoneNumber: user.twilioPhoneNumber,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

/**
 * PUT /api/auth/phone-number
 * Update user's Twilio phone number
 */
router.put('/phone-number', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { phoneNumber } = req.body;

    // Validate phone number format (E.164: +1234567890)
    if (phoneNumber && !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must be in E.164 format (e.g., +15025211439)'
      });
    }

    // Check if phone number is already in use by another user
    if (phoneNumber) {
      const existingUser = await User.findOne({ 
        twilioPhoneNumber: phoneNumber,
        _id: { $ne: decoded.userId }
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'This phone number is already registered to another user'
        });
      }
    }

    // Update user's phone number
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { twilioPhoneNumber: phoneNumber || null },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log(`✅ Updated phone number for user ${user.email}: ${phoneNumber || 'removed'}`);

    res.json({
      success: true,
      message: phoneNumber ? 'Phone number updated successfully' : 'Phone number removed',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        twilioPhoneNumber: user.twilioPhoneNumber
      }
    });

  } catch (error) {
    console.error('Update phone number error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update phone number'
    });
  }
});

module.exports = router;
