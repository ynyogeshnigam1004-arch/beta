/**
 * Switch TTS Provider for Assistants
 * Run: node switch-tts-provider.js [elevenlabs|cartesia]
 */

require('dotenv').config();
const database = require('./config/database');

const PROVIDERS = {
  elevenlabs: {
    voiceProvider: 'elevenlabs',
    voiceModel: 'eleven_flash_v2_5',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    description: 'ElevenLabs WebSocket Streaming (Fast, High Quality)'
  },
  cartesia: {
    voiceProvider: 'cartesia',
    voiceModel: 'sonic-english',
    voiceId: '95d51f79-c397-46f9-b49a-23763d3eaa2d',
    description: 'Cartesia Sonic (Ultra Fast, Good Quality)'
  }
};

async function switchProvider(providerName) {
  console.log('🔄 Switching TTS provider...\n');
  
  // Validate provider
  if (!PROVIDERS[providerName]) {
    console.error('❌ Invalid provider. Use: elevenlabs or cartesia');
    console.log('\nAvailable providers:');
    Object.keys(PROVIDERS).forEach(key => {
      console.log(`  - ${key}: ${PROVIDERS[key].description}`);
    });
    process.exit(1);
  }
  
  const config = PROVIDERS[providerName];
  
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
    
    console.log(`📋 Found ${assistants.length} assistant(s)\n`);
    console.log(`🎯 Switching to: ${config.description}\n`);
    
    // Update all assistants
    for (const asst of assistants) {
      const update = {
        voiceProvider: config.voiceProvider,
        voiceModel: config.voiceModel,
        voiceId: config.voiceId,
        updatedAt: new Date().toISOString()
      };
      
      await collection.updateOne(
        { id: asst.id },
        { $set: update }
      );
      
      console.log(`✅ Updated: ${asst.name || asst.id}`);
    }
    
    console.log('\n✅ All assistants updated successfully!');
    console.log('\n📝 Configuration:');
    console.log(`   Provider: ${config.voiceProvider}`);
    console.log(`   Model: ${config.voiceModel}`);
    console.log(`   Voice ID: ${config.voiceId}`);
    console.log('\n🔄 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Make a test call');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get provider from command line
const provider = process.argv[2];

if (!provider) {
  console.log('Usage: node switch-tts-provider.js [elevenlabs|cartesia]\n');
  console.log('Available providers:');
  Object.keys(PROVIDERS).forEach(key => {
    console.log(`  - ${key}: ${PROVIDERS[key].description}`);
  });
  process.exit(1);
}

// Run switch
switchProvider(provider.toLowerCase());
