/**
 * Cartesia Streaming Service - OPTIMIZED VERSION
 * Persistent WebSocket connection for ultra-low latency TTS
 * 
 * Optimizations:
 * - Persistent WebSocket connection (eliminates handshake overhead)
 * - Connection pooling and reuse
 * - Auto-reconnect with exponential backoff
 * - Keep-alive mechanism
 * - Predictive pre-connection
 */

const WebSocket = require('ws');

class CartesiaStreamingService {
  constructor() {
    this.apiKey = process.env.CARTESIA_API_KEY;
    this.wsUrl = 'wss://api.cartesia.ai/tts/websocket';
    this.defaultVoiceId = 'a0e99841-438c-4a64-b679-ae501e7d6091';
    
    // Persistent connection management
    this.persistentWs = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.keepAliveInterval = null;
    
    // Request management
    this.activeRequests = new Map(); // contextId -> request handlers
    this.requestCounter = 0;
    
    console.log('🔊 Cartesia Streaming Service initialized (OPTIMIZED)');
    console.log('🔑 API Key configured:', this.apiKey ? 'Yes' : 'No');
    console.log('🚀 Persistent WebSocket connection enabled');
  }

  /**
   * Ensure persistent WebSocket connection is established
   */
  async ensureConnection() {
    if (this.isConnected && this.persistentWs && this.persistentWs.readyState === WebSocket.OPEN) {
      return this.persistentWs;
    }

    if (this.isConnecting && this.connectionPromise) {
      console.log('🔄 [CARTESIA] Connection in progress, waiting...');
      return this.connectionPromise;
    }

    console.log('🔌 [CARTESIA] Establishing persistent connection...');
    this.isConnecting = true;
    this.connectionPromise = this.createPersistentConnection();
    
    try {
      const ws = await this.connectionPromise;
      this.isConnecting = false;
      return ws;
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  /**
   * Create persistent WebSocket connection with auto-reconnect
   */
  async createPersistentConnection() {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.wsUrl}?api_key=${this.apiKey}&cartesia_version=2024-06-10`;
      console.log('🔌 [CARTESIA] Connecting to persistent WebSocket...');
      
      const ws = new WebSocket(wsUrl, {
        handshakeTimeout: 10000
      });

      const connectionTimeout = setTimeout(() => {
        console.error('❌ [CARTESIA] Connection timeout');
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(connectionTimeout);
        console.log('✅ [CARTESIA] Persistent WebSocket connected');
        
        this.persistentWs = ws;
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Start keep-alive mechanism
        this.startKeepAlive();
        
        resolve(ws);
      });

      ws.on('message', (data) => {
        this.handleMessage(data);
      });

      ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        console.error('❌ [CARTESIA] WebSocket error:', error);
        this.isConnected = false;
        
        if (!this.isConnecting) {
          reject(error);
        }
      });

      ws.on('close', (code, reason) => {
        clearTimeout(connectionTimeout);
        console.log(`🔌 [CARTESIA] WebSocket closed (${code}): ${reason}`);
        
        this.isConnected = false;
        this.persistentWs = null;
        this.stopKeepAlive();
        
        // Auto-reconnect if not intentionally closed
        if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(data) {
    try {
      let message = null;
      let isJSON = false;
      
      // Try to parse as JSON first
      try {
        const jsonString = data.toString('utf8');
        message = JSON.parse(jsonString);
        isJSON = true;
      } catch (e) {
        // Not JSON, must be binary audio
        isJSON = false;
      }
      
      if (isJSON && message) {
        const contextId = message.context_id;
        const requestHandler = this.activeRequests.get(contextId);
        
        if (!requestHandler) {
          console.warn(`⚠️ [CARTESIA] No handler for context: ${contextId}`);
          return;
        }

        if (message.type === 'chunk' && message.data) {
          // Audio chunk received
          const audioData = Buffer.from(message.data, 'base64');
          requestHandler.onAudioChunk(audioData);
          
        } else if (message.done || message.type === 'done') {
          // Request completed
          console.log(`✅ [CARTESIA] Request ${contextId} completed`);
          requestHandler.onComplete();
          this.activeRequests.delete(contextId);
          
        } else if (message.error) {
          // Error occurred
          console.error(`❌ [CARTESIA] Request ${contextId} error:`, message.error);
          requestHandler.onError(new Error(message.error));
          this.activeRequests.delete(contextId);
        }
      }
    } catch (error) {
      console.error('❌ [CARTESIA] Message processing error:', error);
    }
  }

  /**
   * Start keep-alive mechanism
   */
  startKeepAlive() {
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected && this.persistentWs && this.persistentWs.readyState === WebSocket.OPEN) {
        // Send ping to keep connection alive
        try {
          this.persistentWs.ping();
        } catch (error) {
          console.warn('⚠️ [CARTESIA] Keep-alive ping failed:', error);
        }
      }
    }, 30000); // Ping every 30 seconds
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
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000); // Exponential backoff, max 10s
    
    console.log(`🔄 [CARTESIA] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.ensureConnection();
        console.log('✅ [CARTESIA] Reconnected successfully');
      } catch (error) {
        console.error('❌ [CARTESIA] Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Optimized streaming TTS with persistent connection
   */
  async streamTextToSpeech(text, onAudioChunk, onComplete, options = {}) {
    const startTime = Date.now();
    const model = options.model || 'sonic-english';
    const voiceId = options.voiceId || this.defaultVoiceId;
    const language = options.language || 'en';
    const dialect = options.dialect || 'us';
    const speed = options.speed || 1.0;
    const emotion = options.emotion || 'neutral';
    const volume = options.volume || 1.0;
    const contextId = `ctx_${++this.requestCounter}_${Date.now()}`;
    
    console.log(`🌊 [CARTESIA] Starting optimized TTS: "${text.substring(0, 50)}..."`);
    console.log(`🎤 Voice: ${voiceId}, Model: ${model}, Context: ${contextId}`);
    console.log(`🌍 Language: ${language}, Dialect: ${dialect}`);
    console.log(`⚡ Speed: ${speed}x, Volume: ${volume}x, Emotion: ${emotion}`);

    try {
      // Ensure persistent connection is ready
      const connectionStart = Date.now();
      const ws = await this.ensureConnection();
      const connectionTime = Date.now() - connectionStart;
      
      if (connectionTime > 10) {
        console.log(`🔌 [CARTESIA] Connection ready in ${connectionTime}ms`);
      } else {
        console.log(`⚡ [CARTESIA] Using existing connection (0ms overhead)`);
      }

      return new Promise((resolve, reject) => {
        let audioChunks = [];
        let firstChunkReceived = false;
        let isCompleted = false;

        // Register request handler
        this.activeRequests.set(contextId, {
          onAudioChunk: (audioData) => {
            if (!firstChunkReceived) {
              const firstChunkTime = Date.now() - startTime;
              console.log(`🎵 [CARTESIA] First chunk in ${firstChunkTime}ms (OPTIMIZED!)`);
              firstChunkReceived = true;
            }
            
            audioChunks.push(audioData);
            
            // Convert PCM to WAV and send immediately
            const wavChunk = this.pcmToWav(audioData, 16000, 1, 16);
            onAudioChunk(wavChunk);
          },
          
          onComplete: () => {
            const totalTime = Date.now() - startTime;
            console.log(`✅ [CARTESIA] Completed in ${totalTime}ms, ${audioChunks.length} chunks (OPTIMIZED!)`);
            
            isCompleted = true;
            if (onComplete) onComplete();
            resolve({
              chunks: audioChunks.length,
              totalTime: totalTime
            });
          },
          
          onError: (error) => {
            console.error(`❌ [CARTESIA] Request ${contextId} failed:`, error);
            if (!isCompleted) {
              reject(error);
            }
          }
        });

        // Build request with voice controls
        const request = {
          model_id: model,
          transcript: text,
          voice: {
            mode: "id",
            id: voiceId
          },
          output_format: {
            container: "raw",
            encoding: "pcm_s16le",
            sample_rate: 16000
          },
          context_id: contextId,
          continue: false
        };

        // Add generation config for Sonic-3 model with advanced controls
        if (model === 'sonic-3') {
          request.generation_config = {
            speed: speed,
            volume: volume,
            emotion: emotion
          };
        }

        // Add language/dialect for localization
        if (language !== 'en' || dialect !== 'us') {
          request.language = language;
          if (['en', 'es', 'pt', 'fr'].includes(language) && dialect) {
            request.dialect = dialect;
          }
        }

        try {
          ws.send(JSON.stringify(request));
          console.log(`📤 [CARTESIA] Request sent via persistent connection`);
        } catch (error) {
          console.error(`❌ [CARTESIA] Failed to send request:`, error);
          this.activeRequests.delete(contextId);
          reject(error);
        }

        // Timeout handling
        const timeout = setTimeout(() => {
          if (!isCompleted) {
            console.warn(`⏱️ [CARTESIA] Request ${contextId} timeout`);
            this.activeRequests.delete(contextId);
            reject(new Error('TTS request timeout'));
          }
        }, 30000);

        // Clear timeout when completed
        const originalOnComplete = this.activeRequests.get(contextId).onComplete;
        this.activeRequests.get(contextId).onComplete = () => {
          clearTimeout(timeout);
          originalOnComplete();
        };
      });

    } catch (error) {
      console.error('❌ [CARTESIA] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  async streamTextChunked(text, onAudioChunk, onComplete, options = {}) {
    return this.streamTextToSpeech(text, onAudioChunk, onComplete, options);
  }

  /**
   * Convert PCM to WAV format
   */
  pcmToWav(pcmBuffer, sampleRate, numChannels, bitDepth) {
    const blockAlign = numChannels * (bitDepth / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmBuffer.length;
    const headerSize = 44;
    const fileSize = headerSize + dataSize - 8;

    const wavBuffer = Buffer.alloc(headerSize + dataSize);

    // RIFF header
    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(fileSize, 4);
    wavBuffer.write('WAVE', 8);

    // fmt chunk
    wavBuffer.write('fmt ', 12);
    wavBuffer.writeUInt32LE(16, 16);
    wavBuffer.writeUInt16LE(1, 20); // PCM
    wavBuffer.writeUInt16LE(numChannels, 22);
    wavBuffer.writeUInt32LE(sampleRate, 24);
    wavBuffer.writeUInt32LE(byteRate, 28);
    wavBuffer.writeUInt16LE(blockAlign, 32);
    wavBuffer.writeUInt16LE(bitDepth, 34);

    // data chunk
    wavBuffer.write('data', 36);
    wavBuffer.writeUInt32LE(dataSize, 40);
    pcmBuffer.copy(wavBuffer, headerSize);

    return wavBuffer;
  }

  /**
   * Pre-connect for predictive optimization
   */
  async preConnect() {
    if (!this.isConnected && !this.isConnecting) {
      console.log('🚀 [CARTESIA] Pre-connecting for next request...');
      try {
        await this.ensureConnection();
        console.log('✅ [CARTESIA] Pre-connection ready');
      } catch (error) {
        console.warn('⚠️ [CARTESIA] Pre-connection failed:', error);
      }
    }
  }

  /**
   * Close persistent connection
   */
  close() {
    console.log('🔌 [CARTESIA] Closing persistent connection...');
    
    this.stopKeepAlive();
    
    // Cancel all active requests
    for (const [contextId, handler] of this.activeRequests) {
      handler.onError(new Error('Connection closed'));
    }
    this.activeRequests.clear();
    
    if (this.persistentWs) {
      this.persistentWs.close(1000, 'Service shutdown');
      this.persistentWs = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionPromise = null;
  }
}

module.exports = CartesiaStreamingService;