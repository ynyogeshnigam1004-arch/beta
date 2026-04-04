/**
 * Check TwiML App Configuration
 * This will show the current configuration of your TwiML App
 */

require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

const client = twilio(accountSid, authToken);

async function checkTwiMLApp() {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 TWIML APP CONFIGURATION');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('TwiML App SID:', twimlAppSid);
    console.log('');
    console.log('Fetching configuration...');
    console.log('');

    const app = await client.applications(twimlAppSid).fetch();

    console.log('✅ TwiML App Found');
    console.log('');
    console.log('--- CONFIGURATION ---');
    console.log('Friendly Name:', app.friendlyName);
    console.log('');
    console.log('Voice Configuration:');
    console.log('  URL:', app.voiceUrl);
    console.log('  Method:', app.voiceMethod);
    console.log('  Fallback URL:', app.voiceFallbackUrl || 'None');
    console.log('  Fallback Method:', app.voiceFallbackMethod || 'None');
    console.log('');
    console.log('Status Callback:');
    console.log('  URL:', app.statusCallback || 'None');
    console.log('  Method:', app.statusCallbackMethod || 'None');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    
    // Check if voice method is correct
    if (app.voiceMethod === 'POST') {
      console.log('⚠️  WARNING: Voice Method is POST');
      console.log('');
      console.log('When using Twilio Device SDK with params, Twilio sends');
      console.log('the params as QUERY PARAMETERS in the URL.');
      console.log('');
      console.log('RECOMMENDED: Change Voice Method to GET');
      console.log('');
      console.log('How to fix:');
      console.log('1. Go to: https://console.twilio.com/us1/develop/voice/manage/twiml-apps');
      console.log('2. Click on your TwiML App');
      console.log('3. Under Voice section, change HTTP Method to GET');
      console.log('4. Click Save');
      console.log('');
    } else if (app.voiceMethod === 'GET') {
      console.log('✅ Voice Method is GET - This is correct!');
      console.log('');
      console.log('Query parameters should be received correctly.');
      console.log('');
    }
    
    // Check if voice URL is correct
    const expectedUrl = process.env.BASE_URL + '/api/twilio/voice';
    if (app.voiceUrl !== expectedUrl) {
      console.log('⚠️  WARNING: Voice URL mismatch');
      console.log('');
      console.log('Expected:', expectedUrl);
      console.log('Actual:', app.voiceUrl);
      console.log('');
      console.log('Make sure your ngrok URL matches the TwiML App configuration.');
      console.log('');
    } else {
      console.log('✅ Voice URL matches BASE_URL in .env');
      console.log('');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Error fetching TwiML App:', error.message);
    console.error('');
    
    if (error.code === 20404) {
      console.error('TwiML App not found. Check your TWILIO_TWIML_APP_SID in .env');
    } else if (error.code === 20003) {
      console.error('Authentication failed. Check your Twilio credentials in .env');
    }
    console.error('');
  }
}

checkTwiMLApp();
