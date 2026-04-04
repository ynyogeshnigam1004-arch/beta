/**
 * Real-time Streaming Voice Pipeline Handler
 * Handles bidirectional WebSocket streaming for live voice conversations
 * Architecture: Audio Chunks → STT Stream → LLM Stream → TTS Stream → Audio Out
 * Target Latency: <1000ms end-to-end
 */

const StreamingPipeline = require('../services/streamingPipeline');
const DeepgramService = require('../services/deepgramService');

class RealtimePipelineHandler {
  constructor(ws, connectionId) {
    this.ws = ws;
    this.connectionId = connectionId;
    this.pipeline = null;
    this.config = null;
    
    // Deepgram streaming service
    this.deepgramService = null;
    this.isDeepgramConnected = false;
    this.deepgramTranscript = '';
    
    // Audio buffering for STT (fallback for non-Deepgram)
    this.audioBuffer = [];
    this.audioBufferSize = 0;
    this.minChunkSize = 4800; // ~300ms at 16kHz (16000 samples/sec * 0.3s)
    
    // State tracking
    this.isProcessing = false;
    this.isAssistantSpeaking = false;
    this.lastTranscriptTime = Date.now();
    this.silenceTimeout = null;
    this.silenceThreshold = 1500; // 1.5s of silence triggers processing
    
    // Performance metrics
    this.metrics = {
      audioReceived: 0,
      sttLatency: 0,
      llmLatency: 0,
      ttsLatency: 0,
      totalLatency: 0,
      lastMessageTime: Date.now()
    };
    
    console.log(`🎙️ Realtime pipeline handler created for ${connectionId}`);
  }

  /**
   * Initialize the streaming pipeline with assistant configuration
   */
  async initialize(config) {
    try {
      this.config = config;
      
      // Create pipeline instance
      this.pipeline = new StreamingPipeline({
        ttsProvider: 'cartesia',
        sttModel: config.transcriber || 'whisper-large-v3-turbo',
        llmModel: config.model || 'llama-3.1-8b-instant',
        voiceModel: config.voiceModel || 'sonic-2024-10',
        voiceId: config.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091'
      });

      // Set system prompt
      if (config.systemPrompt) {
        this.pipeline.setSystemPrompt(config.systemPrompt);
      }

      // Initialize Deepgram streaming if using Deepgram transcriber
      const isDeepgram = config.transcriber && config.transcriber.startsWith('deepgram');
      if (isDeepgram) {
        console.log('🚀 [STREAMING] Initializing Deepgram real-time streaming...');
        await this.initializeDeepgramStreaming();
      }

      // Send configuration confirmation
      this.send({
        type: 'config_confirmed',
        config: {
          transcriber: config.transcriber,
          model: config.model,
          voiceModel: config.voiceModel,
          voiceId: config.voiceId,
          streamingMode: isDeepgram ? 'deepgram-realtime' : 'batch'
        },
        timestamp: Date.now()
      });

      console.log(`✅ Pipeline initialized for ${this.connectionId}:`, {
        stt: config.transcriber,
        llm: config.model,
        tts: config.voiceModel,
        voiceId: config.voiceId,
        streaming: isDeepgram
      });
      console.log(`🚀 Now accepting audio chunks for ${isDeepgram ? 'REAL-TIME' : 'batch'} streaming!`);

      // Send first message if configured
      if (config.firstMessageMode === 'assistant-speaks-first' && config.firstMessage) {
        await this.sendFirstMessage(config.firstMessage);
      } else {
        // Send ready state
        this.send({
          type: 'pipeline_ready',
          message: 'Ready to receive audio',
          timestamp: Date.now()
        });
      }

      return true;
    } catch (error) {
      console.error(`❌ Pipeline initialization error for ${this.connectionId}:`, error);
      this.send({
        type: 'error',
        error: 'Failed to initialize pipeline',
        details: error.message,
        timestamp: Date.now()
      });
      return false;
    }
  }

