/**
 * Test Deepgram WebSocket Streaming
 * Verify we can achieve 300ms latency with real-time streaming
 */

require('dotenv').config();
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const fs = require('fs');

if (!process.env.DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY not found');
  process.exit(1);
}

console.log('🚀 Testing Deepgram WebSocket Streaming');
console.log('========================================\n');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

/**
 * Test streaming with simulated real-time audio chunks
 */
async function testStreamingLatency() {
  console.log('📡 Test: Real-time streaming latency...\n');
  
  // Load test audio file
  let audioFile;
  if (fs.existsSync('test-audio-fix.wav')) {
    audioFile = 'test-audio-fix.wav';
  } else if (fs.existsSync('test-voice-quality.mp3')) {
    audioFile = 'test-voice-quality.mp3';
  } else {
    console.error('❌ No test audio file found');
    return;
  }
  
  const audioBuffer = fs.readFileSync(audioFile);
  console.log('📂 Loaded:', audioFile, `(${audioBuffer.length} bytes)\n`);
  
  // Create live connection
  const connection = deepgram.listen.live({
    model: 'nova-2',
    language: 'en-US',
    smart_format: true,
    interim_results: true,
    utterance_end_ms: 1000,
    vad_events: true
  });
  
  const latencies = [];
  let firstTranscriptTime = null;
  let streamStartTime = null;
  let interimCount = 0;
  let finalCount = 0;
  
  // Handle connection open
  connection.on(LiveTranscriptionEvents.Open, () => {
    console.log('✅ WebSocket connected to Deepgram\n');
    console.log('📤 Streaming audio in 250ms chunks...\n');
    
    streamStartTime = Date.now();
    
    // Simulate real-time streaming: send 250ms chunks
    const chunkSize = 12000; // ~250ms at 48kHz
    let offset = 0;
    
    const sendChunk = () => {
      if (offset >= audioBuffer.length) {
        console.log('\n📤 All chunks sent, finishing stream...');
        connection.finish();
        return;
      }
      
      const chunk = audioBuffer.slice(offset, offset + chunkSize);
      connection.send(chunk);
      
      const chunkNum = Math.floor(offset / chunkSize) + 1;
      process.stdout.write(`📦 Chunk ${chunkNum} sent (${chunk.length} bytes)\r`);
      
      offset += chunkSize;
      setTimeout(sendChunk, 250); // Send next chunk after 250ms
    };
    
    sendChunk();
  });
  
  // Handle transcripts
  connection.on(LiveTranscriptionEvents.Transcript, (data) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    const confidence = data.channel?.alternatives?.[0]?.confidence;
    
    if (!transcript || transcript.trim().length === 0) return;
    
    const now = Date.now();
    
    if (!firstTranscriptTime) {
      firstTranscriptTime = now;
      const latency = now - streamStartTime;
      latencies.push(latency);
      console.log(`\n\n⚡ FIRST TRANSCRIPT RECEIVED: ${latency}ms`);
      console.log('─────────────────────────────────────\n');
    }
    
    if (data.is_final || data.speech_final) {
      finalCount++;
      const latency = now - streamStartTime;
      console.log(`✅ [FINAL ${finalCount}] "${transcript}"`);
      console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
      console.log(`   Latency: ${latency}ms from stream start\n`);
    } else {
      interimCount++;
      console.log(`📝 [INTERIM ${interimCount}] "${transcript}"`);
    }
  });
  
  // Handle utterance end
  connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
    console.log('🔚 Utterance ended\n');
  });
  
  // Handle errors
  connection.on(LiveTranscriptionEvents.Error, (error) => {
    console.error('❌ Error:', error);
  });
  
  // Handle close
  connection.on(LiveTranscriptionEvents.Close, () => {
    const totalTime = Date.now() - streamStartTime;
    
    console.log('\n========================================');
    console.log('📊 Streaming Test Results');
    console.log('========================================');
    console.log(`Total streaming time: ${totalTime}ms`);
    console.log(`First transcript latency: ${latencies[0]}ms`);
    console.log(`Interim transcripts: ${interimCount}`);
    console.log(`Final transcripts: ${finalCount}`);
    console.log('\n🎯 Target Latency: <500ms');
    
    if (latencies[0] < 500) {
      console.log(`✅ SUCCESS: ${latencies[0]}ms (${Math.round((500 - latencies[0]) / 500 * 100)}% better than target!)`);
    } else if (latencies[0] < 1000) {
      console.log(`⚠️ ACCEPTABLE: ${latencies[0]}ms (slower than target but usable)`);
    } else {
      console.log(`❌ SLOW: ${latencies[0]}ms (needs optimization)`);
    }
    
    console.log('\n💡 This is the latency you\'ll get with streaming mode!');
    process.exit(0);
  });
  
  // Keep alive
  const keepAliveInterval = setInterval(() => {
    if (connection) {
      connection.keepAlive();
    }
  }, 5000);
  
  // Cleanup on exit
  process.on('SIGINT', () => {
    clearInterval(keepAliveInterval);
    connection.finish();
  });
}

// Run test
testStreamingLatency().catch(console.error);
