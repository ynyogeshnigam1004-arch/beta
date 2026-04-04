/**
 * Check Database State
 * See what's actually in the database after migration
 */

require('dotenv').config();
const http = require('http');

async function checkDatabaseState() {
  try {
    console.log('🔍 Checking database state...\n');
    
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJiYzE3NzkyY2I3ZGI3ZTJjOWE2ZTYiLCJlbWFpbCI6InlueW9nZXNobmlnYW0xMDA4QGdtYWlsLmNvbSIsImlhdCI6MTc3Mzk0MDMzNiwiZXhwIjoxNzc0NTQ1MTM2fQ.h0zR4-CkUmNkCLyIsN_1vtB7F83Bv3rXvuQHMkMl930';
    
    // Test 1: Check assistants API
    console.log('📊 Testing /api/assistants...');
    await testAPI('/api/assistants', token);
    
    // Test 2: Check calls API  
    console.log('\n📞 Testing /api/calls...');
    await testAPI('/api/calls', token);
    
    // Test 3: Check phone numbers API
    console.log('\n📱 Testing /api/phone-numbers...');
    await testAPI('/api/phone-numbers', token);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

function testAPI(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        
        try {
          const result = JSON.parse(data);
          
          if (path === '/api/assistants') {
            console.log(`   Assistants found: ${result.assistants?.length || 0}`);
            if (result.assistants?.length > 0) {
              console.log(`   First assistant: "${result.assistants[0].name}"`);
            }
          } else if (path === '/api/calls') {
            console.log(`   Calls found: ${result.calls?.length || 0}`);
            if (result.calls?.length > 0) {
              console.log(`   Latest call: ${result.calls[0].callType || 'unknown'}`);
            }
          } else if (path === '/api/phone-numbers') {
            console.log(`   Phone numbers: ${result.phoneNumbers?.length || 0}`);
            console.log(`   Twilio configured: ${result.twilioCredentials?.configured || false}`);
          }
          
          if (!result.success) {
            console.log(`   ❌ Error: ${result.error}`);
          }
        } catch (e) {
          console.log(`   ❌ Invalid JSON response`);
          console.log(`   Response: ${data.substring(0, 200)}...`);
        }
        
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`   ❌ Request error: ${e.message}`);
      resolve();
    });
    
    req.end();
  });
}

checkDatabaseState();