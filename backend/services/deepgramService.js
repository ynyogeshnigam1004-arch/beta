/**
 * Deepgram STT Service - Official SDK Implementation
 * Ultra-fast real-time speech-to-text transcription
 * 
 * Latency: 0.3-0.5 seconds (3x faster than Groq Whisper)
 * Cost: $0.0043/minute ($200 free credits on signup)
 * 
 * Using official @deepgram/sdk for best performance
 */

const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const { EventEmitter } = require('events');

class DeepgramService extends EventEmitter {
  constructor() {
    super();
    this.apiKey = process.env.DEEPGRAM_API_KEY;
    this.deepgramClient = null;
    this.liveConnection = null;
    this.isConnected = false;
    this.keepAliveInterval = null;
    
    console.log('🎙️ Deepgram Service initialized (OPTIMIZED SDK)');
    console.log('🔑 Deepgram API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...${this.apiKey.substring(this.apiKey.length - 4)}` : 'NOT SET');
  }

  /**
   * Connect to Deepgram using official SDK
   * @param {Object} options - Transcription options
   * @returns {Promise<void>}
   */
  async connect(options = {}) {
    // IMPORTANT: Close any existing connection before creating new one
    // This prevents overlapping sessions (Vapi-style session management)
    if (this.isConnected || this.liveConnection) {
      console.warn('⚠️ Closing existing Deepgram connection before creating new one');
      await this.close();
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      // Create Deepgram client
      this.deepgramClient = createClient(this.apiKey);
      
      // Configure live transcription options - OPTIMIZED for ULTRA-LOW latency!
      const transcriptionOptions = {
        model: options.model || 'nova-2',
        language: options.language || 'en-US',
        smart_format: true,
        interim_results: true, // Get results as they come
        encoding: options.encoding || 'linear16',
        sample_rate: options.sampleRate || 16000,  // 16kHz
        channels: 1,
        endpointing: options.endpointing || 50,   // OPTIMIZED: 50ms for MAXIMUM speed! (was 150ms)
        vad_events: options.vad_events || false
      };

      if (options.utterance_end_ms) {
        transcriptionOptions.utterance_end_ms = options.utterance_end_ms;
      }

      console.log('🔌 Connecting to Deepgram with OPTIMIZED SDK...');
      console.log('📋 Options:', transcriptionOptions);

      // Create live transcription connection
      this.liveConnection = this.deepgramClient.listen.live(transcriptionOptions);

      // Setup event handlers
      this.setupEventHandlers();

      // Wait for connection to open - OPTIMIZED timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Deepgram connection timeout'));
        }, 5000); // OPTIMIZED: 5s timeout instead of 10s

        this.liveConnection.on(LiveTranscriptionEvents.Open, () => {
          clearTimeout(timeout);
          this.isConnected = true;
          console.log('✅ Connected to Deepgram (OPTIMIZED SDK)');
          this.startKeepAlive();
          resolve();
        });

        this.liveConnection.on(LiveTranscriptionEvents.Error, (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Failed to connect to Deepgram:', error);
      throw error;
    }
  }

  /**
   * Setup event handlers for Deepgram connection
   */
  setupEventHandlers() {
    let transcriptEventCount = 0;
    
    // Handle transcription results
    this.liveConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
      transcriptEventCount++;
      
      try {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const confidence = data.channel?.alternatives?.[0]?.confidence;
        const isFinal = data.is_final;
        const speechFinal = data.speech_final;

        console.log(`📝 [Deepgram Event #${transcriptEventCount}]`, {
          isFinal,
          speechFinal,
          hasTranscript: !!transcript,
          transcriptLength: transcript ? transcript.length : 0,
          transcript: transcript || '(empty)',
          confidence: confidence || 0
        });

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
            console.log('✅ [Deepgram] Final transcript:', transcript);
            this.emit('transcript', {
              transcript,
              confidence: confidence || 0,
              isFinal: true,
              words: data.channel?.alternatives?.[0]?.words || []
            });
          }
        } else {
          console.warn('⚠️ [Deepgram] Empty transcript event received');
        }
      } catch (error) {
        console.error('❌ Error processing transcript:', error);
      }
    });

    // Handle metadata
    this.liveConnection.on(LiveTranscriptionEvents.Metadata, (metadata) => {
      console.log('📊 [Deepgram] Metadata:', metadata);
      this.emit('metadata', metadata);
    });

    // Handle utterance end
    this.liveConnection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      console.log('🔚 [Deepgram] Utterance ended');
      this.emit('utteranceEnd');
    });

    // Handle errors
    this.liveConnection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('❌ [Deepgram] Error:', error);
      this.emit('error', error);
    });

    // Handle close
    this.liveConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log('🔌 Deepgram connection closed');
      this.isConnected = false;
      this.stopKeepAlive();
      this.emit('close');
    });

    // Handle warnings
    this.liveConnection.on(LiveTranscriptionEvents.Warning, (warning) => {
      console.warn('⚠️ [Deepgram] Warning:', warning);
      this.emit('warning', warning);
    });
  }

  /**
   * Send audio data to Deepgram for transcription
   * @param {Buffer} audioData - Audio buffer (WebM/Opus or PCM)
   */
  sendAudio(audioData) {
    if (!this.isConnected || !this.liveConnection) {
      console.warn('⚠️ Not connected to Deepgram');
      return false;
    }

    try {
      this.liveConnection.send(audioData);
      return true;
    } catch (error) {
      console.error('❌ Error sending audio:', error);
      return false;
    }
  }

  /**
   * Start keep-alive mechanism - OPTIMIZED
   */
  startKeepAlive() {
    // Send keep-alive every 3 seconds (more responsive)
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected && this.liveConnection) {
        try {
          this.liveConnection.keepAlive();
        } catch (error) {
          console.error('❌ Keep-alive error:', error);
        }
      }
    }, 3000); // OPTIMIZED: 3s instead of 5s
  }

  /**
   * Stop keep-alive mechanism
   */
  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Finish sending audio and close stream
   */
  async finishStream() {
    if (this.liveConnection && this.isConnected) {
      try {
        this.liveConnection.finish();
        console.log('📤 Sent finish signal to Deepgram');
      } catch (error) {
        console.error('❌ Error finishing stream:', error);
      }
    }
  }

  /**
   * Close the connection
   */
  async close() {
    this.stopKeepAlive();
    
    if (this.liveConnection) {
      try {
        await this.finishStream();
        // Give it a moment to finish
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('❌ Error closing connection:', error);
      }
      this.liveConnection = null;
    }
    
    this.deepgramClient = null;
    this.isConnected = false;
    console.log('🔌 Deepgram connection closed');
  }

  /**
   * Check if Deepgram is available
   * @returns {boolean}
   */
  static isAvailable() {
    return !!process.env.DEEPGRAM_API_KEY;
  }

  /**
   * Get connection status
   * @returns {Object}
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      hasClient: !!this.deepgramClient,
      hasConnection: !!this.liveConnection
    };
  }
}

module.exports = DeepgramService;
