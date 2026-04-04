/**
 * Inbound Call Handler
 * Handles phone calls coming into Twilio number via Media Streams
 */

const { base64MulawToPCM, pcmToBase64Mulaw } = require('../services/audioConverter');
const VapiStylePipeline = require('../services/VapiStylePipeline');
const AssistantModel = require('../models/Assistant');
const CallHistory = require('../models/CallHistory');

class InboundCallHandler {
  constructor(ws, callSid) {
    this.ws = ws;
    this.callSid = callSid;
    this.streamSid = null;
    this.callerNumber = null;
    this.twilioNumber = null;
    this.assistant = null;
    this.pipeline = null;
    this.deepgramConnection = null; // Streaming STT connection
    this.deepgramStreamingService = null; // Service instance
    this.deepgramSession = null; // Session instance
    this.conversationHistory = [];
    this.callStartTime = new Date();
    this.startTime = Date.now(); // For duration tracking
    this.isActive = true;
    this.isStreaming = false; // Track if Deepgram is connected and streaming
    this.isConnecting = false; // NEW: Prevent multiple connection attempts
    this.chunkBuffer = []; // Buffer chunks until Deepgram connects
    this.isSpeaking = false; // Track if AI is currently speaking
    this.lastTranscriptTime = 0; // Track last transcript to avoid duplicates

    console.log(`📞 InboundCallHandler created for call: ${callSid}`);
  }

  /**
   * Initialize the call handler
   */
  async initialize(startEvent) {
    try {
      this.streamSid = startEvent.streamSid;
      this.callerNumber = startEvent.customParameters?.from || 'Unknown';
      this.twilioNumber = startEvent.customParameters?.to || process.env.TWILIO_PHONE_NUMBER;
      this.userId = startEvent.customParameters?.userId; // Extract userId
      this.assistantId = startEvent.customParameters?.assistantId; // Store the provided assistant ID

      console.log(`📞 Inbound call from ${this.callerNumber} to ${this.twilioNumber}`);
      if (this.assistantId) {
        console.log(`🎯 Provided assistant ID: ${this.assistantId}`);
      }
      if (this.userId) {
        console.log(`👤 User ID: ${this.userId}`);
      }

      // Load assistant configuration (use provided ID or fallback)
      await this.loadAssistant();

      // Initialize AI pipeline
      await this.initializePipeline();

      // Send greeting message
      await this.sendGreeting();

      console.log(`✅ Inbound call initialized: ${this.callSid}`);
    } catch (error) {
      console.error(`❌ Error initializing inbound call:`, error);
      throw error;
    }
  }

