/**
 * Credits Routes
 * Handles credit balance and transaction history
 */

const express = require('express');
const router = express.Router();
const creditService = require('../services/creditService');
const User = require('../models/UserEnhanced');

/**
 * GET /api/credits
 * Get user credit balance
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select('credits currency role');

    res.json({
      success: true,
      credits: user.role === 'admin' ? Infinity : user.credits,
      currency: user.currency || 'INR',
      isAdmin: user.role === 'admin'
    });
  } catch (error) {
    console.error('Get credits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get credits'
    });
  }
});

/**
 * GET /api/credits/history
 * Get transaction history
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;

    const transactions = await creditService.getTransactionHistory(userId, limit);

    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get history'
    });
  }
});

module.exports = router;
