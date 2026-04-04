/**
 * Call Admin Status Check API
 * Check current admin status after migration
 */

const https = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJiYzE3NzkyY2I3ZGI3ZTJjOWE2ZTYiLCJlbWFpbCI6InlueW9nZXNobmlnYW0xMDA4QGdtYWlsLmNvbSIsImlhdCI6MTc3Mzk0MDMzNiwiZXhwIjoxNzc0NTQ1MTM2fQ.h0zR4-CkUmNkCLyIsN_1vtB7F83Bv3rXvuQHMkMl930';

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/admin/check-current-status',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Checking current admin status...');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      
      if (result.success) {
        console.log('\n🎯 ADMIN STATUS CHECK RESULTS:');
        console.log('='.repeat(50));
        
        console.log('\n📋 JWT Token Info:');
        console.log('   userId:', result.jwtInfo.userId);
        console.log('   email:', result.jwtInfo.email);
        console.log('   type:', result.jwtInfo.type);
        
        console.log('\n👤 User in Database:');
        if (result.userFoundById) {
          console.log('   ✅ User found by JWT userId!');
          console.log('   id:', result.userDetails.id);
          console.log('   email:', result.userDetails.email);
          console.log('   role:', result.userDetails.role);
          console.log('   phoneNumbers:', result.userDetails.phoneNumbers);
          console.log('   twilioStatus:', result.userDetails.twilioStatus);
        } else if (result.userFoundByEmail) {
          console.log('   📧 User found by email but different ID!');
          console.log('   id:', result.userByEmailDetails.id);
          console.log('   email:', result.userByEmailDetails.email);
          console.log('   ❌ ID MISMATCH: JWT userId ≠ Database _id');
        } else {
          console.log('   ❌ User NOT found by ID or email!');
        }
        
        console.log('\n👥 All Users in Database:');
        result.allUsers.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.id})`);
          if (user.matchesJWTId) console.log('      ✅ Matches JWT ID');
          if (user.matchesJWTEmail) console.log('      📧 Matches JWT email');
        });
        
        console.log('\n📊 Data Counts:');
        console.log('   Assistants:', result.assistantsCount);
        console.log('   Calls:', result.callsCount);
        
        if (result.sampleAssistant) {
          console.log('\n🤖 Sample Assistant:');
          console.log('   name:', result.sampleAssistant.name);
          console.log('   userId:', result.sampleAssistant.userId);
          console.log('   userIdType:', result.sampleAssistant.userIdType);
        }
        
        if (result.sampleCall) {
          console.log('\n📞 Sample Call:');
          console.log('   userId:', result.sampleCall.userId);
          console.log('   userIdType:', result.sampleCall.userIdType);
          console.log('   callType:', result.sampleCall.callType);
        }
        
        console.log('\n🎯 CONCLUSION:');
        if (result.userFoundById && result.assistantsCount > 0) {
          console.log('   ✅ Migration successful! Admin should see data now.');
          console.log('   🔄 Please refresh your dashboard.');
        } else if (result.userFoundByEmail && !result.userFoundById) {
          console.log('   ❌ ID MISMATCH DETECTED:');
          console.log('   - JWT userId:', result.jwtInfo.userId);
          console.log('   - Database user _id:', result.userByEmailDetails.id);
          console.log('   🔧 Need to fix user ID mismatch!');
        } else {
          console.log('   ❌ Issues detected:');
          if (!result.userFoundById && !result.userFoundByEmail) console.log('   - User not found at all');
          if (result.assistantsCount === 0) console.log('   - No assistants found');
        }
        
      } else {
        console.log('❌ Status check failed:', result.error);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request error: ${e.message}`);
});

req.end();