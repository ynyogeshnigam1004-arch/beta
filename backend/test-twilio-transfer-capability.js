/**
 * Test Twilio Transfer Capability
 * Check if current Twilio credentials can make outbound calls for transfers
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

async function testTwilioTransferCapability() {
  try {
    console.log('🔍 Testing Twilio transfer capability...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    const creds = adminUser.twilioCredentials;
    if (!creds || !creds.accountSid || !creds.authToken) {
      console.log('❌ No Twilio credentials found');
      return;
    }

    console.log('✅ Twilio credentials found:');
    console.log(`   Account SID: ${creds.accountSid}`);
    console.log(`   Status: ${creds.status}`);
    console.log(`   API Key: ${creds.apiKey || 'Not set'}`);
    console.log(`   API Secret: ${creds.apiSecret ? 'Set' : 'Not set'}`);
    console.log(`   TwiML App: ${creds.twimlAppSid || 'Not set'}`);

    // Test Twilio connection
    const Twilio = require('twilio');
    const client = new Twilio(creds.accountSid, creds.authToken);

    console.log('\n🔍 Testing Twilio connection...');
    
    try {
      // Test basic connection
      const account = await client.api.accounts(creds.accountSid).fetch();
      console.log(`✅ Twilio connection successful`);
      console.log(`   Account Name: ${account.friendlyName}`);
      console.log(`   Account Status: ${account.status}`);

      // Check outgoing caller IDs (needed for transfers)
      console.log('\n📞 Checking outgoing caller IDs...');
      const outgoingCallerIds = await client.outgoingCallerIds.list();
      console.log(`   Found ${outgoingCallerIds.length} verified caller IDs:`);
      
      outgoingCallerIds.forEach((callerId, index) => {
        console.log(`   ${index + 1}. ${callerId.phoneNumber} (${callerId.friendlyName})`);
      });

      // Check phone numbers
      console.log('\n📱 Checking phone numbers...');
      const phoneNumbers = await client.incomingPhoneNumbers.list();
      console.log(`   Found ${phoneNumbers.length} phone numbers:`);
      
      phoneNumbers.forEach((phone, index) => {
        console.log(`   ${index + 1}. ${phone.phoneNumber} (${phone.friendlyName})`);
      });

      // Check if we can make outbound calls
      console.log('\n🔍 Checking outbound call capability...');
      
      // Check account balance
      const balance = await client.balance.fetch();
      console.log(`   Account Balance: $${balance.balance} ${balance.currency}`);
      
      if (parseFloat(balance.balance) <= 0) {
        console.log('   ⚠️  Low balance - may affect outbound calls');
      }

      // Check if transfer phone number is verified
      const transferPhone = '9548744216';
      console.log(`\n🔍 Checking if transfer number ${transferPhone} is verified...`);
      
      const isVerified = outgoingCallerIds.some(id => 
        id.phoneNumber.replace(/\D/g, '') === transferPhone.replace(/\D/g, '')
      );
      
      if (isVerified) {
        console.log('   ✅ Transfer number is verified as caller ID');
      } else {
        console.log('   ❌ Transfer number is NOT verified as caller ID');
        console.log('   📝 You need to verify this number in Twilio Console');
        console.log('   🔗 Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
      }

      // Final assessment
      console.log('\n🎯 Transfer Capability Assessment:');
      console.log(`   ✅ Twilio credentials: Working`);
      console.log(`   ✅ Account status: ${account.status}`);
      console.log(`   ✅ Balance: $${balance.balance}`);
      console.log(`   ${isVerified ? '✅' : '❌'} Transfer number verified: ${isVerified}`);
      
      if (!isVerified) {
        console.log('\n🔧 To fix transfers:');
        console.log('   1. Go to Twilio Console > Phone Numbers > Manage > Verified Caller IDs');
        console.log('   2. Add and verify +919548744216 (or the correct format)');
        console.log('   3. Or use one of your existing verified numbers for transfers');
      }

    } catch (twilioError) {
      console.log('❌ Twilio connection failed:', twilioError.message);
      console.log('\n🔧 You may need to update your Twilio credentials');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testTwilioTransferCapability();