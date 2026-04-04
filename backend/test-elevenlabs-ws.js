/**
 * Test ElevenLabs WebSocket Streaming
 * Run: node test-elevenlabs-ws.js
 */

require('dotenv').config();
const ElevenLabsStreamingService = require('./services/elevenLabsStreamingService');
const fs = require('fs');

async function testWebSocketStreaming() {
  console.log('🧪 Testing ElevenLabs WebSocket Streaming...\n');
  
  // Check API key
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('❌ ELEVENLABS_API_KEY not found in .env file');
    process.exit(1);
  }
  
  console.log(`✅ API Key found: ${process.env.ELEVENLABS_API_KEY.substring(0, 8)}...`);
  
  const service = new ElevenLabsStreamingService();
  const audioChunks = [];
  let chunkCount = 0;
  
  // Set up event listeners
  service.on('connected', () => {
    console.log('✅ Connected to ElevenLabs WebSocket\n');
  });
  
  service.on('audio', (chunk) => {
    chunkCount++;
    audioChunks.push(chunk);
    console.log(`📦 Chunk ${chunkCount}: ${chunk.length} bytes`);
  });
  
  service.on('complete', () => {
    console.log('\n✅ Streaming complete!');
    console.log(`📊 Total chunks: ${chunkCount}`);
    console.log(`📊 Total size: ${audioChunks.reduce((sum, c) => sum + c.length, 0)} bytes`);
    
    // Save to file
    const outputFile = './test-elevenlabs-output.mp3';
    const audioBuffer = Buffer.concat(audioChunks);
    fs.writeFileSync(outputFile, audioBuffer);
    console.log(`💾 Saved audio to: ${outputFile}`);
    
    service.disconnect();
    process.exit(0);
  });
  
  service.on('error', (error) => {
    console.error('❌ Error:', error.message);
    service.disconnect();
    process.exit(1);
  });
  
  try {
    // Test configuration
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const modelId = 'eleven_flash_v2_5'; // Fast model
    const testText = 'Hello! This is a test of ElevenLabs WebSocket streaming. The audio should arrive in real-time chunks.';
    
    console.log(`🎤 Voice ID: ${voiceId}`);
    console.log(`🤖 Model: ${modelId}`);
    console.log(`📝 Text: "${testText}"\n`);
    
    // Connect
    console.log('🔌 Connecting...');
    await service.connect(voiceId, modelId, {
      stability: 0.5,
      similarity_boost: 0.8,
      use_speaker_boost: false
    });
    
    // Stream text
    console.log('📤 Streaming text...\n');
    await service.streamText(testText);
    
    // End stream
    console.log('🏁 Ending stream...');
    await service.endStream();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    service.disconnect();
    process.exit(1);
  }
}

// Run test
testWebSocketStreaming();
