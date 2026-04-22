// Quick test to see what OAuth URL is being generated
require('dotenv').config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

console.log('\n=== Google OAuth Configuration ===');
console.log('Client ID:', GOOGLE_CLIENT_ID);
console.log('Redirect URI:', GOOGLE_REDIRECT_URI);
console.log('Redirect URI (encoded):', encodeURIComponent(GOOGLE_REDIRECT_URI));

const params = new URLSearchParams({
  client_id: GOOGLE_CLIENT_ID,
  redirect_uri: GOOGLE_REDIRECT_URI,
  response_type: 'code',
  scope: 'email profile',
  state: 'test123'
});

const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
console.log('\n=== Generated OAuth URL ===');
console.log(url);
console.log('\n=== What should be in Google Console ===');
console.log('Authorized redirect URIs:', GOOGLE_REDIRECT_URI);
console.log('===================================\n');
