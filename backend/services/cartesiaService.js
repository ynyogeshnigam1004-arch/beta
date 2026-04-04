/**
 * Cartesia Service - FIXED VERSION
 * No retries, proper WAV format, single audio output
 */

const axios = require('axios');

class CartesiaService {
  constructor() {
    this.apiKey = process.env.CARTESIA_API_KEY;
    this.apiUrl = 'https://api.cartesia.ai';
    this.defaultVoiceId = 'a0e99841-438c-4a64-b679-ae501e7d6091';
    
    console.log('🔊 Cartesia Service initialized (FIXED)');
    console.log('🔑 Cartesia API Key:', this.apiKey ? `${this.apiKey.substring(0, 15)}...${this.apiKey.substring(this.apiKey.length - 4)} (${this.apiKey.length} chars)` : 'NOT SET');
  }

  /**
   * Convert text to speech - NO RETRIES, returns complete WAV audio
   */
  async textToSpeechStreaming(text, onAudioChunk, options = {}) {
    try {
      const model = options.model || 'sonic-english';
      const voiceId = options.voiceId || this.defaultVoiceId;
      const language = options.language || 'en';
      const dialect = options.dialect || 'us';
      const speed = options.speed || 1.0;
      const emotion = options.emotion || 'neutral';
      const volume = options.volume || 1.0;
      
      console.log(`🌊 Converting text to speech: "${text.substring(0, 50)}..."`);
      console.log(`🎤 Using voice ID: ${voiceId}`);
      console.log(`🎵 Using model: ${model}`);
      console.log(`🌍 Language: ${language}, Dialect: ${dialect}`);
      console.log(`⚡ Speed: ${speed}x, Volume: ${volume}x, Emotion: ${emotion}`);

      // Build request body with voice controls
      const requestBody = {
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
        }
      };

      // Add generation config for Sonic-3 model with advanced controls
      if (model === 'sonic-3') {
        requestBody.generation_config = {
          speed: speed,
          volume: volume,
          emotion: emotion
        };
      }

      // Add language/dialect for localization
      if (language !== 'en' || dialect !== 'us') {
        requestBody.language = language;
        if (['en', 'es', 'pt', 'fr'].includes(language) && dialect) {
          requestBody.dialect = dialect;
        }
      }

      const response = await axios.post(
        `${this.apiUrl}/tts/bytes`,
        requestBody,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
            'Cartesia-Version': '2024-06-10'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      // Convert PCM to WAV
      const pcmBuffer = Buffer.from(response.data);
      const wavBuffer = this.pcmToWav(pcmBuffer, 16000, 1, 16);
      
      console.log(`✅ TTS completed: ${wavBuffer.length} bytes with voice ${voiceId}`);
      
      // Send complete audio at once
      onAudioChunk(wavBuffer);

    } catch (error) {
      console.error(`❌ Cartesia TTS error:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Simple textToSpeech method (returns buffer directly)
   */
  async textToSpeech(text, options = {}) {
    const model = options.model || 'sonic-english';
    const voiceId = options.voiceId || this.defaultVoiceId;
    const language = options.language || 'en';
    const dialect = options.dialect || 'us';
    const speed = options.speed || 1.0;
    const emotion = options.emotion || 'neutral';
    const volume = options.volume || 1.0;
    
    console.log(`🌊 Converting text to speech: "${text.substring(0, 50)}..."`);
    console.log(`🎤 Using voice ID: ${voiceId}`);
    console.log(`🎵 Using model: ${model}`);
    console.log(`🌍 Language: ${language}, Dialect: ${dialect}`);
    console.log(`⚡ Speed: ${speed}x, Volume: ${volume}x, Emotion: ${emotion}`);

    // Build request body with voice controls
    const requestBody = {
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
      }
    };

    // Add generation config for Sonic-3 model with advanced controls
    if (model === 'sonic-3') {
      requestBody.generation_config = {
        speed: speed,
        volume: volume,
        emotion: emotion
      };
    }

    // Add language/dialect for localization
    if (language !== 'en' || dialect !== 'us') {
      requestBody.language = language;
      if (['en', 'es', 'pt', 'fr'].includes(language) && dialect) {
        requestBody.dialect = dialect;
      }
    }

    const response = await axios.post(
      `${this.apiUrl}/tts/bytes`,
      requestBody,
      {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Cartesia-Version': '2024-06-10'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );

    // Convert PCM to WAV
    const pcmBuffer = Buffer.from(response.data);
    const wavBuffer = this.pcmToWav(pcmBuffer, 16000, 1, 16);
    
    console.log(`✅ TTS completed: ${wavBuffer.length} bytes with voice ${voiceId}`);
    
    return wavBuffer;
  }

  /**
   * Buffer and convert text
   */
  async bufferAndConvertText(textChunk, buffer, onAudioChunk, options = {}) {
    buffer.text = (buffer.text || '') + textChunk;

    const sentenceEnders = /[.!?]\s*$/;
    const wordCount = buffer.text.split(/\s+/).length;

    const shouldConvert = 
      sentenceEnders.test(buffer.text) || 
      (wordCount >= 10 && /[,;]\s*$/.test(buffer.text));

    if (shouldConvert) {
      const textToConvert = buffer.text.trim();
      
      if (textToConvert.length > 0) {
        await this.textToSpeechStreaming(textToConvert, onAudioChunk, options);
        buffer.text = '';
      }
    }
  }

  /**
   * Flush remaining buffer
   */
  async flushBuffer(buffer, onAudioChunk, options = {}) {
    const remainingText = (buffer.text || '').trim();
    
    if (remainingText.length > 0) {
      console.log('🔄 Flushing buffer:', remainingText);
      await this.textToSpeechStreaming(remainingText, onAudioChunk, options);
      buffer.text = '';
    }
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
   * Get available models
   */
  getAvailableModels() {
    return {
      'sonic-english': { id: 'sonic-english', name: 'Sonic English' },
      'sonic-multilingual': { id: 'sonic-multilingual', name: 'Sonic Multilingual' }
    };
  }
}

module.exports = CartesiaService;
