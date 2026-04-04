/**
 * Test Twilio Human Transfer
 * This will directly call your phone to test if Twilio is configured correctly
 */

require('dotenv').config();
const twilioService = require('./services/twilioService');

async function testTwilioCall() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧪 TESTING TWILIO HUMAN TRANSFER');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  console.log('📋 Configuration:');
  console.log(`   Account SID: ${process.env.TWILIO_ACCOUNT_SID}`);
  console.log(`   TwiML App SID: ${process.env.TWILIO_TWIML_APP_SID}`);
  console.log(`   Twilio Number: ${process.env.TWILIO_PHONE_NUMBER}`);
  console.log(`   Your Phone: ${process.env.PERSONAL_PHONE_NUMBER}`);
  console.log(`   Webhook URL: ${process.env.BASE_URL}/api/twilio/voice`);
  console.log('');
  
  try {
    console.log('📞 Initiating test call to your phone...');
    console.log('');
    
    const result = await twilioService.initiateHumanTransfer(
      'test-session-' + Date.now(),
      process.env.PERSONAL_PHONE_NUMBER
    );
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ SUCCESS! Call initiated');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Result:');
    console.log(`   Call SID: ${result.callSid}`);
    console.log(`   Conference: ${result.conferenceName}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    console.log('');
    console.log('📱 YOUR PHONE SHOULD BE RINGING NOW!');
    console.log('');
    console.log('If your phone rings, the configuration is CORRECT! ✅');
    console.log('If you get an error, the webhook URL is not configured. ❌');
    console.log('');
    
  } catch (error) {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('❌ FAILED! Error calling your phone');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Error details:');
    console.log(`   Status: ${error.status}`);
    console.log(`   Code: ${error.code}`);
    console.log(`   Message: ${error.message}`);
    console.log('');
    
    if (error.code === 20003 || error.message.includes('Authenticate')) {
      console.log('🔍 DIAGNOSIS: Webhook URL is NOT configured correctly!');
      console.log('');
      console.log('FIX:');
      console.log('1. Go to: https://console.twilio.com/us1/develop/voice/manage/twiml-apps');
      console.log('2. Click on "voice model" (your TwiML App)');
      console.log('3. Under "Voice Configuration" section:');
      console.log(`   - Request URL: ${process.env.BASE_URL}/api/twilio/voice`);
      console.log('   - HTTP Method: POST');
      console.log('4. Click "Save" at the bottom');
      console.log('5. Run this test again');
      console.log('');
    } else {
      console.log('🔍 DIAGNOSIS: Different error - check the details above');
      console.log('');
    }
  }
}

// Run the test
testTwilioCall();
