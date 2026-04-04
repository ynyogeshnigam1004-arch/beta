/**
 * Test Email Verification Signup Flow
 * This tests the complete signup process with email verification
 */

require('dotenv').config();
const axios = require('axios');

async function testSignupFlow() {
  console.log('🧪 Testing Email Verification Signup Flow...\n');
  
  const testEmail = 'test@example.com'; // Change this to your email for testing
  const testData = {
    fullName: 'Test User',
    email: testEmail,
    password: 'testpassword123'
  };
  
  try {
    // Step 1: Test signup (should send verification email)
    console.log('📝 Step 1: Testing signup...');
    const signupResponse = await axios.post('http://localhost:5001/api/auth/signup', testData);
    
    console.log('✅ Signup Response:', signupResponse.data);
    
    if (signupResponse.data.success && signupResponse.data.requiresVerification) {
      console.log('📧 Verification email should be sent to:', testEmail);
      console.log('🔢 User should receive a 6-digit verification code');
      console.log('\n📋 Next steps for user:');
      console.log('1. Check email for verification code');
      console.log('2. Enter code in verification form');
      console.log('3. Get automatically logged in to dashboard');
    }
    
  } catch (error) {
    console.error('❌ Error testing signup flow:', error.response?.data || error.message);
  }
}

// Test with a real email address
async function testWithRealEmail() {
  console.log('🧪 Testing with real email (ynyogeshnigam1002@gmail.com)...\n');
  
  const testData = {
    fullName: 'Yogesh Test',
    email: 'ynyogeshnigam1002@gmail.com',
    password: 'testpassword123'
  };
  
  try {
    const signupResponse = await axios.post('http://localhost:5001/api/auth/signup', testData);
    console.log('✅ Signup Response:', signupResponse.data);
    
    if (signupResponse.data.success) {
      console.log('📧 Check your Gmail for verification code!');
    }
    
  } catch (error) {
    if (error.response?.data?.error === 'Email already registered') {
      console.log('ℹ️  Email already registered - this is expected if you tested before');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
}

console.log('Choose test:');
console.log('1. Test signup flow explanation');
console.log('2. Send real verification email to your Gmail');

// Run both tests
testSignupFlow();
console.log('\n' + '='.repeat(50) + '\n');
testWithRealEmail();