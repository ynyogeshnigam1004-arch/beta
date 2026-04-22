/**
 * Test OAuth Flow
 * Run this to verify OAuth configuration
 */

require('dotenv').config();

console.log('=== OAuth Configuration Test ===\n');

console.log('1. Environment Variables:');
console.log('   GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('   GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
console.log('   GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
console.log('   FRONTEND_URL:', process.env.FRONTEND_URL);

console.log('\n2. Checking for issues:');

// Check for newlines in redirect URI
if (process.env.GOOGLE_REDIRECT_URI?.includes('\n')) {
  console.log('   ❌ GOOGLE_REDIRECT_URI contains newlines!');
} else {
  console.log('   ✅ GOOGLE_REDIRECT_URI is clean');
}

// Check if URLs are valid
try {
  new URL(process.env.GOOGLE_REDIRECT_URI);
  console.log('   ✅ GOOGLE_REDIRECT_URI is a valid URL');
} catch (e) {
  console.log('   ❌ GOOGLE_REDIRECT_URI is not a valid URL');
}

try {
  new URL(process.env.FRONTEND_URL);
  console.log('   ✅ FRONTEND_URL is a valid URL');
} catch (e) {
  console.log('   ❌ FRONTEND_URL is not a valid URL');
}

console.log('\n3. Expected OAuth Flow:');
console.log('   Step 1: User clicks "Continue with Google"');
console.log('   Step 2: Frontend calls GET /api/auth/google');
console.log('   Step 3: Backend generates OAuth URL and returns it');
console.log('   Step 4: Frontend redirects to Google OAuth URL');
console.log('   Step 5: User authorizes on Google');
console.log('   Step 6: Google redirects to:', process.env.GOOGLE_REDIRECT_URI);
console.log('   Step 7: Backend exchanges code for user info');
console.log('   Step 8: Backend creates/updates user and generates JWT');
console.log('   Step 9: Backend redirects to:', `${process.env.FRONTEND_URL}/auth/google/callback?token=...`);
console.log('   Step 10: Frontend saves token and redirects to dashboard');

console.log('\n=== Test Complete ===');
