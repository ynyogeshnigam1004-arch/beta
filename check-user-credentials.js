/**
 * Check User Credentials in Database
 * Verify that API keys were created during update
 */

require('dotenv').config();
const { connectDB } = require('./backend/config/database');
const User = require('./backend/models/User');

async function checkUserCredentials() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('👤 Finding user with email: yryogeshniigam1008@gmail.com');
    const user = await User.findOne({ email: 'yryogeshniigam1008@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('\n📋 USER CREDENTIALS STATUS:');
    console.log('═══════════════════════════════════════════════════════');
    
    if (user.twilioCredentials) {
      console.log('✅ Twilio Credentials Found:');
      console.log(`   Account SID: ${user.twilioCredentials.accountSid || 'NOT SET'}`);
      console.log(`   Auth Token: ${user.twilioCredentials.authToken ? 'SET (hidden)' : 'NOT SET'}`);
      console.log(`   API Key: ${user.twilioCredentials.apiKey || 'NOT SET'}`);
      console.log(`   API Secret: ${user.twilioCredentials.apiSecret ? 'SET (hidden)' : 'NOT SET'}`);
      console.log(`   TwiML App SID: ${user.twilioCredentials.twimlAppSid || 'NOT SET'}`);
      console.log(`   Status: ${user.twilioCredentials.status || 'NOT SET'}`);
      console.log(`   Configured At: ${user.twilioCredentials.configuredAt || 'NOT SET'}`);
      console.log(`   Last Tested: ${user.twilioCredentials.lastTestedAt || 'NOT SET'}`);
      
      // Check if all required fields for human transfer are present
      const hasApiKey = !!user.twilioCredentials.apiKey;
      const hasApiSecret = !!user.twilioCredentials.apiSecret;
      const hasTwimlApp = !!user.twilioCredentials.twimlAppSid;
      
      console.log('\n🎯 HUMAN TRANSFER READINESS:');
      console.log(`   API Key: ${hasApiKey ? '✅ READY' : '❌ MISSING'}`);
      console.log(`   API Secret: ${hasApiSecret ? '✅ READY' : '❌ MISSING'}`);
      console.log(`   TwiML App: ${hasTwimlApp ? '✅ READY' : '❌ MISSING'}`);
      
      if (hasApiKey && hasApiSecret && hasTwimlApp) {
        console.log('\n🎉 HUMAN TRANSFER: ✅ FULLY CONFIGURED');
      } else {
        console.log('\n⚠️ HUMAN TRANSFER: ❌ NOT READY - Missing components');
      }
    } else {
      console.log('❌ No Twilio credentials found');
    }
    
    console.log('\n📞 PHONE NUMBERS:');
    if (user.phoneNumbers && user.phoneNumbers.length > 0) {
      user.phoneNumbers.forEach((phone, index) => {
        console.log(`   ${index + 1}. ${phone.phoneNumber} (${phone.label})`);
        console.log(`      Assistant: ${phone.assignedAssistantId}`);
        console.log(`      TwiML App: ${phone.twimlAppSid || 'NOT SET'}`);
        console.log(`      Status: ${phone.status}`);
      });
    } else {
      console.log('   No phone numbers configured');
    }
    
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error checking credentials:', error);
  } finally {
    process.exit(0);
  }
}

checkUserCredentials();