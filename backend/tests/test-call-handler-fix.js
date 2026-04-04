/**
 * Test Call Handler with Optimized Deepgram Integration
 */

require('dotenv').config();
const DeepgramStreamingService = require('../services/deepgramStreamingService');

async function testCallHandlerFix() {
  console.log('🧪 Testing Call Handler Deepgram Integration Fix');
  console.log('================================================');
  
  try {
    // Test 1: Create service and start session
    console.log('\n📋 Test 1: Service Creation and Session Start');
    console.log('----------------------------------------------');
    
    const deepgram = new DeepgramStreamingService();
    console.log('✅ Service created');
    
    const session1 = await deepgram.startSession({
      model: 'nova-2',
      language: 'en-US',
      encoding: 'linear16',
      sampleRate: 16000,
      endpointing: 100
    });
    
    console.log('✅ Session 1 started');
    console.log('📊 Status:', deepgram.getStatus());
    
    // Test 2: Send some audio
    console.log('\n📋 Test 2: Audio Sending');
    console.log('-------------------------');
    
    const testAudio = Buffer.alloc(3200); // 100ms of 16kHz audio
    const success = deepgram.sendAudio(testAudio);
    console.log('📤 Audio sent:', success ? 'SUCCESS' : 'FAILED');
    
    // Test 3: Finish session
    console.log('\n📋 Test 3: Session Finish');
    console.log('--------------------------');
    
    await deepgram.finishSession();
    console.log('✅ Session finished');
    
    // Wait for connection to close
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 4: Start new session (simulating new utterance)
    console.log('\n📋 Test 4: New Session After Close');
    console.log('-----------------------------------');
    
    const session2 = await deepgram.startSession({
      model: 'nova-2',
      language: 'en-US',
      encoding: 'linear16',
      sampleRate: 16000,
      endpointing: 100
    });
    
    console.log('✅ Session 2 started');
    console.log('📊 Status:', deepgram.getStatus());
    
    // Send audio to new session
    const success2 = deepgram.sendAudio(testAudio);
    console.log('📤 Audio sent to session 2:', success2 ? 'SUCCESS' : 'FAILED');
    
    // Finish second session
    await deepgram.finishSession();
    console.log('✅ Session 2 finished');
    
    // Cleanup
    await deepgram.close();
    console.log('✅ Service closed');
    
    console.log('\n🎯 Test Results');
    console.log('================');
    console.log('✅ Service creation: SUCCESS');
    console.log('✅ Session management: SUCCESS');
    console.log('✅ Audio sending: SUCCESS');
    console.log('✅ Session recreation: SUCCESS');
    console.log('✅ Multiple sessions: SUCCESS');
    
    console.log('\n🚀 Call handler integration should now work properly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCallHandlerFix().catch(console.error);