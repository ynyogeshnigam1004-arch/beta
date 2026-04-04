/**
 * Create Admin User and Assign Existing Data
 * Run this once to set up the admin account
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Assistant = require('../models/Assistant');
const CallHistory = require('../models/CallHistory');

const ADMIN_EMAIL = 'ynyogeshnigam1008@gmail.com';
const ADMIN_PASSWORD = 'Admin@123'; // Change this after first login!
const ADMIN_NAME = 'Yogesh Nigam';

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (admin) {
      console.log('✅ Admin user already exists');
      console.log(`   Email: ${admin.email}`);
      console.log(`   ID: ${admin._id}`);
    } else {
      // Create admin user
      admin = new User({
        fullName: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin'
      });
      
      await admin.save();
      console.log('✅ Admin user created successfully!');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      console.log(`   ID: ${admin._id}`);
      console.log('');
      console.log('⚠️  IMPORTANT: Change the password after first login!');
    }

    // Assign all existing assistants to admin
    const assistantsUpdated = await Assistant.updateMany(
      { userId: { $exists: false } }, // Assistants without userId
      { $set: { userId: admin._id } }
    );
    console.log(`✅ Assigned ${assistantsUpdated.modifiedCount} assistants to admin`);

    // Assign all existing call history to admin
    const callsUpdated = await CallHistory.updateMany(
      { userId: { $exists: false } }, // Calls without userId
      { $set: { userId: admin._id } }
    );
    console.log(`✅ Assigned ${callsUpdated.modifiedCount} call records to admin`);

    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Login with: ynyogeshnigam1008@gmail.com');
    console.log('2. Password: Admin@123');
    console.log('3. Change your password immediately!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createAdminUser();
