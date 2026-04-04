/**
 * Main Voice Call Pipeline
 * Orchestrates the complete workflow: Transcriber → LLM → TTS
 * This is the central pipeline that activates when user clicks "Make a Call"
 */

const EventEmitter = require('events');
const GroqService = require('../services/groqService');
const CartesiaService = require('../services/cartesiaService');
const InterruptionHandler = require('../services/interruptionHandler');
const VADService = require('../services/vadService');

class MainPipeline extends EventEmitter {
  constructor(connectionId, ws) {
    super();
    this.connectionId = connectionId;
    this.ws = ws;
    this.isActive = false;
    this.config = null;
    
    // Conversation state
    this.conversationHistory = [];
    this.currentTranscript = '';
    this.currentAIResponse = '';
    
    // Performance metrics
    this.metrics = {
      sttLatency: 0,
      llmLatency: 0,
      ttsLatency: 0,
      totalLatency: 0,
      audioChunksReceived: 0,
      audioChunksProcessed: 0,
      interruptions: 0
    };

    // Initialize services
    this.groqService = new GroqService();
    this.cartesiaService = new CartesiaService();
    this.elevenLabsService = require('../services/elevenLabsService'); // Import as instance
    
    // Initialize interruption handling
    this.interruptionHandler = new InterruptionHandler({
      minInterruptionDuration: 500,  // 0.5 seconds
      silenceThreshold: 500,          // 0.5 seconds
      backoffDelay: 800,              // 0.8 seconds
      vadThreshold: 0.5,
      enabled: true
    });
    
    // Initialize VAD service
    this.vadService = new VADService({
      energyThreshold: 0.02,
      sampleRate: 16000
    });
    
    // Set up interruption handler events
    this.setupInterruptionHandlers();
    
    console.log(`🎯 Main Pipeline initialized for connection: ${connectionId}`);
    console.log(`   ✅ Interruption handling enabled`);
  }