  /**
   * Load assistant configuration
   * For phone calls: Routes by Twilio phone number to find user's assistant
   * Each user has their own Twilio number → uses their own active assistant
   */
  /**
     * Load assistant configuration
     * Multi-tenant: Routes by phone number to find assigned assistant
     * Backward compatible: Falls back to old single-number logic
     */
  async loadAssistant() {
    console.log(`🚀 [DEBUG] loadAssistant method started`);
    console.log(`🔍 [DEBUG] this.assistantId = ${this.assistantId}`);
    
    try {
      const User = require('../models/User');
      const { getActiveAssistants, getAssistantById } = require('../models/Assistant');

      console.log(`📞 Looking up user by Twilio number: ${this.twilioNumber}`);
      console.log(`🔍 DEBUG: this.assistantId = ${this.assistantId}`);

      // STEP 0: If assistant ID is provided, use it directly (PRIORITY)
      if (this.assistantId) {
        console.log(`🎯 [DIRECT] Using provided assistant ID: ${this.assistantId}`);
        
        try {
          const loadedAssistant = await getAssistantById(this.assistantId);
          
          if (loadedAssistant) {
            // Map database field names to expected field names
            this.assistant = {
              name: loadedAssistant.name || 'Assistant',
              greeting: loadedAssistant.firstMessage || 'Hello! How can I help you today?',
              systemPrompt: loadedAssistant.systemPrompt || 'You are a helpful AI assistant. Be concise and friendly.',
              llmModel: loadedAssistant.model || process.env.DEFAULT_LLM_MODEL || 'llama-3.3-70b-versatile',
              sttModel: loadedAssistant.transcriber || process.env.DEFAULT_STT_MODEL || 'whisper-large-v3',
              ttsProvider: loadedAssistant.voiceProvider || 'elevenlabs',
              ttsModel: loadedAssistant.voiceModel || 'eleven_turbo_v2_5',
              voiceId: loadedAssistant.voiceId || 'pNInz6obpgDQGcFmaJgB',
              transferEnabled: loadedAssistant.transferSettings?.phoneNumber ? true : false,
              transferNumber: loadedAssistant.transferSettings?.phoneNumber ? 
                `${loadedAssistant.transferSettings.countryCode}${loadedAssistant.transferSettings.phoneNumber}` : 
                process.env.PERSONAL_PHONE_NUMBER,
              tools: loadedAssistant.tools || [],
              _id: loadedAssistant._id,
              userId: null // Will be set if we find the user
            };

            console.log(`✅ [DIRECT] SUCCESS! Using provided assistant: ${this.assistant.name}`);
            console.log(`   TTS: ${this.assistant.ttsProvider} (${this.assistant.ttsModel})`);
            console.log(`   LLM: ${this.assistant.llmModel}`);
            console.log(`   STT: ${this.assistant.sttModel}`);
            console.log(`   Voice ID: ${this.assistant.voiceId}`);
            return;
          } else {
            console.log(`❌ [DIRECT] Provided assistant not found: ${this.assistantId}`);
            console.log(`🔄 [DIRECT] Falling back to multi-tenant lookup...`);
          }
        } catch (assistantError) {
          console.log(`❌ [DIRECT] Error loading provided assistant:`, assistantError.message);
          console.log(`🔄 [DIRECT] Falling back to multi-tenant lookup...`);
        }
      }

      // STEP 1: Try NEW multi-tenant approach
      console.log(`🔍 [MULTI-TENANT] Searching for user with phone number: ${this.twilioNumber}`);
      
      let user;
      try {
        user = await User.findOne({ 
          'phoneNumbers.phoneNumber': this.twilioNumber 
        });
        console.log(`🔍 [MULTI-TENANT] Query result: ${user ? `Found user ${user.email}` : 'No user found'}`);
      } catch (queryError) {
        console.log(`❌ [MULTI-TENANT] Query error:`, queryError.message);
        user = null;
      }

      if (user) {
        console.log(`✅ [MULTI-TENANT] Found user: ${user.email} (${user._id})`);
        console.log(`🔍 [MULTI-TENANT] User has ${user.phoneNumbers?.length || 0} phone numbers`);
        
        // Find the specific phone number configuration
        const phoneConfig = user.phoneNumbers?.find(p => p.phoneNumber === this.twilioNumber);
        console.log(`🔍 [MULTI-TENANT] Phone config search result:`, phoneConfig ? `Found config for ${phoneConfig.phoneNumber}` : 'No config found');
        
        if (phoneConfig && phoneConfig.assignedAssistantId) {
          console.log(`📱 [MULTI-TENANT] Phone config found - Assistant ID: ${phoneConfig.assignedAssistantId}`);
          
          try {
            const loadedAssistant = await getAssistantById(phoneConfig.assignedAssistantId);
            console.log(`🔍 [MULTI-TENANT] getAssistantById result:`, loadedAssistant ? `Found: ${loadedAssistant.name}` : 'Not found');
            
            if (loadedAssistant) {
              this.assistant = {
                name: loadedAssistant.name || 'Assistant',
                greeting: loadedAssistant.firstMessage || 'Hello! How can I help you today?',
                systemPrompt: loadedAssistant.systemPrompt || 'You are a helpful AI assistant. Be concise and friendly.',
                llmModel: loadedAssistant.model || process.env.DEFAULT_LLM_MODEL || 'llama-3.3-70b-versatile',
                sttModel: loadedAssistant.transcriber || process.env.DEFAULT_STT_MODEL || 'whisper-large-v3',
                ttsProvider: loadedAssistant.voiceProvider || 'elevenlabs',
                ttsModel: loadedAssistant.voiceModel || 'eleven_turbo_v2_5',
                voiceId: loadedAssistant.voiceId || 'pNInz6obpgDQGcFmaJgB',
                transferEnabled: loadedAssistant.transferSettings?.phoneNumber ? true : false,
                transferNumber: loadedAssistant.transferSettings?.phoneNumber ? 
                  `${loadedAssistant.transferSettings.countryCode}${loadedAssistant.transferSettings.phoneNumber}` : 
                  process.env.PERSONAL_PHONE_NUMBER,
                tools: loadedAssistant.tools || [],
                _id: loadedAssistant._id,
                userId: user._id
              };

              console.log(`✅ [MULTI-TENANT] SUCCESS! Using assigned assistant: ${this.assistant.name}`);
              console.log(`   Phone: ${this.twilioNumber} → Assistant: ${loadedAssistant.name}`);
              console.log(`   TTS: ${this.assistant.ttsProvider} (${this.assistant.ttsModel})`);
              console.log(`   LLM: ${this.assistant.llmModel}`);
              return;
            } else {
              console.log(`❌ [MULTI-TENANT] Assigned assistant not found: ${phoneConfig.assignedAssistantId}`);
            }
          } catch (assistantError) {
            console.log(`❌ [MULTI-TENANT] Error loading assistant:`, assistantError.message);
          }
        } else {
          console.log(`⚠️ [MULTI-TENANT] Phone config issue:`);
          console.log(`   phoneConfig found: ${!!phoneConfig}`);
          console.log(`   assignedAssistantId: ${phoneConfig?.assignedAssistantId || 'undefined'}`);
        }
      } else {
        console.log(`⚠️ [MULTI-TENANT] No user found with phone number in phoneNumbers array`);
      }

      // STEP 2: BACKWARD COMPATIBILITY - Try old single-number approach
      console.log(`🔄 [LEGACY] Trying legacy single-number lookup...`);
      user = await User.findOne({ twilioPhoneNumber: this.twilioNumber });

      if (user) {
        console.log(`✅ [LEGACY] Found user: ${user.email} (${user._id})`);

        const assistants = await getActiveAssistants(user._id);
        console.log(`📋 [LEGACY] Found ${assistants.length} active assistant(s)`);

        if (assistants.length > 0) {
          const loadedAssistant = assistants[0];

          this.assistant = {
            name: loadedAssistant.name || 'Assistant',
            greeting: loadedAssistant.firstMessage || 'Hello! How can I help you today?',
            systemPrompt: loadedAssistant.systemPrompt || 'You are a helpful AI assistant. Be concise and friendly.',
            llmModel: loadedAssistant.model || process.env.DEFAULT_LLM_MODEL || 'llama-3.3-70b-versatile',
            sttModel: loadedAssistant.transcriber || process.env.DEFAULT_STT_MODEL || 'whisper-large-v3',
            ttsProvider: loadedAssistant.voiceProvider || 'elevenlabs',
            ttsModel: loadedAssistant.voiceModel || 'eleven_turbo_v2_5',
            voiceId: loadedAssistant.voiceId || 'pNInz6obpgDQGcFmaJgB',
            transferEnabled: loadedAssistant.transferSettings?.phoneNumber ? true : false,
            transferNumber: loadedAssistant.transferSettings?.phoneNumber ? 
              `${loadedAssistant.transferSettings.countryCode}${loadedAssistant.transferSettings.phoneNumber}` : 
              process.env.PERSONAL_PHONE_NUMBER,
            tools: loadedAssistant.tools || [],
            _id: loadedAssistant._id,
            userId: user._id
          };

          console.log(`✅ [LEGACY] Using first active assistant: ${this.assistant.name}`);
          return;
        }
      }

      // Fallback: Default assistant
      this.assistant = {
        name: 'Default Assistant',
        greeting: 'Hello! I am your AI assistant. How can I help you today?',
        systemPrompt: 'You are a helpful AI assistant. Be concise and friendly.',
        llmModel: 'llama-3.1-8b-instant',
        sttModel: 'deepgram-nova-2',
        ttsProvider: 'cartesia',
        ttsModel: 'sonic-english',
        voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
        transferEnabled: true,
        transferNumber: process.env.PERSONAL_PHONE_NUMBER
      };

      console.log(`⚠️ Using default assistant configuration`);
    } catch (error) {
      console.error(`❌ Error loading assistant:`, error);
      
      this.assistant = {
        name: 'Fallback Assistant',
        greeting: 'Hello! How can I assist you?',
        systemPrompt: 'You are a helpful assistant.',
        llmModel: 'llama-3.1-8b-instant',
        sttModel: 'deepgram-nova-2',
        ttsProvider: 'cartesia',
        ttsModel: 'sonic-english',
        voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
        transferEnabled: true,
        transferNumber: process.env.PERSONAL_PHONE_NUMBER
      };

      console.log(`⚠️ Using fallback configuration`);
    }
  }

