const EventEmitter = require('events');
const GroqService = require('../services/groqService');
const CartesiaService = require('../services/cartesiaService');

class VoiceCallWorkflow extends EventEmitter {
  constructor(connectionId, ws) {
    super();
    this.connectionId = connectionId;
    this.ws = ws;
    this.isActive = false;
    this.isUserSpeaking = false;
    this.isAssistantSpeaking = false;
    this.currentTranscript = '';
    this.currentAIResponse = '';
    this.conversationHistory = [];
    this.metrics = {
      sttLatency: 0,
      llmLatency: 0,
      ttsLatency: 0,
      totalLatency: 0,
      audioReceived: 0,
      audioProcessed: 0
    };

    // Initialize services
    this.groqService = new GroqService();
    this.cartesiaService = new CartesiaService();
    
    // Audio processing state
    this.audioBuffer = [];
    this.isProcessingAudio = false;
    this.lastActivityTime = Date.now();
    
    console.log(`🎯 Voice Call Workflow initialized for connection: ${connectionId}`);
  }

  /**
   * Start the complete voice calling workflow
   * @param {Object} config - Assistant configuration
   */
  async startWorkflow(config) {
    try {
      console.log(`🚀 Starting voice call workflow for ${this.connectionId}:`, {
        model: config.model,
        transcriber: config.transcriber,
        voiceModel: config.voiceModel,
        voiceId: config.voiceId,
        systemPrompt: config.systemPrompt
      });

      this.config = config;
      this.isActive = true;
      this.lastActivityTime = Date.now();

      // Send workflow started confirmation
      this.sendToClient({
        type: 'workflow_started',
        message: 'Voice call workflow activated',
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

      console.log(`✅ Voice call workflow started successfully for ${this.connectionId}`);
      
    } catch (error) {
      console.error(`❌ Error starting workflow for ${this.connectionId}:`, error);
      this.sendToClient({
        type: 'workflow_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Process incoming audio chunk through the complete pipeline
   * @param {Buffer} audioBuffer - Raw audio data
   */
  async processAudioChunk(audioBuffer) {
    if (!this.isActive || this.isProcessingAudio) {
      return;
    }

    try {
      this.isProcessingAudio = true;
      this.metrics.audioReceived++;
      this.lastActivityTime = Date.now();

      console.log(`🎙️ Processing audio chunk #${this.metrics.audioReceived} for ${this.connectionId}: ${audioBuffer.length} bytes`);

      // Step 1: Speech-to-Text (STT)
      const transcript = await this.processSTT(audioBuffer);
      
      if (transcript && transcript.trim()) {
        this.currentTranscript = transcript;
        this.isUserSpeaking = true;

        // Send partial transcript to client
        this.sendToClient({
          type: 'partial_transcript',
          text: transcript,
          timestamp: new Date().toISOString()
        });

        // Step 2: LLM Processing
        const aiResponse = await this.processLLM(transcript);
        
        if (aiResponse && aiResponse.trim()) {
          this.currentAIResponse = aiResponse;
          this.isAssistantSpeaking = true;

          // Send partial AI response to client
          this.sendToClient({
            type: 'partial_ai_response',
            text: aiResponse,
            timestamp: new Date().toISOString()
          });

          // Step 3: Text-to-Speech (TTS)
          await this.processTTS(aiResponse);
        }
      }

    } catch (error) {
      console.error(`❌ Error processing audio chunk for ${this.connectionId}:`, error);
      this.sendToClient({
        type: 'processing_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      this.isProcessingAudio = false;
    }
  }

  /**
   * Step 1: Speech-to-Text processing
   */
  async processSTT(audioBuffer) {
    const startTime = Date.now();
    
    try {
      console.log(`🎤 STT processing for ${this.connectionId}...`);
      
      const transcript = await this.groqService.transcribeAudio(audioBuffer, this.config.transcriber);
      
      this.metrics.sttLatency = Date.now() - startTime;
      console.log(`✅ STT completed for ${this.connectionId}: "${transcript}" (${this.metrics.sttLatency}ms)`);
      
      return transcript;
    } catch (error) {
      console.error(`❌ STT error for ${this.connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Step 2: LLM processing
   */
  async processLLM(transcript) {
    const startTime = Date.now();
    
    try {
      console.log(`🧠 LLM processing for ${this.connectionId}: "${transcript}"`);
      
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

      const response = await this.groqService.generateResponse(messages, {
        model: this.config.model,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 500,
        stream: true
      });

      let fullResponse = '';
      
      // Handle streaming response
      if (response && typeof response.on === 'function') {
        // Streaming response
        for await (const chunk of response) {
          if (chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) {
            const content = chunk.choices[0].delta.content;
            fullResponse += content;
            
            // Send streaming chunks to client
            this.sendToClient({
              type: 'llm_stream_chunk',
              text: content,
              timestamp: new Date().toISOString()
            });
          }
        }
      } else {
        // Non-streaming response
        fullResponse = response.choices[0].message.content;
      }

      this.metrics.llmLatency = Date.now() - startTime;
      console.log(`✅ LLM completed for ${this.connectionId}: "${fullResponse}" (${this.metrics.llmLatency}ms)`);

      // Add assistant response to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString()
      });

      return fullResponse;
    } catch (error) {
      console.error(`❌ LLM error for ${this.connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Step 3: Text-to-Speech processing
   */
  async processTTS(text) {
    const startTime = Date.now();
    
    try {
      console.log(`🗣️ TTS processing for ${this.connectionId}: "${text}"`);
      
      const audioData = await this.cartesiaService.textToSpeechStreaming(text, {
        model_id: this.config.voiceModel,
        voice_id: this.config.voiceId,
        output_format: 'pcm_16000',
        speed: 1.0,
        emotion: 'neutral'
      });

      this.metrics.ttsLatency = Date.now() - startTime;
      this.metrics.totalLatency = this.metrics.sttLatency + this.metrics.llmLatency + this.metrics.ttsLatency;

      console.log(`✅ TTS completed for ${this.connectionId} (${this.metrics.ttsLatency}ms)`);

      // Send audio data to client
      this.sendToClient({
        type: 'tts_audio_chunk',
        audio: audioData,
        timestamp: new Date().toISOString()
      });

      // Send metrics update
      this.sendToClient({
        type: 'metrics_update',
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ TTS error for ${this.connectionId}:`, error);
      throw error;
    }
  }

  /**
   * Send first message if configured
   */
  async sendFirstMessage(message) {
    try {
      console.log(`👋 Sending first message for ${this.connectionId}: "${message}"`);
      
      // Send text message
      this.sendToClient({
        type: 'first_message',
        text: message,
        timestamp: new Date().toISOString()
      });

      // Convert to speech
      await this.processTTS(message);

    } catch (error) {
      console.error(`❌ Error sending first message for ${this.connectionId}:`, error);
    }
  }

  /**
   * Send data to client via WebSocket
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
   * Stop the workflow
   */
  async stopWorkflow() {
    try {
      console.log(`🛑 Stopping voice call workflow for ${this.connectionId}`);
      
      this.isActive = false;
      this.isUserSpeaking = false;
      this.isAssistantSpeaking = false;
      this.isProcessingAudio = false;

      // Send workflow stopped confirmation
      this.sendToClient({
        type: 'workflow_stopped',
        message: 'Voice call workflow deactivated',
        metrics: this.metrics,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Voice call workflow stopped for ${this.connectionId}`);
      
    } catch (error) {
      console.error(`❌ Error stopping workflow for ${this.connectionId}:`, error);
    }
  }

  /**
   * Get workflow status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      isUserSpeaking: this.isUserSpeaking,
      isAssistantSpeaking: this.isAssistantSpeaking,
      isProcessingAudio: this.isProcessingAudio,
      currentTranscript: this.currentTranscript,
      currentAIResponse: this.currentAIResponse,
      metrics: this.metrics,
      conversationLength: this.conversationHistory.length,
      lastActivityTime: this.lastActivityTime
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log(`🧹 Cleaning up voice call workflow for ${this.connectionId}`);
    this.removeAllListeners();
    this.isActive = false;
    this.isProcessingAudio = false;
  }
}

module.exports = VoiceCallWorkflow;
