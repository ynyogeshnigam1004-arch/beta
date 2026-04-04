/**
 * ULTIMATE Deepgram Streaming Latency Test
 * Tests multiple strategies to achieve absolute minimum latency
 */

require('dotenv').config();
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const fs = require('fs');

if (!process.env.DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY not found');
  process.exit(1);
}

console.log('⚡ ULTIMATE Deepgram Streaming Latency Test');
console.log('============================================\n');
console.log('🎯 Goal: Find absolute minimum latency possible\n');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Load test audio
let audioFile;
if (fs.existsSync('test-audio-fix.wav')) {
  audioFile = 'test-audio-fix.wav';
} else if (fs.existsSync('test-voice-quality.mp3')) {
  audioFile = 'test-voice-quality.mp3';
} else {
  console.error('❌ No test audio file found');
  process.exit(1);
}

const audioBuffer = fs.readFileSync(audioFile);
console.log('📂 Audio file:', audioFile);
console.log('📦 File size:', audioBuffer.length, 'bytes\n');

/**
 * Test 1: Aggressive streaming (100ms chunks)
 */
async function testAggressiveStreaming() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 TEST 1: Aggressive Streaming (100ms chunks)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return new Promise((resolve) => {
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true
    });
    
    let streamStartTime;
    let firstTranscriptTime;
    let firstInterimTime;
    let chunksSent = 0;
    
    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('❌ Connection error:', error);
      resolve({
        name: 'Aggressive (100ms chunks)',
        chunkSize: '100ms',
        firstInterim: null,
        firstFinal: null,
        chunksSent: 0,
        error: error.message
      });
    });
    
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('✅ Connected\n');
      streamStartTime = Date.now();
      
      // Send 100ms chunks (very aggressive)
      const chunkSize = 4800; // ~100ms at 48kHz
      let offset = 0;
      
      const sendChunk = () => {
        if (offset >= audioBuffer.length) {
          connection.finish();
          return;
        }
        
        const chunk = audioBuffer.slice(offset, offset + chunkSize);
        connection.send(chunk);
        chunksSent++;
        
        offset += chunkSize;
        setTimeout(sendChunk, 100); // 100ms interval
      };
      
      sendChunk();
    });
    
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (!transcript || transcript.trim().length === 0) return;
      
      const now = Date.now();
      
      if (!firstInterimTime) {
        firstInterimTime = now;
        const latency = now - streamStartTime;
        console.log(`⚡ FIRST INTERIM: ${latency}ms - "${transcript}"`);
      }
      
      if ((data.is_final || data.speech_final) && !firstTranscriptTime) {
        firstTranscriptTime = now;
        const latency = now - streamStartTime;
        console.log(`✅ FIRST FINAL: ${latency}ms - "${transcript}"\n`);
      }
    });
    
    connection.on(LiveTranscriptionEvents.Close, () => {
      const result = {
        name: 'Aggressive (100ms chunks)',
        chunkSize: '100ms',
        firstInterim: firstInterimTime ? firstInterimTime - streamStartTime : null,
        firstFinal: firstTranscriptTime ? firstTranscriptTime - streamStartTime : null,
        chunksSent
      };
      resolve(result);
    });
    
    setTimeout(() => connection.keepAlive(), 3000);
  });
}

/**
 * Test 2: Balanced streaming (250ms chunks - VAPI style)
 */
