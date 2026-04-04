/**
 * Voice Activity Detection Service for Phone Calls
 * Energy-based speech detection (same logic as browser VAD)
 * No external dependencies - pure Node.js implementation
 */

const { EventEmitter } = require('events');

class VADService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.vad = null;
    this.isListening = false;
    this.audioBuffer = Buffer.alloc(0);
    this.isSpeaking = false;
    this.speechStartTime = null;
    this.silenceStartTime = null;
    
    // VAD configuration (same as browser)
    this.config = {
      positiveSpeechThreshold: options.positiveSpeechThreshold || 0.8,
      negativeSpeechThreshold: options.negativeSpeechThreshold || 0.75,
      minSpeechFrames: options.minSpeechFrames || 3,
      redemptionFrames: options.redemptionFrames || 8,
      preSpeechPadFrames: options.preSpeechPadFrames || 1,
      ...options
    };
    
    console.log('✅ VAD Service initialized');
  }
  
  /**
   * Initialize VAD
   */
  async initialize() {
    try {
      // Note: @ricky0123/vad-node requires manual audio feeding
      // We'll implement a simpler energy-based VAD for phone calls
      this.isListening = true;
      console.log('✅ VAD ready for audio processing');
    } catch (error) {
      console.error('❌ Error initializing VAD:', error);
      throw error;
    }
  }
  
  /**
   * Process incoming audio chunk
   * @param {Buffer} audioChunk - PCM audio data (16-bit, 16kHz, mono)
   */
  processAudio(audioChunk) {
    if (!this.isListening) {
      return;
    }
    
    // Accumulate audio
    this.audioBuffer = Buffer.concat([this.audioBuffer, audioChunk]);
    
    // Process in 512-sample frames (32ms at 16kHz)
    const frameSize = 512 * 2; // 512 samples * 2 bytes per sample
    
    while (this.audioBuffer.length >= frameSize) {
      const frame = this.audioBuffer.slice(0, frameSize);
      this.audioBuffer = this.audioBuffer.slice(frameSize);
      
      // Detect speech in frame
      const hasSpeech = this.detectSpeechInFrame(frame);
      
      if (hasSpeech && !this.isSpeaking) {
        // Speech started
        this.isSpeaking = true;
        this.speechStartTime = Date.now();
        this.silenceStartTime = null;
        this.emit('speech_start');
        console.log('🎤 [VAD] Speech detected');
      } else if (!hasSpeech && this.isSpeaking) {
        // Potential speech end - wait for silence duration
        if (!this.silenceStartTime) {
          this.silenceStartTime = Date.now();
        }
        
        const silenceDuration = Date.now() - this.silenceStartTime;
        
        // End speech after 500ms of silence
        if (silenceDuration > 500) {
          const speechDuration = Date.now() - this.speechStartTime;
          
          // Only process if speech was at least 300ms (filters out very short noises)
          if (speechDuration >= 300) {
            this.isSpeaking = false;
            this.speechStartTime = null;
            this.silenceStartTime = null;
            this.emit('speech_end');
            console.log(`🔇 [VAD] Speech ended (duration: ${speechDuration}ms)`);
          } else {
            // Too short, ignore it
            console.log(`⚠️ [VAD] Speech too short (${speechDuration}ms), ignoring`);
            this.isSpeaking = false;
            this.speechStartTime = null;
            this.silenceStartTime = null;
          }
        }
      } else if (hasSpeech && this.isSpeaking) {
        // Continue speech - reset silence timer
        this.silenceStartTime = null;
      }
    }
  }
  
  /**
   * Detect speech in audio frame using energy-based VAD
   * @param {Buffer} frame - PCM audio frame
   * @returns {boolean} True if speech detected
   */
  detectSpeechInFrame(frame) {
    // Calculate RMS energy
    let sum = 0;
    const samples = frame.length / 2;
    
    for (let i = 0; i < frame.length; i += 2) {
      const sample = frame.readInt16LE(i);
      sum += sample * sample;
    }
    
    const rms = Math.sqrt(sum / samples);
    
    // Normalize to 0-1 range (16-bit audio max is 32768)
    const energy = rms / 32768;
    
    // Speech threshold - increased from 0.02 to 0.05 (5% of max amplitude)
    // This makes VAD less sensitive to background noise
    const threshold = 0.05;
    
    return energy > threshold;
  }
  
  /**
   * Stop VAD processing
   */
  stop() {
    this.isListening = false;
    this.audioBuffer = Buffer.alloc(0);
    this.isSpeaking = false;
    this.speechStartTime = null;
    this.silenceStartTime = null;
    console.log('🛑 VAD stopped');
  }
  
  /**
   * Cleanup resources
   */
  async cleanup() {
    this.stop();
    this.removeAllListeners();
  }
}

module.exports = VADService;
