/**
 * Credits Routes
 * Handles user credit balance and transactions
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

/**
 * GET /api/credits/balance
 * Get user's credit balance
 */
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      balance: user.credits || 0
    });
  } catch (error) {
    console.error('❌ Error fetching credit balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit balance'
    });
  }
});

module.exports = router;