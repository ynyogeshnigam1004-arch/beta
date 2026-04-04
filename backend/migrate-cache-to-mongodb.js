/**
 * Migrate Cached Assistant to MongoDB
 * This script creates the "yogi" assistant in MongoDB with phone number
 */

const { connectDB, getCollection } = require('./config/database');

async function migrateAssistant() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    const collection = getCollection('assistants');
    
    // Create yogi assistant with phone number
    const yogiAssistant = {
      id: `asst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'yogi',
      model: 'llama-3.1-8b-instant',
      transcriber: 'whisper-large-v3-turbo',
      voiceProvider: 'cartesia',
      voiceModel: 'sonic-2024-10',
      voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
      elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
      elevenLabsModel: 'eleven_monolingual_v1',
      elevenLabsSettings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true
      },
      useCustomVoiceId: false,
      customVoiceId: '',
      voice: 'Cartesia Sonic',
      status: 'active',
      firstMessageMode: 'assistant-speaks-first',
      firstMessage: 'Hello! How can I help you today?',
      systemPrompt: 'You are a helpful voice assistant. Be friendly and professional.',
      transferSettings: {
        countryCode: '+91',
        phoneNumber: '9548744216',
        endCallEnabled: false,
        dialKeypadEnabled: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('');
    console.log('📝 Creating "yogi" assistant in MongoDB...');
    console.log('   Phone Number: +919548744216');
    console.log('');
    
    const result = await collection.insertOne(yogiAssistant);
    
    console.log('✅ Assistant created successfully!');
    console.log('   ID:', yogiAssistant.id);
    console.log('   MongoDB _id:', result.insertedId);
    console.log('');
    console.log('🎉 Done! Now refresh your browser to see the assistant.');
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrateAssistant();
