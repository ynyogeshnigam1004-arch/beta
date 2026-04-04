 /**
 * ============================================================================
 * Call Handler - VAPI-Style WebSocket Management
 * ============================================================================
 * 
 * Handles WebSocket connections for voice calls using VAPI's architecture:
 * 1. First message = Configuration (JSON)
 * 2. Pipeline initialized with config
 * 3. Subsequent messages = Audio data (Binary)
 * 4. Responses sent as events
 * 
 * Author: Voice AI Platform
 * Version: 2.0
 * ============================================================================
 */

const VapiStylePipeline = require('../services/VapiStylePipeline');

class CallHandler {
  constructor(ws, connectionId) {
    this.ws = ws;
    this.connectionId = connectionId;
    this.sessionId = connectionId; // Use connectionId as sessionId
    this.pipeline = null;
    this.isConfigured = false;
    this.configurationAttempted = false; // Prevent repeated configuration attempts
    this.config = null; // Store config for later use
    this.userId = null; // Store userId for human transfer
    this.transferMode = false; // Track if in human transfer mode
    this.deepgramConnection = null; // Persistent Deepgram connection for streaming
    this.isStreaming = false; // Track if using streaming mode
    this.streamingChunks = []; // Buffer for streaming chunks
    this.callStartTime = new Date(); // Track call start time for history
    
    console.log(`📞 Call handler created for ${connectionId}`);
  }
  
