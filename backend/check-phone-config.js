/**
 * Check Twilio phone number configuration
 */

require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function checkPhoneConfig() {
  console.log('🔍 Checking Twilio Phone Number Configuration...\n');
  console.log(`Phone Number: ${phoneNumber}\n`);

  try {
    // Get all phone numbers
    const numbers = await client.incomingPhoneNumbers.list();
    
    // Find our number
    const ourNumber = numbers.find(n => n.phoneNumber === phoneNumber);
    
    if (!ourNumber) {
      console.log('❌ Phone number not found in your Twilio account!');
      console.log('\nAvailable numbers:');
      numbers.forEach(n => {
        console.log(`  - ${n.phoneNumber}`);
      });
      return;
    }

    console.log('✅ Phone number found!\n');
    console.log('📋 Current Configuration:');
    console.log('─────────────────────────────────────────────────');
    console.log(`Friendly Name: ${ourNumber.friendlyName}`);
    console.log(`Phone Number: ${ourNumber.phoneNumber}`);
    console.log(`Voice URL: ${ourNumber.voiceUrl || 'NOT SET'}`);
    console.log(`Voice Method: ${ourNumber.voiceMethod || 'NOT SET'}`);
    console.log(`Voice Application SID: ${ourNumber.voiceApplicationSid || 'NOT SET'}`);
    console.log(`Status Callback: ${ourNumber.statusCallback || 'NOT SET'}`);
    console.log('─────────────────────────────────────────────────\n');

    // Check configuration
    const expectedUrl = `${process.env.BASE_URL}/api/twilio/incoming-call`;
    const isCorrect = ourNumber.voiceUrl === expectedUrl && ourNumber.voiceMethod === 'POST';

    if (isCorrect) {
      console.log('✅ Configuration is CORRECT!');
      console.log('\nIf calls are still failing, check:');
      console.log('1. Is ngrok running?');
      console.log('2. Is backend running?');
      console.log('3. Twilio trial account geo permissions');
    } else {
      console.log('❌ Configuration is INCORRECT!\n');
      console.log('Expected Configuration:');
      console.log(`  Voice URL: ${expectedUrl}`);
      console.log(`  Voice Method: POST`);
      console.log(`  Voice Application SID: (should be empty)\n`);
      
      console.log('Current Configuration:');
      console.log(`  Voice URL: ${ourNumber.voiceUrl || 'NOT SET'}`);
      console.log(`  Voice Method: ${ourNumber.voiceMethod || 'NOT SET'}`);
      console.log(`  Voice Application SID: ${ourNumber.voiceApplicationSid || 'NOT SET'}\n`);

      console.log('🔧 To fix this:');
      console.log('1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming');
      console.log(`2. Click on ${phoneNumber}`);
      console.log('3. Under "Voice Configuration":');
      console.log('   - Configure with: Webhook');
      console.log(`   - A CALL COMES IN: ${expectedUrl}`);
      console.log('   - HTTP Method: POST');
      console.log('4. Click Save');
    }

  } catch (error) {
    console.error('❌ Error checking phone configuration:', error.message);
  }
}

checkPhoneConfig();
