/**
 * Vapi.ai Style Voice Pipeline
 * Streamlined STT → LLM → TTS pipeline with real-time audio streaming
 * Focuses on immediate audio playback like Vapi.ai
 */

const EventEmitter = require('events');
const GroqService = require('../services/groqService');
const CartesiaService = require('../services/cartesiaService');

class VapiStylePipeline extends EventEmitter {
  constructor(connectionId, ws) {
    super();
    this.connectionId = connectionId;
    this.ws = ws;
    this.isActive = false;
    this.config = null;
    
    // Pipeline state
    this.isProcessing = false;
    this.conversationHistory = [];
    
    // Initialize services
    this.groqService = new GroqService();
    this.cartesiaService = new CartesiaService();
    this.elevenLabsService = require('../services/elevenLabsService');
    
    console.log(`🎯 Vapi-Style Pipeline initialized for ${connectionId}`);
  }

  /**
   * Activate pipeline with configuration
   */
  async activate(config) {
    try {
      this.config = config;
      this.isActive = true;
      
      console.log(`🚀 Activating Vapi-Style Pipeline for ${this.connectionId}`);
      console.log(`   Model: ${config.model}`);
      console.log(`   System Prompt: "${(config.systemPrompt || '').substring(0, 50)}..."`);
      console.log(`   First Message Mode: ${config.firstMessageMode || 'assistant-speaks-first'}`);
      console.log(`   First Message: "${(config.firstMessage || '').substring(0, 50)}..."`);
      console.log(`   Voice Provider: ${config.voiceProvider || 'cartesia'}`);
      console.log(`   Voice: ${config.voiceId || config.elevenLabsVoiceId}`);
      
      // Initialize system prompt in conversation history
      this.initializeSystemPrompt();
      
      this.sendToClient({
        type: 'pipeline_activated',
        config: {
          model: config.model,
          systemPrompt: config.systemPrompt,
          firstMessageMode: config.firstMessageMode,
          firstMessage: config.firstMessage,
          voiceProvider: config.voiceProvider,
          voiceId: config.voiceId || config.elevenLabsVoiceId
        },
        timestamp: new Date().toISOString()
      });

      // Handle first message based on mode
      await this.handleFirstMessageMode();

      console.log(`✅ Vapi-Style Pipeline activated for ${this.connectionId}`);
      
    } catch (error) {
      console.error(`❌ Error activating pipeline:`, error);
      throw error;
    }
  }

