/**
 * Credit Service
 * Manages user credits and transactions
 */

const User = require('../models/User');
const Transaction = require('../models/Transaction');

class CreditService {
  /**
   * Get user balance
   */
  async getBalance(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    return user.credits;
  }

  /**
   * Add credits to user account
   */
  async addCredits(userId, amount, description, metadata = {}) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Admin has unlimited credits
    if (user.role === 'admin') {
      return { balance: Infinity, transaction: null };
    }

    user.credits += amount;
    await user.save();

    const transaction = new Transaction({
      userId,
      type: metadata.type || 'bonus',
      amount,
      balance: user.credits,
      description,
      ...metadata
    });
    await transaction.save();

    return { balance: user.credits, transaction };
  }

  /**
   * Deduct credits from user account
   */
  async deductCredits(userId, amount, description, metadata = {}) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Admin has unlimited credits
    if (user.role === 'admin') {
      return { balance: Infinity, transaction: null };
    }

    if (user.credits < amount) {
      throw new Error('Insufficient credits');
    }

    user.credits -= amount;
    await user.save();

    const transaction = new Transaction({
      userId,
      type: 'usage',
      amount: -amount,
      balance: user.credits,
      description,
      ...metadata
    });
    await transaction.save();

    return { balance: user.credits, transaction };
  }

  /**
   * Check if user has enough credits
   */
  async hasEnoughCredits(userId, amount) {
    const user = await User.findById(userId);
    if (!user) return false;
    
    // Admin has unlimited credits
    if (user.role === 'admin') return true;
    
    return user.credits >= amount;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId, limit = 50) {
    return await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Calculate call cost (hidden from users)
   * ~₹2 per minute
   */
  calculateCallCost(durationSeconds) {
    const minutes = Math.ceil(durationSeconds / 60);
    return minutes * 2;
  }
}

module.exports = new CreditService();
