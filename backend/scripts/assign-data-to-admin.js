/**
 * Assign All Existing Data to Admin User
 * Run this to fix the data ownership
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { getCollection } = require('../config/database');

const ADMIN_EMAIL = 'ynyogeshnigam1008@gmail.com';

async function assignDataToAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const admin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (!admin) {
      console.error('❌ Admin user not found!');
      console.log('   Please make sure you signed up with:', ADMIN_EMAIL);
      process.exit(1);
    }

    console.log('✅ Found admin user');
    console.log(`   Email: ${admin.email}`);
    console.log(`   ID: ${admin._id}`);
    console.log('');

    // Assign all assistants to admin
    const assistantsCollection = getCollection('assistants');
    const assistantsResult = await assistantsCollection.updateMany(
      {}, // All assistants
      { $set: { userId: admin._id } }
    );
    console.log(`✅ Assigned ${assistantsResult.modifiedCount} assistants to admin`);

    // Assign all call history to admin
    const callsCollection = getCollection('call_history');
    const callsResult = await callsCollection.updateMany(
      {}, // All calls
      { $set: { userId: admin._id } }
    );
    console.log(`✅ Assigned ${callsResult.modifiedCount} call records to admin`);

    console.log('');
    console.log('🎉 Data assignment complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart backend server');
    console.log('2. Login with: ynyogeshnigam1008@gmail.com');
    console.log('3. You should see all your assistants!');
    console.log('4. Login with: ynyogeshnigam1002@gmail.com');
    console.log('5. Should see empty dashboard');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignDataToAdmin();
