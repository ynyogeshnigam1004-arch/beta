/**
 * Test Phone Routing with Simulated Twilio Webhook
 * Simulates a real Twilio webhook request to test phone number routing
 * This tests the COMPLETE flow: webhook → user lookup → assistant loading
 */

require('dotenv').config();
const http = require('http');
const querystring = require('querystring');

async function testPhoneRoutingWebhook() {
  console.log('\n🎯 ========== TESTING PHONE ROUTING WEBHOOK ==========\n');
  
  // Your actual phone numbers
  const FROM_NUMBER = '+919273302194';  // Your calling number
  const TO_NUMBER = '+15025211439';     // Your Twilio number (admin's)
  const CALL_SID = `CA_TEST_${Date.now()}`;
  
  console.log('📞 Simulating incoming call:');
  console.log(`   From: ${FROM_NUMBER} (your phone)`);
  console.log(`   To: ${TO_NUMBER} (admin's Twilio number)`);
  console.log(`   CallSid: ${CALL_SID}`);
  console.log('');
  
  // Twilio sends data as application/x-www-form-urlencoded
  const formData = querystring.stringify({
    From: FROM_NUMBER,
    To: TO_NUMBER,
    CallSid: CALL_SID,
    AccountSid: process.env.TWILIO_ACCOUNT_SID || 'AC_TEST',
    CallStatus: 'ringing',
    Direction: 'inbound',
    ApiVersion: '2010-04-01'
  });
  
  console.log('📤 Sending webhook request to backend...');
  console.log('   URL: http://localhost:5001/api/twilio/incoming-call');
  console.log('   Method: POST');
  console.log('   Content-Type: application/x-www-form-urlencoded');
  console.log('');
  
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/twilio/incoming-call',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formData),
      'X-Twilio-Signature': 'test-signature'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📥 Response received from backend:');
        console.log('   Status:', res.statusCode);
        console.log('   Content-Type:', res.headers['content-type']);
        console.log('');
        
        if (res.statusCode === 200) {
          console.log('✅ SUCCESS! Backend accepted the webhook');
          console.log('');
          console.log('📋 TwiML Response:');
          console.log(data);
          console.log('');
          console.log('🔍 NOW CHECK YOUR BACKEND TERMINAL LOGS!');
          console.log('');
          console.log('You should see:');
          console.log('  ✅ req.body.From: +919273302194 (NOT undefined)');
          console.log('  ✅ req.body.To: +15025211439 (NOT undefined)');
          console.log('  ✅ req.body.CallSid: CA_TEST_... (NOT undefined)');
          console.log('');
          console.log('If phone routing is working, you should also see:');
          console.log('  ✅ Looking up user by Twilio number: +15025211439');
          console.log('  ✅ Found user: ynyogeshnigam1008@gmail.com');
          console.log('  ✅ Loaded assistant: mine for user: ynyogeshnigam1008@gmail.com');
          console.log('');
          console.log('❌ If you see "undefined" for phone numbers:');
          console.log('   → express.urlencoded() middleware is NOT working');
          console.log('   → Check backend/server.js line 34');
          console.log('');
          console.log('❌ If you see "No user found for Twilio number":');
          console.log('   → Admin phone number is not assigned in database');
          console.log('   → Run: node backend/scripts/assign-admin-phone.js');
          console.log('');
        } else {
          console.log('⚠️ Unexpected status code:', res.statusCode);
          console.log('Response:', data);
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ ERROR: Could not connect to backend');
      console.error('');
      console.error('Make sure backend is running:');
      console.error('  1. Open terminal');
      console.error('  2. Run: node backend/server.js');
      console.error('  3. Wait for "Server running on port 5001"');
      console.error('  4. Then run this test again');
      console.error('');
      console.error('Error details:', error.message);
      reject(error);
    });
    
    req.write(formData);
    req.end();
  });
}

// Run test
console.log('');
console.log('🎯 PHONE ROUTING TEST');
console.log('═══════════════════════════════════════════════════════');
console.log('');
console.log('This script simulates a Twilio webhook to test:');
console.log('  1. ✅ express.urlencoded() middleware parsing');
console.log('  2. ✅ Phone number extraction (From, To, CallSid)');
console.log('  3. ✅ User lookup by Twilio phone number');
console.log('  4. ✅ Assistant loading for that user');
console.log('');
console.log('💰 Cost: FREE (no actual phone call)');
console.log('⏱️  Time: < 1 second');
console.log('');
console.log('Prerequisites:');
console.log('  ✅ Backend must be running (node backend/server.js)');
console.log('  ✅ MongoDB must be connected');
console.log('  ✅ Admin phone number must be assigned');
console.log('');

testPhoneRoutingWebhook()
  .then(() => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 TEST COMPLETE!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Check backend terminal for detailed logs');
    console.log('  2. Verify phone numbers are NOT undefined');
    console.log('  3. Verify user lookup succeeded');
    console.log('  4. Verify assistant loaded correctly');
    console.log('');
    console.log('If everything looks good:');
    console.log('  → Phone routing is WORKING! 🎉');
    console.log('  → You can now test with a real call (costs ₹8)');
    console.log('  → Or use browser calling (FREE)');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('❌ TEST FAILED');
    console.log('');
    console.log('Make sure backend is running and try again.');
    console.log('');
    process.exit(1);
  });
