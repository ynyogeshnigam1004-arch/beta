/**
 * Diagnose TTS Configuration
 * Run: node diagnose-tts.js
 */

require('dotenv').config();
const database = require('./config/database');

async function diagnose() {
  console.log('🔍 Voice AI Platform - TTS Diagnostic Tool\n');
  console.log('='.repeat(60));
  console.log('\n');
  
  // 1. Check Environment Variables
  console.log('1️⃣  ENVIRONMENT VARIABLES\n');
  
  const checks = [
    { name: 'ELEVENLABS_API_KEY', value: process.env.ELEVENLABS_API_KEY, required: false },
    { name: 'CARTESIA_API_KEY', value: process.env.CARTESIA_API_KEY, required: false },
    { name: 'GROQ_API_KEY', value: process.env.GROQ_API_KEY, required: true },
    { name: 'MONGODB_URI', value: process.env.MONGODB_URI, required: true }
  ];
  
  checks.forEach(check => {
    if (check.value) {
      const masked = check.value.substring(0, 8) + '...' + check.value.slice(-4);
      console.log(`   ✅ ${check.name}: ${masked}`);
    } else {
      const status = check.required ? '❌' : '⚠️ ';
      console.log(`   ${status} ${check.name}: Not set`);
    }
  });
  
  console.log('\n');
  
  // 2. Check TTS Services
  console.log('2️⃣  TTS SERVICES\n');
  
  try {
    const ElevenLabsService = require('./services/elevenLabsService');
    const elevenLabsAvailable = ElevenLabsService.isAvailable();
    console.log(`   ${elevenLabsAvailable ? '✅' : '❌'} ElevenLabs: ${elevenLabsAvailable ? 'Available' : 'Not configured'}`);
  } catch (error) {
    console.log(`   ❌ ElevenLabs: Error loading service - ${error.message}`);
  }
  
  try {
    const CartesiaService = require('./services/cartesiaService');
    const cartesiaService = new CartesiaService();
    const cartesiaAvailable = !!process.env.CARTESIA_API_KEY;
    console.log(`   ${cartesiaAvailable ? '✅' : '❌'} Cartesia: ${cartesiaAvailable ? 'Available' : 'Not configured'}`);
  } catch (error) {
    console.log(`   ❌ Cartesia: Error loading service - ${error.message}`);
  }
  
  console.log('\n');
  
  // 3. Check Database and Assistants
  console.log('3️⃣  DATABASE & ASSISTANTS\n');
  
  try {
    await database.connectDB();
    console.log('   ✅ MongoDB: Connected');
    
    const collection = database.getCollection('assistants');
    const assistants = await collection.find({}).toArray();
    
    console.log(`   📋 Assistants found: ${assistants.length}\n`);
    
    if (assistants.length > 0) {
      assistants.forEach((asst, index) => {
        console.log(`   ${index + 1}. ${asst.name || 'Unnamed'}`);
        console.log(`      ID: ${asst.id}`);
        console.log(`      Provider: ${asst.voiceProvider || '❌ Not set'}`);
        console.log(`      Model: ${asst.voiceModel || '❌ Not set'}`);
        console.log(`      Voice ID: ${asst.voiceId || '❌ Not set'}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No assistants configured yet');
    }
    
  } catch (error) {
    console.log(`   ❌ MongoDB: ${error.message}`);
  }
  
  console.log('\n');
  
  // 4. Recommendations
  console.log('4️⃣  RECOMMENDATIONS\n');
  
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  const hasCartesia = !!process.env.CARTESIA_API_KEY;
  
  if (!hasElevenLabs && !hasCartesia) {
    console.log('   ⚠️  No TTS provider configured!');
    console.log('   → Add ELEVENLABS_API_KEY or CARTESIA_API_KEY to .env');
  } else if (hasElevenLabs && hasCartesia) {
    console.log('   ✅ Both TTS providers available!');
    console.log('   → Use: node switch-tts-provider.js [elevenlabs|cartesia]');
  } else if (hasElevenLabs) {
    console.log('   ✅ ElevenLabs configured');
    console.log('   → Use: node update-assistant-to-elevenlabs.js');
  } else if (hasCartesia) {
    console.log('   ✅ Cartesia configured');
    console.log('   → Use: node switch-tts-provider.js cartesia');
  }
  
  console.log('\n');
  console.log('='.repeat(60));
  console.log('\n📚 Documentation: See ELEVENLABS_WEBSOCKET_STREAMING_FIXED.md');
  console.log('🧪 Test: node test-elevenlabs-ws.js');
  console.log('\n');
  
  process.exit(0);
}

diagnose().catch(error => {
  console.error('❌ Diagnostic failed:', error.message);
  process.exit(1);
});
