/**
 * Call Emergency Create User
 * Create the missing user record via API
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/emergency/create-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🚨 Calling emergency user creation...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('✅ User creation successful!');
        console.log('   User ID:', result.user.id);
        console.log('   Email:', result.user.email);
        console.log('   Role:', result.user.role);
        console.log('   Message:', result.message);
        
        console.log('\n🔄 Now test your phone numbers page!');
        console.log('   1. Refresh your browser');
        console.log('   2. Click on Phone Numbers');
        console.log('   3. Should not get "session expired" anymore');
      } else {
        console.log('❌ User creation failed:', result.error);
      }
    } catch (e) {
      console.log('❌ Invalid response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.end();