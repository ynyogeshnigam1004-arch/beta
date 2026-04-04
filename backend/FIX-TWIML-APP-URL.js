/**
 * Fix TwiML App Voice URL Configuration
 * This updates your TwiML App to point to the correct webhook URL
 */

require('dotenv').config({ path: __dirname + '/.env' });
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
const baseUrl = process.env.BASE_URL;

if (!accountSid || !authToken || !twimlAppSid || !baseUrl) {
  console.error('❌ Missing required environment variables!');
  console.log('Required:');
  console.log('  - TWILIO_ACCOUNT_SID');
  console.log('  - TWILIO_AUTH_TOKEN');
  console.log('  - TWILIO_TWIML_APP_SID');
  console.log('  - BASE_URL');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function fixTwiMLApp() {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔧 FIXING TWIML APP CONFIGURATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`TwiML App SID: ${twimlAppSid}`);
    console.log(`Base URL: ${baseUrl}`);
    console.log('');

    // Get current configuration
    console.log('📋 Current configuration:');
    const app = await client.applications(twimlAppSid).fetch();
    console.log(`  Friendly Name: ${app.friendlyName}`);
    console.log(`  Voice URL: ${app.voiceUrl || 'NOT SET'}`);
    console.log(`  Voice Method: ${app.voiceMethod || 'NOT SET'}`);
    console.log('');

    // Update configuration
    const newVoiceUrl = `${baseUrl}/api/twilio/incoming-call`;
    console.log('🔄 Updating configuration...');
    console.log(`  New Voice URL: ${newVoiceUrl}`);
    console.log(`  New Voice Method: POST`);
    console.log('');

    const updated = await client.applications(twimlAppSid).update({
      voiceUrl: newVoiceUrl,
      voiceMethod: 'POST',
      voiceFallbackUrl: newVoiceUrl,
      voiceFallbackMethod: 'POST'
    });

    console.log('✅ TwiML App updated successfully!');
    console.log('');
    console.log('📋 New configuration:');
    console.log(`  Voice URL: ${updated.voiceUrl}`);
    console.log(`  Voice Method: ${updated.voiceMethod}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ CONFIGURATION FIXED!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test human transfer by saying "connect me to human"');
    console.log('');

  } catch (error) {
    console.error('❌ Failed to update TwiML App:', error.message);
    console.log('');
    console.log('Manual fix:');
    console.log('1. Go to: https://console.twilio.com/us1/develop/voice/manage/twiml-apps');
    console.log(`2. Find app: ${twimlAppSid}`);
    console.log(`3. Set Voice Request URL to: ${baseUrl}/api/twilio/voice`);
    console.log('4. Set Voice Request Method to: POST');
    console.log('5. Click Save');
    console.log('');
    process.exit(1);
  }
}

fixTwiMLApp();
