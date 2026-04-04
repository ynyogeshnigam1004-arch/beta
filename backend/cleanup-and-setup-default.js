/**
 * Cleanup: Delete all assistants except "mine"
 * Setup: Configure default assistant template for new users
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');
const { ObjectId } = require('mongodb');

async function cleanupAndSetup() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    const assistantsCollection = getCollection('assistants');
    const usersCollection = getCollection('users');
    
    // Find admin user
    const adminUser = await usersCollection.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('❌ No admin user found');
      process.exit(1);
    }
    
    console.log(`\n✅ Found admin user: ${adminUser.email}`);
    console.log(`   UserId: ${adminUser._id}`);
    
    // Get all assistants
    const allAssistants = await assistantsCollection.find({}).toArray();
    console.log(`\n📊 Total assistants in database: ${allAssistants.length}`);
    
    // Find "mine" assistant
    const mineAssistant = allAssistants.find(a => a.name === 'mine');
    
    if (!mineAssistant) {
      console.error('❌ "mine" assistant not found!');
      console.log('Available assistants:', allAssistants.map(a => a.name).join(', '));
      process.exit(1);
    }
    
    console.log(`\n✅ Found "mine" assistant:`);
    console.log(`   ID: ${mineAssistant.id}`);
    console.log(`   Model: ${mineAssistant.model}`);
    console.log(`   Transcriber: ${mineAssistant.transcriber}`);
    console.log(`   Voice Provider: ${mineAssistant.voiceProvider}`);
    console.log(`   Voice Model: ${mineAssistant.voiceModel}`);
    console.log(`   First Message: ${mineAssistant.firstMessage}`);
    
    // Update "mine" assistant to belong to admin
    await assistantsCollection.updateOne(
      { _id: mineAssistant._id },
      { $set: { userId: adminUser._id } }
    );
    console.log(`\n✅ Updated "mine" assistant userId to admin`);
    
    // Delete all other assistants
    const toDelete = allAssistants.filter(a => a.name !== 'mine');
    
    if (toDelete.length > 0) {
      console.log(`\n🗑️  Deleting ${toDelete.length} other assistants:`);
      toDelete.forEach(a => console.log(`   - ${a.name}`));
      
      const deleteResult = await assistantsCollection.deleteMany({
        name: { $ne: 'mine' }
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} assistants`);
    } else {
      console.log(`\n✅ No other assistants to delete`);
    }
    
    // Save "mine" assistant config as default template
    const defaultTemplate = {
      name: 'My First Assistant',
      model: mineAssistant.model || 'llama-3.1-8b-instant',
      transcriber: mineAssistant.transcriber || 'whisper-large-v3-turbo',
      voiceProvider: mineAssistant.voiceProvider || 'cartesia',
      voiceModel: mineAssistant.voiceModel || 'sonic-2024-10',
      voiceId: mineAssistant.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091',
      elevenLabsVoiceId: mineAssistant.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
      elevenLabsModel: mineAssistant.elevenLabsModel || 'eleven_turbo_v2',
      elevenLabsSettings: mineAssistant.elevenLabsSettings || {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true
      },
      useCustomVoiceId: mineAssistant.useCustomVoiceId || false,
      customVoiceId: mineAssistant.customVoiceId || '',
      voice: mineAssistant.voice || 'Cartesia Sonic',
      status: 'active',
      firstMessageMode: mineAssistant.firstMessageMode || 'assistant-speaks-first',
      firstMessage: mineAssistant.firstMessage || 'Hello! How can I help you today?',
      systemPrompt: mineAssistant.systemPrompt || 'You are a helpful voice assistant. Be friendly and professional.',
      transferSettings: mineAssistant.transferSettings || {
        enabled: false,
        phoneNumber: '',
        phrases: []
      }
    };
    
    // Save to a config file
    const fs = require('fs');
    fs.writeFileSync(
      './backend/config/defaultAssistant.json',
      JSON.stringify(defaultTemplate, null, 2)
    );
    
    console.log(`\n✅ Saved default assistant template to: backend/config/defaultAssistant.json`);
    console.log(`\n📋 Default Template:`);
    console.log(`   Model: ${defaultTemplate.model}`);
    console.log(`   Transcriber: ${defaultTemplate.transcriber}`);
    console.log(`   Voice Provider: ${defaultTemplate.voiceProvider}`);
    console.log(`   Voice Model: ${defaultTemplate.voiceModel}`);
    console.log(`   First Message: ${defaultTemplate.firstMessage}`);
    
    console.log(`\n✅ CLEANUP COMPLETE!`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Kept: "mine" assistant (admin user)`);
    console.log(`   - Deleted: ${toDelete.length} other assistants`);
    console.log(`   - Created: Default template for new users`);
    console.log(`\n🔄 Next: Restart backend to apply changes`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupAndSetup();
