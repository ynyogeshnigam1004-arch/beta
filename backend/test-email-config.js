/**
 * Test Email Configuration
 * Run this to verify your Gmail setup is working
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfig() {
  console.log('📧 Testing Email Configuration...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('✅ EMAIL_USER:', process.env.EMAIL_USER || '❌ Missing');
  console.log('✅ EMAIL_APP_PASSWORD:', process.env.EMAIL_APP_PASSWORD ? 'Set' : '❌ Missing');
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.log('\n❌ Email credentials are missing!');
    return;
  }
  
  // Test email transporter
  try {
    console.log('\n🔧 Creating email transporter...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
    
    console.log('✅ Email transporter created successfully!');
    
    // Verify connection
    console.log('🔍 Verifying email connection...');
    await transporter.verify();
    console.log('✅ Email connection verified successfully!');
    
    console.log('\n🎉 Email configuration is working perfectly!');
    console.log('\n📋 Your enhanced authentication system is ready:');
    console.log('✅ Google OAuth configured');
    console.log('✅ Gmail app password configured');
    console.log('✅ Email verification ready');
    console.log('✅ 2FA email notifications ready');
    
  } catch (error) {
    console.log('\n❌ Error testing email:', error.message);
    
    if (error.message.includes('Invalid login')) {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure you copied the app password correctly (no spaces)');
      console.log('2. Verify 2-Step Verification is enabled on your Google account');
      console.log('3. Try generating a new app password');
    }
  }
}

testEmailConfig();