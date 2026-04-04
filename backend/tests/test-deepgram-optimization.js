/**
 * Test Deepgram Streaming Optimization
 * Tests the new persistent WebSocket connection for reduced STT latency
 */

require('dotenv').config();
const DeepgramStreamingService = require('../services/deepgramStreamingService');

async function testDeepgramOptimization() {
  console.log('🧪 Testing Deepgram Streaming Optimization');
  console.log('==========================================');
  
  const deepgram = new DeepgramStreamingService();
  
  try {
    // Test 1: First session (should establish connection)
    console.log('\n📋 Test 1: First Session (Connection Establishment)');
    console.log('---------------------------------------------------');
    
    const test1Start = Date.now();
    let firstTranscriptTime = null;
    let transcriptCount = 0;
    
    const session1 = await deepgram.startSession({
      model: 'nova-2',
      language: 'en-US',
      encoding: 'linear16',
      sampleRate: 16000,
      endpointing: 50
    });
    
    const connectionTime = Date.now() - test1Start;
    console.log(`🔌 Session 1 ready in: ${connectionTime}ms`);
    
    session1.onTranscript((data) => {
      transcriptCount++;
      if (!firstTranscriptTime && data.transcript && data.transcript.trim().length > 0) {
        firstTranscriptTime = Date.now() - test1Start;
        console.log(`🎵 First transcript received in: ${firstTranscriptTime}ms`);
        console.log(`📝 Content: "${data.transcript}"`);
      }
    });
    
    // Generate test audio (simple sine wave)
    const generateTestAudio = (durationSeconds = 1) => {
      const sampleRate = 16000;
      const samples = sampleRate * durationSeconds;
      const audioBuffer = Buffer.alloc(samples * 2);
      
      for (let i = 0; i < samples; i++) {
        const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 16000;
        audioBuffer.writeInt16LE(sample, i * 2);
      }
      
      return audioBuffer;
    };
    
    // Send test audio
    const testAudio = generateTestAudio(1);
    session1.sendAudio(testAudio);
    session1.finish();
    
    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`✅ Test 1 completed - Connection: ${connectionTime}ms, Transcripts: ${transcriptCount}`);
    
    // Test 2: Second session (should reuse connection)
    console.log('\n📋 Test 2: Second Session (Connection Reuse)');
    console.log('---------------------------------------------');
    
    const test2Start = Date.now();
    let secondFirstTranscriptTime = null;
    let secondTranscriptCount = 0;
    
    const session2 = await deepgram.startSession({
      model: 'nova-2',
      language: 'en-US',
      encoding: 'linear16',
      sampleRate: 16000,
      endpointing: 50
    });
    
    const connection2Time = Date.now() - test2Start;
    console.log(`🔌 Session 2 ready in: ${connection2Time}ms`);
    
    session2.onTranscript((data) => {
      secondTranscriptCount++;
      if (!secondFirstTranscriptTime && data.transcript && data.transcript.trim().length > 0) {
        secondFirstTranscriptTime = Date.now() - test2Start;
        console.log(`🎵 First transcript received in: ${secondFirstTranscriptTime}ms`);
        console.log(`📝 Content: "${data.transcript}"`);
      }
    });
    
    // Send test audio
    session2.sendAudio(testAudio);
    session2.finish();
    
    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`✅ Test 2 completed - Connection: ${connection2Time}ms, Transcripts: ${secondTranscriptCount}`);
    
    // Test 3: Multiple concurrent sessions
    console.log('\n📋 Test 3: Concurrent Sessions');
    console.log('-------------------------------');
    
    const concurrentStart = Date.now();
    const promises = [];
    
    for (let i = 1; i <= 3; i++) {
      promises.push(
        (async () => {
          const session = await deepgram.startSession();
          console.log(`✅ Concurrent session ${i} ready`);
          session.sendAudio(testAudio);
          session.finish();
        })()
      );
    }
    
    await Promise.all(promises);
    const concurrentTime = Date.now() - concurrentStart;
    console.log(`✅ All concurrent sessions completed in: ${concurrentTime}ms`);
    
    // Results Summary
    console.log('\n📊 Optimization Results');
    console.log('=======================');
    console.log(`First session connection: ${connectionTime}ms`);
    console.log(`Second session connection: ${connection2Time}ms`);
    
    if (connection2Time < connectionTime) {
      const improvement = Math.round(((connectionTime - connection2Time) / connectionTime) * 100);
      console.log(`Improvement: ${improvement}% faster connection reuse`);
    }
    
    // Compare with browser call results
    console.log('\n🔍 Comparison with Browser Call');
    console.log('===============================');
    console.log('Browser call STT latency: 1921ms');
    console.log(`Optimized connection setup: ${connectionTime}ms`);
    console.log(`Optimized connection reuse: ${connection2Time}ms`);
    
    if (connection2Time < 500) {
      console.log('🎉 OPTIMIZATION SUCCESS! Connection reuse under 500ms');
    } else if (connection2Time < 1000) {
      console.log('✅ Good optimization! Connection reuse under 1 second');
    } else {
      console.log('⚠️ Still room for improvement');
    }
    
    // Status check
    const status = deepgram.getStatus();
    console.log('\n📋 Service Status');
    console.log('=================');
    console.log(`Connected: ${status.isConnected}`);
    console.log(`Active sessions: ${status.activeSessions}`);
    console.log(`Reconnect attempts: ${status.reconnectAttempts}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    deepgram.close();
    console.log('\n🧹 Cleanup completed');
  }
}

// Test connection persistence across multiple operations
async function testConnectionPersistence() {
  console.log('\n🔄 Testing Connection Persistence');
  console.log('=================================');
  
  const deepgram = new DeepgramStreamingService();
  
  try {
    // Rapid succession of sessions to test persistence
    for (let i = 1; i <= 5; i++) {
      const start = Date.now();
      const session = await deepgram.startSession();
      const time = Date.now() - start;
      
      console.log(`Session ${i}: ${time}ms ${time < 100 ? '(REUSED!)' : '(NEW CONNECTION)'}`);
      session.finish();
      
      // Small delay between sessions
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (error) {
    console.error('❌ Persistence test failed:', error);
  } finally {
    deepgram.close();
  }
}

// Run the tests
if (require.main === module) {
  (async () => {
    await testDeepgramOptimization();
    await testConnectionPersistence();
  })().catch(console.error);
}

module.exports = { testDeepgramOptimization, testConnectionPersistence };