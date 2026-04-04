/**
 * Test TTS Routes Registration
 * This tests if the routes are properly configured
 */

// Set environment variables manually for testing
process.env.ELEVENLABS_API_KEY = 'sk_82c19986f4b129b0327220a089abce051b4c34631eb5a9df';
process.env.CARTESIA_API_KEY = 'sk_car_oMbtAqAC14yHmLC2cNt6tf';

const express = require('express');
const ttsRoutes = require('./backend/routes/tts');

const app = express();
app.use(express.json());

// Register TTS routes
app.use('/api/tts', ttsRoutes);

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test server working' });
});

const PORT = 3001; // Different port to avoid conflict

app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log('📋 Available routes:');
  console.log('   GET /test');
  console.log('   GET /api/tts/providers');
  console.log('   GET /api/tts/elevenlabs/voices');
  console.log('   GET /api/tts/elevenlabs/models');
  console.log('   GET /api/tts/cartesia/voices');
  console.log('   POST /api/tts/synthesize');
  
  // Test the providers endpoint
  setTimeout(async () => {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/tts/providers`);
      const data = await response.json();
      console.log('\n✅ TTS Providers test result:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.providers) {
        const elevenLabs = data.providers.find(p => p.id === 'elevenlabs');
        if (elevenLabs) {
          console.log(`\n🎉 ElevenLabs provider found: ${elevenLabs.available ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
        } else {
          console.log('\n❌ ElevenLabs provider not found in response');
        }
      }
      
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    }
  }, 1000);
});