  /**
   * Initialize Deepgram streaming connection
   */
  async initializeDeepgramStreaming() {
    try {
      this.deepgramService = new DeepgramService();
      
      // Set up event handlers BEFORE connecting
      this.deepgramService.on('transcript', (data) => {
        if (data.isFinal && data.transcript && data.transcript.trim().length > 0) {
          console.log('✅ [DEEPGRAM] Final transcript:', data.transcript);
          this.deepgramTranscript = data.transcript;
          
          // Send transcript to client
          this.send({
            type: 'stt_completed',
            text: data.transcript,
            confidence: data.confidence,
            timestamp: Date.now()
          });
          
          // Process through LLM immediately
          if (!this.isProcessing) {
            this.processTranscript(data.transcript);
          }
        } else if (!data.isFinal && data.transcript) {
          // Send interim results for live feedback
          this.send({
            type: 'stt_interim',
            text: data.transcript,
            timestamp: Date.now()
          });
        }
      });
      
      this.deepgramService.on('error', (error) => {
        console.error('❌ [DEEPGRAM] Error:', error);
        this.send({
          type: 'error',
          error: 'Deepgram streaming error',
          details: error.message,
          timestamp: Date.now()
        });
      });
      
      this.deepgramService.on('close', () => {
        console.log('🔌 [DEEPGRAM] Connection closed');
        this.isDeepgramConnected = false;
      });
      
      // Connect to Deepgram
      await this.deepgramService.connect({
        model: 'nova-2',
        language: 'en-US',
        encoding: 'linear16',
        sampleRate: 16000,
        channels: 1,
        endpointing: 50, // OPTIMIZED: 50ms for ultra-fast response (was 150ms)
        interim_results: true
      });
      
      this.isDeepgramConnected = true;
      console.log('✅ [DEEPGRAM] Streaming connection established');
      
    } catch (error) {
      console.error('❌ [DEEPGRAM] Failed to initialize streaming:', error);
      throw error;
    }
  }

