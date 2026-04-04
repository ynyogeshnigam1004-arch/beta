/**
 * Fix Transfer Phrases for Mine Assistant
 * Add transfer trigger phrases so human transfer works
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { getCollection } = require('./config/database');

async function fixTransferPhrases() {
  try {
    console.log('🔧 Fixing transfer phrases for "mine" assistant...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const assistantsCollection = getCollection('assistants');
    
    // Find the "mine" assistant
    const mineAssistant = await assistantsCollection.findOne({
      id: 'asst_1772915631010_pouc1agz9'
    });

    if (!mineAssistant) {
      console.log('❌ "mine" assistant not found');
      return;
    }

    console.log('✅ Found "mine" assistant');
    console.log(`   Current transfer enabled: ${mineAssistant.transferSettings?.enabled}`);
    console.log(`   Current transfer phone: ${mineAssistant.transferSettings?.phoneNumber}`);
    console.log(`   Current transfer phrases: ${mineAssistant.transferSettings?.phrases?.length || 0}`);

    // Add transfer phrases
    const transferPhrases = [
      'transfer',
      'transfer my call',
      'human',
      'agent',
      'speak to human',
      'connect me to human',
      'human agent',
      'live agent',
      'representative',
      'customer service'
    ];

    // Update the assistant with transfer phrases
    const result = await assistantsCollection.updateOne(
      { id: 'asst_1772915631010_pouc1agz9' },
      {
        $set: {
          'transferSettings.phrases': transferPhrases,
          'transferSettings.enabled': true,
          'transferSettings.phoneNumber': '9548744216',
          updatedAt: new Date().toISOString()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Transfer phrases added successfully!');
      console.log(`   Added ${transferPhrases.length} transfer phrases:`);
      transferPhrases.forEach((phrase, index) => {
        console.log(`   ${index + 1}. "${phrase}"`);
      });
      
      console.log('\n🎉 Now when you say any of these phrases, the call will transfer to: 9548744216');
    } else {
      console.log('❌ Failed to update assistant');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixTransferPhrases();