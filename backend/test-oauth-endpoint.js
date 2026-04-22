// Test if the OAuth endpoint is working
const axios = require('axios');

const BACKEND_URL = 'https://beta-rgl7.onrender.com';

async function testOAuthEndpoint() {
  console.log('\n=== Testing OAuth Endpoint ===\n');
  
  try {
    console.log('1. Testing backend health...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    console.log('✅ Backend is healthy:', healthResponse.data);
    
    console.log('\n2. Testing Google OAuth initiation...');
    const oauthResponse = await axios.get(`${BACKEND_URL}/api/auth/google`);
    
    if (oauthResponse.data.success && oauthResponse.data.authUrl) {
      console.log('✅ OAuth URL generated successfully!');
      console.log('\n📋 Generated URL:');
      console.log(oauthResponse.data.authUrl);
      
      // Check if URL contains correct redirect_uri
      const url = new URL(oauthResponse.data.authUrl);
      const redirectUri = url.searchParams.get('redirect_uri');
      
      console.log('\n🔍 Redirect URI in URL:', redirectUri);
      console.log('✅ Expected:', 'https://beta-rgl7.onrender.com/api/auth/google/callback');
      
      if (redirectUri === 'https://beta-rgl7.onrender.com/api/auth/google/callback') {
        console.log('✅ Redirect URI matches!');
      } else {
        console.log('❌ Redirect URI does NOT match!');
      }
    } else {
      console.log('❌ Failed to generate OAuth URL');
      console.log('Response:', oauthResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
  
  console.log('\n=== Test Complete ===\n');
}

testOAuthEndpoint();