  /**
   * Initialize AI pipeline
   */
  async initializePipeline() {
    try {
      this.pipeline = new VapiStylePipeline({
        model: this.assistant.llmModel,
        transcriber: this.assistant.sttModel,
        voiceProvider: this.assistant.ttsProvider,
        voiceModel: this.assistant.ttsModel,
        voiceId: this.assistant.voiceId,
        systemPrompt: this.assistant.systemPrompt,
        sessionId: this.callSid,
        tools: this.assistant.tools || []
      });

      // Set up pipeline event listeners
      this.setupPipelineEvents();

      // Initialize Deepgram streaming (will connect on first audio chunk)
      console.log(`✅ Pipeline initialized for inbound call (streaming mode)`);

    } catch (error) {
      console.error(`❌ Error initializing pipeline:`, error);
      throw error;
    }
  }

  /**
   * Process complete user utterance
   * Isolated method to handle routing to pipeline or handling transfers 
   */
  handleFinalTranscript(transcript) {
    if (!transcript || transcript.trim().length === 0) return;

    // Track the exact string to prevent duplicate execution
    this.lastProcessedTranscript = transcript;
    
    // URGENT: Check for transfer request FIRST
    const isTransferRequest = this.checkUserTransferRequest(transcript);
    
    if (isTransferRequest) {
      console.log(`🚨 URGENT: User requested human transfer: "${transcript}"`);
      console.log(`🛑 Interrupting AI to transfer call immediately...`);
      this.conversationHistory.push({
        role: 'user',
        content: transcript,
        timestamp: new Date()
      });
      this.initiateTransfer();
      return;
    }
    
    // Add to standard conversation log
    this.conversationHistory.push({
      role: 'user',
      content: transcript,
      timestamp: new Date()
    });
    
    // Feed into the AI logic loop
    if (this.pipeline && this.isActive) {
      console.log(`✅ [STT] Processing transcript: ${transcript}`);
      this.pipeline.processTranscript(transcript);
    }
  }

