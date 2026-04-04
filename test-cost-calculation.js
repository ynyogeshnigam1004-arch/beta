/**
 * Test Cost Calculation
 * Quick test to verify the pricing system is working
 */

const fetch = require('node-fetch');

async function testCostCalculation() {
  console.log('🧪 Testing Cost Calculation...\n');

  try {
    // Test with a typical assistant configuration
    const testConfig = {
      model: 'llama-3.1-8b-instant',
      transcriber: 'whisper-large-v3',
      voiceModel: 'sonic-english'
    };

    console.log('📋 Testing configuration:');
    console.log(`   LLM: ${testConfig.model}`);
    console.log(`   STT: ${testConfig.transcriber}`);
    console.log(`   TTS: ${testConfig.voiceModel}\n`);

    const response = await fetch('http://localhost:3001/api/calculate-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testConfig)
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Cost calculation successful!\n');
      console.log('💰 Cost Breakdown:');
      console.log(`   LLM Cost: ${data.costs.breakdown.llm.display} ${data.costs.breakdown.llm.unit}`);
      console.log(`   STT Cost: ${data.costs.breakdown.stt.display} ${data.costs.breakdown.stt.unit}`);
      console.log(`   TTS Cost: ${data.costs.breakdown.tts.display} ${data.costs.breakdown.tts.unit}`);
      console.log(`   Platform Fee: ${data.costs.breakdown.platformFee.display} ${data.costs.breakdown.platformFee.unit}`);
      console.log(`   ─────────────────────────────────────────`);
      console.log(`   TOTAL: ${data.costs.total.display} ${data.costs.total.unit}`);
    } else {
      console.log('❌ Cost calculation failed:', data.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Instructions
console.log('📋 INSTRUCTIONS:');
console.log('1. Start your backend server: node backend/server.js');
console.log('2. Run: node test-cost-calculation.js\n');

// Uncomment to run the test
// testCostCalculation();

module.exports = { testCostCalculation };