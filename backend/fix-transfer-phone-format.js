/**
 * Fix Transfer Phone Number Format
 * Update to use the verified caller ID format
 */

const mongoose = require('mongoose');
require('dotenv').config();

const { getCollection } = require('./config/database');

async function fixTransferPhoneFormat() {
  try {
    console.log('🔧 Fixing transfer phone number format...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const assistantsCollection = getCollection('assistants');
    
    // Update the "mine" assistant with correct phone format
    const result = await assistantsCollection.updateOne(
      { id: 'asst_1772915631010_pouc1agz9' },
      {
        $set: {
          'transferSettings.phoneNumber': '+919548744216', // Use verified format
          updatedAt: new Date().toISOString()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Transfer phone number updated successfully!');
      console.log('   Old format: 9548744216');
      console.log('   New format: +919548744216 (matches verified caller ID)');
      
      console.log('\n🎉 Transfer should work now!');
      console.log('   Try saying "transfer my call" in your next call');
    } else {
      console.log('❌ Failed to update phone number');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixTransferPhoneFormat();