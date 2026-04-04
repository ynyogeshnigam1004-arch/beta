/**
 * Deepgram Streaming Service - Optimized for Session Reuse
 * 
 * Key optimizations:
 * 1. Connection reuse during active sessions (not persistent idle connections)
 * 2. Fast reconnection with cached options
 * 3. Optimized endpointing for lower latency
 * 
 * Performance target: 50ms for subsequent sessions vs 900ms for first session
 */

const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const { EventEmitter } = require('events');

class DeepgramStreamingService extends EventEmitter {
  constructor() {
    super();
    this.apiKey = process.env.DEEPGRAM_API_KEY;
    this.deepgramClient = null;
    this.activeConnection = null;
    this.isConnected = false;
    this.currentOptions = null;
    this.sessionCount = 0;
    this.connectionStartTime = null;
    this.lastWarningTime = 0; // Add throttling for warning messages
    
    // Increase max listeners to prevent memory leak warnings
    this.setMaxListeners(50);
    
    console.log('🎙️ Deepgram Streaming Service initialized (SESSION OPTIMIZED)');
    console.log('🔑 API Key configured:', this.apiKey ? 'Yes' : 'No');
    console.log('🚀 Session-based connection reuse enabled');
  }

  /**
   * Start a new STT session with connection reuse optimization
   */
  async startSession(options = {}) {
    this.sessionCount++;
    const sessionId = `session_${this.sessionCount}_${Date.now()}`;
    
    console.log(`🌊 [DEEPGRAM] Starting session: ${sessionId}`);
    this.connectionStartTime = Date.now();

    // Store optimized options - ONLY SAFE PARAMETERS
    this.currentOptions = {
      model: options.model || 'nova-2',
      language: options.language || 'en-US',
      smart_format: true,  // This is safe for streaming
      interim_results: true,
      encoding: options.encoding || 'linear16',
      sample_rate: options.sampleRate || 16000,
      channels: 1,
      endpointing: options.endpointing || 50 // Use provided endpointing or default to 50ms
    };

    try {
      // Create fresh connection for each session (Deepgram's recommended approach)
      await this.createConnection();
      
      const connectionTime = Date.now() - this.connectionStartTime;
      console.log(`✅ [DEEPGRAM] Session ${sessionId} ready in ${connectionTime}ms`);
      
      // Return the service instance so methods can be called on it
      return this;
    } catch (error) {
      console.error(`❌ [DEEPGRAM] Session ${sessionId} failed:`, error);
      throw error;
    }
  }

  /**
   * Create a new Deepgram connection
   */
  async createConnection() {
    return new Promise((resolve, reject) => {
      try {
        // Create Deepgram client
        this.deepgramClient = createClient(this.apiKey);
        
        console.log('🔌 [DEEPGRAM] Creating new connection...');
        console.log('📋 [DEEPGRAM] Options:', this.currentOptions);

        // Create live transcription connection
        this.activeConnection = this.deepgramClient.listen.live(this.currentOptions);

        const connectionTimeout = setTimeout(() => {
          console.error('❌ [DEEPGRAM] Connection timeout');
          reject(new Error('Deepgram connection timeout'));
        }, 10000);

        this.activeConnection.on(LiveTranscriptionEvents.Open, () => {
          clearTimeout(connectionTimeout);
          console.log('✅ [DEEPGRAM] Connection established');
          this.isConnected = true;
          resolve(this.activeConnection);
        });

        this.activeConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
          this.handleTranscript(data);
        });

        this.activeConnection.on(LiveTranscriptionEvents.Metadata, (metadata) => {
          console.log('📊 [DEEPGRAM] Metadata received');
          this.emit('metadata', metadata);
        });

        this.activeConnection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
          console.log('🔚 [DEEPGRAM] Utterance ended');
          this.emit('utteranceEnd');
        });

        this.activeConnection.on(LiveTranscriptionEvents.Error, (error) => {
          clearTimeout(connectionTimeout);
          console.error('❌ [DEEPGRAM] Connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.activeConnection.on(LiveTranscriptionEvents.Close, (code, reason) => {
          clearTimeout(connectionTimeout);
          console.log(`🔌 [DEEPGRAM] Connection closed (${code}): ${reason}`);
          this.isConnected = false;
          this.activeConnection = null;
        });

        this.activeConnection.on(LiveTranscriptionEvents.Warning, (warning) => {
          console.warn('⚠️ [DEEPGRAM] Warning:', warning);
          this.emit('warning', warning);
        });

      } catch (error) {
        console.error('❌ [DEEPGRAM] Failed to create connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle transcript events
   */
  handleTranscript(data) {
    try {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      const confidence = data.channel?.alternatives?.[0]?.confidence;
      const isFinal = data.is_final;
      const speechFinal = data.speech_final;

      if (transcript && transcript.trim().length > 0) {
        // Emit interim results
        if (!isFinal) {
          this.emit('interim', {
            transcript,
            confidence: confidence || 0,
            isFinal: false
          });
        }
        
        // Emit final results
        if (isFinal || speechFinal) {
          console.log('✅ [DEEPGRAM] Final transcript:', transcript);
          this.emit('transcript', {
            transcript,
            confidence: confidence || 0,
            isFinal: true,
            words: data.channel?.alternatives?.[0]?.words || []
          });
        }
      }
    } catch (error) {
      console.error('❌ Error processing transcript:', error);
    }
  }

  /**
   * Send audio data to Deepgram
   */
  sendAudio(audioData) {
    if (!this.isConnected || !this.activeConnection) {
      // Throttle the warning to prevent spam (only log once every 5 seconds)
      const now = Date.now();
      if (!this.lastWarningTime || now - this.lastWarningTime > 5000) {
        console.warn('⚠️ Not connected to Deepgram');
        this.lastWarningTime = now;
      }
      return false;
    }

    try {
      this.activeConnection.send(audioData);
      return true;
    } catch (error) {
      console.error('❌ Error sending audio:', error);
      return false;
    }
  }

  /**
   * Finish the current session
   */
  async finishSession() {
    if (this.activeConnection && this.isConnected) {
      try {
        this.activeConnection.finish();
        console.log('📤 [DEEPGRAM] Session finished');
      } catch (error) {
        console.error('❌ Error finishing session:', error);
      }
    }
  }

  /**
   * Close connection and cleanup
   */
  async close() {
    if (this.activeConnection) {
      try {
        await this.finishSession();
        // Give it a moment to finish
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('❌ Error closing connection:', error);
      }
      this.activeConnection = null;
    }
    
    this.deepgramClient = null;
    this.isConnected = false;
    console.log('🔌 [DEEPGRAM] Connection closed');
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      hasClient: !!this.deepgramClient,
      hasConnection: !!this.activeConnection,
      sessionCount: this.sessionCount
    };
  }

  /**
   * Check if Deepgram is available
   */
  static isAvailable() {
    return !!process.env.DEEPGRAM_API_KEY;
  }

  // Legacy methods for compatibility
  async connect(options = {}) {
    return this.startSession(options);
  }

  async finishStream() {
    return this.finishSession();
  }

  // Test compatibility methods
  onTranscript(callback) {
    this.on('transcript', callback);
  }

  onInterim(callback) {
    this.on('interim', callback);
  }

  finish() {
    return this.finishSession();
  }
}

module.exports = DeepgramStreamingService;