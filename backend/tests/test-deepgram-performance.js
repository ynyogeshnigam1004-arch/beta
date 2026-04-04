/**
 * Deepgram Performance Test
 * Tests Deepgram STT latency with actual audio file
 * This will help isolate Deepgram performance from our pipeline overhead
 */

require('dotenv').config();
const DeepgramService = require('../services/deepgramService');
const fs = require('fs');
const path = require('path');

async function testDeepgramPerformance() {
  console.log('🧪 Testing Deepgram STT Performance');
  console.log('===================================');
  
  const deepgram = new DeepgramService();
  
  try {
    // Test 1: Connection Speed
    console.log('\n📋 Test 1: Connection Establishment Speed');
    console.log('------------------------------------------');
    
    const connectionStart = Date.now();
    await deepgram.connect({
      model: 'nova-2',
      language: 'en-US',
      encoding: 'linear16',
      sampleRate: 16000,
      interim_results: true,
      channels: 1,
      endpointing: 100,
      smart_format: true
    });
    const connectionTime = Date.now() - connectionStart;
    console.log(`✅ Deepgram connected in: ${connectionTime}ms`);
    
    // Test 2: Create test audio (synthetic PCM data)
    console.log('\n📋 Test 2: Synthetic Audio Test');
    console.log('--------------------------------');
    
    // Generate 2 seconds of synthetic audio (16kHz, 16-bit PCM)
    const sampleRate = 16000;
    const duration = 2; // seconds
    const samples = sampleRate * duration;
    const audioBuffer = Buffer.alloc(samples * 2); // 16-bit = 2 bytes per sample
    
    // Generate a simple sine wave (440Hz - A note)
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 16000;
      audioBuffer.writeInt16LE(sample, i * 2);
    }
    
    console.log(`📊 Generated ${audioBuffer.length} bytes of test audio (${duration}s at ${sampleRate}Hz)`);
    
    // Test 3: Streaming transcription performance
    let firstTranscriptTime = null;
    let finalTranscriptTime = null;
    let transcriptCount = 0;
    const testStart = Date.now();
    
    deepgram.on('transcript', (data) => {
      transcriptCount++;
      const currentTime = Date.now() - testStart;
      
      if (!firstTranscriptTime && data.transcript && data.transcript.trim().length > 0) {
        firstTranscriptTime = currentTime;
        console.log(`🎵 First transcript received in: ${firstTranscriptTime}ms`);
        console.log(`📝 Content: "${data.transcript}"`);
      }
      
      if (data.isFinal && data.transcript && data.transcript.trim().length > 0) {
        finalTranscriptTime = currentTime;
        console.log(`✅ Final transcript in: ${finalTranscriptTime}ms`);
        console.log(`📝 Final content: "${data.transcript}"`);
      }
    });
    
    deepgram.on('error', (error) => {
      console.error('❌ Deepgram error:', error);
    });
    
    // Send audio in chunks (simulate real-time streaming)
    const chunkSize = 3200; // 100ms chunks at 16kHz (1600 samples * 2 bytes)
    let bytesSent = 0;
    
    console.log('\n📤 Sending audio in chunks...');
    
    const sendChunks = () => {
      return new Promise((resolve) => {
        const sendNextChunk = () => {
          if (bytesSent >= audioBuffer.length) {
            console.log(`📤 All audio sent (${bytesSent} bytes)`);
            deepgram.finishStream();
            resolve();
            return;
          }
          
          const remainingBytes = audioBuffer.length - bytesSent;
          const currentChunkSize = Math.min(chunkSize, remainingBytes);
          const chunk = audioBuffer.slice(bytesSent, bytesSent + currentChunkSize);
          
          deepgram.sendAudio(chunk);
          bytesSent += currentChunkSize;
          
          console.log(`📤 Sent chunk: ${currentChunkSize} bytes (${bytesSent}/${audioBuffer.length})`);
          
          // Send next chunk after 100ms (simulate real-time)
          setTimeout(sendNextChunk, 100);
        };
        
        sendNextChunk();
      });
    };
    
    await sendChunks();
    
    // Wait for final results
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Results Analysis
    console.log('\n📊 Performance Results');
    console.log('======================');
    console.log(`Connection time: ${connectionTime}ms`);
    console.log(`First transcript: ${firstTranscriptTime || 'N/A'}ms`);
    console.log(`Final transcript: ${finalTranscriptTime || 'N/A'}ms`);
    console.log(`Total transcripts: ${transcriptCount}`);
    console.log(`Audio duration: ${duration * 1000}ms`);
    
    if (firstTranscriptTime) {
      const latencyRatio = firstTranscriptTime / (duration * 1000);
      console.log(`Latency ratio: ${latencyRatio.toFixed(2)}x (${latencyRatio < 1 ? 'REAL-TIME' : 'SLOWER THAN REAL-TIME'})`);
    }
    
    // Performance assessment
    console.log('\n🎯 Performance Assessment');
    console.log('=========================');
    
    if (connectionTime < 500) {
      console.log('✅ Connection speed: EXCELLENT (<500ms)');
    } else if (connectionTime < 1000) {
      console.log('⚠️ Connection speed: GOOD (<1s)');
    } else {
      console.log('❌ Connection speed: SLOW (>1s)');
    }
    
    if (firstTranscriptTime && firstTranscriptTime < 500) {
      console.log('✅ Transcription speed: EXCELLENT (<500ms)');
    } else if (firstTranscriptTime && firstTranscriptTime < 1000) {
      console.log('⚠️ Transcription speed: GOOD (<1s)');
    } else if (firstTranscriptTime) {
      console.log('❌ Transcription speed: SLOW (>1s)');
    } else {
      console.log('❌ No transcription received');
    }
    
    // Test 5: Compare with your browser call results
    console.log('\n🔍 Comparison with Browser Call');
    console.log('===============================');
    console.log('Browser call STT latency: 1921ms');
    console.log(`Isolated Deepgram test: ${firstTranscriptTime || 'N/A'}ms`);
    
    if (firstTranscriptTime) {
      const improvement = ((1921 - firstTranscriptTime) / 1921) * 100;
      if (improvement > 0) {
        console.log(`🎉 Potential improvement: ${improvement.toFixed(1)}% faster`);
        console.log('💡 This suggests pipeline overhead is the main bottleneck');
      } else {
        console.log('⚠️ Deepgram itself may be the bottleneck');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    deepgram.close();
    console.log('\n🧹 Cleanup completed');
  }
}

// Test 6: Alternative - Test with different Deepgram settings
async function testDeepgramSettings() {
  console.log('\n🔧 Testing Different Deepgram Settings');
  console.log('======================================');
  
  const settings = [
    { name: 'Current Settings', endpointing: 100, model: 'nova-2' },
    { name: 'Faster Endpointing', endpointing: 50, model: 'nova-2' },
    { name: 'Ultra Fast', endpointing: 25, model: 'nova-2' },
    { name: 'Base Model', endpointing: 100, model: 'base' }
  ];
  
  for (const setting of settings) {
    console.log(`\n📋 Testing: ${setting.name}`);
    console.log(`   Endpointing: ${setting.endpointing}ms`);
    console.log(`   Model: ${setting.model}`);
    
    const deepgram = new DeepgramService();
    
    try {
      const start = Date.now();
      await deepgram.connect({
        model: setting.model,
        language: 'en-US',
        encoding: 'linear16',
        sampleRate: 16000,
        interim_results: true,
        channels: 1,
        endpointing: setting.endpointing,
        smart_format: true
      });
      const connectionTime = Date.now() - start;
      console.log(`   ✅ Connected in: ${connectionTime}ms`);
      
      deepgram.close();
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
}

// Run the tests
if (require.main === module) {
  (async () => {
    await testDeepgramPerformance();
    await testDeepgramSettings();
  })().catch(console.error);
}

module.exports = { testDeepgramPerformance, testDeepgramSettings };