async function testBalancedStreaming() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 TEST 2: Balanced Streaming (250ms chunks - VAPI)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return new Promise((resolve) => {
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true
    });
    
    let streamStartTime;
    let firstTranscriptTime;
    let firstInterimTime;
    let chunksSent = 0;
    
    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('❌ Connection error:', error);
      resolve({
        name: 'Balanced (250ms chunks)',
        chunkSize: '250ms',
        firstInterim: null,
        firstFinal: null,
        chunksSent: 0,
        error: error.message
      });
    });
    
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('✅ Connected\n');
      streamStartTime = Date.now();
      
      // Send 250ms chunks (VAPI standard)
      const chunkSize = 12000; // ~250ms at 48kHz
      let offset = 0;
      
      const sendChunk = () => {
        if (offset >= audioBuffer.length) {
          connection.finish();
          return;
        }
        
        const chunk = audioBuffer.slice(offset, offset + chunkSize);
        connection.send(chunk);
        chunksSent++;
        
        offset += chunkSize;
        setTimeout(sendChunk, 250); // 250ms interval
      };
      
      sendChunk();
    });
    
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (!transcript || transcript.trim().length === 0) return;
      
      const now = Date.now();
      
      if (!firstInterimTime) {
        firstInterimTime = now;
        const latency = now - streamStartTime;
        console.log(`⚡ FIRST INTERIM: ${latency}ms - "${transcript}"`);
      }
      
      if ((data.is_final || data.speech_final) && !firstTranscriptTime) {
        firstTranscriptTime = now;
        const latency = now - streamStartTime;
        console.log(`✅ FIRST FINAL: ${latency}ms - "${transcript}"\n`);
      }
    });
    
    connection.on(LiveTranscriptionEvents.Close, () => {
      const result = {
        name: 'Balanced (250ms chunks)',
        chunkSize: '250ms',
        firstInterim: firstInterimTime ? firstInterimTime - streamStartTime : null,
        firstFinal: firstTranscriptTime ? firstTranscriptTime - streamStartTime : null,
        chunksSent
      };
      resolve(result);
    });
    
    setTimeout(() => connection.keepAlive(), 3000);
  });
}

/**
 * Test 3: Burst streaming (send all immediately)
 */
async function testBurstStreaming() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 TEST 3: Burst Streaming (all at once)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return new Promise((resolve) => {
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true
    });
    
    let streamStartTime;
    let firstTranscriptTime;
    let firstInterimTime;
    let chunksSent = 0;
    
    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('❌ Connection error:', error);
      resolve({
        name: 'Burst (all at once)',
        chunkSize: '1s chunks',
        firstInterim: null,
        firstFinal: null,
        chunksSent: 0,
        error: error.message
      });
    });
    
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('✅ Connected\n');
      streamStartTime = Date.now();
      
      // Send in large chunks immediately
      const chunkSize = 48000; // ~1 second chunks
      let offset = 0;
      
      while (offset < audioBuffer.length) {
        const chunk = audioBuffer.slice(offset, offset + chunkSize);
        connection.send(chunk);
        chunksSent++;
        offset += chunkSize;
      }
      
      console.log(`📤 Sent ${chunksSent} chunks immediately\n`);
      
      setTimeout(() => connection.finish(), 2000);
    });
    
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (!transcript || transcript.trim().length === 0) return;
      
      const now = Date.now();
      
      if (!firstInterimTime) {
        firstInterimTime = now;
        const latency = now - streamStartTime;
        console.log(`⚡ FIRST INTERIM: ${latency}ms - "${transcript}"`);
      }
      
      if ((data.is_final || data.speech_final) && !firstTranscriptTime) {
        firstTranscriptTime = now;
        const latency = now - streamStartTime;
        console.log(`✅ FIRST FINAL: ${latency}ms - "${transcript}"\n`);
      }
    });
    
    connection.on(LiveTranscriptionEvents.Close, () => {
      const result = {
        name: 'Burst (all at once)',
        chunkSize: '1s chunks',
        firstInterim: firstInterimTime ? firstInterimTime - streamStartTime : null,
        firstFinal: firstTranscriptTime ? firstTranscriptTime - streamStartTime : null,
        chunksSent
      };
      resolve(result);
    });
    
    setTimeout(() => connection.keepAlive(), 3000);
  });
}

/**
 * Test 4: Ultra-fast streaming (50ms chunks)
 */