  /**
   * Start Deepgram streaming connection
   */
  async startDeepgramStreaming() {
    console.log(`🚀 [PHONE STREAMING] Starting Deepgram connection for ${this.callSid}...`);
    
    // Use the SAME DeepgramService that browser calls use (fast & reliable)
    const DeepgramService = require('../services/deepgramService');
    this.deepgramConnection = new DeepgramService();
    
    const streamStartTime = Date.now();
    let transcriptCount = 0;
    
    // Handle transcripts - SAME as browser calls
    this.deepgramConnection.on('transcript', (data) => {
      transcriptCount++;
      const transcriptTime = Date.now() - streamStartTime;
      const transcriptReceiveTime = Date.now();
      
      console.log(`📝 [Deepgram Event #${transcriptCount}] {
        isFinal: ${data.isFinal},
        speechFinal: ${data.speechFinal},
        hasTranscript: ${!!data.transcript},
        transcriptLength: ${data.transcript?.length || 0},
        transcript: '${data.transcript || '(empty)'}',
        confidence: ${data.confidence}
      }`);
      
      if (data.isFinal && data.transcript && data.transcript.trim().length > 0) {
        this.lastTranscriptTime = Date.now();
        
        if (this.interimEndpointingTimer) {
          clearTimeout(this.interimEndpointingTimer);
          this.interimEndpointingTimer = null;
        }

        // Avoid double processing if interim timeout already fired
        if (this.lastProcessedTranscript === data.transcript) {
          console.log(`⏱️ [DUPLICATE CATCH] Ignoring delayed final transcript, already processed via VAD: "${data.transcript}"`);
          return;
        }
        
        console.log(`✅ [PHONE STREAMING] Final transcript: "${data.transcript}"`);
        this.handleFinalTranscript(data.transcript);
        
      } else if (!data.transcript || data.transcript.trim().length === 0) {
        // Silently ignore empty transcript events
      }
    });
    
    // Handle interim results for interruption detection and Predictive VAD
    this.deepgramConnection.on('interim', (data) => {
      if (!data.isFinal && data.transcript && data.transcript.trim().length > 0) {
        
        // 1. Interruption detection
        if (data.transcript.trim().length > 3 && this.isSpeaking) {
          console.log(`🛑 [INTERRUPTION] User speaking while AI talks - stopping AI`);
          this.isSpeaking = false;
          if (this.pipeline) {
            this.pipeline.stopSpeaking(); // Stop current TTS
          }
          // WE MUST ADD THE CLEAR COMMAND HERE TO NUKE TWILIO'S BUFFER
          this.clearTwilioBuffer();
        }

        // 2. Predictive Interim Endpointing (Vapi/Retell style text-stability)
        this.latestInterimTranscript = data.transcript;

        if (this.interimEndpointingTimer) {
          clearTimeout(this.interimEndpointingTimer);
        }
        
        // If 600ms passes with NO new text generated by the user, force end the turn!
        this.interimEndpointingTimer = setTimeout(() => {
          if (this.latestInterimTranscript && this.latestInterimTranscript.trim().length > 3) {
             console.log(`⚡ [ULTRA-FAST VAD] Forcing final transcript due to 600ms silence: "${this.latestInterimTranscript}"`);
             this.handleFinalTranscript(this.latestInterimTranscript);
             
             // Clear the interim buffer so we don't re-trigger
             this.latestInterimTranscript = '';
          }
        }, 600);
      }
    });
    
    // Handle utterance end
    this.deepgramConnection.on('utteranceEnd', () => {
      const utteranceTime = Date.now() - streamStartTime;
      console.log(`🔚 [PHONE STREAMING] Utterance end after ${utteranceTime}ms`);
    });
    
    // Handle errors
    this.deepgramConnection.on('error', (error) => {
      console.error('❌ [PHONE STREAMING] Deepgram error:', error);
    });
    
    // Handle close
    this.deepgramConnection.on('close', () => {
      const closeTime = Date.now() - streamStartTime;
      console.log(`🔌 [PHONE STREAMING] Connection closed after ${closeTime}ms. Total transcripts: ${transcriptCount}`);
      this.deepgramConnection = null;
      this.isStreaming = false;
    });
    
    // Connect to Deepgram - SAME configuration as browser calls
    try {
      await this.deepgramConnection.connect({
        model: 'nova-2',
        language: 'en-US',
        encoding: 'linear16',
        sampleRate: 16000,        // 16kHz (same as browser)
        interim_results: true,
        channels: 1,
        endpointing: 250,         // OPTIMIZED FOR TWILIO: 250ms is the sweet spot for phone line static
        vad_events: true,         // OPTIMIZED FOR TWILIO: Receive VAD events for faster cutoff
        utterance_end_ms: "1000"  // OPTIMIZED FOR TWILIO: Force flush if 1 second of silence
      });
      
      this.isStreaming = true;
      this.isConnecting = false; // Clear the lock after successful connection
      console.log('✅ [PHONE STREAMING] Deepgram connected successfully');
      console.log('📋 [PHONE STREAMING] Config: linear16, 16kHz, mono, endpointing: 250ms (OPTIMIZED FOR NOISE)');
      console.log('🎯 [PHONE STREAMING] Using EXACT same service as browser calls');
      console.log('🚀 [PHONE STREAMING] Should be as fast as browser now!');
      
    } catch (error) {
      console.error('❌ [PHONE STREAMING] Failed to start Deepgram:', error);
      // Reset state on failure
      this.deepgramConnection = null;
      this.isStreaming = false;
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Set up pipeline event listeners
   */
  setupPipelineEvents() {
    // LLM completed - AI response
    this.pipeline.on('llm_completed', (data) => {
      console.log(`🤖 AI: "${data.text}"`);
      this.conversationHistory.push({
        role: 'assistant',
        content: data.text,
        timestamp: new Date()
      });

      // Check for human transfer request
      this.checkForTransferRequest(data.text);
    });

    // TTS started - AI is now speaking
    this.pipeline.on('tts_started', () => {
      this.isSpeaking = true;
      console.log(`🔊 [AI SPEAKING] Started`);
      // VAPI TRICK: Nuke Twilio's playback queue just before new audio arrives
      this.clearTwilioBuffer();
    });

    // TTS completed - AI finished speaking
    this.pipeline.on('tts_completed', () => {
      this.isSpeaking = false;
      console.log(`✅ [AI SPEAKING] Completed`);
    });

    // Audio chunk ready to send (streaming TTS)
    this.pipeline.on('audio_chunk', async (audioData) => {
      await this.sendAudioToTwilio(audioData);
    });

    // Error handling
    this.pipeline.on('error', (error) => {
      console.error(`❌ Pipeline error:`, error);
      this.isSpeaking = false;
    });
  }

  /**
   * Send greeting message to caller
   */
  async sendGreeting() {
    try {
      const greeting = this.assistant.greeting || 'Hello! How can I help you today?';
      console.log(`🔊 Sending greeting: "${greeting}"`);

      // Generate greeting audio using synthesizeSpeech
      // Note: Audio chunks are sent via 'audio_chunk' events (already set up in setupPipelineEvents)
      await this.pipeline.synthesizeSpeech(greeting);

      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: greeting,
        timestamp: new Date()
      });

    } catch (error) {
      console.error(`❌ Error sending greeting:`, error);
    }
  }

