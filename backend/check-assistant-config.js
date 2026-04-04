/**
 * Check Assistant Configuration
 * This script checks what config is loaded for the "yogi" assistant
 */

const { connectDB, getCollection } = require('./config/database');

async function checkAssistantConfig() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    const collection = getCollection('assistants');
    
    // Find the yogi assistant
    const assistant = await collection.findOne({ name: 'yogi' });
    
    if (!assistant) {
      console.log('❌ No assistant named "yogi" found in database');
      console.log('');
      console.log('📋 Available assistants:');
      const allAssistants = await collection.find({}).toArray();
      allAssistants.forEach(a => {
        console.log(`   - ${a.name} (id: ${a.id})`);
      });
      process.exit(1);
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 ASSISTANT CONFIGURATION FOR: ' + assistant.name);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    console.log('🆔 Basic Info:');
    console.log('   ID:', assistant.id);
    console.log('   Name:', assistant.name);
    console.log('   Status:', assistant.status);
    console.log('   Created:', assistant.createdAt);
    console.log('   Updated:', assistant.updatedAt);
    console.log('');
    
    console.log('🤖 LLM Config:');
    console.log('   Model:', assistant.model);
    console.log('   System Prompt:', assistant.systemPrompt ? assistant.systemPrompt.substring(0, 100) + '...' : 'Not set');
    console.log('');
    
    console.log('🎙️ STT Config:');
    console.log('   Transcriber:', assistant.transcriber);
    console.log('');
    
    console.log('🎤 TTS Config:');
    console.log('   Voice Provider:', assistant.voiceProvider);
    console.log('   Voice Model:', assistant.voiceModel);
    console.log('   Voice ID:', assistant.voiceId);
    console.log('');
    
    console.log('💬 First Message:');
    console.log('   Mode:', assistant.firstMessageMode);
    console.log('   Message:', assistant.firstMessage);
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📞 TRANSFER SETTINGS (CRITICAL FOR HUMAN TRANSFER):');
    console.log('═══════════════════════════════════════════════════════════');
    
    if (assistant.transferSettings) {
      console.log('✅ Transfer settings FOUND in database!');
      console.log('');
      console.log('   Country Code:', assistant.transferSettings.countryCode || 'NOT SET');
      console.log('   Phone Number:', assistant.transferSettings.phoneNumber || 'NOT SET');
      console.log('   End Call Enabled:', assistant.transferSettings.endCallEnabled || false);
      console.log('   Dial Keypad Enabled:', assistant.transferSettings.dialKeypadEnabled || false);
      console.log('');
      
      if (assistant.transferSettings.phoneNumber) {
        const fullNumber = `${assistant.transferSettings.countryCode || ''}${assistant.transferSettings.phoneNumber}`;
        console.log('📱 Full Phone Number:', fullNumber);
        console.log('');
        console.log('✅ HUMAN TRANSFER SHOULD WORK!');
        console.log('   When user says "connect me to a human", system will call:', fullNumber);
      } else {
        console.log('❌ PHONE NUMBER NOT SET!');
        console.log('   Human transfer will NOT work until phone number is added.');
      }
    } else {
      console.log('❌ Transfer settings NOT FOUND in database!');
      console.log('');
      console.log('🔧 TO FIX:');
      console.log('   1. Go to http://localhost:3000/assistants');
      console.log('   2. Click on "yogi" assistant');
      console.log('   3. Go to "Tools" tab');
      console.log('   4. Enter phone number: 9548744216');
      console.log('   5. Select country code: +91');
      console.log('   6. Click "Publish" button');
      console.log('   7. Run this script again to verify');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    console.log('📄 FULL ASSISTANT OBJECT (JSON):');
    console.log(JSON.stringify(assistant, null, 2));
    console.log('');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('💡 POSSIBLE ISSUES:');
    console.error('   1. MongoDB connection failed (check .env file)');
    console.error('   2. IP not whitelisted in MongoDB Atlas');
    console.error('   3. Database credentials incorrect');
    console.error('');
    process.exit(1);
  }
}

checkAssistantConfig();
