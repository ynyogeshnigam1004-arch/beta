/**
 * Cartesia Service
 * Handles text-to-speech conversion using Cartesia API with ultra-low latency
 */

const axios = require('axios');

class CartesiaService {
  constructor() {
    this.apiKey = process.env.CARTESIA_API_KEY;
    // Hardcoded Cartesia API URL - no need for environment variable
    this.apiUrl = 'https://api.cartesia.ai';
    
    // Rate limiting configuration
    this.rateLimit = {
      maxTokensPerMinute: 250,
      maxRequestsPerMinute: 60,
      currentTokensUsed: 0,
      currentRequestsUsed: 0,
      resetTime: Date.now() + 60000, // Reset every minute
      requestQueue: [],
      isProcessingQueue: false
    };
    
    if (!this.apiKey) {
      console.warn('⚠️  CARTESIA_API_KEY not set. Cartesia service will not function properly.');
    }
    
    // Available Cartesia models (based on Cartesia's latest offerings)
    this.models = {
      'sonic-2024-10': {
        id: 'sonic-2024-10',
        name: 'Sonic 2.0',
        latency: 95,  // ~95ms (fastest)
        description: 'Latest Sonic model with improved quality and speed - RECOMMENDED'
      },
      'sonic-turbo': {
        id: 'sonic-turbo',
        name: 'Sonic Turbo',
        latency: 110,  // ~110ms
        description: 'High-speed synthesis with balanced quality'
      },
      'sonic': {
        id: 'sonic',
        name: 'Sonic',
        latency: 135,  // ~135ms
        description: 'Original Sonic model - reliable and fast'
      },
      'sonic-english': {
        id: 'sonic-english',
        name: 'Sonic English',
        latency: 125,  // ~125ms
        description: 'English-only, optimized for clarity'
      },
      'sonic-multilingual': {
        id: 'sonic-multilingual',
        name: 'Sonic Multilingual',
        latency: 155,  // ~155ms
        description: 'Support for multiple languages'
      }
    };
    
    // Voices will be fetched dynamically from API
    this.voices = {};
    this.voicesFetched = false;
    
    // Default voice ID (British Lady)
    this.defaultVoiceId = 'a0e99841-438c-4a64-b679-ae501e7d6091';
    
    console.log('🔊 Cartesia Service initialized');
    
    // Start rate limit reset timer
    this.startRateLimitTimer();
    
    // Fetch voices from API on initialization
    this.fetchVoicesFromAPI();
  }

  /**
   * Start rate limit reset timer
   */
  startRateLimitTimer() {
    setInterval(() => {
      this.rateLimit.currentTokensUsed = 0;
      this.rateLimit.currentRequestsUsed = 0;
      this.rateLimit.resetTime = Date.now() + 60000;
      console.log('🔄 Rate limit reset - tokens and requests cleared');
    }, 60000); // Reset every minute
  }

  /**
   * Check if request can be made within rate limits
   * @param {string} text - Text to convert (for token estimation)
   * @returns {Object} Rate limit status
   */
  checkRateLimit(text) {
    const estimatedTokens = this.estimateTokens(text);
    const now = Date.now();
    
    // Reset counters if minute has passed
    if (now > this.rateLimit.resetTime) {
      this.rateLimit.currentTokensUsed = 0;
      this.rateLimit.currentRequestsUsed = 0;
      this.rateLimit.resetTime = now + 60000;
    }
    
    const canMakeRequest = 
      this.rateLimit.currentTokensUsed + estimatedTokens <= this.rateLimit.maxTokensPerMinute &&
      this.rateLimit.currentRequestsUsed < this.rateLimit.maxRequestsPerMinute;
    
    return {
      canMakeRequest,
      tokensRemaining: this.rateLimit.maxTokensPerMinute - this.rateLimit.currentTokensUsed,
      requestsRemaining: this.rateLimit.maxRequestsPerMinute - this.rateLimit.currentRequestsUsed,
      estimatedTokens,
      resetIn: Math.max(0, this.rateLimit.resetTime - now)
    };
  }

  /**
   * Estimate token count for text (rough approximation)
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Update rate limit counters
   * @param {number} tokensUsed - Number of tokens used
   */
  updateRateLimit(tokensUsed) {
    this.rateLimit.currentTokensUsed += tokensUsed;
    this.rateLimit.currentRequestsUsed += 1;
    
    console.log(`📊 Rate limit: ${this.rateLimit.currentTokensUsed}/${this.rateLimit.maxTokensPerMinute} tokens, ${this.rateLimit.currentRequestsUsed}/${this.rateLimit.maxRequestsPerMinute} requests`);
  }

  /**
   * Wait for rate limit reset if needed
   * @param {number} tokensNeeded - Tokens needed for request
   * @returns {Promise<void>}
   */
  async waitForRateLimit(tokensNeeded) {
    const rateLimitStatus = this.checkRateLimit('');
    
    if (!rateLimitStatus.canMakeRequest) {
      const waitTime = rateLimitStatus.resetIn + 1000; // Add 1 second buffer
      console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Fetch all available voices from Cartesia API
   * @returns {Promise<Object>} Map of voices
   */
  async fetchVoicesFromAPI() {
    try {
      console.log('🎤 Fetching voices from Cartesia API...');
      
      const response = await axios.get(
        `${this.apiUrl}/voices`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Cartesia-Version': '2024-06-10'
          },
          timeout: 10000
        }
      );

      if (response.data && Array.isArray(response.data)) {
        // Transform API response to our format
        this.voices = {};
        response.data.forEach(voice => {
          this.voices[voice.id] = {
            id: voice.id,
            name: voice.name,
            language: voice.language || 'en',
            gender: this.inferGender(voice.name),
            accent: this.inferAccent(voice.name, voice.language),
            description: voice.description || `${voice.name} voice`,
            embedding: voice.embedding || null,
            is_public: voice.is_public !== undefined ? voice.is_public : true
          };
        });
        
        this.voicesFetched = true;
        console.log(`✅ Loaded ${Object.keys(this.voices).length} voices from Cartesia API`);
      } else {
        console.warn('⚠️ Unexpected Cartesia API response format, using fallback voices');
        this.useFallbackVoices();
      }
    } catch (error) {
      console.error('❌ Error fetching voices from Cartesia API:', error.message);
      console.log('ℹ️ Using fallback voices');
      this.useFallbackVoices();
    }
    
    return this.voices;
  }

  /**
   * Use fallback voices if API fetch fails
   */
  useFallbackVoices() {
    this.voices = {
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
      },
      'b7d50908-b17c-442d-ad8d-810c63997ed9': {
        id: 'b7d50908-b17c-442d-ad8d-810c63997ed9',
        name: 'American Female',
        language: 'en',
        gender: 'female',
        accent: 'american',
        description: 'Warm American female voice',
        is_public: true
      },
      '820a3788-2b37-4d21-847a-b65d8a68c99a': {
        id: '820a3788-2b37-4d21-847a-b65d8a68c99a',
        name: 'Australian Male',
        language: 'en',
        gender: 'male',
        accent: 'australian',
        description: 'Friendly Australian male voice',
        is_public: true
      },
      'e13cae5c-ec59-4f71-b0a6-266df3c9e12a': {
        id: 'e13cae5c-ec59-4f71-b0a6-266df3c9e12a',
        name: 'British Male',
        language: 'en',
        gender: 'male',
        accent: 'british',
        description: 'Authoritative British male voice',
        is_public: true
      },
      'f785d0e9-4a2e-4c73-8b49-9e84fd583fcd': {
        id: 'f785d0e9-4a2e-4c73-8b49-9e84fd583fcd',
        name: 'Indian Female',
        language: 'en',
        gender: 'female',
        accent: 'indian',
        description: 'Professional Indian female voice',
        is_public: true
      }
    };
    this.voicesFetched = true;
  }

  /**
   * Infer gender from voice name
   * @param {string} name - Voice name
   * @returns {string} Gender (male/female/neutral)
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
   * @param {string} name - Voice name
   * @param {string} language - Language code
   * @returns {string} Accent
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
    
    // Default by language
    if (language === 'en') return 'neutral';
    return language;
  }

  /**
   * Convert text to speech using Cartesia
   * @param {string} text - Text to convert
   * @param {Object} options - Options for TTS
   * @returns {Promise<Buffer>} Audio buffer
   */
  async textToSpeech(text, options = {}) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    // Check rate limit before making request
    const rateLimitStatus = this.checkRateLimit(text);
    if (!rateLimitStatus.canMakeRequest) {
      console.warn(`⚠️ Rate limit reached. Tokens: ${rateLimitStatus.tokensRemaining}/${this.rateLimit.maxTokensPerMinute}, Requests: ${rateLimitStatus.requestsRemaining}/${this.rateLimit.maxRequestsPerMinute}`);
      await this.waitForRateLimit(rateLimitStatus.estimatedTokens);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🗣️ Converting text to speech with Cartesia (attempt ${attempt}/${maxRetries}):`, text.substring(0, 50) + '...');

        const model = options.model || 'sonic-english';
        const voiceId = options.voiceId || this.defaultVoiceId;

        const response = await axios.post(
          `${this.apiUrl}/tts/bytes`,
          {
            model_id: (this.models[model]?.id) || 'sonic-english',
            transcript: text,
            voice: {
              mode: "id",
              id: voiceId
            },
            output_format: {
              container: "wav",
              encoding: "pcm_s16le",
              sample_rate: 16000
            },
            voice_settings: {
              stability: 0.9,
              similarity_boost: 0.9,
              style: 0.1,
              use_speaker_boost: true
            }
          },
          {
            headers: {
              'X-API-Key': this.apiKey,
              'Content-Type': 'application/json',
              'Cartesia-Version': '2024-06-10'
            },
            responseType: 'arraybuffer',
            timeout: 30000
          }
        );

        console.log('✅ Cartesia TTS conversion completed');
        
        // Update rate limit counters
        this.updateRateLimit(rateLimitStatus.estimatedTokens);
        
        return Buffer.from(response.data);

      } catch (error) {
        const statusCode = error.response?.status;
        const isRateLimit = statusCode === 429;
        const isServerError = statusCode >= 500;
        
        console.error(`❌ Cartesia TTS error (attempt ${attempt}/${maxRetries}):`, error.response?.data || error.message);
        
        // If it's a rate limit or server error and we have retries left, wait and retry
        if ((isRateLimit || isServerError) && attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Rate limited or server error. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If it's a client error (400-499) that's not rate limiting, don't retry
        if (statusCode >= 400 && statusCode < 500 && !isRateLimit) {
          throw new Error(`Cartesia TTS failed: ${error.message}`);
        }
        
        // If we've exhausted retries, throw the error
        if (attempt === maxRetries) {
          throw new Error(`Cartesia TTS failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Stream text to speech for lower latency
   * @param {string} text - Text to convert
   * @param {Function} onAudioChunk - Callback for each audio chunk
   * @param {Object} options - Options for TTS
   * @returns {Promise<void>}
   */
  async textToSpeechStreaming(text, onAudioChunk, options = {}) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    // Check rate limit before making request
    const rateLimitStatus = this.checkRateLimit(text);
    if (!rateLimitStatus.canMakeRequest) {
      console.warn(`⚠️ Rate limit reached for streaming. Tokens: ${rateLimitStatus.tokensRemaining}/${this.rateLimit.maxTokensPerMinute}, Requests: ${rateLimitStatus.requestsRemaining}/${this.rateLimit.maxRequestsPerMinute}`);
      await this.waitForRateLimit(rateLimitStatus.estimatedTokens);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🌊 Starting streaming Cartesia TTS (attempt ${attempt}/${maxRetries})...`);

        const model = options.model || 'sonic-english';
        const voiceId = options.voiceId || this.defaultVoiceId;

        const response = await axios.post(
          `${this.apiUrl}/tts/bytes`,
          {
            model_id: (this.models[model]?.id) || 'sonic-english',
            transcript: text,
            voice: {
              mode: "id",
              id: voiceId
            },
            output_format: {
              container: "wav",
              encoding: "pcm_s16le",
              sample_rate: 16000
            },
            voice_settings: {
              stability: 0.9,
              similarity_boost: 0.9,
              style: 0.1,
              use_speaker_boost: true
            }
          },
          {
            headers: {
              'X-API-Key': this.apiKey,
              'Content-Type': 'application/json',
              'Cartesia-Version': '2024-06-10'
            },
            responseType: 'stream',
            timeout: 60000
          }
        );

        let totalBytes = 0;

        return new Promise((resolve, reject) => {
          response.data.on('data', (chunk) => {
            try {
              totalBytes += chunk.length;
              onAudioChunk(chunk);
            } catch (error) {
              console.error('❌ Error processing Cartesia audio chunk:', error);
              reject(error);
            }
          });

        response.data.on('end', () => {
          console.log(`✅ Cartesia streaming TTS completed. Total bytes: ${totalBytes}`);
          
          // Update rate limit counters
          this.updateRateLimit(rateLimitStatus.estimatedTokens);
          
          resolve();
        });

          response.data.on('error', (error) => {
            console.error('❌ Cartesia stream error:', error);
            reject(error);
          });
        });

      } catch (error) {
        const statusCode = error.response?.status;
        const isRateLimit = statusCode === 429;
        const isServerError = statusCode >= 500;
        
        console.error(`❌ Cartesia streaming TTS error (attempt ${attempt}/${maxRetries}):`, error.response?.data || error.message);
        
        // If it's a rate limit or server error and we have retries left, wait and retry
        if ((isRateLimit || isServerError) && attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Rate limited or server error. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If it's a client error (400-499) that's not rate limiting, don't retry
        if (statusCode >= 400 && statusCode < 500 && !isRateLimit) {
          throw new Error(`Streaming Cartesia TTS failed: ${error.message}`);
        }
        
        // If we've exhausted retries, throw the error
        if (attempt === maxRetries) {
          throw new Error(`Streaming Cartesia TTS failed after ${maxRetries} attempts: ${error.message}`);
        }
      }
    }
  }

  /**
   * Buffer text chunks and convert when complete sentences are formed
   * @param {string} textChunk - New text chunk to add
   * @param {Object} buffer - Buffer object to track state
   * @param {Function} onAudioChunk - Callback for audio chunks
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async bufferAndConvertText(textChunk, buffer, onAudioChunk, options = {}) {
    try {
      // Add new chunk to buffer
      buffer.text = (buffer.text || '') + textChunk;

      // Check if we have a complete sentence
      const sentenceEnders = /[.!?]\s*$/;
      const wordCount = buffer.text.split(/\s+/).length;

      // Convert to speech if we have a sentence or enough words
      const shouldConvert = 
        sentenceEnders.test(buffer.text) || 
        (wordCount >= 10 && /[,;]\s*$/.test(buffer.text));

      if (shouldConvert) {
        const textToConvert = buffer.text.trim();
        
        if (textToConvert.length > 0) {
          console.log('📢 Converting buffered text:', textToConvert);
          await this.textToSpeechStreaming(textToConvert, onAudioChunk, options);
        }

        buffer.text = '';
      }

    } catch (error) {
      console.error('❌ Error in buffer and convert:', error);
      throw error;
    }
  }

  /**
   * Flush any remaining text in the buffer
   * @param {Object} buffer - Buffer object
   * @param {Function} onAudioChunk - Callback for audio chunks
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async flushBuffer(buffer, onAudioChunk, options = {}) {
    try {
      if (buffer.text && buffer.text.trim().length > 0) {
        console.log('🔄 Flushing remaining buffer:', buffer.text);
        await this.textToSpeechStreaming(buffer.text.trim(), onAudioChunk, options);
        buffer.text = '';
      }
    } catch (error) {
      console.error('❌ Error flushing buffer:', error);
      throw error;
    }
  }

  /**
   * Fetch available models from Cartesia API
   * @returns {Promise<Object>} Map of available models
   */
  async fetchModelsFromAPI() {
    try {
      console.log('🔄 Fetching TTS models from Cartesia API...');
      
      // Cartesia doesn't have a /models endpoint, so we use hardcoded models
      // These are the known Cartesia TTS models based on their documentation
      console.log('ℹ️ Cartesia API doesn\'t have a /models endpoint, using known models');
      return this.models; // Return hardcoded models

    } catch (error) {
      console.error('❌ Error fetching models from Cartesia API:', error.message);
      console.log('ℹ️ Using fallback TTS models');
      return this.models; // Fallback to hardcoded models
    }
  }

  /**
   * Fetch all available data from Cartesia API (models + voices)
   * @returns {Promise<Object>} All available data
   */
  async fetchAllFromAPI() {
    try {
      console.log('🔄 Fetching all data from Cartesia API...');
      
      // Fetch both models and voices in parallel
      const [models, voices] = await Promise.all([
        this.fetchModelsFromAPI(),
        this.fetchVoicesFromAPI()
      ]);
      
      return {
        models,
        voices,
        fetchedAt: new Date().toISOString(),
        totalModels: Object.keys(models).length,
        totalVoices: Object.keys(voices).length
      };
    } catch (error) {
      console.error('❌ Error fetching all data from Cartesia API:', error.message);
      return {
        models: this.models,
        voices: this.voices,
        fetchedAt: new Date().toISOString(),
        totalModels: Object.keys(this.models).length,
        totalVoices: Object.keys(this.voices).length,
        error: error.message
      };
    }
  }

  /**
   * Get available models
   * @returns {Object} Map of available models with metadata
   */
  getAvailableModels() {
    return this.models;
  }

  /**
   * Get available voices
   * @returns {Promise<Object>} Map of available voices with metadata
   */
  async getAvailableVoices() {
    // If voices haven't been fetched yet, wait for them
    if (!this.voicesFetched) {
      await this.fetchVoicesFromAPI();
    }
    return this.voices;
  }

  /**
   * Get voice by ID
   * @param {string} voiceId - Voice ID to lookup
   * @returns {Object|null} Voice object or null
   */
  getVoiceById(voiceId) {
    return this.voices[voiceId] || null;
  }

  /**
   * Get current rate limit status
   * @returns {Object} Rate limit status information
   */
  getRateLimitStatus() {
    const now = Date.now();
    const resetIn = Math.max(0, this.rateLimit.resetTime - now);
    
    return {
      tokensUsed: this.rateLimit.currentTokensUsed,
      tokensLimit: this.rateLimit.maxTokensPerMinute,
      tokensRemaining: this.rateLimit.maxTokensPerMinute - this.rateLimit.currentTokensUsed,
      requestsUsed: this.rateLimit.currentRequestsUsed,
      requestsLimit: this.rateLimit.maxRequestsPerMinute,
      requestsRemaining: this.rateLimit.maxRequestsPerMinute - this.rateLimit.currentRequestsUsed,
      resetInMs: resetIn,
      resetInSeconds: Math.ceil(resetIn / 1000),
      isNearLimit: this.rateLimit.currentTokensUsed > this.rateLimit.maxTokensPerMinute * 0.8
    };
  }

  /**
   * Health check for Cartesia API
   * @returns {Promise<boolean>} True if API is accessible
   */
  async healthCheck() {
    try {
      // Simple test with minimal text
      await this.textToSpeech('Test', { model: 'sonic-english' });
      console.log('✅ Cartesia API health check passed');
      return true;
    } catch (error) {
      console.error('❌ Cartesia API health check failed:', error.message);
      return false;
    }
  }
}

module.exports = CartesiaService;

