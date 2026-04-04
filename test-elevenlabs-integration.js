/**
 * Test ElevenLabs Integration
 * Run this to verify the integration is working
 */

const elevenLabsService = require('./backend/services/elevenLabsService');

async function testElevenLabsIntegration() {
  console.log('🧪 Testing ElevenLabs Integration...\n');
  
  // Test 1: Service availability
  console.log('1. Testing service availability...');
  const isAvailable = elevenLabsService.isAvailable();
  console.log(`   Service available: ${isAvailable ? '✅ YES' : '❌ NO'}`);
  
  if (!isAvailable) {
    console.log('   ❌ ElevenLabs service not available - check API key in .env');
    return;
  }
  
  // Test 2: Fetch voices
  try {
    console.log('\n2. Testing voice fetching...');
    const voices = await elevenLabsService.getVoices();
    console.log(`   ✅ Fetched ${voices.length} voices`);
    console.log(`   Sample voices: ${voices.slice(0, 3).map(v => v.name).join(', ')}`);
  } catch (error) {
    console.log(`   ❌ Voice fetching failed: ${error.message}`);
  }
  
  // Test 3: Fetch models
  try {
    console.log('\n3. Testing model fetching...');
    const models = await elevenLabsService.getModels();
    console.log(`   ✅ Fetched ${models.length} models`);
    console.log(`   Sample models: ${models.slice(0, 3).map(m => m.name).join(', ')}`);
  } catch (error) {
    console.log(`   ❌ Model fetching failed: ${error.message}`);
  }
  
  // Test 4: Test TTS (small sample)
  try {
    console.log('\n4. Testing speech synthesis...');
    const audioStream = await elevenLabsService.synthesizeSpeech(
      'Hello, this is a test.',
      '21m00Tcm4TlvDq8ikWAM', // Rachel voice
      'eleven_monolingual_v1'
    );
    console.log(`   ✅ Speech synthesis successful`);
    console.log(`   Audio stream type: ${typeof audioStream}`);
  } catch (error) {
    console.log(`   ❌ Speech synthesis failed: ${error.message}`);
  }
  
  console.log('\n🎯 Integration test complete!');
}

// Run the test
testElevenLabsIntegration().catch(console.error);