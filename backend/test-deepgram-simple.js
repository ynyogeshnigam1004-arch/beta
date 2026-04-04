/**
 * Simple Deepgram WebSocket Connection Test
 */

require('dotenv').config();
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const fs = require('fs');

console.log('🔍 Testing Deepgram WebSocket Connection\n');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Test with minimal options
const connection = deepgram.listen.live({
  model: 'nova-2',
  language: 'en-US'
});

connection.on(LiveTranscriptionEvents.Open, () => {
  console.log('✅ WebSocket connected successfully!\n');
  
  // Load and send audio
  const audioBuffer = fs.readFileSync('test-audio-fix.wav');
  console.log('📤 Sending audio:', audioBuffer.length, 'bytes\n');
  
  connection.send(audioBuffer);
  
  setTimeout(() => {
    console.log('🔚 Closing connection...');
    connection.finish();
  }, 3000);
});

connection.on(LiveTranscriptionEvents.Transcript, (data) => {
  const transcript = data.channel?.alternatives?.[0]?.transcript;
  if (transcript && transcript.trim().length > 0) {
    console.log('📝 Transcript:', transcript);
    console.log('   Is final:', data.is_final || data.speech_final);
  }
});

connection.on(LiveTranscriptionEvents.Error, (error) => {
  console.error('❌ Error:', error.message);
  console.error('   Status:', error.statusCode);
  console.error('   URL:', error.url);
  process.exit(1);
});

connection.on(LiveTranscriptionEvents.Close, () => {
  console.log('\n✅ Connection closed');
  process.exit(0);
});

// Timeout
setTimeout(() => {
  console.log('\n⏱️ Test timeout');
  process.exit(1);
}, 10000);
