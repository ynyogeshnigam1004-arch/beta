/**
 * Transaction Model
 * Tracks credit purchases, usage, and bonuses
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['purchase', 'usage', 'bonus'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  balance: {
    type: Number,
    required: true
  },
  // For purchases
  paymentGateway: {
    type: String,
    enum: ['stripe', 'razorpay']
  },
  paymentId: String,
  amountPaid: Number,
  currency: String,
  // For usage
  callId: String,
  duration: Number,
  // Description
  description: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