  /**
   * Handle incoming media (audio) from Twilio
   */
  async handleMedia(mediaEvent) {
    try {
      // Check if pipeline is ready
      if (!this.pipeline || !this.isActive) {
        return; // Silently skip if not ready
      }

      const mediaStartTime = Date.now();
      const { payload } = mediaEvent.media;

      // Audio conversion (mulaw to PCM)
      const pcmAudio = base64MulawToPCM(payload);

      // If Deepgram is not connected yet, buffer this chunk
      if (!this.isStreaming) {
        this.chunkBuffer.push(pcmAudio);

        // SIMPLIFIED: Only start connection if no connection exists AND not currently connecting
        if (!this.deepgramConnection && !this.isConnecting) {
          this.isConnecting = true; // Set lock immediately
          const connectionInitTime = Date.now();
          console.log(`📥 [STREAMING] First PCM chunk received, initializing Deepgram...`);

          // Start connection asynchronously
          this.startDeepgramStreaming().then(() => {
            console.log(`✅ [STREAMING] Deepgram connected successfully`);
            
            // After connection, send ALL buffered chunks
            if (this.chunkBuffer && this.chunkBuffer.length > 0 && this.deepgramConnection) {
              const sendStartTime = Date.now();
              const totalBytes = this.chunkBuffer.reduce((sum, buf) => sum + buf.length, 0);
              console.log(`📤 [STREAMING] Deepgram ready! Sending ${this.chunkBuffer.length} buffered PCM chunks (${totalBytes} bytes total, 16kHz)...`);
              
              for (const chunk of this.chunkBuffer) {
                try {
                  if (this.deepgramConnection) {
                    this.deepgramConnection.sendAudio(chunk);
                  }
                } catch (err) {
                  console.error('❌ Error sending buffered PCM chunk:', err);
                }
              }
              this.chunkBuffer = [];
              const sendTime = Date.now() - sendStartTime;
              console.log(`✅ [STREAMING] All buffered PCM chunks sent!`);
            }
          }).catch(err => {
            console.error('❌ [STREAMING] Failed to start Deepgram:', err);
            this.isConnecting = false; // Clear lock on failure
          });
        }
        return;
      }

      // Normal streaming - Deepgram is connected and ready
      try {
        if (this.deepgramConnection) {
          this.deepgramConnection.sendAudio(pcmAudio);
        }
      } catch (error) {
        console.error('❌ Error sending PCM to Deepgram:', error);
      }

    } catch (error) {
      console.error(`❌ Error handling media:`, error);
    }
  }

