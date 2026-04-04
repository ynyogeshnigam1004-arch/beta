/**
 * Two-Factor Authentication Routes
 * Handles 2FA setup, verification, and management
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/UserEnhanced');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

/**
 * POST /api/2fa/setup
 * Generate 2FA secret and QR code
 */
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is already enabled for this account'
      });
    }

    // Generate 2FA secret
    const { secret, otpauthUrl } = authService.generate2FASecret(user.email);
    
    // Generate QR code
    const qrCodeDataURL = await authService.generateQRCode(otpauthUrl);

    // Store secret temporarily (not enabled yet)
    user.twoFactorSecret = secret;
    await user.save();

    res.json({
      success: true,
      message: '2FA setup initiated',
      qrCode: qrCodeDataURL,
      secret: secret, // For manual entry
      backupCodes: null // Will be generated after verification
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup 2FA'
    });
  }
});

/**
 * POST /api/2fa/verify-setup
 * Verify 2FA setup with token
 */
router.post('/verify-setup', authenticateToken, [
  body('token').isLength({ min: 6, max: 6 }).withMessage('2FA token must be 6 digits'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { token } = req.body;
    const user = req.user;

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        success: false,
        error: 'No 2FA setup in progress'
      });
    }

    // Verify the token
    const isValid = authService.verify2FAToken(token, user.twoFactorSecret);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid 2FA token'
      });
    }

    // Enable 2FA and generate backup codes
    user.twoFactorEnabled = true;
    const backupCodes = user.generateBackupCodes();
    await user.save();

    res.json({
      success: true,
      message: '2FA enabled successfully!',
      backupCodes: backupCodes
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify 2FA setup'
    });
  }
});

/**
 * POST /api/2fa/disable
 * Disable 2FA with password confirmation
 */
router.post('/disable', authenticateToken, [
  body('password').notEmpty().withMessage('Password is required'),
  body('token').optional().isLength({ min: 6, max: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: errors.array()[0].msg
      });
    }

    const { password, token } = req.body;
    const user = req.user;

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled for this account'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Verify 2FA token if provided
    if (token) {
      const is2FAValid = authService.verify2FAToken(token, user.twoFactorSecret);
      if (!is2FAValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid 2FA token'
        });
      }
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({
      success: true,
      message: '2FA disabled successfully'
    });

  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable 2FA'
    });
  }
});

/**
 * GET /api/2fa/status
 * Get 2FA status for current user
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled,
      backupCodesRemaining: user.twoFactorBackupCodes ? 
        user.twoFactorBackupCodes.filter(code => !code.used).length : 0
    });

  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get 2FA status'
    });
  }
});

/**
 * POST /api/2fa/regenerate-backup-codes
 * Regenerate backup codes
 */
router.post('/regenerate-backup-codes', authenticateToken, [
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

    const { password } = req.body;
    const user = req.user;

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '2FA is not enabled for this account'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Generate new backup codes
    const backupCodes = user.generateBackupCodes();
    await user.save();

    res.json({
      success: true,
      message: 'Backup codes regenerated successfully',
      backupCodes: backupCodes
    });

  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate backup codes'
    });
  }
});

module.exports = router;