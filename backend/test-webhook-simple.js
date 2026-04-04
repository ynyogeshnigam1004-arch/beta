// Simple test to verify webhook endpoint is accessible
const https = require('https');

const ngrokUrl = 'https://nontypical-kieran-virally.ngrok-free.dev';
const testConference = `test-${Date.now()}`;
const endpoint = `/api/twilio/voice?conferenceName=${encodeURIComponent(testConference)}`;

console.log('🧪 Testing Twilio Voice Webhook');
console.log('================================');
console.log(`URL: ${ngrokUrl}${endpoint}`);
console.log('');

const postData = 'From=%2B919548744216&To=%2B15025211439';

const options = {
  hostname: 'nontypical-kieran-virally.ngrok-free.dev',
  port: 443,
  path: endpoint,
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  console.log('');
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 TwiML Response:');
    console.log(data);
    console.log('');
    
    if (res.statusCode === 200 && data.includes('<Conference>')) {
      console.log('✅ Webhook is working correctly!');
      console.log('');
      console.log('Next step: Test human transfer in browser');
      console.log('Watch backend logs for:');
      console.log('  - 📞 INITIATING HUMAN TRANSFER (when you say "connect to human")');
      console.log('  - 📞 Voice webhook called (when you answer the phone)');
    } else {
      console.log('❌ Unexpected response');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('');
  console.log('This means:');
  console.log('  - ngrok might not be running');
  console.log('  - Backend might not be accessible');
  console.log('  - Network issue');
});

req.write(postData);
req.end();
