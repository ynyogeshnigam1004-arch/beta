/**
 * Test Dual Currency Pricing System
 * Verify that costs are displayed in both USD and INR format
 */

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3001';

async function testDualCurrencyPricing() {
  console.log('🧪 Testing Dual Currency Pricing System...\n');

  try {
    // Test 1: Get pricing information
    console.log('1️⃣ Testing /api/pricing endpoint...');
    const pricingResponse = await fetch(`${BASE_URL}/api/pricing`);
    const pricingData = await pricingResponse.json();
    
    if (pricingData.success) {
      console.log('✅ Pricing API working');
      console.log('📊 Sample LLM pricing:');
      
      // Show sample LLM model pricing
      const sampleLLM = Object.keys(pricingData.pricing.llm)[0];
      const llmPrice = pricingData.pricing.llm[sampleLLM];
      console.log(`   ${sampleLLM}:`);
      console.log(`     Input: ${llmPrice.input.display}`);
      console.log(`     Output: ${llmPrice.output.display}`);
      
      // Show sample STT pricing
      const sampleSTT = Object.keys(pricingData.pricing.stt)[0];
      const sttPrice = pricingData.pricing.stt[sampleSTT];
      console.log(`\n📊 Sample STT pricing:`);
      console.log(`   ${sampleSTT}: ${sttPrice.display}`);
      
      // Show sample TTS pricing
      const sampleTTS = Object.keys(pricingData.pricing.tts)[0];
      const ttsPrice = pricingData.pricing.tts[sampleTTS];
      console.log(`\n📊 Sample TTS pricing:`);
      console.log(`   ${sampleTTS}: ${ttsPrice.display}`);
      
      // Show platform fee
      console.log(`\n💰 Platform Fee: ${pricingData.platformFee.display}`);
      
    } else {
      console.log('❌ Pricing API failed:', pricingData.error);
    }

    // Test 2: Calculate cost for assistant configuration
    console.log('\n2️⃣ Testing /api/calculate-cost endpoint...');
    const costResponse = await fetch(`${BASE_URL}/api/calculate-cost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        transcriber: 'deepgram-nova-2',
        voiceModel: 'cartesia-sonic-english'
      })
    });
    
    const costData = await costResponse.json();
    
    if (costData.success) {
      console.log('✅ Cost calculation working');
      console.log('\n💰 Cost Breakdown:');
      
      const costs = costData.costs;
      console.log(`   LLM (${costs.breakdown.llm.model}): ${costs.breakdown.llm.display} ${costs.breakdown.llm.unit}`);
      console.log(`   STT (${costs.breakdown.stt.model}): ${costs.breakdown.stt.display} ${costs.breakdown.stt.unit}`);
      console.log(`   TTS (${costs.breakdown.tts.model}): ${costs.breakdown.tts.display} ${costs.breakdown.tts.unit}`);
      console.log(`   Platform Fee: ${costs.breakdown.platformFee.display} ${costs.breakdown.platformFee.unit}`);
      console.log(`   ─────────────────────────────────────────`);
      console.log(`   TOTAL: ${costs.total.display} ${costs.total.unit}`);
      
    } else {
      console.log('❌ Cost calculation failed:', costData.error);
    }

    // Test 3: Verify dual currency format
    console.log('\n3️⃣ Testing dual currency format...');
    const testCases = [
      { usd: 0.005, inr: 0.42, expected: '$0.0050/₹0.42' },
      { usd: 0.0001, inr: 0.01, expected: '$0.0001/₹0.01' },
      { usd: 0.012, inr: 1.0, expected: '$0.0120/₹1.00' }
    ];
    
    testCases.forEach((test, index) => {
      const pricingService = require('./backend/services/pricingService');
      const result = pricingService.formatDualCurrency(test.usd, test.inr);
      const passed = result === test.expected;
      console.log(`   Test ${index + 1}: ${passed ? '✅' : '❌'} ${result} ${passed ? '' : `(expected: ${test.expected})`}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🏁 Dual Currency Pricing tests completed!');
}

// Instructions for running the test
console.log('📋 INSTRUCTIONS:');
console.log('1. Start your backend server: node backend/server.js');
console.log('2. Run: node test-dual-currency-pricing.js\n');

// Uncomment to run the test
// testDualCurrencyPricing();

module.exports = { testDualCurrencyPricing };