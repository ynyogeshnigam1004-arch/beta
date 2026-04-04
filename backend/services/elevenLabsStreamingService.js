/**
 * ElevenLabs WebSocket Streaming Service
 * Real-time text-to-speech using WebSocket connection
 * Based on official ElevenLabs WebSocket API documentation
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class ElevenLabsStreamingService extends EventEmitter {
  constructor() {
    super();
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseWsUrl = 'wss://api.elevenlabs.io/v1/text-to-speech';
    this.ws = null;
    this.isConnected = false;
    
    if (!this.apiKey) {
      console.warn('⚠️ ElevenLabs API key not found. Streaming will be disabled.');
      return;
    }
    
    console.log('🔊 ElevenLabs Streaming Service initialized');
  }

  isAvailable() {
    return !!this.apiKey;
  }

  /**
   * Connect to ElevenLabs WebSocket for streaming TTS
   * @param {string} voiceId - Voice ID to use
   * @param {string} modelId - Model ID (default: eleven_flash_v2_5 for low latency)
   * @param {Object} voiceSettings - Voice settings
   * @returns {Promise<void>}
   */
  async connect(voiceId, modelId = 'eleven_flash_v2_5', voiceSettings = {}) {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Close existing connection if any
    if (this.ws) {
      this.disconnect();
    }

    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.baseWsUrl}/${voiceId}/stream-input?model_id=${modelId}`;
        
        console.log('🔌 Connecting to ElevenLabs WebSocket...');
        console.log(`   Voice ID: ${voiceId}`);
        console.log(`   Model: ${modelId}`);
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.on('open', async () => {
          console.log('✅ ElevenLabs WebSocket connected');
          this.isConnected = true;
          
          // Send initial configuration
          const config = {
            text: ' ', // Space to keep connection alive
            voice_settings: {
              stability: voiceSettings.stability || 0.5,
              similarity_boost: voiceSettings.similarity_boost || 0.8,
              use_speaker_boost: voiceSettings.use_speaker_boost || false
            },
            generation_config: {
              chunk_length_schedule: voiceSettings.chunk_length_schedule || [120, 160, 250, 290]
            },
            xi_api_key: this.apiKey
          };
          
          this.ws.send(JSON.stringify(config));
          console.log('📤 Sent initial configuration');
          
          this.emit('connected');
          resolve();
        });
        
        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.audio) {
              // Decode base64 audio and emit
              const audioBuffer = Buffer.from(message.audio, 'base64');
              this.emit('audio', audioBuffer);
              console.log(`🎵 Received audio chunk: ${audioBuffer.length} bytes`);
            }
            
            if (message.isFinal) {
              console.log('✅ Audio generation complete');
              this.emit('complete');
            }
            
            if (message.error) {
              console.error('❌ ElevenLabs error:', message.error);
              this.emit('error', new Error(message.error));
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        });
        
        this.ws.on('error', (error) => {
          console.error('❌ ElevenLabs WebSocket error:', error);
          this.isConnected = false;
          this.emit('error', error);
          reject(error);
        });
        
        this.ws.on('close', () => {
          console.log('🔌 ElevenLabs WebSocket closed');
          this.isConnected = false;
          this.ws = null;
          this.emit('disconnected');
        });
        
      } catch (error) {
        console.error('❌ Error connecting to ElevenLabs WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Send text to be converted to speech
   * @param {string} text - Text to convert
   * @param {boolean} flush - Force immediate generation
   * @returns {Promise<void>}
   */
  async sendText(text, flush = false) {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      text: text,
      flush: flush
    };

    this.ws.send(JSON.stringify(message));
    console.log(`📤 Sent text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" (flush: ${flush})`);
  }

  /**
   * Stream text with automatic sentence detection
   * @param {string} text - Full text to stream
   * @returns {Promise<void>}
   */
  async streamText(text) {
    if (!this.isConnected || !this.ws) {
      throw new Error('WebSocket not connected');
    }

    // Split text into sentences for better streaming
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      const isLast = i === sentences.length - 1;
      
      await this.sendText(sentence, isLast);
      
      // Small delay between sentences
      if (!isLast) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * End the stream and close connection
   */
  async endStream() {
    if (!this.isConnected || !this.ws) {
      return;
    }

    // Send empty string to close connection
    this.ws.send(JSON.stringify({ text: '' }));
    console.log('📤 Sent end signal');
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
      console.log('🔌 Disconnected from ElevenLabs WebSocket');
    }
  }

  /**
   * Synthesize speech with streaming (convenience method)
   * @param {string} text - Text to convert
   * @param {string} voiceId - Voice ID
   * @param {string} modelId - Model ID
   * @param {Object} voiceSettings - Voice settings
   * @returns {Promise<Buffer[]>} Array of audio chunks
   */
  async synthesizeSpeechStreaming(text, voiceId, modelId = 'eleven_flash_v2_5', voiceSettings = {}) {
    const audioChunks = [];
    
    return new Promise(async (resolve, reject) => {
      try {
        // Set up event listeners
        const onAudio = (chunk) => audioChunks.push(chunk);
        const onComplete = () => {
          this.removeListener('audio', onAudio);
          this.removeListener('complete', onComplete);
          this.removeListener('error', onError);
          this.disconnect();
          resolve(audioChunks);
        };
        const onError = (error) => {
          this.removeListener('audio', onAudio);
          this.removeListener('complete', onComplete);
          this.removeListener('error', onError);
          this.disconnect();
          reject(error);
        };
        
        this.on('audio', onAudio);
        this.on('complete', onComplete);
        this.on('error', onError);
        
        // Connect and stream
        await this.connect(voiceId, modelId, voiceSettings);
        await this.streamText(text);
        await this.endStream();
        
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = ElevenLabsStreamingService;
