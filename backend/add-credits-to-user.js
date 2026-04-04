/**
 * Add credits to existing user
 * Usage: node add-credits-to-user.js <email> <amount>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

async function addCredits() {
  try {
    const email = process.argv[2];
    const amount = parseInt(process.argv[3]) || 500;

    if (!email) {
      console.error('❌ Please provide email address');
      console.log('Usage: node add-credits-to-user.js <email> <amount>');
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\n📧 User: ${user.email}`);
    console.log(`💰 Current balance: ₹${user.credits}`);

    // Add credits
    user.credits += amount;
    await user.save();

    // Create transaction
    const transaction = new Transaction({
      userId: user._id,
      type: 'bonus',
      amount: amount,
      balance: user.credits,
      description: 'Manual credit addition'
    });
    await transaction.save();

    console.log(`\n✅ Added ₹${amount} credits`);
    console.log(`💰 New balance: ₹${user.credits}`);
    console.log(`📝 Transaction recorded`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addCredits();
