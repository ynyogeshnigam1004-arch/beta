/**
 * Create Missing User Record
 * Create the user record that should exist for the JWT token
 */

const https = require('http');

const userData = {
  email: 'ynyogeshnigam1008@gmail.com',
  userId: '69bbc17792cb7db7e2c9a6e6',
  role: 'admin'
};

const postData = JSON.stringify(userData);

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/admin/create-missing-user',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔄 Creating missing user record...');
console.log('   Email:', userData.email);
console.log('   UserId:', userData.userId);
console.log('   Role:', userData.role);

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log('✅ User record created successfully!');
        console.log('   User ID:', result.user.id);
        console.log('   Email:', result.user.email);
        console.log('   Role:', result.user.role);
        console.log('\n🔄 Now test your dashboard again!');
      } else {
        console.log('❌ Failed to create user:', result.error);
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