/**
 * ============================================================================
 * Streaming Pipeline Service - FULLY CONFIGURED WITH CARTESIA TTS
 * ============================================================================
 * 
 * ⚠️  DO NOT OVERWRITE OR REVERT THIS FILE ⚠️
 * 
 * This pipeline orchestrates the complete voice AI workflow:
 * 1. Audio Input (WebM/WAV)
 * 2. Speech-to-Text (Groq Whisper)
 * 3. LLM Processing (Groq LLM - streaming)
 * 4. Text-to-Speech (Cartesia - real-time streaming)
 * 5. Audio Output (PCM 16kHz)
 * 
 * FEATURES:
 * - Real-time streaming TTS with Cartesia
 * - Automatic fallback to ElevenLabs if Cartesia fails
 * - Rate limiting and error handling
 * - Conversation history management
 * 
 * BACKUP LOCATION: backend/services/streamingPipeline.BACKUP.js
 * Last Updated: 2025-01-29
 * ============================================================================
 */

const GroqService = require('./groqService');
const ElevenLabsService = require('./elevenLabsService');
const CartesiaService = require('./cartesiaService');
const { EventEmitter } = require('events');

class StreamingPipeline extends EventEmitter {
  constructor() {
    super();
    
    // Initialize services
    this.groqService = new GroqService();
    this.elevenLabsService = new ElevenLabsService();
    this.cartesiaService = new CartesiaService();
    
    // Get default TTS provider from environment
    this.defaultTTSProvider = process.env.DEFAULT_TTS_PROVIDER || 'cartesia';
    
    // Conversation state
    this.conversationHistory = [];
    this.isProcessing = false;
    this.textBuffer = { text: '' };
    
    // Configuration
    this.maxHistoryLength = 20; // Keep last 20 messages
    this.systemPrompt = null;
    
    console.log(`🚀 Streaming Pipeline initialized (TTS: ${this.defaultTTSProvider})`);
  }

  /**
   * Get TTS service based on provider name
   * @param {string} provider - TTS provider name ('elevenlabs' or 'cartesia')
   * @returns {Object} TTS service instance
   */
  getTTSService(provider = null) {
    const ttsProvider = provider || this.defaultTTSProvider;
    
    switch (ttsProvider.toLowerCase()) {
      case 'elevenlabs':
        return this.elevenLabsService;
      case 'cartesia':
        return this.cartesiaService;
      default:
        console.warn(`⚠️ Unknown TTS provider: ${ttsProvider}, using default: cartesia`);
        return this.cartesiaService;
    }
  }

  /**
   * Get fallback TTS service (opposite of current provider)
   * @param {Object} currentTtsService - Current TTS service instance
   * @returns {Object|null} Fallback TTS service instance or null
   */
  getFallbackTTSService(currentTtsService) {
    if (currentTtsService === this.cartesiaService) {
      return this.elevenLabsService;
    } else if (currentTtsService === this.elevenLabsService) {
      return this.cartesiaService;
    }
    return null;
  }

  /**
   * Set default TTS provider
   * @param {string} provider - Provider name ('elevenlabs' or 'cartesia')
   */
  setTTSProvider(provider) {
    if (['elevenlabs', 'cartesia'].includes(provider.toLowerCase())) {
      this.defaultTTSProvider = provider.toLowerCase();
      console.log(`✅ TTS provider set to: ${this.defaultTTSProvider}`);
      return true;
    } else {
      console.error(`❌ Invalid TTS provider: ${provider}`);
      return false;
    }
  }

