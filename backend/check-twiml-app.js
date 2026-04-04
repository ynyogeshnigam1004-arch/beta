/**
 * Check TwiML App Configuration
 * Verify that the voice URL is correct for conference joining
 */

require('dotenv').config();
const { connectDB } = require('./config/database');
const User = require('./models/User');
const Twilio = require('twilio');

async function checkTwimlApp() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('👤 Finding user...');
    const user = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    
    if (!user || !user.twilioCredentials) {
      console.log('❌ User or credentials not found');
      return;
    }
    
    const client = new Twilio(
      user.twilioCredentials.accountSid,
      user.twilioCredentials.authToken
    );
    
    console.log('\n📋 TWIML APP CONFIGURATION:');
    console.log('═══════════════════════════════════════════════════════');
    
    // Check main TwiML App (for Twilio Device)
    if (user.twilioCredentials.twimlAppSid) {
      console.log(`🔍 Checking TwiML App: ${user.twilioCredentials.twimlAppSid}`);
      
      try {
        const app = await client.applications(user.twilioCredentials.twimlAppSid).fetch();
        
        console.log('✅ TwiML App Found:');
        console.log(`   Friendly Name: ${app.friendlyName}`);
        console.log(`   Voice URL: ${app.voiceUrl || 'NOT SET'}`);
        console.log(`   Voice Method: ${app.voiceMethod || 'NOT SET'}`);
        console.log(`   Status Callback: ${app.statusCallback || 'NOT SET'}`);
        
        // Check if voice URL is correct
        const expectedVoiceUrl = `${process.env.BASE_URL}/api/twilio/voice`;
        const isCorrect = app.voiceUrl === expectedVoiceUrl;
        
        console.log(`\n🎯 VOICE URL CHECK:`);
        console.log(`   Expected: ${expectedVoiceUrl}`);
        console.log(`   Actual: ${app.voiceUrl}`);
        console.log(`   Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
        
        if (!isCorrect) {
          console.log('\n🔧 FIXING VOICE URL...');
          await client.applications(user.twilioCredentials.twimlAppSid).update({
            voiceUrl: expectedVoiceUrl,
            voiceMethod: 'POST'
          });
          console.log('✅ Voice URL updated successfully!');
        }
        
      } catch (error) {
        console.error('❌ Error fetching TwiML App:', error.message);
      }
    }
    
    // Check phone number TwiML Apps
    if (user.phoneNumbers && user.phoneNumbers.length > 0) {
      console.log('\n📞 PHONE NUMBER TWIML APPS:');
      
      for (const phone of user.phoneNumbers) {
        if (phone.twimlAppSid) {
          console.log(`\n🔍 Phone: ${phone.phoneNumber} (${phone.label})`);
          console.log(`   TwiML App: ${phone.twimlAppSid}`);
          
          try {
            const phoneApp = await client.applications(phone.twimlAppSid).fetch();
            console.log(`   Voice URL: ${phoneApp.voiceUrl}`);
            console.log(`   Status: ${phoneApp.voiceUrl ? '✅ SET' : '❌ NOT SET'}`);
          } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
          }
        }
      }
    }
    
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error checking TwiML App:', error);
  } finally {
    process.exit(0);
  }
}

checkTwimlApp();