/**
 * Enhanced User Model with 2FA and Google OAuth
 * Supports advanced authentication features
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required for Google OAuth users
    },
    minlength: 6
  },
  
  // Google OAuth fields
  googleId: {
    type: String,
    sparse: true // Allows null values but ensures uniqueness when present
  },
  profilePicture: {
    type: String
  },
  
  // Email verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationCode: {
    type: String
  },
  emailVerificationExpires: {
    type: Date
  },
  
  // Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  },
  twoFactorBackupCodes: [{
    code: String,
    used: { type: Boolean, default: false }
  }],
  
  // Account security
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  
  // User preferences and existing fields
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  credits: {
    type: Number,
    default: 500
  },
  country: {
    type: String,
    default: 'IN'
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'INR'
  },
  twilioPhoneNumber: {
    type: String,
    default: null,
    trim: true,
    validate: {
      validator: function(v) {
        return v === null || /^\+[1-9]\d{1,14}$/.test(v);
      },
      message: 'Phone number must be in E.164 format (e.g., +15025211439)'
    }
  },
  
  // Multi-tenant Twilio credentials
  twilioCredentials: {
    accountSid: { type: String, default: null, trim: true },
    authToken: { type: String, default: null, trim: true },
    apiKey: { type: String, default: null, trim: true },
    apiSecret: { type: String, default: null, trim: true },
    twimlAppSid: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'error', 'disabled'],
      default: 'pending'
    },
    configuredAt: { type: Date, default: null },
    lastTestedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null }
  },
  
  // Multiple phone numbers
  phoneNumbers: [{
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^\+[1-9]\d{1,14}$/.test(v);
        },
        message: 'Phone number must be in E.164 format'
      }
    },
    label: { type: String, required: true, trim: true, maxlength: 50 },
    assignedAssistantId: { type: String, required: true, trim: true },
    twimlAppSid: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'error'],
      default: 'active'
    },
    configuredAt: { type: Date, default: Date.now },
    errorMessage: { type: String, default: null }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ emailVerificationCode: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 }
  });
};

// Method to generate backup codes for 2FA
userSchema.methods.generateBackupCodes = function() {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push({
      code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      used: false
    });
  }
  this.twoFactorBackupCodes = codes;
  return codes.map(c => c.code);
};

// Method to use backup code
userSchema.methods.useBackupCode = function(code) {
  const backupCode = this.twoFactorBackupCodes.find(
    bc => bc.code === code.toUpperCase() && !bc.used
  );
  
  if (backupCode) {
    backupCode.used = true;
    return true;
  }
  
  return false;
};

module.exports = mongoose.model('UserEnhanced', userSchema);