  /**
   * Setup interruption handler event listeners
   */
  setupInterruptionHandlers() {
    // When interruption is triggered, stop TTS playback
    this.interruptionHandler.on('interruption_triggered', (data) => {
      console.log(`⚠️ INTERRUPTION: User interrupted assistant (${data.speechDuration}ms)`);
      this.metrics.interruptions++;
      
      // Send interruption event to client
      this.sendToClient({
        type: 'interruption_detected',
        speechDuration: data.speechDuration,
        timestamp: new Date().toISOString()
      });
      
      // Stop current TTS playback
      this.stopCurrentTTS();
    });

    // When ready to resume after interruption
    this.interruptionHandler.on('ready_to_resume', () => {
      console.log('✅ Ready to resume after interruption');
      
      this.sendToClient({
        type: 'ready_to_resume',
        timestamp: new Date().toISOString()
      });
    });

    // When assistant speech starts
    this.interruptionHandler.on('assistant_speech_started', () => {
      this.sendToClient({
        type: 'assistant_speaking',
        timestamp: new Date().toISOString()
      });
    });

    // When assistant speech stops
    this.interruptionHandler.on('assistant_speech_stopped', (data) => {
      this.sendToClient({
        type: 'assistant_stopped',
        reason: data.reason,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Stop current TTS playback
   */
  stopCurrentTTS() {
    console.log('🛑 Stopping current TTS playback');
    
    // Send stop command to client
    this.sendToClient({
      type: 'stop_audio_playback',
      timestamp: new Date().toISOString()
    });
    
    // Mark assistant as not speaking
    this.interruptionHandler.stopAssistantSpeech('interrupted');
  }

  /**
   * ACTIVATE PIPELINE - Called when user clicks "Make a Call"
   * @param {Object} config - Assistant configuration
   */
  async activate(config) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 ACTIVATING MAIN PIPELINE for ${this.connectionId}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`📋 Configuration:`, {
        model: config.model,
        transcriber: config.transcriber,
        voiceModel: config.voiceModel,
        voiceId: config.voiceId,
        systemPrompt: config.systemPrompt?.substring(0, 50) + '...',
        firstMessage: config.firstMessage
      });
      console.log(`${'='.repeat(60)}\n`);

      this.config = config;
      this.isActive = true;

      // Clear conversation history if requested
      if (config.clearHistory) {
        console.log('🗑️  Clearing conversation history for fresh start');
        this.conversationHistory = [];
      }

      // Send activation confirmation to client
      this.sendToClient({
        type: 'pipeline_activated',
        message: 'Voice pipeline is now active',
        config: {
          model: config.model,
          transcriber: config.transcriber,
          voiceModel: config.voiceModel,
          voiceId: config.voiceId
        },
        timestamp: new Date().toISOString()
      });

      // Send first message if configured
      if (config.firstMessage && config.firstMessageMode === 'assistant-speaks-first') {
        await this.sendFirstMessage(config.firstMessage);
      }

      console.log(`✅ Main Pipeline activated successfully for ${this.connectionId}\n`);
      
    } catch (error) {
      console.error(`❌ Error activating pipeline for ${this.connectionId}:`, error);
      this.sendToClient({
        type: 'pipeline_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * MAIN WORKFLOW - Process audio through the complete pipeline
   * Flow: Audio → Transcriber → LLM → TTS
   * @param {Buffer} audioBuffer - Raw audio data from microphone
   */
  async processAudio(audioBuffer) {
    if (!this.isActive) {
      console.warn(`⚠️  Pipeline not active for ${this.connectionId}, ignoring audio`);
      return;
    }

    try {
      this.metrics.audioChunksReceived++;
      const workflowStartTime = Date.now();
      
      // ============================================
      // VOICE ACTIVITY DETECTION (VAD)
      // ============================================
      const vadResult = this.vadService.analyze(audioBuffer);
      
      // Update interruption handler with VAD result
      this.interruptionHandler.onUserVoiceActivity({
        vadScore: vadResult.score,
        isVoice: vadResult.isVoice,
        energy: vadResult.energy
      });
      
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🎙️  WORKFLOW START #${this.metrics.audioChunksReceived} - ${this.connectionId}`);
      console.log(`📦 Audio size: ${audioBuffer.length} bytes`);
      console.log(`🎤 VAD: ${vadResult.isVoice ? 'VOICE' : 'SILENCE'} (score: ${vadResult.score.toFixed(2)}, energy: ${vadResult.energy.toFixed(4)})`);
      console.log(`${'─'.repeat(60)}\n`);

      // ============================================
      // STEP 1: TRANSCRIBER (Audio → Text)
      // ============================================
      const transcript = await this.runTranscriber(audioBuffer);
      
      if (!transcript || !transcript.trim()) {
        console.log(`🔇 No speech detected in audio chunk #${this.metrics.audioChunksReceived}\n`);
        this.sendToClient({
          type: 'no_speech_detected',
          timestamp: new Date().toISOString()
        });
        return;
      }

      this.currentTranscript = transcript;

      // ============================================
      // STEP 2: LLM MODEL (Text → AI Response)
      // ============================================
      const aiResponse = await this.runLLM(transcript);
      
      if (!aiResponse || !aiResponse.trim()) {
        console.warn(`⚠️  No response from LLM for ${this.connectionId}\n`);
        return;
      }

      this.currentAIResponse = aiResponse;

      // ============================================
      // STEP 3: TTS (AI Response → Audio)
      // ============================================
      await this.runTTS(aiResponse);

      // ============================================
      // WORKFLOW COMPLETE
      // ============================================
      this.metrics.totalLatency = Date.now() - workflowStartTime;
      this.metrics.audioChunksProcessed++;

      console.log(`\n${'─'.repeat(60)}`);
      console.log(`✅ WORKFLOW COMPLETE #${this.metrics.audioChunksProcessed}`);
      console.log(`⏱️  Total Latency: ${this.metrics.totalLatency}ms`);
      console.log(`   ├─ STT: ${this.metrics.sttLatency}ms`);
      console.log(`   ├─ LLM: ${this.metrics.llmLatency}ms`);
      console.log(`   └─ TTS: ${this.metrics.ttsLatency}ms`);
      console.log(`${'─'.repeat(60)}\n`);

      // Send completion notification
      this.sendToClient({
        type: 'workflow_completed',
        userText: transcript,
        assistantText: aiResponse,
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Workflow error for ${this.connectionId}:`, error);
      this.sendToClient({
        type: 'workflow_error',
        error: error.message,
        stage: 'processing',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * STEP 1: Run Transcriber (Whisper)
   * Converts audio to text using Groq Whisper
   */
  async runTranscriber(audioBuffer) {
    const startTime = Date.now();
    
    try {
      console.log(`🎤 [STEP 1/3] TRANSCRIBER - Starting...`);
      
      this.sendToClient({
        type: 'transcriber_started',
        timestamp: new Date().toISOString()
      });

      const transcript = await this.groqService.transcribeAudio(
        audioBuffer, 
        this.config.transcriber || 'whisper-large-v3-turbo'
      );
      
      this.metrics.sttLatency = Date.now() - startTime;
      
      console.log(`✅ [STEP 1/3] TRANSCRIBER - Complete (${this.metrics.sttLatency}ms)`);
      console.log(`📝 Transcript: "${transcript}"\n`);
      
      this.sendToClient({
        type: 'transcriber_completed',
        text: transcript,
        latency: this.metrics.sttLatency,
        timestamp: new Date().toISOString()
      });

      return transcript;
      
    } catch (error) {
      console.error(`❌ [STEP 1/3] TRANSCRIBER - Error:`, error.message);
      this.sendToClient({
        type: 'transcriber_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * STEP 2: Run LLM Model (Groq)
   * Generates AI response from user transcript
   */
  async runLLM(transcript) {
    const startTime = Date.now();
    
    try {
      console.log(`🧠 [STEP 2/3] LLM MODEL - Starting...`);
      console.log(`💭 Input: "${transcript}"`);
      
      this.sendToClient({
        type: 'llm_started',
        timestamp: new Date().toISOString()
      });

      // Add user message to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: transcript,
        timestamp: new Date().toISOString()
      });

      // Prepare messages for LLM
      const messages = [
        {
          role: 'system',
          content: this.config.systemPrompt || 'You are a helpful voice assistant.'
        },
        ...this.conversationHistory.slice(-10) // Keep last 10 messages for context
      ];

      // Generate response with streaming
      const response = await this.groqService.generateResponse(messages, {
        model: this.config.model || 'llama-3.1-70b-versatile',
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 500,
        stream: true
      });

      let fullResponse = '';
      
      // Handle streaming response
      if (response && typeof response[Symbol.asyncIterator] === 'function') {
        for await (const chunk of response) {
          if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
            const content = chunk.choices[0].delta.content;
            fullResponse += content;
            
            // Send streaming chunks to client
            this.sendToClient({
              type: 'llm_chunk',
              text: content,
              timestamp: new Date().toISOString()
            });
          }
        }
      } else if (response && response.choices && response.choices[0]) {
        fullResponse = response.choices[0].message.content;
      }

      this.metrics.llmLatency = Date.now() - startTime;
      
      console.log(`✅ [STEP 2/3] LLM MODEL - Complete (${this.metrics.llmLatency}ms)`);
      console.log(`💬 Response: "${fullResponse}"\n`);

      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString()
      });

      this.sendToClient({
        type: 'llm_completed',
        text: fullResponse,
        latency: this.metrics.llmLatency,
        timestamp: new Date().toISOString()
      });

      return fullResponse;
      
    } catch (error) {
      console.error(`❌ [STEP 2/3] LLM MODEL - Error:`, error.message);
      this.sendToClient({
        type: 'llm_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * STEP 3: Run TTS (Provider-aware)
   * Converts AI response to speech audio using configured provider
   */
  async runTTS(text) {
    const startTime = Date.now();
    
    try {
      // Check if we can start assistant speech (not interrupted)
      if (!this.interruptionHandler.canStartAssistantSpeech()) {
        console.log(`⏸️  Cannot start TTS - user is speaking or interrupted`);
        return null;
      }
      
      console.log(`🗣️  [STEP 3/3] TTS - Starting...`);
      console.log(`📢 Text to speak: "${text}"`);
      console.log(`🎤 Provider: ${this.config.voiceProvider || 'cartesia'}`);
      
      // Notify interruption handler that assistant is starting to speak
      this.interruptionHandler.startAssistantSpeech();
      
      this.sendToClient({
        type: 'tts_started',
        timestamp: new Date().toISOString()
      });

      let audioData;
      let ttsProvider = this.config.voiceProvider || 'cartesia';

      if (ttsProvider === 'elevenlabs') {
        // Use ElevenLabs
        try {
          // Determine voice ID: custom voice ID takes priority
          const voiceId = this.config.useCustomVoiceId && this.config.customVoiceId 
            ? this.config.customVoiceId 
            : this.config.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM';
          
          console.log(`🎤 Using ElevenLabs voice ID: ${voiceId} ${this.config.useCustomVoiceId ? '(custom)' : '(preset)'}`);
          
          audioData = await this.elevenLabsService.synthesizeSpeech(
            text,
            voiceId,
            this.config.elevenLabsModel || 'eleven_monolingual_v1',
            this.config.elevenLabsSettings || {}
          );
          console.log('✅ ElevenLabs TTS successful');
          
        } catch (elevenLabsError) {
          console.warn('⚠️ ElevenLabs TTS failed, trying Cartesia fallback:', elevenLabsError.message);
          
          // Fallback to Cartesia
          audioData = await this.cartesiaService.textToSpeech(text, {
            model: this.config.voiceModel || 'sonic-english',
            voiceId: this.config.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091'
          });
          ttsProvider = 'Cartesia (fallback)';
          console.log('✅ Cartesia TTS fallback successful');
        }
      } else {
        // Use Cartesia (default)
        try {
          audioData = await this.cartesiaService.textToSpeech(text, {
            model: this.config.voiceModel || 'sonic-english',
            voiceId: this.config.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091'
          });
          console.log('✅ Cartesia TTS successful');
          
        } catch (cartesiaError) {
          console.warn('⚠️ Cartesia TTS failed, trying ElevenLabs fallback:', cartesiaError.message);
          
          // Fallback to ElevenLabs
          const fallbackVoiceId = this.config.useCustomVoiceId && this.config.customVoiceId 
            ? this.config.customVoiceId 
            : this.config.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM';
          
          audioData = await this.elevenLabsService.synthesizeSpeech(
            text,
            fallbackVoiceId,
            this.config.elevenLabsModel || 'eleven_monolingual_v1',
            this.config.elevenLabsSettings || {}
          );
          ttsProvider = 'ElevenLabs (fallback)';
          console.log('✅ ElevenLabs TTS fallback successful');
        }
      }

      this.metrics.ttsLatency = Date.now() - startTime;
      
      console.log(`✅ [STEP 3/3] TTS - Complete (${this.metrics.ttsLatency}ms) using ${ttsProvider}`);
      console.log(`🔊 Audio generated: ${audioData.length} bytes\n`);

      // Send audio data to client
      this.sendToClient({
        type: 'tts_completed',
        latency: this.metrics.ttsLatency,
        provider: ttsProvider,
        timestamp: new Date().toISOString()
      });

      // Send audio data as base64 encoded message
      if (this.ws && this.ws.readyState === 1) {
        this.sendToClient({
          type: 'audio_chunk',
          data: audioData.toString('base64'),
          timestamp: new Date().toISOString()
        });
      }

      // Notify interruption handler that assistant finished speaking
      // (Will be called when audio playback completes on client side)
      setTimeout(() => {
        this.interruptionHandler.stopAssistantSpeech('completed');
      }, 100);

      return audioData;
      
    } catch (error) {
      console.error(`❌ [STEP 3/3] TTS - Error:`, error.message);
      
      // Notify interruption handler that TTS failed
      this.interruptionHandler.stopAssistantSpeech('error');
      
      this.sendToClient({
        type: 'tts_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Send first message when assistant speaks first
   */
  async sendFirstMessage(message) {
    try {
      console.log(`👋 Sending first message: "${message}"\n`);
      
      this.sendToClient({
        type: 'first_message',
        text: message,
        timestamp: new Date().toISOString()
      });

      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Convert to speech
      await this.runTTS(message);

    } catch (error) {
      console.error(`❌ Error sending first message:`, error);
    }
  }

  /**
   * Send JSON message to client
   */
  sendToClient(data) {
    try {
      if (this.ws && this.ws.readyState === 1) { // WebSocket.OPEN
        this.ws.send(JSON.stringify(data));
      }
    } catch (error) {
      console.error(`❌ Error sending data to client ${this.connectionId}:`, error);
    }
  }

  /**
   * Deactivate the pipeline
   */
  async deactivate() {
    try {
      console.log(`\n🛑 Deactivating Main Pipeline for ${this.connectionId}`);
      
      this.isActive = false;

      this.sendToClient({
        type: 'pipeline_deactivated',
        message: 'Voice pipeline deactivated',
        metrics: this.metrics,
        conversationLength: this.conversationHistory.length,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Main Pipeline deactivated for ${this.connectionId}\n`);
      
    } catch (error) {
      console.error(`❌ Error deactivating pipeline:`, error);
    }
  }

  /**
   * Get pipeline status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      connectionId: this.connectionId,
      currentTranscript: this.currentTranscript,
      currentAIResponse: this.currentAIResponse,
      conversationLength: this.conversationHistory.length,
      metrics: this.metrics,
      config: this.config
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    this.currentTranscript = '';
    this.currentAIResponse = '';
    console.log(`🧹 Conversation history cleared for ${this.connectionId}`);
  }

  /**
   * Get conversation history
   */
  getConversationHistory() {
    return this.conversationHistory;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log(`🧹 Cleaning up Main Pipeline for ${this.connectionId}`);
    this.isActive = false;
    
    // Cleanup interruption handler
    if (this.interruptionHandler) {
      this.interruptionHandler.cleanup();
    }
    
    // Reset VAD service
    if (this.vadService) {
      this.vadService.reset();
    }
    
    this.removeAllListeners();
    this.conversationHistory = [];
  }
}

module.exports = MainPipeline;

