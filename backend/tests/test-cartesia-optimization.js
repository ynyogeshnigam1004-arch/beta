/**
 * Test Cartesia Streaming Optimization
 * Tests the new persistent WebSocket connection for reduced latency
 */

require('dotenv').config();
const CartesiaStreamingService = require('../services/cartesiaStreamingService');

async function testOptimization() {
  console.log('🧪 Testing Cartesia Streaming Optimization');
  console.log('==========================================');
  
  const cartesia = new CartesiaStreamingService();
  
  try {
    // Test 1: First request (should establish connection)
    console.log('\n📋 Test 1: First Request (Connection Establishment)');
    console.log('---------------------------------------------------');
    
    const test1Start = Date.now();
    let firstChunkTime = null;
    let chunkCount = 0;
    
    await cartesia.streamTextToSpeech(
      "Hello, this is a test of the optimized Cartesia streaming service.",
      (audioChunk) => {
        chunkCount++;
        if (!firstChunkTime) {
          firstChunkTime = Date.now() - test1Start;
          console.log(`🎵 First chunk received in: ${firstChunkTime}ms`);
        }
      },
      () => {
        const totalTime = Date.now() - test1Start;
        console.log(`✅ Test 1 completed in: ${totalTime}ms (${chunkCount} chunks)`);
      }
    );
    
    // Test 2: Second request (should reuse connection)
    console.log('\n📋 Test 2: Second Request (Connection Reuse)');
    console.log('---------------------------------------------');
    
    const test2Start = Date.now();
    let secondFirstChunkTime = null;
    let secondChunkCount = 0;
    
    await cartesia.streamTextToSpeech(
      "This second request should be much faster since the connection is already established.",
      (audioChunk) => {
        secondChunkCount++;
        if (!secondFirstChunkTime) {
          secondFirstChunkTime = Date.now() - test2Start;
          console.log(`🎵 First chunk received in: ${secondFirstChunkTime}ms`);
        }
      },
      () => {
        const totalTime = Date.now() - test2Start;
        console.log(`✅ Test 2 completed in: ${totalTime}ms (${secondChunkCount} chunks)`);
      }
    );
    
    // Test 3: Multiple concurrent requests
    console.log('\n📋 Test 3: Concurrent Requests');
    console.log('-------------------------------');
    
    const concurrentStart = Date.now();
    const promises = [];
    
    for (let i = 1; i <= 3; i++) {
      promises.push(
        cartesia.streamTextToSpeech(
          `Concurrent request number ${i}. Testing multiple requests at once.`,
          (audioChunk) => {
            // Just count chunks
          },
          () => {
            console.log(`✅ Concurrent request ${i} completed`);
          }
        )
      );
    }
    
    await Promise.all(promises);
    const concurrentTime = Date.now() - concurrentStart;
    console.log(`✅ All concurrent requests completed in: ${concurrentTime}ms`);
    
    // Results Summary
    console.log('\n📊 Optimization Results');
    console.log('=======================');
    console.log(`First request (with connection): ${firstChunkTime}ms to first chunk`);
    console.log(`Second request (reused connection): ${secondFirstChunkTime}ms to first chunk`);
    console.log(`Improvement: ${Math.round(((firstChunkTime - secondFirstChunkTime) / firstChunkTime) * 100)}% faster`);
    
    if (secondFirstChunkTime < 500) {
      console.log('🎉 OPTIMIZATION SUCCESS! TTS latency under 500ms');
    } else if (secondFirstChunkTime < 1000) {
      console.log('✅ Good optimization! TTS latency under 1 second');
    } else {
      console.log('⚠️ Still room for improvement. TTS latency over 1 second');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    cartesia.close();
    console.log('\n🧹 Cleanup completed');
  }
}

// Run the test
if (require.main === module) {
  testOptimization().catch(console.error);
}

module.exports = { testOptimization };