/**
 * Decode Current JWT Token
 * Check what userId is actually in your current token
 */

const jwt = require('jsonwebtoken');

// You need to get your current JWT token from browser localStorage or cookies
// For now, let's decode the token you provided earlier
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJiYzE3NzkyY2I3ZGI3ZTJjOWE2ZTYiLCJlbWFpbCI6InlueW9nZXNobmlnYW0xMDA4QGdtYWlsLmNvbSIsImlhdCI6MTc3Mzk0MDMzNiwiZXhwIjoxNzc0NTQ1MTM2fQ.h0zR4-CkUmNkCLyIsN_1vtB7F83Bv3rXvuQHMkMl930';

try {
  const decoded = jwt.decode(token);
  
  console.log('🔍 Current JWT Token Analysis:');
  console.log('================================');
  console.log('userId:', decoded.userId);
  console.log('email:', decoded.email);
  console.log('issued at:', new Date(decoded.iat * 1000));
  console.log('expires at:', new Date(decoded.exp * 1000));
  console.log('is expired?', Date.now() > decoded.exp * 1000);
  
  console.log('\n🎯 Migration Target:');
  console.log('We migrated data TO userId:', decoded.userId);
  console.log('Type:', typeof decoded.userId);
  
  if (Date.now() > decoded.exp * 1000) {
    console.log('\n❌ TOKEN IS EXPIRED!');
    console.log('This explains the "session expired" error');
    console.log('You need to log in again to get a fresh token');
  } else {
    console.log('\n✅ Token is still valid');
  }
  
} catch (error) {
  console.error('❌ Error decoding token:', error.message);
}

console.log('\n📋 INSTRUCTIONS:');
console.log('1. Check if your token is expired (see above)');
console.log('2. If expired, log out and log back in');
console.log('3. Get the new JWT token from browser localStorage');
console.log('4. Update this script with the new token');
console.log('5. Run migration again with the new userId');