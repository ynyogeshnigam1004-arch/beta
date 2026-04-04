/**
 * Interruption Handler Service
 * Manages user interruptions during assistant speech (similar to Vapi.ai)
 * 
 * Features:
 * - Detects when user starts speaking during TTS playback
 * - Stops assistant speech immediately on valid interruption
 * - Filters out short noises/background sounds
 * - Manages state transitions between speaking and listening
 * - Implements backoff delay to prevent rapid toggling
 */

const EventEmitter = require('events');

class InterruptionHandler extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Configuration with defaults
    this.config = {
      // Minimum duration of user speech to trigger interruption (ms)
      minInterruptionDuration: config.minInterruptionDuration || 500,
      
      // Silence duration before resuming assistant (ms)
      silenceThreshold: config.silenceThreshold || 500,
      
      // Backoff delay before restarting assistant speech (ms)
      backoffDelay: config.backoffDelay || 800,
      
      // Voice activity detection threshold (0-1)
      vadThreshold: config.vadThreshold || 0.5,
      
      // Enable/disable interruption handling
      enabled: config.enabled !== false
    };
    
    // State management
    this.state = {
      assistantSpeaking: false,
      userSpeaking: false,
      interrupted: false,
      lastUserSpeechTime: null,
      lastSilenceTime: null,
      userSpeechStartTime: null,
      pendingResume: null
    };
    
    // Timers
    this.timers = {
      silenceDetection: null,
      backoffDelay: null,
      interruptionCheck: null
    };
    
    console.log('🎙️ Interruption Handler initialized');
    console.log(`   Min interruption duration: ${this.config.minInterruptionDuration}ms`);
    console.log(`   Silence threshold: ${this.config.silenceThreshold}ms`);
    console.log(`   Backoff delay: ${this.config.backoffDelay}ms`);
  }

  /**
   * Called when assistant starts speaking (TTS begins)
   */
  startAssistantSpeech() {
    if (!this.config.enabled) return;
    
    console.log('🔊 Assistant started speaking');
    this.state.assistantSpeaking = true;
    this.state.interrupted = false;
    
    this.emit('assistant_speech_started');
  }

  /**
   * Called when assistant stops speaking (TTS ends)
   */
  stopAssistantSpeech(reason = 'completed') {
    if (!this.state.assistantSpeaking) return;
    
    console.log(`🔇 Assistant stopped speaking (${reason})`);
    this.state.assistantSpeaking = false;
    
    this.emit('assistant_speech_stopped', { reason });
  }

  /**
   * Called when user voice activity is detected
   * @param {Object} audioData - Audio data with VAD score
   */
  onUserVoiceActivity(audioData = {}) {
    if (!this.config.enabled) return;
    
    const vadScore = audioData.vadScore || 0;
    const hasVoiceActivity = vadScore > this.config.vadThreshold;
    
    if (hasVoiceActivity) {
      this.handleUserSpeechStart();
    } else {
      this.handleUserSpeechEnd();
    }
  }

  /**
   * Handle user starting to speak
   */
  handleUserSpeechStart() {
    const now = Date.now();
    
    // Mark user speech start time
    if (!this.state.userSpeaking) {
      this.state.userSpeaking = true;
      this.state.userSpeechStartTime = now;
      this.state.lastUserSpeechTime = now;
      
      console.log('🎤 User started speaking');
      
      // Clear any pending silence detection
      if (this.timers.silenceDetection) {
        clearTimeout(this.timers.silenceDetection);
        this.timers.silenceDetection = null;
      }
      
      // Check if this should trigger an interruption
      this.checkInterruption();
    } else {
      // Update last speech time
      this.state.lastUserSpeechTime = now;
    }
  }

  /**
   * Handle user stopping speech
   */
  handleUserSpeechEnd() {
    if (!this.state.userSpeaking) return;
    
    const now = Date.now();
    this.state.lastSilenceTime = now;
    
    // Start silence detection timer
    if (this.timers.silenceDetection) {
      clearTimeout(this.timers.silenceDetection);
    }
    
    this.timers.silenceDetection = setTimeout(() => {
      this.onSilenceDetected();
    }, this.config.silenceThreshold);
  }

  /**
   * Check if user speech should trigger interruption
   */
  checkInterruption() {
    // Only interrupt if assistant is currently speaking
    if (!this.state.assistantSpeaking) return;
    
    // Already interrupted
    if (this.state.interrupted) return;
    
    // Wait for minimum interruption duration
    if (this.timers.interruptionCheck) {
      clearTimeout(this.timers.interruptionCheck);
    }
    
    this.timers.interruptionCheck = setTimeout(() => {
      // Check if user is still speaking after minimum duration
      if (this.state.userSpeaking && this.state.assistantSpeaking) {
        const speechDuration = Date.now() - this.state.userSpeechStartTime;
        
        if (speechDuration >= this.config.minInterruptionDuration) {
          this.triggerInterruption();
        }
      }
    }, this.config.minInterruptionDuration);
  }

  /**
   * Trigger interruption - stop assistant speech
   */
  triggerInterruption() {
    if (this.state.interrupted) return;
    
    console.log('⚠️ INTERRUPTION DETECTED - Stopping assistant speech');
    
    this.state.interrupted = true;
    this.state.assistantSpeaking = false;
    
    // Emit interruption event
    this.emit('interruption_triggered', {
      timestamp: Date.now(),
      speechDuration: Date.now() - this.state.userSpeechStartTime
    });
    
    // Stop TTS playback
    this.emit('stop_tts_playback');
  }

  /**
   * Called when silence is detected after user speech
   */
  onSilenceDetected() {
    console.log('🔇 Silence detected after user speech');
    
    this.state.userSpeaking = false;
    this.state.userSpeechStartTime = null;
    
    // If we interrupted the assistant, prepare to resume
    if (this.state.interrupted) {
      this.prepareResume();
    }
    
    this.emit('silence_detected');
  }

  /**
   * Prepare to resume assistant speech after interruption
   */
  prepareResume() {
    console.log(`⏳ Preparing to resume (backoff: ${this.config.backoffDelay}ms)`);
    
    // Clear any existing backoff timer
    if (this.timers.backoffDelay) {
      clearTimeout(this.timers.backoffDelay);
    }
    
    // Wait for backoff delay before allowing resume
    this.timers.backoffDelay = setTimeout(() => {
      console.log('✅ Ready to resume assistant response');
      this.state.interrupted = false;
      
      this.emit('ready_to_resume', {
        timestamp: Date.now()
      });
    }, this.config.backoffDelay);
  }

  /**
   * Check if system can accept new assistant speech
   */
  canStartAssistantSpeech() {
    return !this.state.userSpeaking && 
           !this.state.interrupted && 
           !this.state.assistantSpeaking;
  }

  /**
   * Check if interruption is currently active
   */
  isInterrupted() {
    return this.state.interrupted;
  }

  /**
   * Check if user is currently speaking
   */
  isUserSpeaking() {
    return this.state.userSpeaking;
  }

  /**
   * Check if assistant is currently speaking
   */
  isAssistantSpeaking() {
    return this.state.assistantSpeaking;
  }

  /**
   * Get current state
   */
  getState() {
    return {
      ...this.state,
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Interruption handler config updated:', this.config);
  }

  /**
   * Reset state
   */
  reset() {
    console.log('🔄 Resetting interruption handler state');
    
    // Clear all timers
    Object.keys(this.timers).forEach(key => {
      if (this.timers[key]) {
        clearTimeout(this.timers[key]);
        this.timers[key] = null;
      }
    });
    
    // Reset state
    this.state = {
      assistantSpeaking: false,
      userSpeaking: false,
      interrupted: false,
      lastUserSpeechTime: null,
      lastSilenceTime: null,
      userSpeechStartTime: null,
      pendingResume: null
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    console.log('🧹 Cleaning up interruption handler');
    this.reset();
    this.removeAllListeners();
  }
}

module.exports = InterruptionHandler;