/**
 * Call Migration API
 * Simple script to call the migration endpoint
 */

const https = require('http');

const postData = JSON.stringify({});

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/admin/migrate-data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔄 Calling migration API...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log('✅ Migration successful!');
        console.log('   Assistants migrated:', result.results.assistantsMigrated);
        console.log('   Calls migrated:', result.results.callsMigrated);
        console.log('   Final assistants:', result.results.finalAssistants);
        console.log('   Final calls:', result.results.finalCalls);
        console.log('\n🔄 Now refresh your dashboard!');
      } else {
        console.log('❌ Migration failed:', result.error);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.write(postData);
req.end();