  /**
   * Set custom system prompt for the AI assistant
   * @param {string} prompt - System prompt text
   */
  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
    console.log('📝 System prompt set');
  }

  /**
   * Process audio input through the complete pipeline
   * @param {Buffer} audioBuffer - Input audio buffer
   * @param {string} audioFormat - Audio format (e.g., 'webm', 'wav')
   * @param {Object} options - Processing options
   * @returns {Promise<void>}
   */
  async processAudioInput(audioBuffer, audioFormat = 'webm', options = {}) {
    try {
      if (this.isProcessing) {
        console.warn('⚠️  Pipeline is already processing. Queuing may be needed.');
      }

      this.isProcessing = true;
      this.emit('processing_started');

      // Validate input buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Empty or invalid audio buffer provided');
      }

      // Step 1: Speech-to-Text
      console.log('🎤 Step 1: Converting speech to text...');
      this.emit('stt_started');
      
      let transcribedText;
      try {
        transcribedText = await this.groqService.transcribeAudio(
          audioBuffer, 
          audioFormat
        );
      } catch (transcriptionError) {
        console.error('❌ Transcription failed:', transcriptionError.message);
        
        // Handle specific transcription errors
        if (transcriptionError.message.includes('Audio format conversion failed')) {
          console.warn('⚠️ Audio conversion failed, skipping this audio chunk');
          this.emit('no_speech_detected');
          this.isProcessing = false;
          return;
        } else if (transcriptionError.message.includes('Rate limit exceeded')) {
          console.warn('⚠️ Rate limit exceeded, please wait before trying again');
          this.emit('error', { 
            stage: 'stt', 
            error: 'Rate limit exceeded. Please wait before trying again.' 
          });
          this.isProcessing = false;
          return;
        } else {
          // Re-throw other errors
          throw transcriptionError;
        }
      }

      if (!transcribedText || transcribedText.trim().length === 0) {
        console.warn('⚠️  No speech detected in audio');
        this.emit('no_speech_detected');
        this.isProcessing = false;
        return;
      }

      this.emit('stt_completed', { text: transcribedText });
      
      // Add user message to conversation history
      this.addToHistory('user', transcribedText);

      // Step 2: LLM Processing with streaming
      console.log('🤖 Step 2: Generating AI response...');
      this.emit('llm_started');

      const messages = this.groqService.buildConversationContext(
        this.conversationHistory,
        this.systemPrompt
      );

      // Reset text buffer for new response
      this.textBuffer.text = '';
      let fullResponse = '';

      // Get TTS service based on options or default
      const ttsService = this.getTTSService(options.ttsProvider);

      // Prepare TTS options with voice configuration
      const ttsOptions = {
        ...options.ttsOptions,
        model: this.voiceModel || options.ttsOptions?.model || 'sonic-english',
        voiceId: this.voiceId || options.ttsOptions?.voiceId
      };

      // Stream LLM response and convert to speech in real-time
      await this.groqService.generateStreamingChatCompletion(
        messages,
        async (textChunk) => {
          try {
            // Emit text chunk immediately
            this.emit('llm_chunk', { text: textChunk });
            fullResponse += textChunk;

            // Step 3: Convert text chunks to speech as they arrive
            try {
              await ttsService.bufferAndConvertText(
                textChunk,
                this.textBuffer,
                (audioChunk) => {
                  // Emit audio chunk for immediate playback
                  this.emit('audio_chunk', { audio: audioChunk });
                },
                ttsOptions
              );
            } catch (ttsError) {
              console.warn('⚠️ Primary TTS failed, trying fallback:', ttsError.message);
              
              // Try fallback TTS provider
              const fallbackTtsService = this.getFallbackTTSService(ttsService);
              if (fallbackTtsService) {
                try {
                  await fallbackTtsService.bufferAndConvertText(
                    textChunk,
                    this.textBuffer,
                    (audioChunk) => {
                      this.emit('audio_chunk', { audio: audioChunk });
                    },
                    ttsOptions
                  );
                  console.log('✅ Fallback TTS successful');
                } catch (fallbackError) {
                  console.error('❌ Both TTS providers failed:', fallbackError.message);
                  throw fallbackError;
                }
              } else {
                throw ttsError;
              }
            }
          } catch (error) {
            console.error('❌ Error processing LLM chunk:', error);
            this.emit('error', { 
              stage: 'tts_chunk', 
              error: error.message 
            });
          }
        }
      );

      // Flush any remaining buffered text
      try {
        await ttsService.flushBuffer(
          this.textBuffer,
          (audioChunk) => {
            this.emit('audio_chunk', { audio: audioChunk });
          },
          ttsOptions
        );
      } catch (flushError) {
        console.warn('⚠️ Primary TTS flush failed, trying fallback:', flushError.message);
        
        // Try fallback TTS provider for flush
        const fallbackTtsService = this.getFallbackTTSService(ttsService);
        if (fallbackTtsService) {
          try {
            await fallbackTtsService.flushBuffer(
              this.textBuffer,
              (audioChunk) => {
                this.emit('audio_chunk', { audio: audioChunk });
              },
              ttsOptions
            );
            console.log('✅ Fallback TTS flush successful');
          } catch (fallbackFlushError) {
            console.error('❌ Both TTS providers failed on flush:', fallbackFlushError.message);
            throw fallbackFlushError;
          }
        } else {
          throw flushError;
        }
      }

      this.emit('llm_completed', { text: fullResponse });

      // Add assistant response to conversation history
      this.addToHistory('assistant', fullResponse);

      // Mark processing complete
      this.isProcessing = false;
      this.emit('processing_completed', {
        userText: transcribedText,
        assistantText: fullResponse,
      });

      console.log('✅ Pipeline processing completed successfully');

    } catch (error) {
      console.error('❌ Pipeline error:', error);
      this.isProcessing = false;
      
      // Clear conversation history to prevent 400 errors from consecutive messages
      console.warn('⚠️  LLM failed, clearing conversation history to prevent API errors');
      this.clearHistory();
      
      this.emit('error', {
        stage: 'pipeline',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process text input directly (bypassing speech-to-text)
   * Useful for testing or text-based interactions
   * @param {string} text - Input text
   * @param {Object} options - Processing options
   * @returns {Promise<string>} AI response text
   */
  async processTextInput(text, options = {}) {
    try {
      if (this.isProcessing) {
        console.warn('⚠️  Pipeline is already processing.');
        throw new Error('Pipeline busy');
      }

      this.isProcessing = true;
      this.emit('processing_started');
      this.emit('text_input_received', { text });

      // Add user message to conversation history
      this.addToHistory('user', text);

      // Generate LLM response
      console.log('🤖 Generating AI response for text input...');
      this.emit('llm_started');

      const messages = this.groqService.buildConversationContext(
        this.conversationHistory,
        this.systemPrompt
      );

      // Reset text buffer
      this.textBuffer.text = '';
      let fullResponse = '';

      // Get TTS service
      const ttsService = this.getTTSService(options.ttsProvider);

      // Stream LLM response
      await this.groqService.generateStreamingChatCompletion(
        messages,
        async (textChunk) => {
          try {
            this.emit('llm_chunk', { text: textChunk });
            fullResponse += textChunk;

            // Convert to speech if TTS is enabled
            if (options.enableTTS !== false) {
              try {
                await ttsService.bufferAndConvertText(
                  textChunk,
                  this.textBuffer,
                  (audioChunk) => {
                    this.emit('audio_chunk', { audio: audioChunk });
                  },
                  options.ttsOptions || {}
                );
              } catch (ttsError) {
                console.warn('⚠️ Primary TTS failed in text processing, trying fallback:', ttsError.message);
                
                const fallbackTtsService = this.getFallbackTTSService(ttsService);
                if (fallbackTtsService) {
                  try {
                    await fallbackTtsService.bufferAndConvertText(
                      textChunk,
                      this.textBuffer,
                      (audioChunk) => {
                        this.emit('audio_chunk', { audio: audioChunk });
                      },
                      options.ttsOptions || {}
                    );
                    console.log('✅ Fallback TTS successful in text processing');
                  } catch (fallbackError) {
                    console.error('❌ Both TTS providers failed in text processing:', fallbackError.message);
                  }
                }
              }
            }
          } catch (error) {
            console.error('❌ Error processing text chunk:', error);
          }
        }
      );

      // Flush remaining buffer if TTS is enabled
      if (options.enableTTS !== false) {
        try {
          await ttsService.flushBuffer(
            this.textBuffer,
            (audioChunk) => {
              this.emit('audio_chunk', { audio: audioChunk });
            },
            options.ttsOptions || {}
          );
        } catch (flushError) {
          console.warn('⚠️ Primary TTS flush failed in text processing, trying fallback:', flushError.message);
          
          const fallbackTtsService = this.getFallbackTTSService(ttsService);
          if (fallbackTtsService) {
            try {
              await fallbackTtsService.flushBuffer(
                this.textBuffer,
                (audioChunk) => {
                  this.emit('audio_chunk', { audio: audioChunk });
                },
                options.ttsOptions || {}
              );
              console.log('✅ Fallback TTS flush successful in text processing');
            } catch (fallbackFlushError) {
              console.error('❌ Both TTS providers failed on flush in text processing:', fallbackFlushError.message);
            }
          }
        }
      }

      this.emit('llm_completed', { text: fullResponse });

      // Add assistant response to history
      this.addToHistory('assistant', fullResponse);

      this.isProcessing = false;
      this.emit('processing_completed', {
        userText: text,
        assistantText: fullResponse,
      });

      console.log('✅ Text processing completed');
      return fullResponse;

    } catch (error) {
      console.error('❌ Text processing error:', error);
      this.isProcessing = false;
      this.emit('error', {
        stage: 'text_processing',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate speech from text without LLM processing
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options
   * @returns {Promise<void>}
   */
  async textToSpeechOnly(text, options = {}) {
    try {
      console.log('🎵 Converting text to speech:', text);
      this.emit('tts_started', { text });

      const ttsService = this.getTTSService(options.ttsProvider);

      await ttsService.textToSpeechStreaming(
        text,
        (audioChunk) => {
          this.emit('audio_chunk', { audio: audioChunk });
        },
        options
      );

      this.emit('tts_completed');
      console.log('✅ TTS conversion completed');

    } catch (error) {
      console.error('❌ TTS error:', error);
      this.emit('error', {
        stage: 'tts',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Add message to conversation history
   * @param {string} role - Message role ('user' or 'assistant')
   * @param {string} content - Message content
   */
  addToHistory(role, content) {
    this.conversationHistory.push({
      role: role,
      content: content,
      timestamp: new Date().toISOString(),
    });

    // Trim history if it gets too long
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(
        -this.maxHistoryLength
      );
    }

    console.log(`📚 Added ${role} message to history. Total messages: ${this.conversationHistory.length}`);
  }

  /**
   * Get conversation history
   * @returns {Array} Conversation history
   */
  getConversationHistory() {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    console.log('🗑️  Conversation history cleared');
    this.emit('history_cleared');
  }

  /**
   * Reset the pipeline to initial state
   */
  reset() {
    this.clearHistory();
    this.isProcessing = false;
    this.textBuffer = { text: '' };
    console.log('🔄 Pipeline reset');
    this.emit('pipeline_reset');
  }

  /**
   * Check if pipeline is currently processing
   * @returns {boolean}
   */
  isBusy() {
    return this.isProcessing;
  }

  /**
   * Health check for all services
   * @returns {Promise<Object>} Health status of all services
   */
  async healthCheck() {
    console.log('🏥 Running health checks...');

    const status = {
      groq: false,
      elevenlabs: false,
      cartesia: false,
      overall: false,
    };

    try {
      status.groq = await this.groqService.healthCheck();
    } catch (error) {
      console.error('❌ Groq health check failed:', error.message);
    }

    try {
      status.elevenlabs = await this.elevenLabsService.healthCheck();
    } catch (error) {
      console.error('❌ ElevenLabs health check failed:', error.message);
    }

    try {
      status.cartesia = await this.cartesiaService.healthCheck();
    } catch (error) {
      console.error('❌ Cartesia health check failed:', error.message);
    }

    // Overall health requires Groq and at least one TTS provider
    status.overall = status.groq && (status.elevenlabs || status.cartesia);

    if (status.overall) {
      console.log('✅ All critical services healthy');
    } else {
      console.warn('⚠️  Some services are unhealthy');
    }

    return status;
  }

  /**
   * Get current pipeline status
   * @returns {Object} Pipeline status information
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      historyLength: this.conversationHistory.length,
      hasSystemPrompt: !!this.systemPrompt,
      bufferSize: this.textBuffer.text.length,
      ttsProvider: this.defaultTTSProvider,
      llmModel: this.groqService.getCurrentModelInfo(),
    };
  }
}

module.exports = StreamingPipeline;