  /**
   * Send audio to Twilio (convert PCM to mulaw)
   */
  async sendAudioToTwilio(audioData) {
    try {
      if (!this.isActive || !this.streamSid) {
        return;
      }

      // Check if audio data exists
      if (!audioData || audioData.length === 0) {
        console.warn(`⚠️ No audio data to send`);
        return;
      }

      // Strip WAV header if present (WAV files start with "RIFF")
      let pcmAudio = audioData;
      if (audioData.length > 44 && audioData[0] === 0x52 && audioData[1] === 0x49 && audioData[2] === 0x46 && audioData[3] === 0x46) {
        // WAV file detected, skip 44-byte header
        pcmAudio = audioData.slice(44);
      }

      // Ensure even length for 16-bit PCM samples (CRITICAL FIX)
      if (pcmAudio.length % 2 !== 0) {
        // Pad with zero byte instead of truncating
        const paddedBuffer = Buffer.alloc(pcmAudio.length + 1);
        pcmAudio.copy(paddedBuffer);
        paddedBuffer[pcmAudio.length] = 0;
        pcmAudio = paddedBuffer;
      }

      // Convert PCM to mulaw base64
      const mulawBase64 = pcmToBase64Mulaw(pcmAudio);

      // Send to Twilio
      const message = {
        event: 'media',
        streamSid: this.streamSid,
        media: {
          payload: mulawBase64
        }
      };

      this.ws.send(JSON.stringify(message));

    } catch (error) {
      console.error(`❌ Error sending audio to Twilio:`, error);
    }
  }

