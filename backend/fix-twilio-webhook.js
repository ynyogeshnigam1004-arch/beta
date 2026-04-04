/**
 * Fix Twilio TwiML App Webhook URL
 * This updates your TwiML App to use the correct ngrok URL
 */

require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
const baseUrl = process.env.BASE_URL;

if (!accountSid || !authToken || !twimlAppSid || !baseUrl) {
  console.error('❌ Missing required environment variables!');
  console.error('Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_TWIML_APP_SID, BASE_URL');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function fixWebhook() {
  console.log('🔧 Fixing Twilio TwiML App webhook...\n');
  
  try {
    const voiceUrl = `${baseUrl}/api/twilio/voice`;
    const statusUrl = `${baseUrl}/api/twilio/status`;
    
    console.log('📋 Current Configuration:');
    console.log(`   TwiML App SID: ${twimlAppSid}`);
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   Voice URL: ${voiceUrl}`);
    console.log(`   Status URL: ${statusUrl}`);
    console.log('');
    
    // Update TwiML App
    const app = await client.applications(twimlAppSid)
      .update({
        voiceUrl: voiceUrl,
        voiceMethod: 'POST',
        statusCallback: statusUrl,
        statusCallbackMethod: 'POST'
      });
    
    console.log('✅ TwiML App updated successfully!');
    console.log('');
    console.log('📞 Webhook URLs configured:');
    console.log(`   Voice: ${app.voiceUrl}`);
    console.log(`   Status: ${app.statusCallback}`);
    console.log('');
    console.log('🎉 Human transfer should now work completely!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Make sure backend is running (npm start)');
    console.log('   2. Make sure ngrok is running (ngrok http 5001)');
    console.log('   3. Refresh your browser');
    console.log('   4. Say "connect me to a human"');
    console.log('   5. Answer your phone - you\'ll be connected!');
    
  } catch (error) {
    console.error('❌ Error updating TwiML App:', error.message);
    
    if (error.code === 20003) {
      console.error('\n⚠️  Authentication failed! Check your Twilio credentials in .env');
    } else if (error.code === 20404) {
      console.error('\n⚠️  TwiML App not found! Check TWILIO_TWIML_APP_SID in .env');
    }
    
    process.exit(1);
  }
}

fixWebhook();