  /**
   * Send first message from assistant
   */
  async sendFirstMessage(message) {
    try {
      this.send({
        type: 'assistant_speaking',
        text: message,
        timestamp: Date.now()
      });

      // Generate TTS for first message
      const audioBuffer = await this.pipeline.cartesiaService.textToSpeech(
        message,
        this.config.voiceModel || 'sonic-2024-10',
        this.config.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091'
      );

      // Send audio in chunks for streaming playback
      await this.streamAudioBuffer(audioBuffer);

      this.send({
        type: 'assistant_finished',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error sending first message:', error);
    }
  }

  /**
   * Handle incoming audio chunk from client
   * Audio format: 16kHz, 16-bit PCM, mono (raw PCM from browser)
   */
  async handleAudioChunk(audioData) {
    try {
      const startTime = Date.now();
      this.metrics.audioReceived++;
      this.metrics.lastMessageTime = startTime;

      // Convert to buffer if needed
      const audioBuffer = Buffer.isBuffer(audioData) 
        ? audioData 
        : Buffer.from(audioData);

      // STREAMING MODE: Forward directly to Deepgram (ULTRA-FAST!)
      if (this.isDeepgramConnected && this.deepgramService) {
        // Send audio chunk immediately to Deepgram
        this.deepgramService.sendAudio(audioBuffer);
        
        // Send acknowledgment (optional, for debugging)
        if (this.metrics.audioReceived % 10 === 0) {
          console.log(`🎙️ [STREAMING] Forwarded ${this.metrics.audioReceived} chunks to Deepgram`);
        }
        
        return; // Don't buffer, just stream!
      }

      // FALLBACK: Batch mode for non-Deepgram transcribers
      console.log(`🎙️ [BATCH] Received audio chunk #${this.metrics.audioReceived}: ${audioBuffer.length} bytes`);

      // Accumulate audio chunks
      this.audioBuffer.push(audioBuffer);
      this.audioBufferSize += audioBuffer.length;

      // Send acknowledgment
      this.send({
        type: 'audio_received',
        bufferSize: this.audioBufferSize,
        timestamp: Date.now()
      });

      // Reset silence timeout
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
      }

      // Set new silence timeout
      this.silenceTimeout = setTimeout(() => {
        this.processSilence();
      }, this.silenceThreshold);

      // Process if buffer is large enough (for near real-time processing)
      if (this.audioBufferSize >= this.minChunkSize && !this.isProcessing) {
        await this.processAudioBuffer();
      }

    } catch (error) {
      console.error('❌ Error handling audio chunk:', error);
      this.send({
        type: 'error',
        error: 'Audio processing error',
        details: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle end of utterance signal from client
   * Tells Deepgram to finalize the transcript
   */
  async handleEndOfUtterance() {
    try {
      console.log('🔚 [END_OF_UTTERANCE] Received from client');
      
      if (this.isDeepgramConnected && this.deepgramService) {
        // Tell Deepgram to finalize the current utterance
        await this.deepgramService.finishStream();
        console.log('✅ [DEEPGRAM] Finalize signal sent');
      }
    } catch (error) {
      console.error('❌ Error handling end of utterance:', error);
    }
  }

  /**
   * Process accumulated audio buffer through STT
   */
  async processAudioBuffer() {
    if (this.isProcessing || this.audioBuffer.length === 0) return;

    try {
      this.isProcessing = true;
      const sttStartTime = Date.now();

      // Concatenate all audio chunks
      const fullAudioBuffer = Buffer.concat(this.audioBuffer);
      
      // Clear buffer
      this.audioBuffer = [];
      this.audioBufferSize = 0;

      // Send STT started event
      this.send({
        type: 'stt_started',
        bufferSize: fullAudioBuffer.length,
        timestamp: Date.now()
      });

      // Transcribe audio using Groq Whisper
      const transcript = await this.pipeline.groqService.transcribeAudio(
        fullAudioBuffer,
        'wav',
        { model: this.config.transcriber || 'whisper-large-v3-turbo' }
      );

      const sttEndTime = Date.now();
      this.metrics.sttLatency = sttEndTime - sttStartTime;

      if (!transcript || transcript.trim().length === 0) {
        console.log('⚠️ Empty transcription, skipping...');
        this.isProcessing = false;
        return;
      }

      console.log(`📝 Transcribed (${this.metrics.sttLatency}ms):`, transcript);

      // Send transcription result
      this.send({
        type: 'transcript_complete',
        text: transcript,
        latency: this.metrics.sttLatency,
        timestamp: Date.now()
      });

      // Process through LLM → TTS pipeline
      await this.processTranscript(transcript);

    } catch (error) {
      console.error('❌ STT processing error:', error);
      this.send({
        type: 'error',
        error: 'Transcription failed',
        details: error.message,
        timestamp: Date.now()
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process transcript through LLM and stream TTS response
   */
  async processTranscript(transcript) {
    try {
      const llmStartTime = Date.now();

      // Add user message to conversation history
      this.pipeline.conversationHistory.push({
        role: 'user',
        content: transcript
      });

      // Send LLM processing started
      this.send({
        type: 'llm_started',
        userMessage: transcript,
        timestamp: Date.now()
      });

      let fullResponse = '';
      let currentSentence = '';

      // Stream LLM response and buffer sentences for TTS
      const stream = await this.pipeline.groqService.streamChatCompletion(
        this.pipeline.conversationHistory,
        {
          temperature: this.config.temperature || 0.7,
          maxTokens: this.config.maxTokens || 500
        }
      );

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        
        if (text) {
          fullResponse += text;
          currentSentence += text;

          // Send partial LLM response
          this.send({
            type: 'llm_chunk',
            text: text,
            fullText: fullResponse,
            timestamp: Date.now()
          });

          // Check for sentence completion (., !, ?)
          const sentenceEndMatch = currentSentence.match(/[.!?]+\s*$/);
          
          if (sentenceEndMatch && currentSentence.trim().length > 10) {
            // We have a complete sentence, generate TTS immediately
            const sentence = currentSentence.trim();
            currentSentence = ''; // Reset for next sentence

            // Generate and stream TTS for this sentence (parallel processing)
            this.generateAndStreamTTS(sentence).catch(err => {
              console.error('❌ TTS streaming error:', err);
            });
          }
        }
      }

      const llmEndTime = Date.now();
      this.metrics.llmLatency = llmEndTime - llmStartTime;

      // Process any remaining text
      if (currentSentence.trim().length > 0) {
        await this.generateAndStreamTTS(currentSentence.trim());
      }

      // Add assistant response to history
      this.pipeline.conversationHistory.push({
        role: 'assistant',
        content: fullResponse
      });

      console.log(`🤖 LLM response (${this.metrics.llmLatency}ms):`, fullResponse);

      // Send LLM completion
      this.send({
        type: 'llm_complete',
        text: fullResponse,
        latency: this.metrics.llmLatency,
        timestamp: Date.now()
      });

      // Calculate total latency
      this.metrics.totalLatency = Date.now() - llmStartTime + this.metrics.sttLatency;

      // Send metrics
      this.send({
        type: 'metrics',
        latency: {
          stt: this.metrics.sttLatency,
          llm: this.metrics.llmLatency,
          total: this.metrics.totalLatency
        },
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ LLM processing error:', error);
      this.send({
        type: 'error',
        error: 'LLM processing failed',
        details: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Generate TTS and stream audio chunks to client
   */
  async generateAndStreamTTS(text) {
    try {
      const ttsStartTime = Date.now();

      this.send({
        type: 'tts_started',
        text: text,
        timestamp: Date.now()
      });

      // Generate TTS audio using Cartesia
      const audioBuffer = await this.pipeline.cartesiaService.textToSpeech(
        text,
        this.config.voiceModel || 'sonic-2024-10',
        this.config.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091'
      );

      const ttsEndTime = Date.now();
      this.metrics.ttsLatency = ttsEndTime - ttsStartTime;

      console.log(`🔊 TTS generated (${this.metrics.ttsLatency}ms) for: "${text.substring(0, 50)}..."`);

      // Stream audio buffer in chunks
      await this.streamAudioBuffer(audioBuffer);

      this.send({
        type: 'tts_complete',
        text: text,
        latency: this.metrics.ttsLatency,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ TTS generation error:', error);
      this.send({
        type: 'error',
        error: 'TTS generation failed',
        details: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Stream audio buffer to client in chunks
   * Breaks large audio into smaller chunks for smoother playback
   */
  async streamAudioBuffer(audioBuffer) {
    const chunkSize = 8192; // 8KB chunks for smooth streaming
    const totalChunks = Math.ceil(audioBuffer.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, audioBuffer.length);
      const chunk = audioBuffer.slice(start, end);

      this.send({
        type: 'audio_chunk',
        data: chunk.toString('base64'),
        chunkIndex: i,
        totalChunks: totalChunks,
        timestamp: Date.now()
      });

      // Small delay to prevent overwhelming the WebSocket
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  /**
   * Handle silence detection (user stopped speaking)
   */
  processSilence() {
    console.log('🔇 Silence detected, processing buffer...');
    
    if (this.audioBuffer.length > 0 && !this.isProcessing) {
      this.processAudioBuffer();
    }
  }

  /**
   * Send message to client
   */
  send(message) {
    try {
      if (this.ws.readyState === 1) { // WebSocket.OPEN
        this.ws.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
      }
      
      // Close Deepgram connection
      if (this.deepgramService) {
        await this.deepgramService.close();
        this.deepgramService = null;
        this.isDeepgramConnected = false;
        console.log('🔌 [DEEPGRAM] Connection closed');
      }
      
      if (this.pipeline) {
        this.pipeline.reset();
      }
      
      this.audioBuffer = [];
      this.audioBufferSize = 0;
      
      console.log(`🧹 Realtime pipeline cleaned up for ${this.connectionId}`);
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }
}

module.exports = RealtimePipelineHandler;