  /**
   * Instantly clear Twilio's audio playback buffer
   * This is CRITICAL for Vapi-level interruption speeds
   */
  clearTwilioBuffer() {
    try {
      if (!this.isActive || !this.streamSid) return;
      
      const clearMessage = {
        event: 'clear',
        streamSid: this.streamSid
      };
      
      this.ws.send(JSON.stringify(clearMessage));
      console.log('🧹 [TWILIO] Sent CLEAR command to empty playback buffer!');
    } catch (error) {
      console.error('❌ Error clearing Twilio buffer:', error);
    }
  }

  /**
   * Check if user is requesting human transfer
   */
  checkUserTransferRequest(text) {
    const transferPhrases = [
      // Direct transfer requests
      'connect me to a human',
      'connect me to human',
      'connect to a human',
      'connect to human',
      'connect me a human',
      'connect to me a human',
      'connect to me human',
      // Transfer variations
      'transfer me to',
      'transfer my call',
      'transfer my phone',
      'transfer the call',
      'transfer to human',
      'transfer to a human',
      // Speak/talk variations
      'speak with a person',
      'speak to a person',
      'speak to human',
      'speak with human',
      'talk to someone',
      'talk to a human',
      'talk to human',
      'talk to a person',
      'talk with human',
      // Agent/representative
      'human agent',
      'human representative',
      'real person',
      'live agent',
      'live person',
      'actual person',
      // Need/want variations
      'need a human',
      'need human',
      'want a human',
      'want human',
      'get me a human',
      'get me human',
      // Other variations
      'speak to someone',
      'talk with someone',
      'real human',
      'actual human'
    ];

    const lowerText = text.toLowerCase();
    const shouldTransfer = transferPhrases.some(phrase => lowerText.includes(phrase));
    return shouldTransfer && this.assistant.transferEnabled;
  }

  /**
   * Check if AI response contains transfer request
   */
  checkForTransferRequest(text) {
    const transferPhrases = [
      'connect you to a human',
      'connecting you to a human',
      'transfer you to',
      'transfer your call',
      'transferring your call',
      'speak with a person',
      'talk to someone',
      'human agent',
      'human representative',
      'real person'
    ];

    const lowerText = text.toLowerCase();
    const shouldTransfer = transferPhrases.some(phrase => lowerText.includes(phrase));

    if (shouldTransfer && this.assistant.transferEnabled) {
      console.log(`📞 Transfer request detected in AI response`);
      this.initiateTransfer();
    }
  }

