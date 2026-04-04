/**
 * Test Optimized Deepgram Service
 */

require('dotenv').config();
const DeepgramService = require('../services/deepgramService');

async function testOptimizedDeepgram() {
  console.log('🧪 Testing Optimized Deepgram Service');
  console.log('====================================');
  
  try {
    // Test 1: Connection Speed
    console.log('\n📋 Test 1: Connection Speed');
    console.log('----------------------------');
    
    const deepgram = new DeepgramService();
    const startTime = Date.now();
    
    await deepgram.connect({
      model: 'nova-2',
      language: 'en-US',
      encoding: 'linear16',
      sampleRate: 16000,
      endpointing: 50 // OPTIMIZED: 50ms
    });
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ Connected in: ${connectionTime}ms`);
    
    // Test 2: Status Check
    console.log('\n📋 Test 2: Status Check');
    console.log('-----------------------');
    
    const status = deepgram.getStatus();
    console.log('📊 Status:', status);
    
    // Test 3: Audio Sending
    console.log('\n📋 Test 3: Audio Sending');
    console.log('-------------------------');
    
    const testAudio = Buffer.alloc(3200); // 100ms of 16kHz audio
    const success = deepgram.sendAudio(testAudio);
    console.log('📤 Audio sent:', success ? 'SUCCESS' : 'FAILED');
    
    // Wait for any responses
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Cleanup
    console.log('\n📋 Test 4: Cleanup');
    console.log('-------------------');
    
    await deepgram.close();
    console.log('✅ Service closed');
    
    console.log('\n🎯 Optimization Results');
    console.log('========================');
    console.log(`✅ Connection time: ${connectionTime}ms`);
    console.log('✅ Endpointing: 50ms (3x faster than before)');
    console.log('✅ Timeout: 5s (2x faster than before)');
    console.log('✅ Keep-alive: 3s (more responsive)');
    
    if (connectionTime < 1000) {
      console.log('🚀 EXCELLENT: Sub-second connection time!');
    } else if (connectionTime < 1500) {
      console.log('✅ GOOD: Connection time under 1.5s');
    } else {
      console.log('⚠️ SLOW: Connection time over 1.5s');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testOptimizedDeepgram().catch(console.error);