  /**
   * Initialize system prompt in conversation context
   */
  initializeSystemPrompt() {
    const systemPrompt = this.config.systemPrompt || 
      'You are a helpful voice assistant. Keep responses concise and conversational.';
    
    // Clear any existing conversation history
    this.conversationHistory = [];
    
    console.log(`🧠 System Prompt initialized: "${systemPrompt.substring(0, 100)}..."`);
    
    this.sendToClient({
      type: 'system_prompt_initialized',
      systemPrompt: systemPrompt,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle first message mode configuration
   */
  async handleFirstMessageMode() {
    const mode = this.config.firstMessageMode || 'assistant-speaks-first';
    const firstMessage = this.config.firstMessage || 'Hello! How can I help you today?';
    
    console.log(`🎯 First Message Mode: ${mode}`);
    
    if (mode === 'assistant-speaks-first') {
      console.log(`🗣️ Assistant will speak first: "${firstMessage}"`);
      
      this.sendToClient({
        type: 'assistant_speaking_first',
        message: firstMessage,
        timestamp: new Date().toISOString()
      });
      
      // Generate and play the first message
      await this.generateFirstMessage(firstMessage);
      
    } else if (mode === 'assistant-waits') {
      console.log(`👂 Assistant will wait for user to speak first`);
      
      this.sendToClient({
        type: 'assistant_waiting',
        message: 'Waiting for user input...',
        timestamp: new Date().toISOString()
      });
      
      // Activate listening mode immediately
      this.sendToClient({
        type: 'listening_activated',
        timestamp: new Date().toISOString()
      });
      
    } else {
      console.log(`⚙️ Custom first message mode: ${mode}`);
      // Handle custom modes if needed
    }
  }

  /**
   * Generate and play the first message (assistant speaks first)
   */
  async generateFirstMessage(message) {
    try {
      console.log(`🎤 Generating first message: "${message}"`);
      
      // Send the first message directly to TTS without LLM processing
      // since it's pre-configured
      this.sendToClient({
        type: 'first_message_started',
        text: message,
        timestamp: new Date().toISOString()
      });
      
      // Convert first message to speech
      await this.textToSpeechStream(message);
      
      // After first message completes, activate listening
      setTimeout(() => {
        console.log(`👂 First message complete, activating listening mode`);
        this.sendToClient({
          type: 'first_message_complete',
          timestamp: new Date().toISOString()
        });
        
        this.sendToClient({
          type: 'listening_activated',
          timestamp: new Date().toISOString()
        });
      }, 1000); // Small delay to ensure audio completes
      
    } catch (error) {
      console.error(`❌ Error generating first message:`, error);
      
      // Fallback: activate listening even if first message fails
      this.sendToClient({
        type: 'first_message_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.sendToClient({
        type: 'listening_activated',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Process audio input through the pipeline
   * STT → LLM → TTS with immediate audio streaming
   */
  async processAudio(audioBuffer) {
    if (!this.isActive || this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;
      
      console.log(`\n🎙️ Processing audio (${audioBuffer.length} bytes)`);
      
      // STEP 1: Speech-to-Text
      const transcript = await this.speechToText(audioBuffer);
      
      if (!transcript || !transcript.trim()) {
        console.log('🔇 No speech detected');
        this.isProcessing = false;
        return;
      }
      
      console.log(`📝 Transcript: "${transcript}"`);
      
      // Add user message to conversation
      this.conversationHistory.push({
        role: 'user',
        content: transcript,
        timestamp: new Date().toISOString()
      });
      
      // Send transcript to client
      this.sendToClient({
        type: 'transcript',
        text: transcript,
        timestamp: new Date().toISOString()
      });
      
      // STEP 2 & 3: LLM → TTS (combined for speed)
      await this.generateAndPlayResponse(transcript);
      
    } catch (error) {
      console.error(`❌ Pipeline error:`, error);
      this.sendToClient({
        type: 'pipeline_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Speech-to-Text using Groq Whisper
   */
  async speechToText(audioBuffer) {
    try {
      console.log('🎤 [STT] Starting transcription...');
      
      const startTime = Date.now();
      const transcript = await this.groqService.transcribeAudio(audioBuffer, {
        model: this.config.transcriber || 'whisper-large-v3-turbo',
        language: 'en'
      });
      
      const latency = Date.now() - startTime;
      console.log(`✅ [STT] Complete (${latency}ms): "${transcript}"`);
      
      return transcript;
      
    } catch (error) {
      console.error(`❌ [STT] Error:`, error.message);
      throw error;
    }
  }

  /**
   * Generate LLM response and immediately convert to speech
   */
  async generateAndPlayResponse(userInput, isFirstMessage = false) {
    try {
      // STEP 2: Generate LLM Response
      console.log('🧠 [LLM] Generating response...');
      
      const startTime = Date.now();
      
      // Get system prompt from configuration
      const systemPrompt = this.config.systemPrompt || 
        'You are a helpful voice assistant. Keep responses concise and conversational.';
      
      console.log(`🧠 Using System Prompt: "${systemPrompt.substring(0, 100)}..."`);
      
      // Prepare conversation context with system prompt
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...this.conversationHistory
      ];
      
      // Add current user input if not first message
      if (!isFirstMessage) {
        messages.push({
          role: 'user',
          content: userInput
        });
      }
      
      const response = await this.groqService.generateResponse(messages, {
        model: this.config.model || 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 150
      });
      
      const llmLatency = Date.now() - startTime;
      console.log(`✅ [LLM] Complete (${llmLatency}ms): "${response}"`);
      
      // Add assistant response to conversation
      if (!isFirstMessage) {
        this.conversationHistory.push({
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString()
        });
      }
      
      // Send LLM response to client
      this.sendToClient({
        type: 'llm_response',
        text: response,
        latency: llmLatency,
        timestamp: new Date().toISOString()
      });
      
      // STEP 3: Convert to Speech and Stream
      await this.textToSpeechStream(response);
      
    } catch (error) {
      console.error(`❌ [LLM/TTS] Error:`, error.message);
      throw error;
    }
  }

  /**
   * Convert text to speech and stream audio immediately
   */
  async textToSpeechStream(text) {
    try {
      console.log('🔊 [TTS] Starting speech synthesis...');
      
      const startTime = Date.now();
      const provider = this.config.voiceProvider || 'cartesia';
      
      this.sendToClient({
        type: 'tts_started',
        provider: provider,
        timestamp: new Date().toISOString()
      });
      
      let audioData;
      
      if (provider === 'elevenlabs') {
        // Use ElevenLabs
        audioData = await this.elevenLabsService.synthesizeSpeech(
          text,
          this.config.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
          this.config.elevenLabsModel || 'eleven_monolingual_v1',
          this.config.elevenLabsSettings || {}
        );
        
        // Convert stream to buffer for ElevenLabs
        if (audioData && typeof audioData.pipe === 'function') {
          audioData = await this.streamToBuffer(audioData);
        }
        
      } else {
        // Use Cartesia (default)
        audioData = await this.cartesiaService.textToSpeech(text, {
          model: this.config.voiceModel || 'sonic-english',
          voiceId: this.config.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091'
        });
      }
      
      const ttsLatency = Date.now() - startTime;
      console.log(`✅ [TTS] Complete (${ttsLatency}ms) - ${audioData.length} bytes`);
      
      // Send audio immediately to client for playback
      await this.streamAudioToClient(audioData, provider);
      
      this.sendToClient({
        type: 'tts_completed',
        provider: provider,
        latency: ttsLatency,
        audioSize: audioData.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`❌ [TTS] Error:`, error.message);
      
      this.sendToClient({
        type: 'tts_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  /**
   * Stream audio data to client for immediate playback
   */
  async streamAudioToClient(audioData, provider) {
    if (!this.ws || this.ws.readyState !== 1) {
      console.warn('⚠️ WebSocket not ready for audio streaming');
      return;
    }
    
    try {
      // Send audio in chunks for better streaming
      const chunkSize = 4096; // 4KB chunks
      const totalChunks = Math.ceil(audioData.length / chunkSize);
      
      console.log(`📡 Streaming audio: ${audioData.length} bytes in ${totalChunks} chunks`);
      
      // Send audio header
      this.sendToClient({
        type: 'audio_stream_start',
        provider: provider,
        totalSize: audioData.length,
        totalChunks: totalChunks,
        chunkSize: chunkSize,
        format: provider === 'elevenlabs' ? 'mp3' : 'wav',
        sampleRate: 16000,
        timestamp: new Date().toISOString()
      });
      
      // Stream audio chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, audioData.length);
        const chunk = audioData.slice(start, end);
        
        this.sendToClient({
          type: 'audio_chunk',
          chunkIndex: i,
          totalChunks: totalChunks,
          data: chunk.toString('base64'),
          isLast: i === totalChunks - 1,
          timestamp: new Date().toISOString()
        });
        
        // Small delay between chunks to prevent overwhelming
        if (i < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Send stream end
      this.sendToClient({
        type: 'audio_stream_end',
        totalChunks: totalChunks,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Audio streaming complete: ${totalChunks} chunks sent`);
      
    } catch (error) {
      console.error(`❌ Audio streaming error:`, error);
    }
  }

  /**
   * Convert stream to buffer (for ElevenLabs)
   */
  async streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  /**
   * Send message to client via WebSocket
   */
  sendToClient(message) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Deactivate pipeline
   */
  async deactivate() {
    console.log(`🛑 Deactivating Vapi-Style Pipeline for ${this.connectionId}`);
    
    this.isActive = false;
    this.isProcessing = false;
    
    this.sendToClient({
      type: 'pipeline_deactivated',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log(`🧹 Cleaning up Vapi-Style Pipeline for ${this.connectionId}`);
    
    this.isActive = false;
    this.isProcessing = false;
    this.conversationHistory = [];
    this.removeAllListeners();
  }
}

module.exports = VapiStylePipeline;