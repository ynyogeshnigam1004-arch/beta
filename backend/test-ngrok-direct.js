require('dotenv').config();
const https = require('https');

const ngrokUrl = process.env.BASE_URL;
const webhookPath = '/api/twilio/voice?conferenceName=test-123';
const fullUrl = `${ngrokUrl}${webhookPath}`;

console.log('🧪 Testing ngrok webhook directly...\n');
console.log(`URL: ${fullUrl}\n`);

const postData = 'From=%2B15025211439&To=%2B919548744216';

const url = new URL(fullUrl);
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'TwilioProxy/1.1'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('');

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Response Body:');
    console.log(data);
    console.log('');

    if (res.statusCode === 200 && data.includes('<Response>')) {
      console.log('✅ SUCCESS! Webhook is working correctly!');
      console.log('The issue is NOT with ngrok or your webhook.');
      console.log('');
      console.log('🔍 The problem might be:');
      console.log('1. Twilio credentials (Account SID or Auth Token) are incorrect');
      console.log('2. Twilio phone number is not verified');
      console.log('3. Your personal number needs to be verified in Twilio');
    } else if (res.statusCode === 403) {
      console.log('❌ ngrok is blocking the request!');
      console.log('');
      console.log('FIX: ngrok free tier shows a warning page.');
      console.log('You need to add ngrok-skip-browser-warning header OR upgrade ngrok.');
    } else {
      console.log('⚠️ Unexpected response');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(postData);
req.end();
