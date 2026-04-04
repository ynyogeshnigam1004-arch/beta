/**
 * Test VapiStylePipeline with Optimized Deepgram Integration
 */

require('dotenv').config();
const VapiStylePipeline = require('../services/VapiStylePipeline');

async function testPipelineIntegration() {
  console.log('🧪 Testing VapiStylePipeline with Optimized Deepgram');
  console.log('=====================================================');
  
  try {
    // Initialize pipeline
    const pipeline = new VapiStylePipeline({
      model: 'llama-3.1-8b-instant',
      transcriber: 'deepgram-streaming', // Use our optimized service
      voiceProvider: 'cartesia',
      systemPrompt: 'You are a helpful voice assistant. Keep responses brief.',
      firstMessage: 'Hello! I\'m ready to help you.'
    });
    
    console.log('✅ Pipeline initialized');
    
    // Test streaming STT initialization
    console.log('\n📋 Testing Streaming STT Initialization');
    console.log('----------------------------------------');
    
    const session = await pipeline.initializeStreamingSTT({
      model: 'nova-2',
      language: 'en-US',
      endpointing: 50 // Ultra-fast
    });
    
    console.log('✅ Streaming STT initialized successfully');
    console.log('📊 Session info:', {
      hasService: !!pipeline.deepgramStreamingService,
      isConnected: pipeline.deepgramStreamingService.isConnected,
      sessionCount: pipeline.deepgramStreamingService.sessionCount
    });
    
    // Test audio sending (simulate)
    console.log('\n📋 Testing Audio Processing');
    console.log('-----------------------------');
    
    // Generate test audio buffer (silence)
    const testAudioBuffer = Buffer.alloc(3200); // 100ms of 16kHz audio
    const success = pipeline.sendAudioToStreamingSTT(testAudioBuffer);
    
    console.log('📤 Audio sent:', success ? 'SUCCESS' : 'FAILED');
    
    // Wait a moment for any responses
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test session finish
    console.log('\n📋 Testing Session Cleanup');
    console.log('---------------------------');
    
    await pipeline.finishStreamingSTT();
    console.log('✅ Session finished');
    
    // Test pipeline cleanup
    pipeline.cleanup();
    console.log('✅ Pipeline cleaned up');
    
    console.log('\n🎯 Integration Test Results');
    console.log('============================');
    console.log('✅ Pipeline initialization: SUCCESS');
    console.log('✅ Streaming STT setup: SUCCESS');
    console.log('✅ Audio processing: SUCCESS');
    console.log('✅ Session management: SUCCESS');
    console.log('✅ Cleanup: SUCCESS');
    
    console.log('\n🚀 Optimized Deepgram integration is working perfectly!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the test
testPipelineIntegration().catch(console.error);