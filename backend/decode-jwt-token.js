/**
 * Decode JWT Token to see the exact userId
 */

const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJiYzE3NzkyY2I3ZGI3ZTJjOWE2ZTYiLCJlbWFpbCI6InlueW9nZXNobmlnYW0xMDA4QGdtYWlsLmNvbSIsImlhdCI6MTc3Mzk0MDMzNiwiZXhwIjoxNzc0NTQ1MTM2fQ.h0zR4-CkUmNkCLyIsN_1vtB7F83Bv3rXvuQHMkMl930';

try {
  // Decode without verification to see contents
  const decoded = jwt.decode(token);
  
  console.log('🔍 JWT Token Contents (decoded):');
  console.log('   userId:', decoded.userId);
  console.log('   userId Type:', typeof decoded.userId);
  console.log('   email:', decoded.email);
  console.log('   issued at:', new Date(decoded.iat * 1000));
  console.log('   expires at:', new Date(decoded.exp * 1000));
  
  console.log('\n🎯 THE ISSUE IDENTIFIED:');
  console.log('   Your current JWT userId:', decoded.userId);
  console.log('   Previous userId from logs:', '69a49be0fdd5376624854e06');
  
  if (decoded.userId !== '69a49be0fdd5376624854e06') {
    console.log('   ❌ These are DIFFERENT user IDs!');
    console.log('\n💡 SOLUTION NEEDED:');
    console.log('   Your assistants/data are linked to: 69a49be0fdd5376624854e06');
    console.log('   But your current login has userId:', decoded.userId);
    console.log('   We need to migrate your data to the new userId!');
  } else {
    console.log('   ✅ User IDs match - issue is elsewhere');
  }
  
} catch (error) {
  console.error('❌ Error decoding token:', error.message);
}

require('dotenv').config();