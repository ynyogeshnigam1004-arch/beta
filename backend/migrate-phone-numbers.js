/**
 * Migrate Phone Numbers Data to Enhanced User Account
 * This script moves phone numbers from old user to new enhanced user
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');

async function migratePhoneNumbers() {
  console.log('🔄 Starting Phone Numbers Migration...\n');
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Get collections
    const oldUsersCollection = getCollection('users');
    const newUsersCollection = getCollection('userenhanceds');
    
    // Find old and new user
    const oldUser = await oldUsersCollection.findOne({ 
      email: 'ynyogeshnigam1008@gmail.com' 
    });
    
    const newUser = await newUsersCollection.findOne({ 
      email: 'ynyogeshnigam1008@gmail.com' 
    });
    
    if (!oldUser || !newUser) {
      console.log('❌ Could not find old or new user');
      return;
    }
    
    console.log('📋 User Information:');
    console.log(`   - Old User ID: ${oldUser._id}`);
    console.log(`   - New User ID: ${newUser._id}`);
    console.log(`   - Old User Credits: ${oldUser.credits || 0}`);
    console.log(`   - New User Credits: ${newUser.credits || 0}`);
    
    // Check phone numbers in old user
    console.log('\n🔍 Checking phone numbers data...');
    
    if (oldUser.phoneNumbers && oldUser.phoneNumbers.length > 0) {
      console.log(`   - Phone numbers in old user: ${oldUser.phoneNumbers.length}`);
      oldUser.phoneNumbers.forEach((phone, index) => {
        console.log(`     ${index + 1}. ${phone.phoneNumber} (${phone.label})`);
      });
    } else {
      console.log('   - No phone numbers found in old user');
    }
    
    // Check Twilio credentials
    if (oldUser.twilioCredentials) {
      console.log('\n📞 Twilio Credentials in old user:');
      console.log(`   - Account SID: ${oldUser.twilioCredentials.accountSid ? 'Set' : 'Not set'}`);
      console.log(`   - Auth Token: ${oldUser.twilioCredentials.authToken ? 'Set' : 'Not set'}`);
      console.log(`   - Status: ${oldUser.twilioCredentials.status || 'Not set'}`);
    }
    
    // Update new user with old user's data
    console.log('\n🔄 Migrating data to enhanced user...');
    
    const updateData = {
      credits: oldUser.credits || 500,
      country: oldUser.country || 'IN',
      currency: oldUser.currency || 'INR',
      twilioPhoneNumber: oldUser.twilioPhoneNumber || null,
      phoneNumbers: oldUser.phoneNumbers || [],
      twilioCredentials: oldUser.twilioCredentials || {
        accountSid: null,
        authToken: null,
        apiKey: null,
        apiSecret: null,
        twimlAppSid: null,
        status: 'pending'
      },
      updatedAt: new Date()
    };
    
    const result = await newUsersCollection.updateOne(
      { _id: newUser._id },
      { $set: updateData }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Successfully updated enhanced user with old data');
    } else {
      console.log('ℹ️  No changes made (data might already be up to date)');
    }
    
    // Verify the migration
    console.log('\n🧪 Verifying migration...');
    const updatedUser = await newUsersCollection.findOne({ 
      email: 'ynyogeshnigam1008@gmail.com' 
    });
    
    console.log('📋 Updated user data:');
    console.log(`   - Credits: ${updatedUser.credits}`);
    console.log(`   - Phone Numbers: ${updatedUser.phoneNumbers ? updatedUser.phoneNumbers.length : 0}`);
    console.log(`   - Twilio Status: ${updatedUser.twilioCredentials?.status || 'Not set'}`);
    
    if (updatedUser.phoneNumbers && updatedUser.phoneNumbers.length > 0) {
      console.log('📞 Phone Numbers:');
      updatedUser.phoneNumbers.forEach((phone, index) => {
        console.log(`   ${index + 1}. ${phone.phoneNumber} (${phone.label})`);
      });
    }
    
    console.log('\n🎉 Phone Numbers migration completed!');
    console.log('📋 Refresh your Phone Numbers page to see your data');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
  
  process.exit(0);
}

migratePhoneNumbers();