  /**
   * Handle incoming message
   * @param {Buffer|String} message - WebSocket message
   */
  async handleMessage(message) {
    try {
      // Convert Buffer to string if needed
      let messageData = message;
      if (message instanceof Buffer) {
        // Check if it's raw PCM audio for streaming (not JSON)
        // Raw PCM will be binary data, not parseable as JSON
        let isJSON = false;
        try {
          const jsonString = message.toString('utf8');
          const parsed = JSON.parse(jsonString);
          if (parsed && parsed.type) {
            messageData = jsonString;
            isJSON = true;
          }
        } catch (e) {
          // Not JSON - treat as raw PCM audio
          isJSON = false;
        }
        
        // If it's raw PCM and we're configured, handle as streaming chunk
        if (!isJSON && this.isConfigured) {
          await this.handlePCMChunk(message);
          return;
        }
      }
      
      // First message should be configuration (JSON)
      if (!this.isConfigured) {
        // Prevent repeated configuration attempts
        if (this.configurationAttempted) {
          // Silently ignore - browser is trying to reconnect after human transfer
          return;
        }
        await this.handleConfiguration(messageData);
        return;
      }
      
      // Parse JSON messages for control signals
      if (typeof messageData === 'string') {
        const data = JSON.parse(messageData);
        
        if (data.type === 'end_of_utterance') {
          await this.handleEndOfUtterance(data);
        } else if (data.type === 'stop_main_pipeline') {
          // Ignore this message type
        } else {
          console.warn('⚠️ Unknown message type:', data.type);
        }
        return;
      }
      
      // Binary messages are batch audio (for Groq Whisper)
      if (messageData instanceof Buffer) {
        await this.handleAudio(messageData);
      }
      
    } catch (error) {
      console.error(`❌ Error handling message for ${this.connectionId}:`, error);
      this.sendMessage({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Handle configuration message (first message)
   * @param {String|Buffer} message - Configuration JSON
   */
  async handleConfiguration(message) {
    try {
      console.log(`⚙️ Configuring pipeline for ${this.connectionId}`);
      
      // Mark that we've attempted configuration
      this.configurationAttempted = true;
      
      // Parse configuration
      const configStr = message.toString();
      const data = JSON.parse(configStr);
      
      if (data.type !== 'config') {
        throw new Error('First message must be configuration');
      }
      
      console.log('📋 Received configuration:', {
        model: data.config.model,
        voiceProvider: data.config.voiceProvider,
        voiceId: data.config.voiceId,
        voiceModel: data.config.voiceModel,
        tools: data.config.tools?.length || 0
      });
      
      // Store config for later use (human transfer)
      this.config = data.config;
      
      // Extract userId from config for credits and human transfer
      const userId = data.config.userId || null;
      this.userId = userId; // Store userId for human transfer
      
      // DEBUG: Log userId details
      console.log('🔍 [USERID DEBUG] Received config userId:', userId);
      console.log('🔍 [USERID DEBUG] UserId type:', typeof userId);
      console.log('🔍 [USERID DEBUG] UserId string:', userId ? userId.toString() : 'null');
      console.log('🔍 [USERID DEBUG] Config transferSettings:', data.config.transferSettings);
      
      // Create pipeline with configuration including userId
      const pipelineConfig = {
        ...data.config,
        userId: userId, // Pass userId for credits deduction
        sessionId: this.connectionId
      };
      
      this.pipeline = new VapiStylePipeline(pipelineConfig);
      this.isConfigured = true;
      
      // Set up pipeline event handlers
      this.setupPipelineEvents();
      
      // Send confirmation
      this.sendMessage({
        type: 'config_confirmed',
        timestamp: new Date().toISOString()
      });
      
      // Generate first message if configured
      if (data.config.firstMessageMode === 'assistant-speaks-first') {
        console.log('🗣️ Generating first message...');
        
        this.sendMessage({
          type: 'first_message_started',
          text: data.config.firstMessage,
          timestamp: new Date().toISOString()
        });
        
        try {
          const firstAudio = await this.pipeline.generateFirstMessage();
          
          if (firstAudio) {
            // Send audio as binary
            this.ws.send(firstAudio);
            
            this.sendMessage({
              type: 'first_message_completed',
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('❌ Error generating first message:', error.message);
          
          // Send error but don't crash - let user start speaking
          this.sendMessage({
            type: 'first_message_error',
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          // Continue anyway - user can still speak
          console.log('⚠️ Skipping first message, waiting for user input');
        }
      }
      
      // Send ready signal
      this.sendMessage({
        type: 'ready',
        message: 'Pipeline ready for audio input',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Pipeline configured and ready for ${this.connectionId}`);
      
    } catch (error) {
      console.error(`❌ Configuration error for ${this.connectionId}:`, error);
      this.sendMessage({
        type: 'config_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Handle audio message
   * @param {Buffer} audioBuffer - Audio data from microphone
   */
  async handleAudio(audioBuffer) {
    if (!this.pipeline) {
      console.warn('⚠️ Pipeline not configured, ignoring audio');
      return;
    }
    
    try {
      // Process audio - chunks will stream via 'audio_chunk' events
      await this.pipeline.processAudio(audioBuffer);
      
    } catch (error) {
      console.error(`❌ Audio processing error for ${this.connectionId}:`, error);
      this.sendMessage({
        type: 'processing_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Handle raw PCM chunk (streaming mode - same as VAPI!)
   * @param {Buffer} pcmBuffer - Raw PCM buffer (16kHz, linear16)
   */
  async handlePCMChunk(pcmBuffer) {
    // Initialize buffer if needed
    if (!this.chunkBuffer) {
      this.chunkBuffer = [];
    }
    
    // If Deepgram is not connected yet, buffer this chunk
    if (!this.isStreaming) {
      this.chunkBuffer.push(pcmBuffer);
      
      // Start connection on first chunk only
      if (!this.deepgramConnection) {
        console.log(`📥 [STREAMING] First PCM chunk received (${pcmBuffer.length} bytes, 16kHz), initializing Deepgram...`);
        
        // Start connection asynchronously (don't await here to avoid blocking)
        this.startDeepgramStreaming().then(() => {
          // After connection, send buffered chunks in smaller batches for faster processing
          if (this.chunkBuffer && this.chunkBuffer.length > 0 && this.deepgramConnection) {
            const totalBytes = this.chunkBuffer.reduce((sum, buf) => sum + buf.length, 0);
            console.log(`📤 [STREAMING] Deepgram ready! Sending ${this.chunkBuffer.length} buffered chunks...`);
            
            // Send chunks immediately without batching for minimum latency
            for (const chunk of this.chunkBuffer) {
              try {
                // Check if connection still exists before sending
                if (this.deepgramConnection) {
                  const success = this.deepgramConnection.sendAudio(chunk);
                  if (!success) {
                    console.warn('⚠️ Failed to send buffered PCM chunk');
                  }
                } else {
                  console.warn('⚠️ Deepgram connection closed before sending buffered chunk');
                  break;
                }
              } catch (err) {
                console.error('❌ Error sending buffered PCM chunk:', err);
              }
            }
            this.chunkBuffer = [];
            console.log('✅ [STREAMING] All buffered PCM chunks sent with minimum latency!');
          }
        }).catch(err => {
          console.error('❌ [STREAMING] Failed to start Deepgram:', err);
        });
      } else {
        // Connection is starting but not ready yet, just buffer
        // Removed spammy log - this fires constantly during buffering
      }
      
      return;
    }
    
    // OPTIMIZED: Immediate streaming - send audio chunks instantly for minimum latency
    try {
      // Check if connection still exists
      if (!this.deepgramConnection) {
        console.warn('⚠️ Deepgram connection closed, cannot send audio');
        return;
      }
      
      // Send audio immediately - no batching for ultra-low latency
      const success = this.deepgramConnection.sendAudio(pcmBuffer);
      
      if (!success) {
        console.warn('⚠️ Failed to send PCM audio to Deepgram');
      }
      
    } catch (error) {
      console.error('❌ Error handling PCM chunk:', error);
    }
  }

  /**
   * Handle streaming audio chunk (Deepgram real-time)
   * @param {Object} data - Audio chunk data
   */
  async handleAudioChunk(data) {
    // Initialize buffer if needed
    if (!this.chunkBuffer) {
      this.chunkBuffer = [];
    }
    
    // Convert Int16Array to Buffer (raw PCM, no WAV header needed for streaming)
    const pcmData = new Int16Array(data.data);
    const pcmBuffer = Buffer.from(pcmData.buffer);
    
    // If Deepgram is not connected yet, buffer this chunk
    if (!this.isStreaming) {
      this.chunkBuffer.push(pcmBuffer);
      
      // Start connection on first chunk only
      if (!this.deepgramConnection) {
        console.log(`📥 [STREAMING] First chunk received (${pcmBuffer.length} bytes raw PCM), initializing Deepgram...`);
        
        // Start connection asynchronously (don't await here to avoid blocking)
        this.startDeepgramStreaming().then(() => {
          // After connection, send ALL buffered chunks
          if (this.chunkBuffer && this.chunkBuffer.length > 0) {
            const totalBytes = this.chunkBuffer.reduce((sum, buf) => sum + buf.length, 0);
            console.log(`📤 [STREAMING] Deepgram ready! Sending ${this.chunkBuffer.length} buffered chunks...`);
            
            for (const chunk of this.chunkBuffer) {
              try {
                const success = this.deepgramConnection.sendAudio(chunk);
                if (!success) {
                  console.warn('⚠️ Failed to send buffered chunk');
                }
              } catch (err) {
                console.error('❌ Error sending buffered chunk:', err);
              }
            }
            this.chunkBuffer = [];
            console.log('✅ [STREAMING] All buffered chunks sent!');
          }
        }).catch(err => {
          console.error('❌ [STREAMING] Failed to start Deepgram:', err);
        });
      } else {
        // Connection is starting but not ready yet, just buffer
        // Removed spammy log - this fires constantly during buffering
      }
      
      return;
    }
    
    // Normal streaming - Deepgram is connected and ready
    try {
      const success = this.deepgramConnection.sendAudio(pcmBuffer);
      
      if (!success) {
        console.warn('⚠️ Failed to send audio to Deepgram');
      }
      
    } catch (error) {
      console.error('❌ Error handling audio chunk:', error);
    }
  }
  
  /**
   * Handle end of utterance signal (user stopped speaking)
   * @param {Object} data - End of utterance data
   */
  async handleEndOfUtterance(data) {
    console.log(`🔚 [STREAMING] End of utterance from ${this.connectionId}`);
    console.log(`   Total chunks: ${data.totalChunks}, Speech duration: ${data.speechDuration}ms`);
    
    if (this.deepgramConnection && this.isStreaming) {
      try {
        // Signal end to Deepgram to finalize the transcript
        await this.deepgramConnection.finishStream();
        console.log('✅ [STREAMING] Sent finish signal to Deepgram');
      } catch (error) {
        console.error('❌ Error finishing Deepgram stream:', error);
      }
    } else {
      console.warn('⚠️ [STREAMING] No active Deepgram connection to finish');
    }
  }
  
  /**
   * Start Deepgram streaming connection
   */
  async startDeepgramStreaming() {
    console.log(`🚀 [STREAMING] Starting Deepgram connection for ${this.connectionId}...`);
    
    const DeepgramService = require('../services/deepgramService');
    this.deepgramConnection = new DeepgramService();
    
    const streamStartTime = Date.now();
    let transcriptCount = 0;
    
    // Handle transcripts
    this.deepgramConnection.on('transcript', (data) => {
      transcriptCount++;
      const transcriptTime = Date.now() - streamStartTime;
      
      // Only log final transcripts to reduce spam
      if (data.isFinal) {
        console.log(`📝 [DEEPGRAM FINAL #${transcriptCount}] Transcript after ${transcriptTime}ms:`, {
          transcript: data.transcript || '(empty)',
          confidence: data.confidence
        });
      }
      
      if (data.isFinal && data.transcript && data.transcript.trim().length > 0) {
        console.log('✅ [STREAMING] Final transcript:', data.transcript);
        console.log(`⏱️  [STREAMING] Received in ${transcriptTime}ms from stream start`);
        
        // Send STT completed to client
        this.sendMessage({
          type: 'stt_completed',
          text: data.transcript,
          confidence: data.confidence,
          timestamp: new Date().toISOString()
        });
        
        // Process transcript through pipeline (LLM + TTS)
        setImmediate(() => {
          // Check if pipeline still exists (might have been cleaned up)
          if (this.pipeline && typeof this.pipeline.processTranscript === 'function') {
            this.pipeline.processTranscript(data.transcript);
          }
        });
      } else if (!data.isFinal && data.transcript && data.transcript.trim().length > 0) {
        this.sendMessage({
          type: 'stt_interim',
          text: data.transcript,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Handle utterance end
    this.deepgramConnection.on('utteranceEnd', () => {
      const utteranceTime = Date.now() - streamStartTime;
      console.log(`🔚 [STREAMING] Utterance end after ${utteranceTime}ms`);
    });
    
    // Handle errors
    this.deepgramConnection.on('error', (error) => {
      console.error('❌ [STREAMING] Deepgram error:', error);
      this.sendMessage({
        type: 'stt_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle close
    this.deepgramConnection.on('close', () => {
      const closeTime = Date.now() - streamStartTime;
      console.log(`🔌 [STREAMING] Connection closed after ${closeTime}ms. Total transcripts: ${transcriptCount}`);
      this.deepgramConnection = null;
      this.isStreaming = false;
    });
    
    // Connect to Deepgram
    try {
      await this.deepgramConnection.connect({
        model: 'nova-2',
        language: 'en-US',
        encoding: 'linear16',
        sampleRate: 16000,        // 16kHz (same as VAPI!)
        interim_results: true,
        channels: 1,
        endpointing: 200          // OPTIMIZED: 200ms for faster response
      });
      
      this.isStreaming = true;
      console.log('✅ [STREAMING] Deepgram connected successfully');
      console.log('📋 [STREAMING] Config: linear16, 16kHz, mono, endpointing: 200ms (OPTIMIZED!)');
      console.log('🎯 [STREAMING] Interim results enabled - you will see live transcripts!');
      
      // Notify client that streaming started
      this.sendMessage({
        type: 'stt_started',
        mode: 'streaming',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ [STREAMING] Failed to connect to Deepgram:', error);
      throw error;
    }
  }
  
  /**
   * Set up pipeline event handlers
   */
  setupPipelineEvents() {
    // STT events
    this.pipeline.on('stt_started', () => {
      this.sendMessage({
        type: 'stt_started',
        timestamp: new Date().toISOString()
      });
    });
    
    this.pipeline.on('stt_completed', async (data) => {
      // Check for human transfer request
      const text = data.text.toLowerCase();
      const isHumanRequest = 
        text.includes('transfer') ||
        (text.includes('connect') && (text.includes('human') || text.includes('person') || text.includes('agent'))) ||
        ((text.includes('talk') || text.includes('speak')) && (text.includes('human') || text.includes('person') || text.includes('agent'))) ||
        text.includes('real person') ||
        text.includes('live agent') ||
        text.includes('human agent');
      
      if (isHumanRequest && this.config?.transferSettings?.phoneNumber) {
        console.log(`🙋 Human transfer: "${data.text}"`);
        
        // Stop AI pipeline (no more AI responses) but keep WebSocket alive for audio bridging
        this.pipeline.stopProcessing();
        
        // Set transfer mode - WebSocket stays open but only for audio passthrough
        this.transferMode = true;
        
        try {
          // Use MultiTenantTwilioService for proper user credential handling
          const MultiTenantTwilioService = require('../services/multiTenantTwilioService');
          const forwardingNumber = `${this.config.transferSettings.countryCode}${this.config.transferSettings.phoneNumber}`;
          
          if (!this.userId) {
            throw new Error('User authentication required for human transfer');
          }
          
          console.log(`🔍 [BROWSER TRANSFER DEBUG] this.config:`, this.config);
          console.log(`🔍 [BROWSER TRANSFER DEBUG] this.config.id:`, this.config.id);
          
          const result = await MultiTenantTwilioService.initiateHumanTransfer(
            this.userId,
            this.sessionId,
            forwardingNumber,
            this.config.id // Pass assistant ID
          );
          
          this.sendMessage({
            type: 'human_transfer_initiated',
            conferenceName: result.conferenceName,
            callSid: result.callSid,
            status: result.status,
            message: result.message,
            instructions: result.instructions,
            timestamp: new Date().toISOString()
          });
          
          console.log('✅ Human transfer initiated - AI stopped, WebSocket audio bridge active');
          return;
        } catch (error) {
          console.error('❌ Human transfer failed:', error);
          
          // Provide user-friendly error messages
          let errorMessage = error.message;
          if (error.message.includes('Twilio credentials not found')) {
            errorMessage = 'Please configure your Twilio credentials in the Phone Numbers section to enable human transfers.';
          } else if (error.message.includes('No phone number configured')) {
            errorMessage = 'Please add a phone number in the Phone Numbers section to enable human transfers.';
          } else if (error.message.includes('username is required')) {
            errorMessage = 'Twilio credentials are not properly configured. Please check your Account SID and Auth Token in the Phone Numbers section.';
          }
          
          this.sendMessage({
            type: 'human_transfer_failed',
            error: errorMessage,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Skip AI processing if in transfer mode (human is handling the conversation)
      if (this.transferMode) {
        console.log('🔇 Transfer mode active - skipping AI processing, audio passthrough only');
        this.sendMessage({
          type: 'stt_completed',
          text: data.text,
          transferMode: true,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Normal STT completed message (AI mode)
      this.sendMessage({
        type: 'stt_completed',
        text: data.text,
        timestamp: new Date().toISOString()
      });
    });
    
    // LLM events
    this.pipeline.on('llm_started', () => {
      this.sendMessage({
        type: 'llm_started',
        timestamp: new Date().toISOString()
      });
    });
    
    this.pipeline.on('llm_chunk', (data) => {
      this.sendMessage({
        type: 'llm_chunk',
        text: data.text,
        timestamp: new Date().toISOString()
      });
    });
    
    this.pipeline.on('llm_completed', (data) => {
      this.sendMessage({
        type: 'llm_completed',
        text: data.text,
        timestamp: new Date().toISOString()
      });
    });
    
    // TTS events
    this.pipeline.on('tts_started', () => {
      this.sendMessage({
        type: 'tts_started',
        timestamp: new Date().toISOString()
      });
    });
    
    // STREAMING: Send audio chunks immediately as they arrive
    this.pipeline.on('audio_chunk', (audioChunk) => {
      if (this.ws && this.ws.readyState === 1) {
        this.ws.send(audioChunk);
        // Removed spammy log - this fires constantly during TTS streaming
      }
    });
    
    this.pipeline.on('tts_completed', () => {
      this.sendMessage({
        type: 'tts_completed',
        timestamp: new Date().toISOString()
      });
    });
    
    // Processing completed
    this.pipeline.on('processing_completed', (data) => {
      this.sendMessage({
        type: 'processing_completed',
        transcript: data.transcript,
        response: data.response,
        timestamp: new Date().toISOString()
      });
    });
    
    // No speech detected
    this.pipeline.on('no_speech_detected', () => {
      this.sendMessage({
        type: 'no_speech_detected',
        timestamp: new Date().toISOString()
      });
    });
    
    // Errors
    this.pipeline.on('error', (data) => {
      this.sendMessage({
        type: 'error',
        error: data.error,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  /**
   * Send JSON message to client
   * @param {Object} data - Message data
   */
  sendMessage(data) {
    if (this.ws.readyState === 1) { // WebSocket.OPEN
      this.ws.send(JSON.stringify(data));
    }
  }
  
  /**
   * Get conversation history
   * @returns {Array} Conversation history
   */
  getConversationHistory() {
    return this.pipeline ? this.pipeline.getConversationHistory() : [];
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    console.log(`🧹 Cleaning up call handler for ${this.connectionId}`);
    
    // Save call history before cleanup
    this.saveCallHistory();
    
    // Close Deepgram connection
    if (this.deepgramConnection) {
      this.deepgramConnection.close();
      this.deepgramConnection = null;
    }
    
    if (this.pipeline) {
      this.pipeline.cleanup();
      this.pipeline = null;
    }
    
    this.isConfigured = false;
    this.configurationAttempted = false;
    this.isStreaming = false;
    this.streamingChunks = [];
  }

  /**
   * Save call history to database
   */
  async saveCallHistory() {
    try {
      if (!this.pipeline || !this.config) {
        return; // No call data to save
      }

      const callDuration = Math.floor((Date.now() - this.callStartTime) / 1000);
      const conversationHistory = this.getConversationHistory();

      // Save to database with userId
      const collection = require('../config/database').getCollection('call_history');
      
      const callRecord = {
        callId: this.connectionId,
        callType: 'browser',
        assistantName: this.config.assistantName || 'Browser Assistant',
        assistantId: this.config.assistantId || null,
        userId: this.config.userId, // Include userId for proper filtering
        duration: callDuration,
        conversationHistory: conversationHistory,
        startTime: this.callStartTime?.toISOString() || new Date().toISOString(),
        endTime: new Date().toISOString(),
        status: 'completed',
        connectionId: this.connectionId,
        metrics: {
          totalLatency: 0,
          sttLatency: 0,
          llmLatency: 0,
          ttsLatency: 0
        }
      };

      await collection.insertOne(callRecord);
      console.log(`✅ Browser call history saved: ${this.connectionId}`);

    } catch (error) {
      console.error(`❌ Error saving browser call history:`, error);
    }
  }
}

module.exports = CallHandler;
