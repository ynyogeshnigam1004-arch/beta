/**
 * Test Cartesia API Key
 */

require('dotenv').config();
const axios = require('axios');

async function testCartesiaAPI() {
  const apiKey = process.env.CARTESIA_API_KEY;
  
  console.log('🔑 Testing Cartesia API Key...');
  console.log('API Key:', apiKey ? `${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET');
  
  if (!apiKey) {
    console.error('❌ CARTESIA_API_KEY not set in .env file');
    return;
  }
  
  try {
    console.log('\n📡 Fetching voices from Cartesia API...');
    const response = await axios.get('https://api.cartesia.ai/voices', {
      headers: {
        'X-API-Key': apiKey,
        'Cartesia-Version': '2025-04-16'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! API Key is valid');
    console.log('📊 Response Status:', response.status);
    console.log('📋 Number of voices:', response.data.length);
    console.log('\n🎤 Sample voices:');
    response.data.slice(0, 3).forEach(voice => {
      console.log(`  - ${voice.name} (${voice.id})`);
    });
    
  } catch (error) {
    console.error('❌ ERROR:', error.response?.status, error.response?.statusText);
    console.error('📝 Error details:', error.response?.data);
    console.error('🔍 Full error:', error.message);
  }
}

testCartesiaAPI();
