/**
 * Debug Browser Call UserId Issue
 * Check why MultiTenantTwilioService can't find user credentials
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function debugBrowserCallUserId() {
  try {
    console.log('🔍 Debugging browser call userId issue...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`   ID: ${adminUser._id}`);
    console.log(`   Type: ${typeof adminUser._id}`);
    console.log(`   String: ${adminUser._id.toString()}`);

    // Test the exact same lookup that MultiTenantTwilioService does
    console.log('\n🔍 Testing MultiTenantTwilioService.getUserTwilioClient lookup...');
    
    // Test with ObjectId
    console.log('\n1. Testing with ObjectId:');
    try {
      const userById = await User.findById(adminUser._id);
      if (userById) {
        console.log('   ✅ Found user with ObjectId');
        console.log(`   Has twilioCredentials: ${!!userById.twilioCredentials}`);
        console.log(`   AccountSid: ${userById.twilioCredentials?.accountSid || 'Not found'}`);
        console.log(`   Status: ${userById.twilioCredentials?.status || 'Not found'}`);
      } else {
        console.log('   ❌ User not found with ObjectId');
      }
    } catch (error) {
      console.log('   ❌ Error with ObjectId:', error.message);
    }

    // Test with string
    console.log('\n2. Testing with string:');
    try {
      const userByString = await User.findById(adminUser._id.toString());
      if (userByString) {
        console.log('   ✅ Found user with string ID');
        console.log(`   Has twilioCredentials: ${!!userByString.twilioCredentials}`);
        console.log(`   AccountSid: ${userByString.twilioCredentials?.accountSid || 'Not found'}`);
        console.log(`   Status: ${userByString.twilioCredentials?.status || 'Not found'}`);
      } else {
        console.log('   ❌ User not found with string ID');
      }
    } catch (error) {
      console.log('   ❌ Error with string ID:', error.message);
    }

    // Test the exact MultiTenantTwilioService function
    console.log('\n3. Testing actual MultiTenantTwilioService function:');
    try {
      const MultiTenantTwilioService = require('./services/multiTenantTwilioService');
      const client = await MultiTenantTwilioService.getUserTwilioClient(adminUser._id);
      console.log('   ✅ MultiTenantTwilioService.getUserTwilioClient SUCCESS');
      console.log(`   Client created: ${!!client}`);
    } catch (error) {
      console.log('   ❌ MultiTenantTwilioService.getUserTwilioClient FAILED:', error.message);
    }

    // Test with string version
    console.log('\n4. Testing MultiTenantTwilioService with string ID:');
    try {
      const MultiTenantTwilioService = require('./services/multiTenantTwilioService');
      const client = await MultiTenantTwilioService.getUserTwilioClient(adminUser._id.toString());
      console.log('   ✅ MultiTenantTwilioService.getUserTwilioClient with string SUCCESS');
      console.log(`   Client created: ${!!client}`);
    } catch (error) {
      console.log('   ❌ MultiTenantTwilioService.getUserTwilioClient with string FAILED:', error.message);
    }

    // Check if there are any issues with the credentials
    console.log('\n🔍 Detailed credential check:');
    if (adminUser.twilioCredentials) {
      console.log(`   AccountSid: ${adminUser.twilioCredentials.accountSid || 'MISSING'}`);
      console.log(`   AuthToken: ${adminUser.twilioCredentials.authToken ? 'SET' : 'MISSING'}`);
      console.log(`   Status: ${adminUser.twilioCredentials.status || 'MISSING'}`);
      console.log(`   API Key: ${adminUser.twilioCredentials.apiKey || 'MISSING'}`);
      console.log(`   API Secret: ${adminUser.twilioCredentials.apiSecret ? 'SET' : 'MISSING'}`);
    } else {
      console.log('   ❌ No twilioCredentials object found');
    }

    console.log('\n🔧 Recommendations:');
    console.log('   1. Check if browser call is passing correct userId');
    console.log('   2. Verify userId format (ObjectId vs string)');
    console.log('   3. Ensure Twilio credentials are properly saved');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugBrowserCallUserId();