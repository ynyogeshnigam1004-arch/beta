/**
 * Check Transfer Configuration
 * Verify why human transfer is not working
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Assistant = require('./models/Assistant');

async function checkTransferConfig() {
  try {
    console.log('🔍 Checking transfer configuration...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', adminUser.email);

    // Check Twilio credentials
    console.log('\n📞 Twilio Credentials:');
    if (adminUser.twilioCredentials && adminUser.twilioCredentials.accountSid) {
      console.log(`   Account SID: ${adminUser.twilioCredentials.accountSid}`);
      console.log(`   Status: ${adminUser.twilioCredentials.status}`);
      console.log(`   API Key: ${adminUser.twilioCredentials.apiKey || 'Not set'}`);
      console.log(`   TwiML App: ${adminUser.twilioCredentials.twimlAppSid || 'Not set'}`);
    } else {
      console.log('   ❌ No Twilio credentials configured');
    }

    // Check phone numbers
    console.log('\n📱 Phone Numbers:');
    if (adminUser.phoneNumbers && adminUser.phoneNumbers.length > 0) {
      adminUser.phoneNumbers.forEach((phone, index) => {
        console.log(`   ${index + 1}. ${phone.phoneNumber} (${phone.label})`);
        console.log(`      Assistant ID: ${phone.assignedAssistantId}`);
        console.log(`      Status: ${phone.status}`);
      });
    } else {
      console.log('   ❌ No phone numbers configured');
    }

    // Check assistant transfer settings
    console.log('\n🤖 Assistant Transfer Settings:');
    const assistants = await Assistant.getAllAssistants(adminUser._id);
    
    if (assistants.length > 0) {
      assistants.forEach((assistant, index) => {
        console.log(`\n   ${index + 1}. ${assistant.name} (ID: ${assistant.id})`);
        
        if (assistant.transferSettings) {
          console.log(`      Transfer Enabled: ${assistant.transferSettings.enabled || false}`);
          console.log(`      Transfer Phone: ${assistant.transferSettings.phoneNumber || 'Not set'}`);
          console.log(`      Transfer Phrases: ${assistant.transferSettings.phrases?.length || 0} phrases`);
          
          if (assistant.transferSettings.phrases && assistant.transferSettings.phrases.length > 0) {
            console.log(`      Phrases: ${assistant.transferSettings.phrases.join(', ')}`);
          }
        } else {
          console.log('      ❌ No transfer settings configured');
        }
      });
    } else {
      console.log('   ❌ No assistants found');
    }

    // Check which assistant is being used in the call
    console.log('\n🔍 Call Analysis:');
    console.log('   The call URL shows: asst_1772915631010_pouc1agz9');
    
    const callAssistant = assistants.find(a => a.id === 'asst_1772915631010_pouc1agz9');
    if (callAssistant) {
      console.log(`   ✅ Found call assistant: ${callAssistant.name}`);
      
      if (callAssistant.transferSettings) {
        console.log(`   Transfer Enabled: ${callAssistant.transferSettings.enabled}`);
        console.log(`   Transfer Phone: ${callAssistant.transferSettings.phoneNumber || 'Not set'}`);
      } else {
        console.log('   ❌ No transfer settings for this assistant');
      }
    } else {
      console.log('   ❌ Call assistant not found');
    }

    // Recommendations
    console.log('\n🔧 Recommendations:');
    console.log('   1. Enable transfer settings for the assistant being used');
    console.log('   2. Set a transfer phone number (your phone number)');
    console.log('   3. Add transfer phrases like "transfer", "human", "agent"');
    console.log('   4. Ensure Twilio credentials have calling permissions');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkTransferConfig();