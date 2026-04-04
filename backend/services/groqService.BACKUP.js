/**
 * Groq API Service
 * Handles speech-to-text transcription and LLM chat completions using Groq API
 */

const axios = require('axios');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');
const os = require('os');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    // Hardcoded Groq API URL - no need for environment variable
    this.apiUrl = 'https://api.groq.com/openai/v1';
    this.model = process.env.DEFAULT_LLM_MODEL || process.env.LLM_MODEL || 'llama-3.1-8b-instant';
    this.temperature = parseFloat(process.env.LLM_TEMPERATURE) || 0.7;
    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS) || 150;
    
    // Rate limiting - More conservative for free tier
    this.requestCounts = new Map(); // Track requests per minute
    this.lastResetTime = Date.now();
    this.maxRequestsPerMinute = 10; // Very conservative limit (Groq free tier is 30)
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    if (!this.apiKey) {
      console.warn('⚠️  GROQ_API_KEY not set. Groq service will not function properly.');
    }
  }

  // Rate limiting methods
  checkRateLimit() {
    const now = Date.now();
    const minuteKey = Math.floor(now / 60000); // Reset every minute
    
    // Reset counters if new minute
    if (minuteKey !== this.lastResetTime) {
      this.requestCounts.clear();
      this.lastResetTime = minuteKey;
      console.log('🔄 Groq rate limit reset - new minute started');
    }
    
    const currentCount = this.requestCounts.get(minuteKey) || 0;
    
    if (currentCount >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (now % 60000); // Time until next minute
      console.warn(`⚠️ Groq rate limit reached (${currentCount}/${this.maxRequestsPerMinute}). Waiting ${Math.ceil(waitTime/1000)} seconds...`);
      return false;
    }
    
    this.requestCounts.set(minuteKey, currentCount + 1);
    console.log(`📊 Groq requests: ${currentCount + 1}/${this.maxRequestsPerMinute} this minute`);
    return true;
  }

  /**
   * Wait for rate limit to reset
   * @returns {Promise<void>}
   */
  async waitForRateLimitReset() {
    const now = Date.now();
    const waitTime = 60000 - (now % 60000) + 1000; // Wait until next minute + 1 second buffer
    console.log(`⏳ Waiting ${Math.ceil(waitTime/1000)} seconds for Groq rate limit reset...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    console.log('✅ Rate limit reset complete, resuming...');
  }

  // Validate and clean messages for API
  validateAndCleanMessages(messages) {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }
    
    const cleanedMessages = messages.map((msg, index) => {
      if (!msg.role || !msg.content) {
        throw new Error(`Message ${index} missing role or content`);
      }
      
      // Clean content - remove empty or very short messages
      let content = msg.content.trim();
      
      // Skip messages that are too short or just punctuation
      if (content.length < 2 || /^[.,!?;:\s]*$/.test(content)) {
        console.warn(`⚠️ Skipping message ${index}: "${content}" (too short or empty)`);
        return null;
      }
      
      return {
        role: msg.role,
        content: content
      };
    }).filter(msg => msg !== null);
    
    // Ensure we have at least one message
    if (cleanedMessages.length === 0) {
      throw new Error('No valid messages after cleaning');
    }
    
    // Note: We don't enforce alternating messages as this can cause issues with Groq API
    
    console.log('✅ Messages validated and cleaned:', cleanedMessages.length, 'messages');
    return cleanedMessages;
  }

  // Available Groq models - Exact names from Groq API
  get availableModels() {
    return {
      // GPT OSS Models - Reasoning & Function Calling
      'gpt-oss-20b-128k': {
        name: 'GPT OSS 20B 128k',
        contextWindow: 131072,
        description: 'Fast reasoning and function calling',
        category: 'reasoning',
        features: ['reasoning', 'function_calling', 'tool_use']
      },
      'gpt-oss-120b-128k': {
        name: 'GPT OSS 120B 128k',
        contextWindow: 131072,
        description: 'Advanced reasoning and function calling - most capable',
        category: 'reasoning',
        features: ['reasoning', 'function_calling', 'tool_use']
      },
      // Kimi K2 - Function Calling
      'kimi-k2-0905-1t-256k': {
        name: 'Kimi K2-0905 1T 256k',
        contextWindow: 256000,
        description: 'Specialized function calling and tool use',
        category: 'function_calling',
        features: ['function_calling', 'tool_use']
      },
      // Llama 4 Models - Function Calling
      'llama-4-scout-17bx16e-128k': {
        name: 'Llama 4 Scout (17Bx16E) 128k',
        contextWindow: 128000,
        description: 'Advanced function calling and tool use',
        category: 'function_calling',
        features: ['tool_use', 'function_calling']
      },
      'llama-4-maverick-17bx128e-128k': {
        name: 'Llama 4 Maverick (17Bx128E) 128k',
        contextWindow: 128000,
        description: 'Versatile Llama 4 model',
        category: 'function_calling',
        features: ['tool_use', 'function_calling']
      },
      // Llama Guard 4
      'llama-guard-4-12b-128k': {
        name: 'Llama Guard 4 12B 128k',
        contextWindow: 128000,
        description: 'Safety and content moderation',
        category: 'safety',
        features: ['content_moderation', 'safety']
      },
      // Qwen 3 32B - Reasoning & Function Calling
      'qwen3-32b-131k': {
        name: 'Qwen3 32B 131k',
        contextWindow: 131072,
        description: 'Excellent reasoning and function calling capabilities',
        category: 'reasoning',
        features: ['reasoning', 'function_calling', 'tool_use']
      },
      // Llama 3.3 - Latest and best
      'llama-3.3-70b-versatile-128k': {
        name: 'Llama 3.3 70B Versatile 128k',
        contextWindow: 128000,
        description: 'Latest Llama model - best for conversation',
        category: 'general'
      },
      // Llama 3.1 models
      'llama-3.1-8b-instant-128k': {
        name: 'Llama 3.1 8B Instant 128k',
        contextWindow: 128000,
        description: 'Ultra-fast responses',
        category: 'general'
      },
      // Mixtral models
      'mixtral-8x7b-32768': {
        name: 'Mixtral 8x7b 32768',
        contextWindow: 32768,
        description: 'Excellent for complex reasoning',
        category: 'general'
      }
    };

    // Available Whisper models for STT (Speech-to-Text)
    this.whisperModels = {
      'whisper-large-v3': {
        name: 'Whisper V3 Large',
        speedFactor: '217x',
        pricePerHour: 0.111,
        pricePerMinute: 0.111 / 60, // $0.00185 per minute
        latency: 42,  // ~42ms average latency with WebSocket streaming
        description: 'Most accurate transcription',
        accuracy: 'highest'
      },
      'whisper-large-v3-turbo': {
        name: 'Whisper Large v3 Turbo',
        speedFactor: '228x',
        pricePerHour: 0.04,
        pricePerMinute: 0.04 / 60, // $0.000667 per minute
        latency: 28,  // ~28ms average latency (fastest)
        description: 'Faster transcription with great accuracy',
        accuracy: 'high'
      },
      'distil-whisper-large-v3-en': {
        name: 'Distil Whisper English',
        speedFactor: '250x',
        pricePerHour: 0.02,
        pricePerMinute: 0.02 / 60, // $0.000333 per minute
        latency: 25,  // ~25ms average latency (ultra-fast, English only)
        description: 'English only, fastest',
        accuracy: 'good'
      }
    };

    // Pricing information (per minute or per million tokens)
    this.pricing = {
      stt: {
        'whisper-large-v3': { 
          inputPerHour: 0.111,
          inputPerMinute: 0.111 / 60, // $0.00185/min
          unit: 'per minute' 
        },
        'whisper-large-v3-turbo': { 
          inputPerHour: 0.04,
          inputPerMinute: 0.04 / 60, // $0.000667/min
          unit: 'per minute' 
        },
        'distil-whisper-large-v3-en': { 
          inputPerHour: 0.02,
          inputPerMinute: 0.02 / 60, // $0.000333/min
          unit: 'per minute' 
        }
      },
      llm: {
        // GPT OSS Models - Updated pricing from Groq API
        'gpt-oss-20b-128k': { 
          input: 0.10,
          output: 0.50,
          latency: 85,    // ~85ms average latency with WebSocket streaming
          unit: 'per million tokens' 
        },
        'gpt-oss-120b-128k': { 
          input: 0.15,
          output: 0.75,
          latency: 120,   // ~120ms average latency
          unit: 'per million tokens' 
        },
        // Kimi K2 Models
        'kimi-k2-0905-1t-256k': { 
          input: 1.00,
          output: 3.00,
          latency: 280,   // ~280ms average latency
          unit: 'per million tokens' 
        },
        // Llama 4 Models
        'llama-4-scout-17bx16e-128k': { 
          input: 0.11,
          output: 0.34,
          latency: 95,    // ~95ms average latency
          unit: 'per million tokens' 
        },
        'llama-4-maverick-17bx128e-128k': { 
          input: 0.20,
          output: 0.60,
          latency: 105,   // ~105ms average latency
          unit: 'per million tokens' 
        },
        // Llama Guard 4
        'llama-guard-4-12b-128k': { 
          input: 0.20,
          output: 0.20,
          latency: 180,   // ~180ms average latency
          unit: 'per million tokens' 
        },
        // Qwen 3 Models
        'qwen3-32b-131k': { 
          input: 0.29,
          output: 0.59,
          latency: 92,    // ~92ms average latency
          unit: 'per million tokens' 
        },
        // Llama 3.3 Models
        'llama-3.3-70b-versatile-128k': { 
          input: 0.59,
          output: 0.79,
          latency: 145,   // ~145ms average latency with WebSocket streaming
          unit: 'per million tokens' 
        },
        // Llama 3.1 Models
        'llama-3.1-8b-instant-128k': { 
          input: 0.05,
          output: 0.08,
          latency: 65,    // ~65ms average latency (fastest)
          unit: 'per million tokens' 
        },
        // Mixtral Models
        'mixtral-8x7b-32768': { 
          input: 0.10,
          output: 0.30,
          latency: 110,   // ~110ms average latency
          unit: 'per million tokens' 
        }
      }
    };

    console.log(`🤖 Groq Service initialized with model: ${this.model}`);
  }

  /**
   * Convert WebM audio to WAV format using FFmpeg
   * @param {Buffer} webmBuffer - WebM audio buffer
   * @returns {Promise<Buffer>} WAV audio buffer
   */
  async convertWebMToWAV(webmBuffer) {
    return new Promise((resolve, reject) => {
      const tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`);
      const tempOutputPath = path.join(os.tmpdir(), `output_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`);

      try {
        // Validate input buffer
        if (!webmBuffer || webmBuffer.length === 0) {
          throw new Error('Empty or invalid audio buffer');
        }
        
        // Check minimum size for valid audio
        if (webmBuffer.length < 1000) {
          throw new Error(`Audio buffer too small: ${webmBuffer.length} bytes (minimum 1000 bytes required)`);
        }

        // Check if buffer looks like WebM (basic validation)
        const webmHeader = webmBuffer.slice(0, 4);
        const isValidWebM = webmHeader[0] === 0x1A && webmHeader[1] === 0x45 && 
                           webmHeader[2] === 0xDF && webmHeader[3] === 0xA3;
        
        if (!isValidWebM) {
          console.warn('⚠️ Buffer does not appear to be valid WebM format, attempting conversion anyway...');
        }

        // Write WebM buffer to temporary file
        fs.writeFileSync(tempInputPath, webmBuffer);
        console.log(`📁 Wrote temp WebM file: ${tempInputPath} (${webmBuffer.length} bytes)`);

        // Enhanced FFmpeg options to handle corrupted WebM files
        ffmpeg(tempInputPath)
          .inputOptions([
            '-loglevel', 'error',  // Only show errors
            '-f', 'webm',  // Explicitly set input format
            '-fflags', '+genpts',  // Generate presentation timestamps
            '-avoid_negative_ts', 'make_zero',  // Handle negative timestamps
            '-analyzeduration', '1000000',  // Analyze more data
            '-probesize', '1000000'  // Probe more data
          ])
          .audioCodec('pcm_s16le')  // PCM 16-bit little-endian
          .audioChannels(1)  // Mono
          .audioFrequency(16000)  // 16kHz sample rate
          .format('wav')  // WAV output
          .outputOptions([
            '-ar', '16000',  // Force 16kHz
            '-ac', '1',  // Force mono
            '-acodec', 'pcm_s16le',  // Ensure PCM encoding
            '-y'  // Overwrite output file
          ])
          .on('start', (commandLine) => {
            console.log('🔄 FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            // Log progress for debugging
            if (progress.percent) {
              console.log(`🔄 Conversion progress: ${Math.round(progress.percent)}%`);
            }
          })
          .on('end', () => {
            try {
              // Check if output file exists and has content
              if (!fs.existsSync(tempOutputPath)) {
                throw new Error('Output file was not created');
              }
              
              const wavBuffer = fs.readFileSync(tempOutputPath);
              if (wavBuffer.length === 0) {
                throw new Error('Output file is empty');
              }
              
              console.log(`✅ Conversion successful: ${wavBuffer.length} bytes`);
              
              // Clean up temp files
              try {
                fs.unlinkSync(tempInputPath);
                fs.unlinkSync(tempOutputPath);
              } catch (err) {
                console.warn('⚠️ Could not delete temp files:', err.message);
              }
              
              resolve(wavBuffer);
            } catch (readError) {
              console.error('❌ Error reading WAV file:', readError.message);
              reject(new Error('Failed to read converted audio file'));
            }
          })
          .on('error', (err, stdout, stderr) => {
            console.error('❌ FFmpeg error:', err.message);
            if (stderr) console.error('FFmpeg stderr:', stderr);
            
            // Clean up temp files on error
            try {
              if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
              if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
            } catch (cleanupErr) {
              console.warn('⚠️ Could not delete temp files:', cleanupErr.message);
            }
            
            // Provide more specific error messages
            let errorMessage = 'Audio format conversion failed';
            if (err.message.includes('Invalid data')) {
              errorMessage = 'Invalid or corrupted audio data received';
            } else if (err.message.includes('EBML header parsing failed')) {
              errorMessage = 'WebM file header is corrupted or invalid';
            } else if (err.message.includes('No such file')) {
              errorMessage = 'Temporary file not found during conversion';
            }
            
            reject(new Error(errorMessage));
          })
          .save(tempOutputPath);
      } catch (error) {
        console.error('❌ Error in convertWebMToWAV:', error.message);
        reject(error);
      }
    });
  }

  /**
   * Alternative WebM to WAV conversion for corrupted files
   * @param {Buffer} webmBuffer - WebM audio buffer
   * @returns {Promise<Buffer>} WAV audio buffer
   */
  async convertWebMToWAVAlternative(webmBuffer) {
    return new Promise((resolve, reject) => {
      const tempInputPath = path.join(os.tmpdir(), `input_alt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`);
      const tempOutputPath = path.join(os.tmpdir(), `output_alt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.wav`);

      try {
        // Write WebM buffer to temporary file
        fs.writeFileSync(tempInputPath, webmBuffer);
        console.log(`📁 Wrote temp WebM file (alternative): ${tempInputPath} (${webmBuffer.length} bytes)`);

        // Alternative FFmpeg options for corrupted WebM files
        ffmpeg(tempInputPath)
          .inputOptions([
            '-loglevel', 'error',
            '-f', 'webm',
            '-fflags', '+ignidx',  // Ignore index
            '-avoid_negative_ts', 'make_zero',
            '-analyzeduration', '2000000',  // Analyze even more data
            '-probesize', '2000000',  // Probe even more data
            '-err_detect', 'ignore_err'  // Ignore errors during detection
          ])
          .audioCodec('pcm_s16le')
          .audioChannels(1)
          .audioFrequency(16000)
          .format('wav')
          .outputOptions([
            '-ar', '16000',
            '-ac', '1',
            '-acodec', 'pcm_s16le',
            '-y',
            '-shortest'  // Stop at shortest stream
          ])
          .on('start', (commandLine) => {
            console.log('🔄 Alternative FFmpeg command:', commandLine);
          })
          .on('end', () => {
            try {
              if (!fs.existsSync(tempOutputPath)) {
                throw new Error('Alternative output file was not created');
              }
              
              const wavBuffer = fs.readFileSync(tempOutputPath);
              if (wavBuffer.length === 0) {
                throw new Error('Alternative output file is empty');
              }
              
              console.log(`✅ Alternative conversion successful: ${wavBuffer.length} bytes`);
              
              // Clean up temp files
              try {
                fs.unlinkSync(tempInputPath);
                fs.unlinkSync(tempOutputPath);
              } catch (err) {
                console.warn('⚠️ Could not delete temp files:', err.message);
              }
              
              resolve(wavBuffer);
            } catch (readError) {
              console.error('❌ Error reading alternative WAV file:', readError.message);
              reject(new Error('Failed to read alternative converted audio file'));
            }
          })
          .on('error', (err, stdout, stderr) => {
            console.error('❌ Alternative FFmpeg error:', err.message);
            if (stderr) console.error('Alternative FFmpeg stderr:', stderr);
            
            // Clean up temp files on error
            try {
              if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
              if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
            } catch (cleanupErr) {
              console.warn('⚠️ Could not delete temp files:', cleanupErr.message);
            }
            
            reject(new Error(`Alternative conversion failed: ${err.message}`));
          })
          .save(tempOutputPath);
      } catch (error) {
        console.error('❌ Error in convertWebMToWAVAlternative:', error.message);
        reject(error);
      }
    });
  }

  /**
   * Transcribe audio to text using Groq's Whisper API
   * @param {Buffer} audioBuffer - Audio data buffer
   * @param {string} format - Audio format (e.g., 'wav', 'mp3', 'webm')
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(audioBuffer, format = 'webm', options = {}) {
    try {
      // Check rate limit before making request - wait if needed
      if (!this.checkRateLimit()) {
        console.log('⏳ Groq rate limit reached, waiting for reset...');
        await this.waitForRateLimitReset();
        // After waiting, check again
        if (!this.checkRateLimit()) {
          throw new Error('Rate limit still exceeded after waiting. Please try again later.');
        }
      }
      
      const model = options.model || process.env.DEFAULT_STT_MODEL || 'whisper-large-v3';
      
      // Validate input buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty or invalid audio buffer provided');
      }
      
      // Convert WebM to WAV if necessary
      let processedBuffer = audioBuffer;
      let actualFormat = format;
      
      if (format === 'webm') {
        console.log('🔄 Converting WebM to WAV...');
        try {
          processedBuffer = await this.convertWebMToWAV(audioBuffer);
          actualFormat = 'wav';
          console.log('✅ Converted to WAV:', processedBuffer.length, 'bytes');
        } catch (conversionError) {
          console.error('❌ WebM conversion failed:', conversionError.message);
          
          // Try alternative approach for corrupted WebM files
          console.log('🔄 Attempting alternative conversion approach...');
          try {
            // Try with different FFmpeg options for corrupted files
            processedBuffer = await this.convertWebMToWAVAlternative(audioBuffer);
            actualFormat = 'wav';
            console.log('✅ Alternative conversion successful:', processedBuffer.length, 'bytes');
          } catch (altConversionError) {
            console.error('❌ Alternative conversion also failed:', altConversionError.message);
            throw new Error(`Audio format conversion failed: ${conversionError.message}`);
          }
        }
      }
      
      // Validate processed buffer
      if (!processedBuffer || processedBuffer.length === 0) {
        throw new Error('Audio processing resulted in empty buffer');
      }
      
      // Create form data for audio upload
      const formData = new FormData();
      formData.append('file', processedBuffer, {
        filename: `audio.${actualFormat}`,
        contentType: `audio/${actualFormat}`,
      });
      formData.append('model', model);
      formData.append('response_format', 'json');
      
      // Optional parameters
      if (options.language) {
        formData.append('language', options.language);
      }
      if (options.temperature !== undefined) {
        formData.append('temperature', options.temperature);
      }

      const response = await axios.post(
        `${this.apiUrl}/audio/transcriptions`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      const transcription = response.data.text || '';
      console.log(`📝 Transcription (${model}):`, transcription);
      return transcription;

    } catch (error) {
      console.error('❌ Groq transcription error:', error.response?.data || error.message);
      
      // Fallback: return empty string to allow conversation to continue
      if (error.response?.status === 404) {
        console.warn('⚠️  STT endpoint not available. You may need to use a different provider for speech-to-text.');
      }
      
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Generate chat completion using Groq LLM (non-streaming)
   * @param {Array} messages - Array of message objects [{role: 'user'|'assistant'|'system', content: string}]
   * @param {Object} options - Additional options
   * @returns {Promise<string>} LLM response text
   */
  async generateChatCompletion(messages, options = {}) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.model,
          messages: messages,
          temperature: options.temperature || this.temperature,
          max_tokens: options.maxTokens || this.maxTokens,
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const completion = response.data.choices[0].message.content;
      console.log('🤖 Groq response:', completion);
      return completion;

    } catch (error) {
      console.error('❌ Groq chat completion error:', error.response?.data || error.message);
      throw new Error(`Chat completion failed: ${error.message}`);
    }
  }

  /**
   * Generate streaming chat completion using Groq LLM
   * Streams responses word-by-word for low latency
   * @param {Array} messages - Array of message objects
   * @param {Function} onChunk - Callback function called for each text chunk
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Complete response text
   */
  async generateStreamingChatCompletion(messages, onChunk, options = {}) {
    try {
      // Check rate limit before making request - wait if needed
      if (!this.checkRateLimit()) {
        console.log('⏳ Groq rate limit reached for LLM, waiting for reset...');
        await this.waitForRateLimitReset();
        // After waiting, check again
        if (!this.checkRateLimit()) {
          throw new Error('Rate limit still exceeded after waiting. Please try again later.');
        }
      }
      
      // Validate and clean messages
      const cleanedMessages = this.validateAndCleanMessages(messages);
      
      console.log('🌊 Starting streaming chat completion...');
      console.log('📝 Messages:', cleanedMessages.length, 'messages');
      
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.model,
          messages: cleanedMessages,
          temperature: options.temperature || this.temperature,
          max_tokens: options.maxTokens || this.maxTokens,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 60000, // 60 second timeout for streaming
        }
      );

      let fullResponse = '';

      return new Promise((resolve, reject) => {
        response.data.on('data', (chunk) => {
          try {
            // Parse Server-Sent Events (SSE) format
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6); // Remove 'data: ' prefix
                
                // Check for completion signal
                if (data === '[DONE]') {
                  console.log('✅ Stream completed');
                  resolve(fullResponse);
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content;
                  
                  if (content) {
                    fullResponse += content;
                    // Call the callback with each chunk for immediate processing
                    onChunk(content);
                  }
                } catch (parseError) {
                  // Skip unparseable chunks
                  console.warn('⚠️  Failed to parse chunk:', parseError.message);
                }
              }
            }
          } catch (error) {
            console.error('❌ Error processing chunk:', error);
          }
        });

        response.data.on('end', () => {
          if (fullResponse) {
            console.log('🤖 Complete streaming response received');
            resolve(fullResponse);
          } else {
            reject(new Error('Stream ended without data'));
          }
        });

        response.data.on('error', (error) => {
          console.error('❌ Stream error:', error);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Groq streaming error:', error.response?.data || error.message);
      
      // Log detailed error without circular references
      console.error('❌ GROQ API ERROR DETAILS:');
      console.error('   Status:', error.response?.status);
      console.error('   Status Text:', error.response?.statusText);
      console.error('   Error Data:', error.response?.data);
      console.error('   Request URL:', error.config?.url);
      console.error('   Request Method:', error.config?.method);
      
      // Parse request data safely
      try {
        const requestData = typeof error.config?.data === 'string' 
          ? JSON.parse(error.config.data) 
          : error.config?.data;
        console.error('   Request Data:', JSON.stringify(requestData, null, 2));
      } catch (e) {
        console.error('   Request Data:', error.config?.data);
      }
      
      throw new Error(`Streaming chat completion failed: ${error.message}`);
    }
  }

  /**
   * Build conversation context from chat history
   * @param {Array} history - Array of conversation turns
   * @param {string} systemPrompt - System prompt for the AI
   * @returns {Array} Formatted messages array
   */
  buildConversationContext(history, systemPrompt = null) {
    const messages = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    } else {
      // Default system prompt for voice AI
      messages.push({
        role: 'system',
        content: 'You are a helpful AI voice assistant. Keep responses concise and natural for voice conversations. Respond in a friendly, conversational tone.',
      });
    }

    // Add conversation history
    history.forEach((turn) => {
      if (turn.role && turn.content) {
        messages.push({
          role: turn.role,
          content: turn.content,
        });
      }
    });

    return messages;
  }

  /**
   * Get available LLM models
   * @param {string} category - Optional category filter ('general', 'reasoning', 'function_calling')
   * @returns {Object} Available models with descriptions
   */
  getAvailableModels(category = null) {
    if (!category) {
      return this.availableModels;
    }
    
    // Filter by category
    const filtered = {};
    for (const [key, value] of Object.entries(this.availableModels)) {
      if (value.category === category) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  /**
   * Get models by capability
   * @param {string} feature - Feature to filter by ('reasoning', 'function_calling', 'tool_use')
   * @returns {Object} Models with the specified feature
   */
  getModelsByFeature(feature) {
    const filtered = {};
    for (const [key, value] of Object.entries(this.availableModels)) {
      if (value.features && value.features.includes(feature)) {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  /**
   * Get all reasoning models
   * @returns {Object} Reasoning-capable models
   */
  getReasoningModels() {
    return this.getModelsByFeature('reasoning');
  }

  /**
   * Get all function calling models
   * @returns {Object} Function calling-capable models
   */
  getFunctionCallingModels() {
    return this.getModelsByFeature('function_calling');
  }

  /**
   * Get available Whisper models
   * @returns {Object} Available Whisper models
   */
  getAvailableWhisperModels() {
    return this.whisperModels;
  }

  /**
   * Get pricing information
   * @param {string} type - Type of pricing ('stt', 'llm', 'all')
   * @returns {Object} Pricing information
   */
  getPricing(type = 'all') {
    if (type === 'all') {
      return this.pricing;
    }
    return this.pricing[type] || {};
  }

  /**
   * Calculate estimated cost for a conversation
   * @param {Object} params - Calculation parameters
   * @returns {Object} Cost breakdown
   */
  calculateCost(params = {}) {
    const {
      sttModel = 'whisper-large-v3',
      llmModel = 'llama-3.3-70b-versatile-128k',
      audioMinutes = 1,
      inputTokens = 1000,
      outputTokens = 1000
    } = params;

    const costs = {
      stt: 0,
      llm: 0,
      total: 0,
      sttPerMinute: 0,
      llmPerMinute: 0,
      totalPerMinute: 0
    };

    // Calculate STT cost (per minute of audio transcribed)
    if (this.pricing.stt[sttModel]) {
      costs.sttPerMinute = this.pricing.stt[sttModel].inputPerMinute;
      costs.stt = audioMinutes * costs.sttPerMinute;
    }

    // Calculate LLM cost (per million tokens)
    // For per-minute cost, we estimate tokens per minute in a conversation
    // Typical conversation: ~150 words/min, ~200 tokens/min (input + output combined)
    // We'll use the actual inputTokens and outputTokens provided but calculate per-minute
    if (this.pricing.llm[llmModel]) {
      const llmPricing = this.pricing.llm[llmModel];
      
      // Total LLM cost for the tokens used
      const totalLlmCost = ((inputTokens / 1000000) * llmPricing.input) + 
                           ((outputTokens / 1000000) * llmPricing.output);
      
      costs.llm = totalLlmCost;
      
      // LLM cost per minute (based on tokens per minute)
      // We divide total tokens by audioMinutes to get average tokens per minute
      const totalTokens = inputTokens + outputTokens;
      const tokensPerMinute = totalTokens / audioMinutes;
      
      // Calculate cost per minute based on 50/50 split (typical conversation pattern)
      const inputTokensPerMinute = tokensPerMinute * 0.5;
      const outputTokensPerMinute = tokensPerMinute * 0.5;
      
      costs.llmPerMinute = ((inputTokensPerMinute / 1000000) * llmPricing.input) + 
                           ((outputTokensPerMinute / 1000000) * llmPricing.output);
    }

    costs.total = costs.stt + costs.llm;
    costs.totalPerMinute = costs.sttPerMinute + costs.llmPerMinute;

    // Calculate total latency (STT + LLM + WebSocket overhead)
    const sttLatency = this.whisperModels[sttModel]?.latency || 35;
    const llmLatency = this.pricing.llm[llmModel]?.latency || 100;
    const websocketOverhead = 15; // ~15ms WebSocket streaming overhead
    const totalLatency = sttLatency + llmLatency + websocketOverhead;

    return {
      breakdown: costs,
      perMinute: costs.totalPerMinute,
      latency: {
        stt: sttLatency,
        llm: llmLatency,
        websocket: websocketOverhead,
        total: totalLatency
      },
      models: {
        stt: sttModel,
        llm: llmModel
      },
      pricing: {
        stt: this.pricing.stt[sttModel],
        llm: this.pricing.llm[llmModel]
      }
    };
  }

  /**
   * Set the current LLM model
   * @param {string} modelName - Model name to use
   * @returns {boolean} Success status
   */
  setModel(modelName) {
    if (this.availableModels[modelName]) {
      this.model = modelName;
      console.log(`✅ Switched to model: ${modelName}`);
      return true;
    } else {
      console.error(`❌ Model not found: ${modelName}`);
      return false;
    }
  }

  /**
   * Get current model info
   * @returns {Object} Current model information
   */
  getCurrentModelInfo() {
    return {
      model: this.model,
      info: this.availableModels[this.model] || 'Unknown model'
    };
  }

  /**
   * Fetch all available models from Groq API (LLM + Whisper/STT)
   * @returns {Promise<Object>} All available models from API with pricing
   */
  async fetchAllModelsFromAPI() {
    try {
      console.log('🔄 Fetching all models from Groq API...');
      const response = await axios.get(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });
      
      if (response.data && response.data.data) {
        const allModels = {
          llm: {},
          stt: {},
          tts: {}
        };
        
        response.data.data.forEach(model => {
          const modelId = model.id;
          const modelType = this.categorizeModel(modelId);
          
          if (modelType === 'llm') {
            const pricing = this.getModelPricing(modelId);
            const speed = this.getModelSpeed(modelId);
            
            allModels.llm[modelId] = {
              id: modelId,
              name: this.formatModelName(modelId),
              contextWindow: model.context_window || 128000,
              description: `${modelId} - ${model.owned_by || 'Groq'}`,
              category: 'llm',
              latency: this.availableModels[modelId]?.latency || 150,
              speed: speed,
              pricing: pricing,
              ownedBy: model.owned_by || 'Groq',
              ...this.availableModels[modelId] // Merge with existing metadata if available
            };
          } else if (modelType === 'stt') {
            // Handle Whisper/STT models
            const whisperInfo = this.getWhisperModelInfo(modelId);
            
            allModels.stt[modelId] = {
              id: modelId,
              name: whisperInfo.name || this.formatModelName(modelId),
              description: whisperInfo.description || `${modelId} - Speech-to-Text`,
              category: 'stt',
              latency: whisperInfo.latency || 35,
              speedFactor: whisperInfo.speedFactor || '200x',
              accuracy: whisperInfo.accuracy || 'high',
              pricing: whisperInfo.pricing || { inputPerHour: 0.1, inputPerMinute: 0.1/60 },
              ownedBy: model.owned_by || 'Groq'
            };
          } else if (modelType === 'tts') {
            // Handle TTS models (if any)
            allModels.tts[modelId] = {
              id: modelId,
              name: this.formatModelName(modelId),
              description: `${modelId} - Text-to-Speech`,
              category: 'tts',
              ownedBy: model.owned_by || 'Groq'
            };
          }
        });
        
        console.log(`✅ Fetched ${Object.keys(allModels.llm).length} LLM models, ${Object.keys(allModels.stt).length} STT models, ${Object.keys(allModels.tts).length} TTS models from Groq API`);
        return allModels;
      }
      
      console.warn('⚠️ No models returned from Groq API, using fallback');
      return this.getAllModelsFromFallback();
    } catch (error) {
      console.error('❌ Error fetching all models from Groq API:', error.message);
      return this.getAllModelsFromFallback(); // Fallback to hardcoded models
    }
  }

  /**
   * Fetch available LLM models from Groq API with pricing (legacy method)
   * @returns {Promise<Object>} Available LLM models from API with pricing
   */
  async fetchLLMModelsFromAPI() {
    const allModels = await this.fetchAllModelsFromAPI();
    return allModels.llm;
  }

  /**
   * Categorize model by type (llm, stt, tts)
   * @param {string} modelId - Model ID to categorize
   * @returns {string} Model category
   */
  categorizeModel(modelId) {
    const modelIdLower = modelId.toLowerCase();
    
    // Check for STT/Whisper models
    if (modelIdLower.includes('whisper') || modelIdLower.includes('distil-whisper')) {
      return 'stt';
    }
    
    // Check for TTS models
    if (modelIdLower.includes('tts') || modelIdLower.includes('playai-tts')) {
      return 'tts';
    }
    
    // Everything else is LLM
    return 'llm';
  }

  /**
   * Get Whisper model information
   * @param {string} modelId - Whisper model ID
   * @returns {Object} Whisper model info
   */
  getWhisperModelInfo(modelId) {
    // Check if we have this model in our hardcoded list
    if (this.whisperModels[modelId]) {
      return this.whisperModels[modelId];
    }
    
    // Generate info for unknown Whisper models
    const modelIdLower = modelId.toLowerCase();
    let name = this.formatModelName(modelId);
    let latency = 35;
    let speedFactor = '200x';
    let accuracy = 'high';
    
    if (modelIdLower.includes('large')) {
      name = 'Whisper Large';
      latency = 42;
      speedFactor = '217x';
      accuracy = 'highest';
    } else if (modelIdLower.includes('turbo')) {
      name = 'Whisper Turbo';
      latency = 28;
      speedFactor = '228x';
      accuracy = 'high';
    } else if (modelIdLower.includes('distil')) {
      name = 'Distil Whisper';
      latency = 25;
      speedFactor = '250x';
      accuracy = 'good';
    }
    
    return {
      name,
      latency,
      speedFactor,
      accuracy,
      description: `${name} - Speech-to-Text`,
      pricing: {
        inputPerHour: 0.1,
        inputPerMinute: 0.1/60
      }
    };
  }

  /**
   * Check if a model is an LLM (not Whisper or TTS)
   */
  isLLMModel(modelId) {
    return this.categorizeModel(modelId) === 'llm';
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
   * Get model pricing information
   */
  getModelPricing(modelId) {
    // Complete pricing data for ALL Groq models (per million tokens)
    const pricing = {
      // Llama models
      'llama-3.3-70b-versatile': { input: 0.59, output: 0.79, speed: 394 },
      'llama-3.1-8b-instant': { input: 0.05, output: 0.08, speed: 840 },
      'llama-3.1-70b-versatile': { input: 0.59, output: 0.79, speed: 394 },
      
      // Mixtral models
      'mixtral-8x7b-32768': { input: 0.27, output: 0.27, speed: 500 },
      
      // OpenAI OSS models
      'openai/gpt-oss-120b': { input: 0.15, output: 0.75, speed: 500 },
      'openai/gpt-oss-20b': { input: 0.10, output: 0.50, speed: 1000 },
      
      // Moonshot AI models
      'moonshotai/kimi-k2-instruct-0905': { input: 1.00, output: 3.00, speed: 200 },
      'moonshotai/kimi-k2-instruct': { input: 1.00, output: 3.00, speed: 200 },
      
      // Meta Llama models
      'meta-llama/llama-4-scout-17b-16e-instruct': { input: 0.11, output: 0.34, speed: 594 },
      'meta-llama/llama-4-maverick-17b-128e-instruct': { input: 0.20, output: 0.60, speed: 562 },
      'meta-llama/llama-guard-4-12b': { input: 0.20, output: 0.20, speed: 325 },
      'meta-llama/llama-prompt-guard-2-86m': { input: 0.20, output: 0.20, speed: 500 },
      'meta-llama/llama-prompt-guard-2-22m': { input: 0.20, output: 0.20, speed: 500 },
      
      // Qwen models
      'qwen/qwen3-32b': { input: 0.29, output: 0.59, speed: 662 },
      
      // Groq models
      'groq/compound': { input: 0.15, output: 0.15, speed: 600 },
      'groq/compound-mini': { input: 0.10, output: 0.10, speed: 800 },
      
      // Other models
      'allam-2-7b': { input: 0.20, output: 0.20, speed: 500 }
    };

    const basePricing = pricing[modelId] || { input: 0.20, output: 0.20, speed: 500 };
    
    // Calculate per-minute pricing based on Groq's documentation
    // Assuming max 500 tokens per minute for voice calls
    const tokensPerMinute = 500;
    const inputPerMinute = (basePricing.input / 1000000) * tokensPerMinute;
    const outputPerMinute = (basePricing.output / 1000000) * tokensPerMinute;
    
    return {
      ...basePricing,
      inputPerMinute: Math.round(inputPerMinute * 10000) / 10000, // Round to 4 decimal places
      outputPerMinute: Math.round(outputPerMinute * 10000) / 10000,
      tokensPerMinute: tokensPerMinute
    };
  }

  /**
   * Get model speed (tokens per second)
   */
  getModelSpeed(modelId) {
    const pricing = this.getModelPricing(modelId);
    return pricing.speed;
  }

  /**
   * Get all models from fallback (hardcoded)
   */
  getAllModelsFromFallback() {
    const allModels = {
      llm: {},
      stt: {},
      tts: {}
    };
    
    // Add LLM models
    Object.entries(this.availableModels).forEach(([key, value]) => {
      if (this.isLLMModel(key)) {
        const pricing = this.getModelPricing(key);
        const speed = this.getModelSpeed(key);
        
        allModels.llm[key] = {
          ...value,
          category: 'llm',
          speed: speed,
          pricing: pricing
        };
      }
    });
    
    // Add STT models
    Object.entries(this.whisperModels).forEach(([key, value]) => {
      allModels.stt[key] = {
        ...value,
        category: 'stt'
      };
    });
    
    return allModels;
  }

  /**
   * Get LLM models from fallback (hardcoded) - legacy method
   */
  getLLMModelsFromFallback() {
    const allModels = this.getAllModelsFromFallback();
    return allModels.llm;
  }

  /**
   * Health check for Groq API
   * @returns {Promise<boolean>} True if API is accessible
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 10000,
      });
      
      console.log('✅ Groq API health check passed');
      return true;
    } catch (error) {
      console.error('❌ Groq API health check failed:', error.message);
      return false;
    }
  }
}

module.exports = GroqService;


