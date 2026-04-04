require('dotenv').config();
const { getAllAssistants } = require('./models/Assistant');
const { connectDB } = require('./config/database');

async function checkAssistants() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('📋 Fetching all assistants...');
    const assistants = await getAllAssistants();
    
    console.log(`\n✅ Found ${assistants.length} assistants:\n`);
    
    assistants.forEach((asst, index) => {
      console.log(`${index + 1}. ${asst.name}`);
      console.log(`   ID: ${asst.id}`);
      console.log(`   Status: ${asst.status}`);
      console.log(`   LLM: ${asst.llmModel}`);
      console.log(`   STT: ${asst.sttProvider || 'groq'} - ${asst.sttModel}`);
      console.log(`   TTS: ${asst.ttsProvider} - ${asst.ttsModel}`);
      console.log(`   Voice: ${asst.voiceId}`);
      console.log(`   Greeting: ${asst.greeting?.substring(0, 50)}...`);
      console.log('');
    });
    
    console.log('\n📞 INBOUND CALL BEHAVIOR:');
    console.log('When you call, the code will:');
    console.log('1. Try to find assistants with status="active"');
    console.log('2. Use the FIRST active assistant found');
    console.log('3. If no active assistant, use default config (Cartesia TTS)');
    
    const activeAssistants = assistants.filter(a => a.status === 'active');
    if (activeAssistants.length > 0) {
      console.log(`\n✅ Active assistant that will be used: "${activeAssistants[0].name}"`);
      console.log(`   TTS Provider: ${activeAssistants[0].ttsProvider}`);
      console.log(`   TTS Model: ${activeAssistants[0].ttsModel}`);
    } else {
      console.log('\n⚠️ No active assistants found!');
      console.log('   Will use default config with Cartesia TTS (which is failing)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAssistants();
