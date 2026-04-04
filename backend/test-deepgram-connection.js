/**
 * Test Deepgram WebSocket Connection
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const WebSocket = require('ws');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;

console.log('🧪 Testing Deepgram WebSocket Connection...');
console.log('🔑 API Key:', DEEPGRAM_API_KEY ? `${DEEPGRAM_API_KEY.substring(0, 8)}...` : 'NOT SET');

if (!DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY not set in .env file');
  process.exit(1);
}

// Test with minimal parameters
const params = new URLSearchParams({
  model: 'nova-2',
  language: 'en',
  encoding: 'linear16',
  sample_rate: '16000',
  channels: '1'
});

const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

console.log('🔌 Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl, {
  headers: {
    'Authorization': `Token ${DEEPGRAM_API_KEY}`
  }
});

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully!');
  console.log('📤 Sending test message...');
  
  // Send a keep-alive message
  ws.send(JSON.stringify({ type: 'KeepAlive' }));
  
  setTimeout(() => {
    console.log('✅ Connection test passed!');
    ws.close();
    process.exit(0);
  }, 2000);
});

ws.on('message', (data) => {
  console.log('📨 Received message:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  console.error('Full error:', error);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed: ${code} - ${reason || 'No reason'}`);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('❌ Connection timeout');
  ws.close();
  process.exit(1);
}, 10000);
