/**
 * Pricing Service
 * Calculates costs for LLM, STT, TTS services based on selected models
 */

// Exchange rates (updated periodically)
const EXCHANGE_RATES = {
  USD: 1,
  INR: 83.5 // 1 USD = 83.5 INR (approximate)
};

// Platform fees
const PLATFORM_FEE = {
  USD: 0.012, // $0.012 per minute
  INR: 1.0    // ₹1 per minute
};

// Pricing data (in USD)
const PRICING = {
  // LLM Models (per 1000 tokens)
  llm: {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
    'claude-3-5-haiku-20241022': { input: 0.00025, output: 0.00125 },
    'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
    'llama-3.1-8b-instant': { input: 0.00018, output: 0.00018 },
    'llama-3.1-70b-versatile': { input: 0.00059, output: 0.00079 },
    'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },
    'llama-3.1-405b-reasoning': { input: 0.005, output: 0.016 },
    'gemma2-9b-it': { input: 0.0002, output: 0.0002 },
    'mixtral-8x7b-32768': { input: 0.00024, output: 0.00024 }
  },

  // STT Models (per minute)
  stt: {
    'deepgram-nova-2': 0.0043,
    'deepgram-nova': 0.0059,
    'deepgram-enhanced': 0.0075,
    'deepgram-base': 0.0043,
    'whisper-1': 0.006,
    'whisper-large-v3': 0.00185, // Groq Whisper pricing
    'whisper-large-v3-turbo': 0.00185,
    'azure-stt': 0.001
  },

  // TTS Models (per 1000 characters)
  tts: {
    'sonic-english': 0.015,
    'sonic-multilingual': 0.015,
    'sonic-2024-10': 0.015,
    'sonic-turbo': 0.012,
    'cartesia-sonic-english': 0.015,
    'cartesia-sonic-multilingual': 0.015,
    'elevenlabs-turbo-v2': 0.2,
    'elevenlabs-turbo-v2.5': 0.2,
    'openai-tts-1': 15,
    'openai-tts-1-hd': 30,
    'azure-tts': 0.016,
    'playht-2.0-turbo': 0.8,
    'rime-mist': 0.35
  }
};

/**
 * Convert USD to target currency
 */
function convertCurrency(usdAmount, targetCurrency) {
  if (targetCurrency === 'USD') return usdAmount;
  return usdAmount * EXCHANGE_RATES[targetCurrency];
}

/**
 * Format cost for dual currency display (USD/INR)
 */
function formatDualCurrency(usdAmount, inrAmount) {
  // Use more precision for very small USD amounts
  const usdDecimals = usdAmount < 0.001 ? 6 : 4;
  const usdFormatted = `$${usdAmount.toFixed(usdDecimals)}`;
  const inrFormatted = `₹${inrAmount.toFixed(2)}`;
  return `${usdFormatted}/${inrFormatted}`;
}

/**
 * Calculate cost breakdown for an assistant configuration
 * Returns costs in both USD and INR simultaneously
 */
