/**
 * Authentication Middleware
 * Protects routes by verifying JWT tokens
 * Uses single User model for clean authentication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/UserEnhanced');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user using single User model - handle both ObjectId and string formats
    let user;
    try {
      // First try direct lookup
      user = await User.findById(decoded.userId).select('-password');
      
      // If not found and userId looks like ObjectId string, try both formats
      if (!user && typeof decoded.userId === 'string' && decoded.userId.length === 24) {
        const { ObjectId } = require('mongodb');
        try {
          const objectIdUserId = new ObjectId(decoded.userId);
          user = await User.findOne({
            $or: [
              { _id: objectIdUserId },
              { _id: decoded.userId }
            ]
          }).select('-password');
        } catch (err) {
          // ObjectId conversion failed, stick with original lookup
        }
      }
    } catch (err) {
      console.error('Error finding user:', err);
    }
    
    if (!user) {
      // TEMPORARY FIX: If user not found but JWT is valid, create user record
      // This handles the case where Google OAuth created JWT but not user record
      if (decoded.email && decoded.userId) {
        console.log('🔧 Creating missing user record for:', decoded.email);
        
        try {
          const { ObjectId } = require('mongodb');
          const { getCollection } = require('../config/database');
          const usersCollection = getCollection('users');
          
          const newUser = {
            _id: new ObjectId(decoded.userId),
            email: decoded.email,
            role: 'admin', // Assume admin for now
            createdAt: new Date(),
            updatedAt: new Date(),
            isEmailVerified: true,
            phoneNumbers: [],
            twilioCredentials: {
              status: 'pending'
            }
          };
          
          await usersCollection.insertOne(newUser);
          console.log('✅ Created missing user record');
          
          // Now find the user we just created
          user = await User.findById(decoded.userId).select('-password');
        } catch (createError) {
          console.error('❌ Failed to create user record:', createError);
        }
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error: 'Account temporarily locked due to too many failed login attempts',
        lockUntil: user.lockUntil
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    
    console.log('🔑 Auth middleware - User ID:', user._id, 'Email:', user.email, 'Model: User');
    console.log('🔍 JWT userId:', decoded.userId, 'Type:', typeof decoded.userId);
    console.log('🔍 Found user ID:', user._id, 'Type:', typeof user._id);
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Find user using single User model
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && !user.isLocked) {
        req.user = user;
        req.userId = user._id;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
