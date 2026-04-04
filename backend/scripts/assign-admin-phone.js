/**
 * Assign Admin's Twilio Phone Number
 * Sets the admin user's twilioPhoneNumber field
 */

require('dotenv').config();
const { connectDB } = require('../config/database');
const User = require('../models/User');

async function assignAdminPhone() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('❌ No admin user found');
      process.exit(1);
    }
    
    console.log(`✅ Found admin user: ${adminUser.email}`);
    
    // Get Twilio number from environment
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!twilioNumber) {
      console.error('❌ TWILIO_PHONE_NUMBER not set in .env file');
      process.exit(1);
    }
    
    console.log(`📞 Assigning Twilio number: ${twilioNumber}`);
    
    // Update admin's phone number
    adminUser.twilioPhoneNumber = twilioNumber;
    await adminUser.save();
    
    console.log(`✅ Admin phone number updated successfully!`);
    console.log(`   User: ${adminUser.email}`);
    console.log(`   Phone: ${adminUser.twilioPhoneNumber}`);
    console.log('\n📞 Now when someone calls this number, they will get YOUR active assistant!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error assigning phone number:', error);
    process.exit(1);
  }
}

assignAdminPhone();
