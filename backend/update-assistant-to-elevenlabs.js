/**
 * Update Assistant to use ElevenLabs WebSocket Streaming
 * Run: node update-assistant-to-elevenlabs.js
 */

require('dotenv').config();
const database = require('./config/database');

async function updateAssistant() {
  console.log('🔄 Updating assistant to use ElevenLabs WebSocket streaming...\n');
  
  try {
    // Connect to database
    await database.connectDB();
    console.log('✅ Connected to MongoDB\n');
    
    const collection = database.getCollection('assistants');
    
    // Get all assistants
    const assistants = await collection.find({}).toArray();
    
    if (assistants.length === 0) {
      console.log('⚠️ No assistants found in database');
      process.exit(0);
    }
    
    console.log(`📋 Found ${assistants.length} assistant(s):\n`);
    
    // Show current configuration
    assistants.forEach((asst, index) => {
      console.log(`${index + 1}. ${asst.name || 'Unnamed'}`);
      console.log(`   ID: ${asst.id}`);
      console.log(`   Current Provider: ${asst.voiceProvider || 'Not set'}`);
      console.log(`   Current Model: ${asst.voiceModel || 'Not set'}`);
      console.log(`   Current Voice ID: ${asst.voiceId || 'Not set'}`);
      console.log('');
    });
    
    // Update all assistants to use ElevenLabs
    console.log('🔧 Updating all assistants to use ElevenLabs...\n');
    
    for (const asst of assistants) {
      const update = {
        voiceProvider: 'elevenlabs',
        voiceModel: 'eleven_flash_v2_5', // Fast model for low latency
        voiceId: asst.voiceId || '21m00Tcm4TlvDq8ikWAM', // Keep existing or use Rachel
        updatedAt: new Date().toISOString()
      };
      
      await collection.updateOne(
        { id: asst.id },
        { $set: update }
      );
      
      console.log(`✅ Updated: ${asst.name || asst.id}`);
      console.log(`   Provider: ${update.voiceProvider}`);
      console.log(`   Model: ${update.voiceModel}`);
      console.log(`   Voice ID: ${update.voiceId}`);
      console.log('');
    }
    
    console.log('✅ All assistants updated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Make a test call');
    console.log('   3. Enjoy fast ElevenLabs streaming!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run update
updateAssistant();