async function calculateAssistantCosts(config) {
  console.log('💰 Calculating costs for config:', config);
  
  const costs = {
    breakdown: {
      llm: { 
        model: config.model, 
        usd: 0, 
        inr: 0, 
        display: '$0.0000/₹0.00',
        unit: 'per minute' 
      },
      stt: { 
        model: config.transcriber, 
        usd: 0, 
        inr: 0, 
        display: '$0.0000/₹0.00',
        unit: 'per minute' 
      },
      tts: { 
        model: config.voiceModel, 
        usd: 0, 
        inr: 0, 
        display: '$0.0000/₹0.00',
        unit: 'per minute' 
      },
      platformFee: {
        usd: PLATFORM_FEE.USD,
        inr: PLATFORM_FEE.INR,
        display: `$${PLATFORM_FEE.USD}/₹${PLATFORM_FEE.INR}`,
        unit: 'per minute'
      }
    },
    total: {
      usd: 0,
      inr: 0,
      display: '$0.0000/₹0.00',
      unit: 'per minute'
    }
  };

  // Assumptions for per-minute calculations
  const estimatedTokensPerMin = 150; // tokens per minute
  const estimatedCharsPerMin = 60;   // characters per minute

  // Calculate LLM cost per minute
  console.log('🔍 Looking for LLM model:', config.model);
  if (PRICING.llm[config.model]) {
    const llmPrice = PRICING.llm[config.model];
    const avgTokenCostUSD = (llmPrice.input + llmPrice.output) / 2;
    const llmCostPerMinUSD = (avgTokenCostUSD * estimatedTokensPerMin) / 1000;
    const llmCostPerMinINR = convertCurrency(llmCostPerMinUSD, 'INR');
    
    costs.breakdown.llm.usd = llmCostPerMinUSD;
    costs.breakdown.llm.inr = llmCostPerMinINR;
    costs.breakdown.llm.display = formatDualCurrency(llmCostPerMinUSD, llmCostPerMinINR);
    console.log('✅ LLM cost per minute calculated:', costs.breakdown.llm.display);
  } else {
    console.log('❌ LLM model not found in pricing:', config.model);
    console.log('📋 Available LLM models:', Object.keys(PRICING.llm));
  }

  // Calculate STT cost per minute (already per minute)
  console.log('🔍 Looking for STT model:', config.transcriber);
  if (PRICING.stt[config.transcriber]) {
    const sttCostUSD = PRICING.stt[config.transcriber];
    const sttCostINR = convertCurrency(sttCostUSD, 'INR');
    
    costs.breakdown.stt.usd = sttCostUSD;
    costs.breakdown.stt.inr = sttCostINR;
    costs.breakdown.stt.display = formatDualCurrency(sttCostUSD, sttCostINR);
    console.log('✅ STT cost per minute calculated:', costs.breakdown.stt.display);
  } else {
    console.log('❌ STT model not found in pricing:', config.transcriber);
    console.log('📋 Available STT models:', Object.keys(PRICING.stt));
  }

  // Calculate TTS cost per minute
  console.log('🔍 Looking for TTS model:', config.voiceModel);
  if (PRICING.tts[config.voiceModel]) {
    const ttsCostPer1000CharsUSD = PRICING.tts[config.voiceModel];
    const ttsCostPerMinUSD = (ttsCostPer1000CharsUSD * estimatedCharsPerMin) / 1000;
    const ttsCostPerMinINR = convertCurrency(ttsCostPerMinUSD, 'INR');
    
    costs.breakdown.tts.usd = ttsCostPerMinUSD;
    costs.breakdown.tts.inr = ttsCostPerMinINR;
    costs.breakdown.tts.display = formatDualCurrency(ttsCostPerMinUSD, ttsCostPerMinINR);
    console.log('✅ TTS cost per minute calculated:', costs.breakdown.tts.display);
  } else {
    console.log('❌ TTS model not found in pricing:', config.voiceModel);
    console.log('📋 Available TTS models:', Object.keys(PRICING.tts));
  }

  // Calculate total cost per minute
  const totalUSD = costs.breakdown.llm.usd + costs.breakdown.stt.usd + costs.breakdown.tts.usd + costs.breakdown.platformFee.usd;
  const totalINR = costs.breakdown.llm.inr + costs.breakdown.stt.inr + costs.breakdown.tts.inr + costs.breakdown.platformFee.inr;
  
  costs.total.usd = totalUSD;
  costs.total.inr = totalINR;
  costs.total.display = formatDualCurrency(totalUSD, totalINR);

  console.log('💰 Final cost breakdown:', costs);
  return costs;
}

/**
 * Get all available models with dual currency pricing
 */
async function getAllModelPricing() {
  const pricing = {
    llm: {},
    stt: {},
    tts: {}
  };

  // Convert LLM pricing to dual currency
  Object.keys(PRICING.llm).forEach(model => {
    const price = PRICING.llm[model];
    const inputINR = convertCurrency(price.input, 'INR');
    const outputINR = convertCurrency(price.output, 'INR');
    
    pricing.llm[model] = {
      input: {
        usd: price.input,
        inr: inputINR,
        display: formatDualCurrency(price.input, inputINR)
      },
      output: {
        usd: price.output,
        inr: outputINR,
        display: formatDualCurrency(price.output, outputINR)
      },
      unit: 'per 1000 tokens'
    };
  });

  // Convert STT pricing to dual currency
  Object.keys(PRICING.stt).forEach(model => {
    const costUSD = PRICING.stt[model];
    const costINR = convertCurrency(costUSD, 'INR');
    
    pricing.stt[model] = {
      usd: costUSD,
      inr: costINR,
      display: formatDualCurrency(costUSD, costINR),
      unit: 'per minute'
    };
  });

  // Convert TTS pricing to dual currency
  Object.keys(PRICING.tts).forEach(model => {
    const costUSD = PRICING.tts[model];
    const costINR = convertCurrency(costUSD, 'INR');
    
    pricing.tts[model] = {
      usd: costUSD,
      inr: costINR,
      display: formatDualCurrency(costUSD, costINR),
      unit: 'per 1000 characters'
    };
  });

  return pricing;
}

/**
 * Format cost for display (legacy single currency)
 */
function formatCost(amount, currency) {
  const symbol = currency === 'USD' ? '$' : '₹';
  const decimals = currency === 'USD' ? 4 : 2;
  return `${symbol}${amount.toFixed(decimals)}`;
}

module.exports = {
  calculateAssistantCosts,
  formatCost,
  formatDualCurrency,
  getAllModelPricing,
  PLATFORM_FEE,
  EXCHANGE_RATES
};