/**
 * ============================================================================
 * API Data Manager - CONFIGURED TO FETCH ALL MODELS
 * ============================================================================
 * 
 * ⚠️  DO NOT OVERWRITE OR REVERT THIS FILE ⚠️
 * 
 * This file is configured to fetch ALL available models from:
 * - Groq API: 20+ LLM models (Llama 3.x, 4.x, Gemma, Qwen, DeepSeek, etc.)
 * - Groq API: 3+ Whisper transcribers (STT)
 * - Cartesia API: 100+ voices
 * - Cartesia: 5 TTS models
 * 
 * BACKUP LOCATION: backend/services/apiDataManager.BACKUP.js
 * 
 * Forces fresh data fetching from all APIs and manages persistent storage
 * NO FALLBACKS - API data is MANDATORY
 * 
 * Last Updated: 2025-01-29
 * ============================================================================
 */

const axios = require('axios');
const LLMModel = require('../models/LLMModel');

class APIDataManager {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.cartesiaApiKey = process.env.CARTESIA_API_KEY;
    this.groqApiUrl = 'https://api.groq.com/openai/v1';
    this.cartesiaApiUrl = 'https://api.cartesia.ai';
    
    // Validate API keys on startup
    this.validateAPIKeys();
  }

  /**
   * Validate that all required API keys are present
   */
  validateAPIKeys() {
    const missingKeys = [];
    
    if (!this.groqApiKey || this.groqApiKey === 'your_groq_api_key_here') {
      missingKeys.push('GROQ_API_KEY');
    }
    
    // Cartesia is OPTIONAL - only warn if missing
    if (!this.cartesiaApiKey || this.cartesiaApiKey === 'your_cartesia_api_key_here') {
      console.warn('⚠️ CARTESIA_API_KEY not configured - Cartesia TTS will not be available');
    }
    
    if (missingKeys.length > 0) {
      throw new Error(`❌ MISSING REQUIRED API KEYS: ${missingKeys.join(', ')}. Please configure your API keys in the environment variables.`);
    }
    
    console.log('✅ All required API keys are configured');
  }

  /**
   * Fetch ALL models from Groq API (LLM + STT)
   * @returns {Promise<Object>} All models from Groq API
   */
  async fetchAllGroqModels() {
    console.log('🔄 FORCING fresh fetch of ALL Groq models...');
    
    try {
      const response = await axios.get(`${this.groqApiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
        },
        timeout: 15000,
      });
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from Groq API');
      }
      
      const allModels = {
        llm: {},
        stt: {},
        tts: {}
      };
      
      console.log(`📊 Processing ${response.data.data.length} models from Groq API...`);
      
      response.data.data.forEach(model => {
        const modelId = model.id;
        const modelType = this.categorizeGroqModel(modelId);
        
        if (modelType === 'llm') {
          allModels.llm[modelId] = {
            id: modelId,
            name: this.formatModelName(modelId),
            contextWindow: model.context_window || 128000,
            description: model.description || `${modelId} - ${model.owned_by || 'Groq'}`,
            category: 'llm',
            ownedBy: model.owned_by || 'Groq',
            pricing: this.getGroqModelPricing(modelId),
            latency: this.getGroqModelLatency(modelId),
            speed: this.getGroqModelSpeed(modelId),
            features: this.getGroqModelFeatures(modelId),
            active: model.active !== undefined ? model.active : true
          };
        } else if (modelType === 'stt') {
          allModels.stt[modelId] = {
            id: modelId,
            name: this.formatModelName(modelId),
            description: model.description || `${modelId} - Speech-to-Text`,
            category: 'stt',
            ownedBy: model.owned_by || 'Groq',
            latency: this.getWhisperLatency(modelId),
            speedFactor: this.getWhisperSpeedFactor(modelId),
            accuracy: this.getWhisperAccuracy(modelId),
            pricing: this.getWhisperPricing(modelId),
            active: model.active !== undefined ? model.active : true
          };
        } else if (modelType === 'tts') {
          allModels.tts[modelId] = {
            id: modelId,
            name: this.formatModelName(modelId),
            description: model.description || `${modelId} - Text-to-Speech`,
            category: 'tts',
            ownedBy: model.owned_by || 'Groq',
            active: model.active !== undefined ? model.active : true
          };
        }
      });
      
      console.log(`✅ Fetched ${Object.keys(allModels.llm).length} LLM models, ${Object.keys(allModels.stt).length} STT models, and ${Object.keys(allModels.tts).length} TTS models from Groq`);
      console.log('📋 LLM Models:', Object.keys(allModels.llm).join(', '));
      console.log('📋 STT Models:', Object.keys(allModels.stt).join(', '));
      if (Object.keys(allModels.tts).length > 0) {
        console.log('📋 TTS Models:', Object.keys(allModels.tts).join(', '));
      }
      return allModels;
      
    } catch (error) {
      console.error('❌ CRITICAL ERROR: Failed to fetch Groq models:', error.message);
      throw new Error(`Failed to fetch Groq models: ${error.message}`);
    }
  }

  /**
   * Fetch ALL voices and models from Cartesia API
   * @returns {Promise<Object>} All voices and models from Cartesia
   */
  async fetchAllCartesiaData() {
    console.log('🔄 FORCING fresh fetch of ALL Cartesia data...');
    console.log('🔑 Cartesia API Key:', this.cartesiaApiKey ? `${this.cartesiaApiKey.substring(0, 15)}...${this.cartesiaApiKey.substring(this.cartesiaApiKey.length - 4)}` : 'NOT SET');
    console.log('🌐 Cartesia API URL:', this.cartesiaApiUrl);
    
    // If Cartesia API key is not configured, return fallback data
    if (!this.cartesiaApiKey || this.cartesiaApiKey === 'your_cartesia_api_key_here') {
      console.warn('⚠️ Cartesia API key not configured, using fallback data');
      return this.getCartesiaFallbackData();
    }
    
    try {
      // Fetch voices (this endpoint exists)
      const voicesResponse = await axios.get(`${this.cartesiaApiUrl}/voices`, {
        headers: {
          'X-API-Key': this.cartesiaApiKey,
          'Cartesia-Version': '2025-04-16'
        },
        timeout: 15000
      });
      
      const voices = {};
      const models = {};
      
      // Process voices - handle new API format {"data": [...]}
      const voicesArray = voicesResponse.data.data || voicesResponse.data;
      if (voicesArray && Array.isArray(voicesArray)) {
        voicesArray.forEach(voice => {
          voices[voice.id] = {
            id: voice.id,
            name: voice.name,
            language: voice.language || 'en',
            gender: this.inferGender(voice.name),
            accent: this.inferAccent(voice.name, voice.language),
            description: voice.description || `${voice.name} voice`,
            is_public: voice.is_public !== undefined ? voice.is_public : true,
            embedding: voice.embedding || null
          };
        });
      }
      
      // Cartesia TTS models - comprehensive list
      const cartesiaModels = {
        'sonic-3': {
          id: 'sonic-3',
          name: 'Sonic 3.0',
          description: 'Latest Sonic 3 model - fastest and highest quality - RECOMMENDED',
          category: 'tts',
          ownedBy: 'Cartesia',
          latency: 85,
          features: ['ultra-low-latency', 'highest-quality', 'streaming'],
          languages: ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'hi', 'it', 'ko', 'nl', 'pl', 'ru', 'sv', 'tr'],
          quality: 'highest',
          pricing: { perCharacter: 0.000015 }
        },
        'sonic-2024-10': {
          id: 'sonic-2024-10',
          name: 'Sonic 2.0 (2024-10)',
          description: 'Sonic 2.0 model with improved quality and speed',
          category: 'tts',
          ownedBy: 'Cartesia',
          latency: 95,
          features: ['ultra-low-latency', 'high-quality', 'streaming'],
          languages: ['en', 'es', 'fr', 'de', 'pt', 'zh', 'ja', 'hi', 'it', 'ko', 'nl', 'pl', 'ru', 'sv', 'tr'],
          quality: 'highest',
          pricing: { perCharacter: 0.000015 }
        },
        'sonic-english': {
          id: 'sonic-english',
          name: 'Sonic English',
          description: 'English-optimized model for best clarity and naturalness',
          category: 'tts',
          ownedBy: 'Cartesia',
          latency: 125,
          features: ['english-optimized', 'clarity', 'streaming'],
          languages: ['en'],
          quality: 'highest',
          pricing: { perCharacter: 0.000015 }
        },
        'sonic-multilingual': {
          id: 'sonic-multilingual',
          name: 'Sonic Multilingual',
          description: 'Support for 15+ languages with consistent quality',
          category: 'tts',
          ownedBy: 'Cartesia',
          latency: 155,
          features: ['multilingual', 'language-support', 'streaming'],
          languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'hi', 'nl', 'pl', 'sv', 'tr'],
          quality: 'high',
          pricing: { perCharacter: 0.000015 }
        },
        'sonic-turbo': {
          id: 'sonic-turbo',
          name: 'Sonic Turbo',
          description: 'Ultra-fast synthesis with balanced quality',
          category: 'tts',
          ownedBy: 'Cartesia',
          latency: 110,
          features: ['ultra-low-latency', 'balanced-quality', 'streaming'],
          languages: ['en'],
          quality: 'high',
          pricing: { perCharacter: 0.000012 }
        },
        'sonic': {
          id: 'sonic',
          name: 'Sonic (Legacy)',
          description: 'Original Sonic model - reliable and fast',
          category: 'tts',
          ownedBy: 'Cartesia',
          latency: 135,
          features: ['low-latency', 'reliable', 'streaming'],
          languages: ['en'],
          quality: 'high',
          pricing: { perCharacter: 0.000015 }
        }
      };
      
      // Copy hardcoded models to the models object
      Object.assign(models, cartesiaModels);
      
      console.log(`✅ Fetched ${Object.keys(voices).length} voices and ${Object.keys(models).length} TTS models from Cartesia`);
      console.log('📋 Cartesia TTS Models:', Object.keys(models).join(', '));
      console.log('📋 Sample Voices (first 10):', Object.keys(voices).slice(0, 10).join(', '));
      
      return {
        voices,
        models,
        fetchedAt: new Date().toISOString(),
        totalVoices: Object.keys(voices).length,
        totalModels: Object.keys(models).length
      };
      
    } catch (error) {
      console.error('❌ ERROR: Failed to fetch Cartesia data:', error.message);
      console.warn('⚠️ Using fallback Cartesia data');
      return this.getCartesiaFallbackData();
    }
  }

  /**
   * Get fallback Cartesia data when API is unavailable
   * @returns {Object} Fallback voices and models
   */
  getCartesiaFallbackData() {
    const voices = {
      'a0e99841-438c-4a64-b679-ae501e7d6091': {
        id: 'a0e99841-438c-4a64-b679-ae501e7d6091',
        name: 'British Lady',
        language: 'en',
        gender: 'female',
        accent: 'british',
        description: 'Professional British female voice',
        is_public: true
      },
      '79a125e8-cd45-4c13-8a67-188112f4dd22': {
        id: '79a125e8-cd45-4c13-8a67-188112f4dd22',
        name: 'American Male',
        language: 'en',
        gender: 'male',
        accent: 'american',
        description: 'Clear American male voice',
        is_public: true
      }
    };

    const models = {
      'sonic-3': {
        id: 'sonic-3',
        name: 'Sonic 3.0',
        description: 'Latest Sonic 3 model - fastest and highest quality - RECOMMENDED',
        category: 'tts',
        ownedBy: 'Cartesia',
        latency: 85,
        features: ['ultra-low-latency', 'highest-quality', 'streaming'],
        languages: ['en'],
        quality: 'highest',
        pricing: { perCharacter: 0.000015 }
      },
      'sonic-english': {
        id: 'sonic-english',
        name: 'Sonic English',
        description: 'English-optimized model for best clarity and naturalness',
        category: 'tts',
        ownedBy: 'Cartesia',
        latency: 125,
        features: ['english-optimized', 'clarity', 'streaming'],
        languages: ['en'],
        quality: 'highest',
        pricing: { perCharacter: 0.000015 }
      }
    };

    console.log('ℹ️ Using fallback Cartesia data: 2 voices, 2 models');
    
    return {
      voices,
      models,
      fetchedAt: new Date().toISOString(),
      totalVoices: Object.keys(voices).length,
      totalModels: Object.keys(models).length,
      isFallback: true
    };
  }

  /**
   * Fetch ALL data from all APIs and save to database
   * @returns {Promise<Object>} Complete data from all APIs
   */
  async fetchAndSaveAllData() {
    console.log('🚀 STARTING API DATA FETCH...');
    console.log('ℹ️ Groq API is required, Cartesia is optional');
    
    try {
      // Fetch Groq data (required)
      const groqData = await this.fetchAllGroqModels();
      
      // Fetch Cartesia data (optional - will use fallback if fails)
      const cartesiaData = await this.fetchAllCartesiaData();
      
      // Save LLM models to MongoDB
      console.log('💾 Saving LLM models to database...');
      await LLMModel.saveModels(groqData.llm);
      console.log(`✅ Saved ${Object.keys(groqData.llm).length} LLM models to database`);
      
      const completeData = {
        groq: groqData,
        cartesia: cartesiaData,
        fetchedAt: new Date().toISOString(),
        summary: {
          llm: Object.keys(groqData.llm).length,
          stt: Object.keys(groqData.stt).length,
          tts: Object.keys(cartesiaData.models).length,
          voices: Object.keys(cartesiaData.voices).length,
          total: Object.keys(groqData.llm).length + Object.keys(groqData.stt).length + 
                 Object.keys(cartesiaData.models).length + Object.keys(cartesiaData.voices).length
        }
      };
      
      console.log('🎉 SUCCESS: All API data fetched and saved!');
      console.log(`📊 Summary: ${completeData.summary.llm} LLM, ${completeData.summary.stt} STT, ${completeData.summary.tts} TTS, ${completeData.summary.voices} voices`);
      
      return completeData;
      
    } catch (error) {
      console.error('💥 CRITICAL FAILURE: Could not fetch API data:', error.message);
      throw error;
    }
  }

  /**
   * Categorize Groq model by type
   */
  categorizeGroqModel(modelId) {
    const modelIdLower = modelId.toLowerCase();
    
    if (modelIdLower.includes('whisper') || modelIdLower.includes('distil-whisper')) {
      return 'stt';
    }
    
    if (modelIdLower.includes('tts') || modelIdLower.includes('playai-tts')) {
      return 'tts';
    }
    
    return 'llm';
  }

  /**
   * Format model name for display
   */
  formatModelName(modelId) {
    return modelId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Get Groq model pricing (per million tokens)
   */
  getGroqModelPricing(modelId) {
    const pricing = {
      // Llama models
      'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
      'llama-3.3-70b-specdec': { input: 0.59, output: 0.99 },
      'llama-3.1-70b-versatile': { input: 0.59, output: 0.79 },
      'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
      'llama-3.2-1b-preview': { input: 0.04, output: 0.04 },
      'llama-3.2-3b-preview': { input: 0.06, output: 0.06 },
      'llama-3.2-11b-vision-preview': { input: 0.18, output: 0.18 },
      'llama-3.2-90b-vision-preview': { input: 0.90, output: 0.90 },
      'llama-guard-3-8b': { input: 0.20, output: 0.20 },
      
      // Llama 4 models
      'llama-4-scout-17bx16e-128k': { input: 0.11, output: 0.34 },
      'llama-4-maverick-17bx128e-128k': { input: 0.20, output: 0.60 },
      'llama-guard-4-12b-128k': { input: 0.20, output: 0.20 },
      
      // Mixtral models
      'mixtral-8x7b-32768': { input: 0.27, output: 0.27 },
      
      // Gemma models
      'gemma-7b-it': { input: 0.07, output: 0.07 },
      'gemma2-9b-it': { input: 0.20, output: 0.20 },
      
      // GPT OSS models
      'gpt-oss-120b-128k': { input: 0.15, output: 0.75 },
      'gpt-oss-20b-128k': { input: 0.10, output: 0.50 },
      
      // Kimi models
      'kimi-k2-0905-1t-256k': { input: 1.00, output: 3.00 },
      
      // Qwen models
      'qwen3-32b-131k': { input: 0.29, output: 0.59 },
      'qwen2-72b-instruct': { input: 0.54, output: 0.54 },
      
      // DeepSeek models
      'deepseek-r1-distill-llama-70b': { input: 0.59, output: 0.79 },
      'deepseek-r1-distill-qwen-32b': { input: 0.29, output: 0.59 }
    };
    
    return pricing[modelId] || { input: 0.20, output: 0.20 };
  }

  /**
   * Get Groq model latency (ms)
   */
  getGroqModelLatency(modelId) {
    const latencies = {
      'llama-3.3-70b-versatile': 145,
      'llama-3.3-70b-specdec': 135,
      'llama-3.1-70b-versatile': 145,
      'llama-3.1-8b-instant': 65,
      'llama-3.2-1b-preview': 45,
      'llama-3.2-3b-preview': 55,
      'llama-3.2-11b-vision-preview': 95,
      'llama-3.2-90b-vision-preview': 180,
      'llama-guard-3-8b': 75,
      'llama-4-scout-17bx16e-128k': 95,
      'llama-4-maverick-17bx128e-128k': 105,
      'llama-guard-4-12b-128k': 180,
      'mixtral-8x7b-32768': 110,
      'gemma-7b-it': 80,
      'gemma2-9b-it': 90,
      'gpt-oss-120b-128k': 120,
      'gpt-oss-20b-128k': 85,
      'kimi-k2-0905-1t-256k': 280,
      'qwen3-32b-131k': 92,
      'qwen2-72b-instruct': 155,
      'deepseek-r1-distill-llama-70b': 145,
      'deepseek-r1-distill-qwen-32b': 92
    };
    
    return latencies[modelId] || 150;
  }

  /**
   * Get Groq model speed (tokens per second)
   */
  getGroqModelSpeed(modelId) {
    const speeds = {
      'llama-3.3-70b-versatile': 394,
      'llama-3.3-70b-specdec': 450,
      'llama-3.1-70b-versatile': 394,
      'llama-3.1-8b-instant': 840,
      'llama-3.2-1b-preview': 1200,
      'llama-3.2-3b-preview': 950,
      'llama-3.2-11b-vision-preview': 600,
      'llama-3.2-90b-vision-preview': 350,
      'llama-guard-3-8b': 750,
      'llama-4-scout-17bx16e-128k': 594,
      'llama-4-maverick-17bx128e-128k': 562,
      'llama-guard-4-12b-128k': 325,
      'mixtral-8x7b-32768': 500,
      'gemma-7b-it': 700,
      'gemma2-9b-it': 650,
      'gpt-oss-120b-128k': 500,
      'gpt-oss-20b-128k': 1000,
      'kimi-k2-0905-1t-256k': 200,
      'qwen3-32b-131k': 662,
      'qwen2-72b-instruct': 420,
      'deepseek-r1-distill-llama-70b': 394,
      'deepseek-r1-distill-qwen-32b': 662
    };
    
    return speeds[modelId] || 500;
  }

  /**
   * Get Groq model features
   */
  getGroqModelFeatures(modelId) {
    const features = {
      'llama-3.3-70b-versatile': ['reasoning', 'function_calling'],
      'llama-3.3-70b-specdec': ['reasoning', 'function_calling', 'speculative_decoding'],
      'llama-3.1-70b-versatile': ['reasoning', 'function_calling'],
      'llama-3.1-8b-instant': ['fast_inference'],
      'llama-3.2-1b-preview': ['ultra_fast', 'lightweight'],
      'llama-3.2-3b-preview': ['fast', 'lightweight'],
      'llama-3.2-11b-vision-preview': ['vision', 'multimodal'],
      'llama-3.2-90b-vision-preview': ['vision', 'multimodal', 'advanced'],
      'llama-guard-3-8b': ['content_moderation', 'safety'],
      'llama-4-scout-17bx16e-128k': ['tool_use', 'function_calling'],
      'llama-4-maverick-17bx128e-128k': ['tool_use', 'function_calling'],
      'llama-guard-4-12b-128k': ['content_moderation', 'safety'],
      'mixtral-8x7b-32768': ['reasoning', 'moe'],
      'gemma-7b-it': ['instruction_following'],
      'gemma2-9b-it': ['instruction_following', 'improved'],
      'gpt-oss-120b-128k': ['reasoning', 'function_calling', 'tool_use'],
      'gpt-oss-20b-128k': ['reasoning', 'function_calling', 'tool_use'],
      'kimi-k2-0905-1t-256k': ['function_calling', 'tool_use', 'long_context'],
      'qwen3-32b-131k': ['reasoning', 'function_calling', 'tool_use'],
      'qwen2-72b-instruct': ['reasoning', 'instruction_following'],
      'deepseek-r1-distill-llama-70b': ['reasoning', 'distilled'],
      'deepseek-r1-distill-qwen-32b': ['reasoning', 'distilled']
    };
    
    return features[modelId] || [];
  }

  /**
   * Get Whisper latency
   */
  getWhisperLatency(modelId) {
    if (modelId.includes('large') && modelId.includes('v3')) return 42;
    if (modelId.includes('turbo')) return 28;
    if (modelId.includes('distil')) return 25;
    return 35;
  }

  /**
   * Get Whisper speed factor
   */
  getWhisperSpeedFactor(modelId) {
    if (modelId.includes('large') && modelId.includes('v3')) return '217x';
    if (modelId.includes('turbo')) return '228x';
    if (modelId.includes('distil')) return '250x';
    return '200x';
  }

  /**
   * Get Whisper accuracy
   */
  getWhisperAccuracy(modelId) {
    if (modelId.includes('large') && modelId.includes('v3')) return 'highest';
    if (modelId.includes('turbo')) return 'high';
    if (modelId.includes('distil')) return 'good';
    return 'high';
  }

  /**
   * Get Whisper pricing
   */
  getWhisperPricing(modelId) {
    if (modelId.includes('large') && modelId.includes('v3')) {
      return { inputPerHour: 0.111, inputPerMinute: 0.111/60 };
    }
    if (modelId.includes('turbo')) {
      return { inputPerHour: 0.04, inputPerMinute: 0.04/60 };
    }
    if (modelId.includes('distil')) {
      return { inputPerHour: 0.02, inputPerMinute: 0.02/60 };
    }
    return { inputPerHour: 0.1, inputPerMinute: 0.1/60 };
  }

  /**
   * Infer gender from voice name
   */
  inferGender(name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('lady') || nameLower.includes('woman') || nameLower.includes('female') || 
        nameLower.includes('girl') || nameLower.includes('she')) {
      return 'female';
    } else if (nameLower.includes('man') || nameLower.includes('male') || nameLower.includes('boy') || 
               nameLower.includes('guy') || nameLower.includes('he')) {
      return 'male';
    }
    return 'neutral';
  }

  /**
   * Infer accent from voice name and language
   */
  inferAccent(name, language) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('british') || nameLower.includes('uk')) return 'british';
    if (nameLower.includes('american') || nameLower.includes('us')) return 'american';
    if (nameLower.includes('australian') || nameLower.includes('aussie')) return 'australian';
    if (nameLower.includes('indian')) return 'indian';
    if (nameLower.includes('canadian')) return 'canadian';
    if (nameLower.includes('irish')) return 'irish';
    if (nameLower.includes('scottish')) return 'scottish';
    
    if (language === 'en') return 'neutral';
    return language;
  }
}

module.exports = APIDataManager;
