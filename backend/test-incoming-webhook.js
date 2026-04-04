/**
 * Test the /incoming-call webhook to see what it returns
 */

const axios = require('axios');

async function testIncomingWebhook() {
  console.log('🧪 Testing /incoming-call webhook...\n');

  const testData = {
    From: '+919273302194',
    To: '+15025211439',
    CallSid: 'TEST123456789',
    CallStatus: 'ringing'
  };

  try {
    // Test local endpoint
    console.log('Testing LOCAL endpoint: http://localhost:5001/api/twilio/incoming-call');
    const localResponse = await axios.post(
      'http://localhost:5001/api/twilio/incoming-call',
      testData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('\n✅ LOCAL Response Status:', localResponse.status);
    console.log('✅ LOCAL Response Type:', localResponse.headers['content-type']);
    console.log('\n📄 LOCAL TwiML Response:');
    console.log(localResponse.data);
    console.log('\n');

    // Test ngrok endpoint
    const ngrokUrl = process.env.BASE_URL || 'https://nontypical-kieran-virally.ngrok-free.dev';
    console.log(`Testing NGROK endpoint: ${ngrokUrl}/api/twilio/incoming-call`);
    
    const ngrokResponse = await axios.post(
      `${ngrokUrl}/api/twilio/incoming-call`,
      testData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('\n✅ NGROK Response Status:', ngrokResponse.status);
    console.log('✅ NGROK Response Type:', ngrokResponse.headers['content-type']);
    console.log('\n📄 NGROK TwiML Response:');
    console.log(ngrokResponse.data);
    console.log('\n');

    console.log('✅ Both endpoints are working correctly!');
    console.log('\nIf calls are still failing, the issue is in Twilio Console configuration.');
    console.log('Check: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming');
    console.log(`Make sure webhook is set to: ${ngrokUrl}/api/twilio/incoming-call`);

  } catch (error) {
    console.error('\n❌ Error testing webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    
    console.log('\n🔍 Troubleshooting:');
    console.log('1. Make sure backend is running: npm start');
    console.log('2. Make sure ngrok is running: ngrok http --domain=nontypical-kieran-virally.ngrok-free.dev 5001');
    console.log('3. Check if port 5001 is correct');
  }
}

testIncomingWebhook();