async function testUltraFastStreaming() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 TEST 4: Ultra-Fast Streaming (50ms chunks)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return new Promise((resolve) => {
    const connection = deepgram.listen.live({
      model: 'nova-2',
      language: 'en-US',
      smart_format: true,
      interim_results: true
    });
    
    let streamStartTime;
    let firstTranscriptTime;
    let firstInterimTime;
    let chunksSent = 0;
    
    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('❌ Connection error:', error);
      resolve({
        name: 'Ultra-Fast (50ms chunks)',
        chunkSize: '50ms',
        firstInterim: null,
        firstFinal: null,
        chunksSent: 0,
        error: error.message
      });
    });
    
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('✅ Connected\n');
      streamStartTime = Date.now();
      
      // Send 50ms chunks (ultra aggressive)
      const chunkSize = 2400; // ~50ms at 48kHz
      let offset = 0;
      
      const sendChunk = () => {
        if (offset >= audioBuffer.length) {
          connection.finish();
          return;
        }
        
        const chunk = audioBuffer.slice(offset, offset + chunkSize);
        connection.send(chunk);
        chunksSent++;
        
        offset += chunkSize;
        setTimeout(sendChunk, 50); // 50ms interval
      };
      
      sendChunk();
    });
    
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (!transcript || transcript.trim().length === 0) return;
      
      const now = Date.now();
      
      if (!firstInterimTime) {
        firstInterimTime = now;
        const latency = now - streamStartTime;
        console.log(`⚡ FIRST INTERIM: ${latency}ms - "${transcript}"`);
      }
      
      if ((data.is_final || data.speech_final) && !firstTranscriptTime) {
        firstTranscriptTime = now;
        const latency = now - streamStartTime;
        console.log(`✅ FIRST FINAL: ${latency}ms - "${transcript}"\n`);
      }
    });
    
    connection.on(LiveTranscriptionEvents.Close, () => {
      const result = {
        name: 'Ultra-Fast (50ms chunks)',
        chunkSize: '50ms',
        firstInterim: firstInterimTime ? firstInterimTime - streamStartTime : null,
        firstFinal: firstTranscriptTime ? firstTranscriptTime - streamStartTime : null,
        chunksSent
      };
      resolve(result);
    });
    
    setTimeout(() => connection.keepAlive(), 3000);
  });
}

/**
 * Run all tests and compare
 */
async function runAllTests() {
  const results = [];
  
  // Run each test with delay between
  results.push(await testAggressiveStreaming());
  await new Promise(r => setTimeout(r, 2000));
  
  results.push(await testBalancedStreaming());
  await new Promise(r => setTimeout(r, 2000));
  
  results.push(await testBurstStreaming());
  await new Promise(r => setTimeout(r, 2000));
  
  results.push(await testUltraFastStreaming());
  
  // Display comparison
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('                    📊 FINAL RESULTS                        ');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('Strategy                    | Chunk Size | First Interim | First Final | Chunks');
  console.log('----------------------------|------------|---------------|-------------|--------');
  
  results.forEach(r => {
    const name = r.name.padEnd(27);
    const chunk = r.chunkSize.padEnd(10);
    const interim = r.firstInterim ? `${r.firstInterim}ms`.padEnd(13) : 'N/A'.padEnd(13);
    const final = r.firstFinal ? `${r.firstFinal}ms`.padEnd(11) : 'N/A'.padEnd(11);
    const chunks = r.chunksSent.toString();
    
    console.log(`${name} | ${chunk} | ${interim} | ${final} | ${chunks}`);
  });
  
  // Find best result
  const validResults = results.filter(r => r.firstInterim);
  if (validResults.length > 0) {
    const fastest = validResults.reduce((min, r) => 
      r.firstInterim < min.firstInterim ? r : min
    );
    
    console.log('\n' + '═'.repeat(63));
    console.log(`🏆 FASTEST: ${fastest.name}`);
    console.log(`⚡ Latency: ${fastest.firstInterim}ms (first interim)`);
    console.log(`✅ Latency: ${fastest.firstFinal}ms (first final)`);
    console.log('═'.repeat(63));
    
    console.log('\n💡 Recommendations:');
    if (fastest.firstInterim < 300) {
      console.log('   ✅ EXCELLENT: Matches VAPI-level performance!');
    } else if (fastest.firstInterim < 500) {
      console.log('   ✅ VERY GOOD: Close to VAPI performance');
    } else if (fastest.firstInterim < 700) {
      console.log('   ✅ GOOD: Acceptable for production');
    } else {
      console.log('   ⚠️ ACCEPTABLE: Slower than target but usable');
    }
    
    console.log(`\n🎯 Use ${fastest.chunkSize} chunks for optimal latency`);
    console.log(`📊 Expected system latency: ~${Math.round(fastest.firstInterim + 400 + 500)}ms total`);
    console.log('   (STT: ' + fastest.firstInterim + 'ms + LLM: 400ms + TTS: 500ms)');
  }
  
  process.exit(0);
}

// Run all tests
runAllTests().catch(console.error);
