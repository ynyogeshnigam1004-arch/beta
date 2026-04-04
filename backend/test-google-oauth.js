/**
 * Test Google OAuth Configuration
 * Run this to verify your Google OAuth setup is working
 */

require('dotenv').config({ path: './.env' });

async function testGoogleOAuth() {
  console.log('🔍 Testing Google OAuth Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('✅ GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : '❌ Missing');
  console.log('✅ GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : '❌ Missing');
  console.log('✅ GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '❌ Missing');
  console.log('✅ EMAIL_USER:', process.env.EMAIL_USER || '❌ Missing');
  console.log('✅ EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set' : '❌ Missing');
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('\n❌ Google OAuth credentials are missing!');
    console.log('Please update your backend/.env file with:');
    console.log('GOOGLE_CLIENT_ID=your_client_id_here');
    console.log('GOOGLE_CLIENT_SECRET=your_client_secret_here');
    return;
  }
  
  // Test Google OAuth URL generation
  try {
    const authService = require('./services/authService');
    const state = 'test_state_123';
    const googleAuthURL = authService.generateGoogleOAuthURL(state);
    
    console.log('\n🔗 Generated Google OAuth URL:');
    console.log(googleAuthURL);
    
    console.log('\n✅ Google OAuth configuration appears to be working!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up Gmail app password for EMAIL_USER and EMAIL_APP_PASSWORD');
    console.log('2. Start your backend server: cd backend && npm start');
    console.log('3. Start your frontend: cd frontend && npm run dev');
    console.log('4. Test the login/signup flow with Google OAuth');
    
  } catch (error) {
    console.log('\n❌ Error testing Google OAuth:', error.message);
  }
}

testGoogleOAuth();