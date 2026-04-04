/**
 * Install required packages for enhanced authentication
 * Run this script to install all necessary dependencies
 */

const { execSync } = require('child_process');

console.log('📦 Installing enhanced authentication packages...');

const packages = [
  'passport',
  'passport-google-oauth20', 
  'passport-jwt',
  'speakeasy',           // For 2FA TOTP
  'qrcode',             // For 2FA QR codes
  'nodemailer',         // For email verification
  'express-rate-limit', // For rate limiting
  'helmet',             // For security headers
  'express-validator'   // For input validation
];

try {
  execSync(`npm install ${packages.join(' ')}`, { stdio: 'inherit' });
  console.log('✅ All packages installed successfully!');
  
  console.log('\n📋 Next steps:');
  console.log('1. Set up Google OAuth credentials in Google Console');
  console.log('2. Add environment variables to .env file');
  console.log('3. Configure email service for 2FA');
  
} catch (error) {
  console.error('❌ Failed to install packages:', error.message);
}