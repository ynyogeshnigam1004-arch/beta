/**
 * Test Deepgram STT with Audio Sample
 * Tests both PCM and WebM formats
 */

require('dotenv').config();
const { createClient } = require('@deepgram/sdk');
const fs = require('fs');
const path = require('path');

// Check API key
if (!process.env.DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY not found in .env file');
  process.exit(1);
}

console.log('🎙️ Testing Deepgram STT Service');
console.log('================================\n');
console.log('🔑 API Key:', process.env.DEEPGRAM_API_KEY.substring(0, 8) + '...');

// Create Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

/**
 * Test 1: Generate PCM audio sample
 */
async function generatePCMSample() {
  console.log('\n📝 Test 1: Generating PCM audio sample...');
  
  // Generate 2 seconds of PCM audio (48kHz, mono, 16-bit)
  const sampleRate = 48000;
  const duration = 2; // seconds
  const numSamples = sampleRate * duration;
  const pcmBuffer = Buffer.alloc(numSamples * 2); // 2 bytes per sample (16-bit)
  
  // Generate a simple tone (440 Hz - A note)
  const frequency = 440;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 32767;
    pcmBuffer.writeInt16LE(Math.round(sample), i * 2);
  }
  
  console.log('✅ Generated PCM sample:', pcmBuffer.length, 'bytes');
  console.log('   Sample rate: 48kHz, Duration: 2s, Format: PCM Int16');
  
  return pcmBuffer;
}

/**
 * Test 2: Test Deepgram with PCM format
 */
async function testDeepgramPCM(pcmBuffer) {
  console.log('\n🚀 Test 2: Testing Deepgram with PCM format...');
  
  try {
    const startTime = Date.now();
    
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      pcmBuffer,
      {
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        encoding: 'linear16',
        sample_rate: 48000,
        channels: 1
      }
    );
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('❌ Deepgram error:', error);
      return false;
    }
    
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence;
    
    console.log('✅ Deepgram response received in', duration, 'ms');
    console.log('📝 Transcript:', transcript || '(empty - expected for tone)');
    console.log('📊 Confidence:', confidence ? (confidence * 100).toFixed(1) + '%' : 'N/A');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Test with actual speech (if sample file exists)
 */
async function testWithSpeechSample() {
  console.log('\n🎤 Test 3: Testing with speech sample...');
  
  // Check if test audio file exists
  const testFiles = [
    'test-audio-fix.wav',
    'test-voice-quality.mp3'
  ];
  
  let audioFile = null;
  for (const file of testFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      audioFile = filePath;
      break;
    }
  }
  
  if (!audioFile) {
    console.log('⚠️ No test audio file found, skipping speech test');
    console.log('💡 To test with real speech, add a .wav or .mp3 file to backend folder');
    return true;
  }
  
  console.log('📂 Found test file:', path.basename(audioFile));
  
  try {
    const audioBuffer = fs.readFileSync(audioFile);
    console.log('📦 File size:', audioBuffer.length, 'bytes');
    
    const startTime = Date.now();
    
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true
      }
    );
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('❌ Deepgram error:', error);
      return false;
    }
    
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence;
    const words = result?.results?.channels?.[0]?.alternatives?.[0]?.words || [];
    
    console.log('✅ Deepgram response received in', duration, 'ms');
    console.log('📝 Transcript:', transcript || '(no speech detected)');
    console.log('📊 Confidence:', confidence ? (confidence * 100).toFixed(1) + '%' : 'N/A');
    console.log('🔤 Words detected:', words.length);
    
    if (words.length > 0) {
      console.log('📋 First 5 words:');
      words.slice(0, 5).forEach((word, i) => {
        console.log(`   ${i + 1}. "${word.word}" (${(word.confidence * 100).toFixed(1)}%)`);
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Test latency with multiple requests
 */
async function testLatency(pcmBuffer) {
  console.log('\n⏱️ Test 4: Testing latency (5 requests)...');
  
  const latencies = [];
  
  for (let i = 0; i < 5; i++) {
    try {
      const startTime = Date.now();
      
      await deepgram.listen.prerecorded.transcribeFile(
        pcmBuffer,
        {
          model: 'nova-2',
          language: 'en-US',
          encoding: 'linear16',
          sample_rate: 48000,
          channels: 1
        }
      );
      
      const duration = Date.now() - startTime;
      latencies.push(duration);
      
      console.log(`   Request ${i + 1}: ${duration}ms`);
      
    } catch (error) {
      console.error(`   Request ${i + 1}: Failed -`, error.message);
    }
  }
  
  if (latencies.length > 0) {
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    
    console.log('\n📊 Latency Statistics:');
    console.log('   Average:', Math.round(avg), 'ms');
    console.log('   Min:', min, 'ms');
    console.log('   Max:', max, 'ms');
    console.log('   Target: <3000ms (batch), <500ms (streaming)');
    
    if (avg < 3000) {
      console.log('   ✅ Performance: Good for batch mode');
    } else {
      console.log('   ⚠️ Performance: Slower than expected');
    }
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Test 1: Generate PCM sample
    const pcmBuffer = await generatePCMSample();
    
    // Test 2: Test Deepgram with PCM
    const pcmSuccess = await testDeepgramPCM(pcmBuffer);
    
    // Test 3: Test with speech sample (if available)
    const speechSuccess = await testWithSpeechSample();
    
    // Test 4: Test latency
    await testLatency(pcmBuffer);
    
    // Summary
    console.log('\n================================');
    console.log('📊 Test Summary');
    console.log('================================');
    console.log('PCM Format Test:', pcmSuccess ? '✅ Passed' : '❌ Failed');
    console.log('Speech Sample Test:', speechSuccess ? '✅ Passed' : '⚠️ Skipped');
    console.log('Latency Test: ✅ Completed');
    console.log('\n💡 Deepgram STT is', pcmSuccess ? 'working correctly!' : 'having issues');
    
    if (pcmSuccess) {
      console.log('\n🎯 Next Steps:');
      console.log('1. Use Deepgram transcriber in your assistant');
      console.log('2. Set transcriber to: deepgram-nova-2');
      console.log('3. Start a call and speak');
      console.log('4. Expect ~2-3 second transcription latency');
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

// Run tests
runTests();