  /**
   * Initiate human transfer
   */
  async initiateTransfer() {
    try {
      console.log(`📞 Initiating human transfer for call: ${this.callSid}`);

      // STEP 1: Reload assistant config to get LATEST transfer number from database
      console.log('🔄 Reloading assistant config to get latest transfer number...');
      if (this.assistant._id) {
        try {
          const latestAssistant = await AssistantModel.findById(this.assistant._id);
          if (latestAssistant && latestAssistant.transferSettings?.phoneNumber) {
            const latestTransferNumber = `${latestAssistant.transferSettings.countryCode}${latestAssistant.transferSettings.phoneNumber}`;
            if (latestTransferNumber !== this.assistant.transferNumber) {
              console.log(`📱 Transfer number updated:`);
              console.log(`   Old: ${this.assistant.transferNumber}`);
              console.log(`   New: ${latestTransferNumber}`);
              this.assistant.transferNumber = latestTransferNumber;
            } else {
              console.log(`✅ Transfer number unchanged: ${this.assistant.transferNumber}`);
            }
          }
        } catch (reloadError) {
          console.warn(`⚠️ Could not reload assistant config, using cached number: ${this.assistant.transferNumber}`);
        }
      }

      // STEP 2: Play immediate audio feedback to keep caller on the line
      console.log('🔊 Playing transfer message to keep caller on line...');
      const transferMessage = "Please hold while I connect you to a human agent.";

      // Generate and send audio immediately (this keeps the caller engaged)
      if (this.pipeline && this.isActive) {
        await this.pipeline.synthesizeSpeech(transferMessage);
        // Wait a moment for audio to start playing
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // STEP 3: Stop AI processing
      console.log('🛑 Stopping AI pipeline...');
      this.isActive = false;
      if (this.deepgramConnection) {
        // Use finish() instead of close() for our connection object
        if (this.deepgramConnection.finish) {
          this.deepgramConnection.finish();
        }
        this.deepgramConnection = null;
      }
      if (this.pipeline) {
        await this.pipeline.cleanup();
      }

      // STEP 4: Call the transfer API (calls human + redirects this call to conference)
      console.log(`📞 Calling transfer API with number: ${this.assistant.transferNumber}`);
      const response = await fetch(`${process.env.BASE_URL}/api/twilio/transfer-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callSid: this.callSid,
          forwardingNumber: this.assistant.transferNumber,
          userId: this.userId,
          assistantId: this.assistantId
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log(`✅ Transfer initiated: ${result.conferenceName}`);
        console.log(`   Original call redirected to conference`);
        console.log(`   Human call initiated: ${result.humanCallSid}`);

        // Add conference info to conversation
        this.conversationHistory.push({
          role: 'system',
          content: `Human transfer initiated to ${this.assistant.transferNumber}`,
          timestamp: new Date()
        });
      } else {
        console.error(`❌ Transfer failed:`, result.error);
      }

    } catch (error) {
      console.error(`❌ Error initiating transfer:`, error);
    }
  }

  /**
   * Handle call end
   */
  async handleStop() {
    try {
      console.log(`📞 Call ended: ${this.callSid}`);
      this.isActive = false;

      // Proper session cleanup - Close Deepgram connection first
      if (this.deepgramConnection) {
        console.log('📤 Sent finish signal to Deepgram');
        try {
          if (this.deepgramConnection.finish) {
            this.deepgramConnection.finish();
          }
        } catch (finishError) {
          console.error('❌ Error finishing Deepgram session:', finishError);
        }
        this.deepgramConnection = null;
      }

      // Close streaming service
      if (this.deepgramStreamingService) {
        try {
          await this.deepgramStreamingService.close();
        } catch (closeError) {
          console.error('❌ Error closing Deepgram streaming service:', closeError);
        }
        this.deepgramStreamingService = null;
      }

      // Reset streaming state
      this.isStreaming = false;
      this.deepgramSession = null;

      // Save call history
      await this.saveCallHistory();

      // Cleanup pipeline
      if (this.pipeline) {
        await this.pipeline.cleanup();
      }

      console.log(`✅ Inbound call cleanup complete: ${this.callSid}`);

    } catch (error) {
      console.error(`❌ Error handling call stop:`, error);
    }
  }

  /**
   * Save call history to database
   */
  async saveCallHistory() {
    try {
      const callDuration = Math.floor((new Date() - this.callStartTime) / 1000);

      // Save to database with userId
      const collection = require('../config/database').getCollection('call_history');
      
      const callRecord = {
        callId: this.callSid,
        callType: 'inbound',
        callerNumber: this.callerNumber,
        twilioNumber: this.twilioNumber,
        assistantName: this.assistant?.name || 'Unknown',
        assistantId: this.assistant?._id || null,
        userId: this.userId, // Include userId for proper filtering
        duration: callDuration,
        conversationHistory: this.conversationHistory,
        startTime: this.callStartTime.toISOString(),
        endTime: new Date().toISOString(),
        status: 'completed',
        connectionId: this.callSid,
        metrics: {
          totalLatency: 0,
          sttLatency: 0,
          llmLatency: 0,
          ttsLatency: 0
        }
      };

      await collection.insertOne(callRecord);

      console.log(`📊 Call completed:`, {
        callSid: this.callSid,
        duration: callDuration,
        messages: this.conversationHistory.length
      });

      console.log(`✅ Call history logged: ${this.callSid}`);

    } catch (error) {
      console.error(`❌ Error saving call history:`, error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.isActive = false;

    // Close Deepgram connection - SAME as browser calls
    if (this.deepgramConnection) {
      try {
        await this.deepgramConnection.close();
        console.log('🔌 [PHONE STREAMING] Deepgram connection closed');
      } catch (error) {
        console.error('❌ Error closing Deepgram connection:', error);
      }
      this.deepgramConnection = null;
    }

    this.isStreaming = false;

    if (this.pipeline) {
      await this.pipeline.cleanup();
    }
  }
}

module.exports = InboundCallHandler;