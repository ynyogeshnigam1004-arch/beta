/**
 * Call Database Reset API
 * Trigger complete database wipe and fresh setup
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/emergency/reset-database',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('🚨 CALLING USER DATA RESET...');
console.log('⚠️  This will DELETE ONLY USER DATA (users, assistants, calls, phone numbers)');
console.log('✅ Platform data (models, voices, etc.) will be PRESERVED');

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
        console.log('\n🎉 USER DATA RESET SUCCESSFUL!');
        console.log('='.repeat(50));
        console.log('✅ Admin Created:');
        console.log('   Email:', result.admin.email);
        console.log('   ID:', result.admin.id);
        console.log('   Credits:', result.admin.credits.toLocaleString(), '(infinite)');
        
        console.log('\n🗑️ User Data Deleted:');
        console.log('   Users:', result.deleted.users);
        console.log('   Assistants:', result.deleted.assistants);
        console.log('   Calls:', result.deleted.calls);
        console.log('   Credits:', result.deleted.credits);
        
        console.log('\n✅ Platform Data Preserved:');
        console.log('   Models, voices, and system data kept intact');
        
        console.log('\n🔄 NEXT STEPS:');
        console.log('1. Clear your browser cache/localStorage');
        console.log('2. Go to login page');
        console.log('3. Login with: ynyogeshnigam1008@gmail.com');
        console.log('4. Should work perfectly with fresh user data!');
        
      } else {
        console.log('❌ User data reset failed:', result.error);
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