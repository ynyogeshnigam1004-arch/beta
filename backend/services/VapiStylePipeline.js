/**
 * ============================================================================
 * VAPI-Style Pipeline - Clean & Simple Implementation
 * ============================================================================
 * 
 * This pipeline follows VAPI.ai's proven architecture:
 * 1. Configuration set at initialization (not after)
 * 2. Simple linear flow: Audio → STT → LLM → TTS → Audio
 * 3. Event-driven responses
 * 4. No complex state management
 * 
 * Author: Voice AI Platform
 * Version: 2.0
 * ============================================================================
 */

const GroqService = require('./groqService');
const DeepgramService = require('./deepgramService');
const CartesiaService = require('./cartesiaService');
const CartesiaStreamingService = require('./cartesiaStreamingService');
const ElevenLabsStreamingService = require('./elevenLabsStreamingService');
const { EventEmitter } = require('events');

class VapiStylePipeline extends EventEmitter {
  /**
   * Initialize pipeline with configuration
   * @param {Object} config - Assistant configuration
   * @param {string} config.model - LLM model (e.g., 'llama-3.1-8b-instant')
   * @param {string} config.transcriber - STT model (e.g., 'whisper-large-v3-turbo')
   * @param {string} config.voiceProvider - TTS provider ('cartesia' or 'elevenlabs')
   * @param {string} config.voiceModel - Voice model (e.g., 'sonic-2024-10')
   * @param {string} config.voiceId - Voice ID for TTS
   * @param {string} config.systemPrompt - System prompt for LLM
   * @param {string} config.firstMessage - First message from assistant
   * @param {string} config.firstMessageMode - 'assistant-speaks-first' or 'assistant-waits'
   */
  constructor(config = {}) {
    super();
    
    // Store configuration
    this.config = {
      model: config.model || 'llama-3.1-8b-instant',
      transcriber: config.transcriber || 'whisper-large-v3-turbo',
      voiceProvider: config.voiceProvider || 'cartesia',
      voiceModel: config.voiceModel || 'sonic-english', // Fixed: use valid Cartesia model
      voiceId: config.voiceId || '95d51f79-c397-46f9-b49a-23763d3eaa2d',
      // Voice characteristics
      voiceLanguage: config.voiceLanguage || 'en',
      voiceDialect: config.voiceDialect || 'us',
      voiceSpeed: config.voiceSpeed || 1.0,
      voiceEmotion: config.voiceEmotion || 'neutral',
      voiceVolume: config.voiceVolume || 1.0,
      voicePitch: config.voicePitch || 1.0,
      systemPrompt: config.systemPrompt || 'You are a helpful voice assistant.',
      firstMessage: config.firstMessage || 'Hello! How can I help you?',
      firstMessageMode: config.firstMessageMode || 'assistant-speaks-first',
      tools: config.tools || [],
      userId: config.userId || null, // NEW: User ID for credits deduction
      sessionId: config.sessionId || `session-${Date.now()}`
    };
    
    // Normalize voice model name (Cartesia only accepts specific models)
    const validCartesiaModels = ['sonic-english', 'sonic-multilingual', 'sonic', 'sonic-turbo', 'sonic-3'];
    if (!validCartesiaModels.includes(this.config.voiceModel)) {
      console.warn(`⚠️ Invalid Cartesia model '${this.config.voiceModel}', using 'sonic-english' instead`);
      this.config.voiceModel = 'sonic-english';
    }
    
    // Initialize services
    this.groqService = new GroqService();
    this.deepgramService = null; // Created on-demand for streaming
    this.cartesiaService = new CartesiaService();
    this.cartesiaStreamingService = new CartesiaStreamingService();
    this.elevenLabsStreamingService = null; // Created per-connection
    
    // Tools state
    this.toolDefinitions = null; // Will be loaded from database
    this.isLoadingTools = false;
    
    // Conversation state
    this.conversationHistory = [];
    this.isProcessing = false;
    this.isInBackoff = false; // Backoff period after interruption (Vapi-style)
    this.backoffTimeout = null;
    this.BACKOFF_DURATION = 1000; // 1 second backoff (Vapi standard)
    this.shouldStopProcessing = false; // Flag to stop processing (e.g., for human transfer)
    this.isSpeaking = false; // Track if TTS is currently active
    this.currentTTSAbortController = null; // For interrupting TTS
    
    console.log('✅ VAPI-Style Pipeline initialized with STREAMING');
    console.log('📋 Config:', {
      model: this.config.model,
      voiceProvider: this.config.voiceProvider,
      voiceId: this.config.voiceId,
      voiceModel: this.config.voiceModel,
      voiceLanguage: this.config.voiceLanguage,
      voiceDialect: this.config.voiceDialect,
      voiceSpeed: this.config.voiceSpeed,
      voiceEmotion: this.config.voiceEmotion,
      tools: this.config.tools.length
    });
  }

  /**
   * Load tool definitions from database
   */
  async loadTools() {
    if (this.isLoadingTools || this.toolDefinitions) {
      return this.toolDefinitions;
    }

    if (!this.config.tools || this.config.tools.length === 0) {
      console.log('ℹ️ No tools configured');
      this.toolDefinitions = [];
      return [];
    }

    this.isLoadingTools = true;

    try {
      const { getCollection } = require('../config/database');
      const collection = getCollection('tools');

      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔧 LOADING TOOLS FROM DATABASE');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`📦 Tool IDs to load: ${this.config.tools.length}`);
      this.config.tools.forEach((id, index) => {
        console.log(`   ${index + 1}. ${id}`);
      });
      console.log('');

      const tools = await collection.find({
        id: { $in: this.config.tools }
      }).toArray();

      console.log(`✅ Found ${tools.length} tool(s) in database`);
      console.log('');

      this.toolDefinitions = tools.map(tool => {
        console.log('🔄 Converting tool to OpenAI format:');
        console.log(`   Name: ${tool.name || tool.id}`);
        console.log(`   Description: ${tool.description || 'No description'}`);
        console.log(`   URL: ${tool.url}`);
        console.log(`   Method: ${tool.method || 'POST'}`);
        console.log(`   Parameters: ${tool.parameters?.length || 0}`);
        
        // Convert parameters array to OpenAI schema format
        let parametersSchema = {
          type: 'object',
          properties: {},
          required: []
        };
        
        if (tool.parameters && Array.isArray(tool.parameters) && tool.parameters.length > 0) {
          tool.parameters.forEach(param => {
            parametersSchema.properties[param.name] = {
              type: param.type || 'string',
              description: param.description || ''
            };
            if (param.required) {
              parametersSchema.required.push(param.name);
            }
          });
          console.log(`   ✅ Converted ${tool.parameters.length} parameter(s) to OpenAI schema`);
        } else {
          console.log(`   ℹ️ No parameters - tool takes no arguments`);
        }
        
        return {
          type: 'function',
          function: {
            name: tool.name || tool.id,
            description: tool.description || 'No description',
            parameters: parametersSchema
          },
          _toolData: {
            id: tool.id,
            url: tool.url,
            method: tool.method || 'POST',
            headers: tool.headers || {}
          }
        };
      });

      console.log('');
      console.log('✅ TOOLS READY FOR LLM:');
      this.toolDefinitions.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool.function.name}`);
        console.log(`      → ${tool.function.description}`);
      });
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

      return this.toolDefinitions;
    } catch (error) {
      console.error('❌ Error loading tools:', error);
      this.toolDefinitions = [];
      return [];
    } finally {
      this.isLoadingTools = false;
    }
  }

  /**
   * Execute a tool call
   */
  async executeTool(toolName, toolArgs) {
    const toolStartTime = Date.now();
    console.log('');
    console.log('⏱️ ═══════════════════════════════════════════════════════');
    console.log('⏱️ 🔧 TOOL EXECUTION LATENCY TRACKING');
    console.log('⏱️ ═══════════════════════════════════════════════════════');
    console.log(`⏱️ Tool: ${toolName}`);
    console.log(`⏱️ Started at: ${new Date().toISOString()}`);
    console.log('⏱️ ═══════════════════════════════════════════════════════');
    
    try {
      const toolLookupStart = Date.now();
      const tool = this.toolDefinitions?.find(t => t.function.name === toolName);
      const toolLookupTime = Date.now() - toolLookupStart;
      
      console.log(`⏱️ Tool lookup time: ${toolLookupTime}ms`);

      if (!tool) {
        const totalTime = Date.now() - toolStartTime;
        console.error(`❌ Tool not found: ${toolName}`);
        console.log(`⏱️ Total time (failed): ${totalTime}ms`);
        return { error: `Tool ${toolName} not found` };
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔧 EXECUTING TOOL');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`📛 Tool Name: ${toolName}`);
      console.log(`📋 Arguments:`, JSON.stringify(toolArgs, null, 2));
      console.log(`🌐 URL: ${tool._toolData.url}`);
      console.log(`📤 Method: ${tool._toolData.method}`);
      console.log(`📨 Headers:`, tool._toolData.headers);
      console.log('');

      const axios = require('axios');
      const toolData = tool._toolData;

      console.log('⏳ Making HTTP request...');
      const httpRequestStart = Date.now();

      const response = await axios({
        method: toolData.method,
        url: toolData.url,
        headers: toolData.headers,
        data: toolArgs
      });

      const httpRequestTime = Date.now() - httpRequestStart;
      const totalToolTime = Date.now() - toolStartTime;

      console.log('');
      console.log('⏱️ ═══════════════════════════════════════════════════════');
      console.log('⏱️ 🎯 TOOL EXECUTION COMPLETED');
      console.log('⏱️ ═══════════════════════════════════════════════════════');
      console.log(`⏱️ HTTP request time: ${httpRequestTime}ms`);
      console.log(`⏱️ Total tool execution time: ${totalToolTime}ms`);
      console.log(`⏱️ Tool overhead: ${totalToolTime - httpRequestTime}ms`);
      console.log('⏱️ ═══════════════════════════════════════════════════════');
      console.log(`✅ Tool executed successfully`);
      console.log(`📥 Response Status: ${response.status}`);
      console.log(`📦 Response Data:`, JSON.stringify(response.data, null, 2));
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

      return response.data;
    } catch (error) {
      const totalErrorTime = Date.now() - toolStartTime;
      console.log('');
      console.log('⏱️ ═══════════════════════════════════════════════════════');
      console.log('⏱️ ❌ TOOL EXECUTION FAILED');
      console.log('⏱️ ═══════════════════════════════════════════════════════');
      console.log(`⏱️ Total time before failure: ${totalErrorTime}ms`);
      console.log('⏱️ ═══════════════════════════════════════════════════════');
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.error(`❌ TOOL EXECUTION FAILED: ${toolName}`);
      console.error(`Error: ${error.message}`);
      if (error.response) {
        console.error(`Response Status: ${error.response.status}`);
        console.error(`Response Data:`, error.response.data);
      }
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      return { error: error.message };
    }
  }

  
  /**
   * Process audio input through the pipeline
   * @param {Buffer} audioBuffer - Audio data from microphone
   * @returns {Promise<Object>} Result with transcript, response, and audio
   */
  async processAudio(audioBuffer) {
    if (this.isProcessing) {
      return null; // Silently skip if busy
    }
    
    this.isProcessing = true;
    
    try {
      // Validate audio buffer - skip silently if too small
      if (!audioBuffer || audioBuffer.length < 1000) {
        this.isProcessing = false;
        return null;
      }
      
      // Detect audio format
      const isPCM = this.detectPCMFormat(audioBuffer);
      const audioFormat = isPCM ? 'pcm' : 'webm';
      
      console.log(`🎵 Processing ${audioFormat.toUpperCase()} audio (${audioBuffer.length} bytes)`);
      
      // Step 1: Speech-to-Text
      console.log('🎤 [STT] Converting speech to text...');
      console.log(`📋 [STT] Using transcriber: ${this.config.transcriber || 'whisper-large-v3-turbo'}`);
      console.log(`📋 [STT] Audio format detected: ${audioFormat.toUpperCase()}, isPCM: ${isPCM}`);
      this.emit('stt_started');
      
      // Choose STT provider based on transcriber config AND audio format
      let transcript;
      if (this.config.transcriber && this.config.transcriber.startsWith('deepgram')) {
        // Use Deepgram for ultra-fast transcription
        console.log('🚀 [STT] Using Deepgram SDK...');
        
        if (!isPCM) {
          console.warn('⚠️ [STT] Deepgram selected but received WebM format - this will be slower');
          console.warn('💡 [TIP] Browser should send PCM for best performance');
        }
        
        try {
          transcript = await this.transcribeWithDeepgram(audioBuffer);
          console.log(`✅ [STT] Deepgram transcription result: "${transcript}"`);
        } catch (deepgramError) {
          console.error('❌ [STT] Deepgram transcription failed:', deepgramError.message);
          throw deepgramError;
        }
      } else {
        // Use Groq Whisper (default, free)
        console.log('🎤 [STT] Using Groq Whisper...');
        
        if (isPCM) {
          console.error('❌ [STT] Groq Whisper does not support PCM format');
          console.error('💡 [FIX] Please use Deepgram transcriber for PCM audio');
          console.error('💡 [FIX] Or disable browser-side PCM conversion in frontend');
          throw new Error('Groq Whisper requires WebM/Opus format, received PCM. Please use Deepgram transcriber or disable PCM conversion.');
        }
        
        transcript = await this.groqService.transcribeAudio(audioBuffer, audioFormat);
      }
      
      if (!transcript || transcript.trim().length === 0) {
        console.log('🔇 No speech detected');
        this.emit('no_speech_detected');
        this.isProcessing = false;
        return null;
      }
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('📝 [TRANSCRIPT] YOU SAID:', transcript);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      
      this.emit('stt_completed', { text: transcript });
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: transcript,
        timestamp: new Date().toISOString()
      });
      
      // Step 2: LLM Processing
      console.log('🤖 [LLM] Generating response...');
      this.emit('llm_started');
      
      const messages = this.buildMessages();
      let fullResponse = '';
      
      try {
        // Stream LLM response
        await this.groqService.generateStreamingChatCompletion(
          messages,
          (chunk) => {
            fullResponse += chunk;
            this.emit('llm_chunk', { text: chunk });
          }
        );
        
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('🤖 [AI RESPONSE]:', fullResponse);
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
        
        this.emit('llm_completed', { text: fullResponse });
      } catch (llmError) {
        console.error('❌ [LLM] Error:', llmError.message);
        this.emit('error', { error: 'LLM error: ' + llmError.message });
        this.isProcessing = false;
        return null;
      }
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString()
      });
      
      // Step 3: Text-to-Speech
      console.log('🔊 [TTS] Starting synthesis...');
      this.emit('tts_started');
      
      try {
        await this.synthesizeSpeech(fullResponse);
        console.log('✅ [TTS] Completed');
        this.emit('tts_completed');
      } catch (ttsError) {
        console.error('❌ [TTS] Error:', ttsError.message);
        this.emit('error', { error: 'TTS error: ' + ttsError.message });
        this.isProcessing = false;
        return null;
      }
      
      // Emit processing complete
      this.emit('processing_completed', {
        transcript,
        response: fullResponse
      });
      
      this.isProcessing = false;
      
      return {
        transcript,
        response: fullResponse
      };
      
    } catch (error) {
      console.error('❌ Pipeline error:', error.message);
      this.emit('error', { error: error.message });
      this.isProcessing = false;
      throw error;
    }
  }
  
  /**
   * Process transcript from streaming STT (Deepgram real-time)
   * @param {string} transcript - Transcript text
   */
  async processTranscript(transcript) {
    // Don't process empty transcripts
    if (!transcript || transcript.trim().length === 0) {
      console.warn('⚠️ Empty transcript, skipping');
      return;
    }
    
    // Check if in backoff period (Vapi-style interruption handling)
    if (this.isInBackoff) {
      console.warn('⏳ In backoff period, skipping transcript:', transcript);
      return;
    }
    
    if (this.isProcessing) {
      console.warn('⚠️ Pipeline busy, skipping transcript:', transcript);
      // Start backoff period to prevent rapid-fire requests
      this.startBackoff();
      return;
    }
    
    this.isProcessing = true;
    
    try {
      console.log('✅ [STT] Processing transcript:', transcript);
      
      // Emit STT completed event (for human transfer detection in callHandler)
      this.emit('stt_completed', { text: transcript });
      
      // CRITICAL: Check if processing should be stopped IMMEDIATELY after STT event
      // This allows the call handler to set transfer mode before we continue
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for event handling
      
      if (this.shouldStopProcessing) {
        console.log('🛑 Processing stopped by external handler (human transfer)');
        this.shouldStopProcessing = false;
        this.isProcessing = false;
        return;
      }
      
      // Pre-connect TTS for faster response (predictive optimization)
      if (this.config.voiceProvider === 'cartesia' && this.cartesiaStreamingService) {
        this.cartesiaStreamingService.preConnect().catch(err => {
          console.warn('⚠️ [OPTIMIZATION] TTS pre-connection failed:', err.message);
        });
      }
      
      // Pre-connect Deepgram for next STT request (predictive optimization)
      if (this.deepgramService) {
        this.deepgramService.preConnect().catch(err => {
          console.warn('⚠️ [OPTIMIZATION] STT pre-connection failed:', err.message);
        });
      }
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: transcript,
        timestamp: new Date().toISOString()
      });
      
      // Load tools if configured (tools are OPTIONAL - errors won't block conversation)
      let tools = [];
      try {
        tools = await this.loadTools();
        
        // Basic validation - just check structure exists
        if (tools && tools.length > 0) {
          tools = tools.filter(tool => {
            if (!tool.function || !tool.function.name) {
              console.warn(`⚠️ Skipping tool with missing name`);
              return false;
            }
            return true;
          });
          
          if (tools.length === 0) {
            console.log('⚠️ All tools were invalid, proceeding without tools');
          }
        }
      } catch (toolError) {
        console.error('❌ Error loading tools:', toolError.message);
        console.log('⚠️ Proceeding without tools - conversation will continue normally');
        tools = [];
      }
      
      // Step 2: LLM Processing with Tools
      const llmStartTime = Date.now();
      console.log('🤖 [LLM] Generating response...');
      console.log(`⏱️ [TIMING] LLM processing started at: ${llmStartTime}ms`);
      if (tools && tools.length > 0) {
        console.log(`🔧 [LLM] ${tools.length} tool(s) available for use`);
      }
      this.emit('llm_started');
      
      const messages = this.buildMessages();
      let fullResponse = '';
      let toolExecutionResults = [];
      
      // Tool execution loop - keep calling LLM until no more tool calls
      let maxIterations = 5; // Prevent infinite loops
      let iteration = 0;
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔄 STARTING TOOL EXECUTION LOOP');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Max iterations: ${maxIterations}`);
      console.log('');
      
      while (iteration < maxIterations) {
        iteration++;
        
        console.log('');
        console.log('─────────────────────────────────────────────────────');
        console.log(`🔁 ITERATION ${iteration}/${maxIterations}`);
        console.log('─────────────────────────────────────────────────────');
        console.log('');
        
        try {
          console.log('📤 Sending to LLM:');
          console.log(`   Messages: ${messages.length}`);
          console.log(`   Tools available: ${tools && tools.length > 0 ? 'YES (' + tools.length + ')' : 'NO'}`);
          console.log('');
          
          // Call LLM with tools (only if valid tools exist)
          const llmOptions = {};
          if (tools && tools.length > 0) {
            llmOptions.tools = tools;
            console.log('✅ Including tools in LLM request');
          } else {
            console.log('ℹ️ No tools to include in LLM request');
          }
          
          const result = await this.groqService.generateStreamingChatCompletion(
            messages,
            (chunk) => {
              fullResponse += chunk;
              this.emit('llm_chunk', { text: chunk });
            },
            llmOptions
          );
          
          const llmCallTime = Date.now() - llmStartTime;
          console.log(`⏱️ [TIMING] LLM API call completed: ${llmCallTime}ms`);
          
          // NEW: Deduct LLM credits
          if (this.config.userId && result) {
            try {
              const CreditsService = require('../services/creditsService');
              const responseText = typeof result === 'string' ? result : result.content || '';
              const estimatedTokens = Math.ceil(responseText.length / 4); // Rough token estimation
              
              await CreditsService.deductLLMCredits(this.config.userId, estimatedTokens, {
                model: this.config.model,
                sessionId: this.config.sessionId,
                type: 'llm_generation'
              });
              
              console.log(`💳 LLM Credits deducted: ${estimatedTokens} tokens for user ${this.config.userId}`);
            } catch (creditsError) {
              console.error('❌ Credits deduction failed:', creditsError.message);
              // Don't stop processing - just log the error
            }
          }
          
          // Check if result is string (old format) or object (new format with tools)
          const responseContent = typeof result === 'string' ? result : result.content;
          const toolCalls = typeof result === 'object' ? result.toolCalls : null;
          
          console.log('');
          console.log('📥 LLM Response:');
          console.log(`   Content: ${responseContent ? '"' + responseContent.substring(0, 100) + '..."' : '(none)'}`);
          console.log(`   Tool calls: ${toolCalls ? toolCalls.length : 0}`);
          console.log('');
          
          // If no tool calls, we're done
          if (!toolCalls || toolCalls.length === 0) {
            fullResponse = responseContent || fullResponse;
            console.log('✅ No tool calls - Loop complete!');
            console.log(`📝 Final response: "${fullResponse}"`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('');
            break;
          }
          
          // LLM wants to use tools
          console.log('');
          console.log('🔧 LLM WANTS TO USE TOOLS!');
          console.log(`   Number of tool calls: ${toolCalls.length}`);
          toolCalls.forEach((tc, idx) => {
            console.log(`   ${idx + 1}. ${tc.function.name}(${tc.function.arguments})`);
          });
          console.log('');
          
          // Add assistant message with tool calls to history
          messages.push({
            role: 'assistant',
            content: responseContent || null,
            tool_calls: toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments
              }
            }))
          });
          
          console.log('✅ Added assistant message with tool calls to conversation');
          console.log('');
          
          // Execute each tool call
          const toolLoopStartTime = Date.now();
          console.log('⏱️ ═══════════════════════════════════════════════════════');
          console.log('⏱️ 🔧 STARTING TOOL EXECUTION LOOP');
          console.log(`⏱️ Number of tools to execute: ${toolCalls.length}`);
          console.log('⏱️ ═══════════════════════════════════════════════════════');
          for (let i = 0; i < toolCalls.length; i++) {
            const toolCall = toolCalls[i];
            const toolName = toolCall.function.name;
            let toolArgs;
            
            console.log(`🔧 Tool Call ${i + 1}/${toolCalls.length}:`);
            console.log(`   ID: ${toolCall.id}`);
            console.log(`   Name: ${toolName}`);
            console.log(`   Arguments: ${toolCall.function.arguments}`);
            console.log('');
            
            try {
              toolArgs = JSON.parse(toolCall.function.arguments);
              console.log('✅ Arguments parsed successfully');
            } catch (e) {
              console.error(`❌ Failed to parse arguments:`, e.message);
              console.error(`   Raw arguments: ${toolCall.function.arguments}`);
              toolArgs = {};
            }
            
            // Execute the tool (with error handling)
            let toolResult;
            const singleToolStart = Date.now();
            try {
              toolResult = await this.executeTool(toolName, toolArgs);
              const singleToolTime = Date.now() - singleToolStart;
              console.log(`⏱️ Single tool execution completed in: ${singleToolTime}ms`);
            } catch (toolExecError) {
              const singleToolTime = Date.now() - singleToolStart;
              console.error(`❌ Tool execution failed: ${toolExecError.message}`);
              console.log(`⏱️ Tool failed after: ${singleToolTime}ms`);
              console.log('⚠️ Returning error result to LLM');
              toolResult = { 
                error: `Tool execution failed: ${toolExecError.message}`,
                success: false
              };
            }
            
            console.log('');
            console.log('📨 Adding tool result to conversation:');
            console.log(`   Role: tool`);
            console.log(`   Tool Call ID: ${toolCall.id}`);
            console.log(`   Result: ${JSON.stringify(toolResult).substring(0, 200)}...`);
            console.log('');
            
            // Add tool result to messages
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult)
            });
            
            toolExecutionResults.push({
              tool: toolName,
              args: toolArgs,
              result: toolResult
            });
            
            console.log('✅ Tool result added to conversation');
            console.log('');
          }
          
          const toolLoopTotalTime = Date.now() - toolLoopStartTime;
          console.log('⏱️ ═══════════════════════════════════════════════════════');
          console.log('⏱️ 🎯 ALL TOOLS EXECUTED');
          console.log(`⏱️ Total tool loop time: ${toolLoopTotalTime}ms`);
          console.log(`⏱️ Average time per tool: ${Math.round(toolLoopTotalTime / toolCalls.length)}ms`);
          console.log('⏱️ ═══════════════════════════════════════════════════════');
          console.log('🔄 All tools executed, looping back to LLM with results...');
          console.log('');
          
          // Clear fullResponse for next iteration
          fullResponse = '';
          
          // Continue loop to get LLM's response with tool results
          
        } catch (llmError) {
          console.error('');
          console.error('❌ [LLM] Error:', llmError.message);
          console.error('');
          
          // Check if error is related to tools
          const isToolError = llmError.message && (
            llmError.message.includes('tools') || 
            llmError.message.includes('parameters') ||
            llmError.message.includes('function')
          );
          
          if (isToolError && tools && tools.length > 0) {
            console.warn('⚠️ Tool-related error detected, retrying WITHOUT tools...');
            console.log('');
            
            // Clear tools and retry
            tools = [];
            iteration--; // Don't count this iteration
            fullResponse = ''; // Clear any partial response
            continue; // Retry the loop without tools
          }
          
          // If not a tool error, or already tried without tools, stop
          console.error('❌ LLM error is not recoverable');
          this.emit('error', { error: 'LLM error: ' + llmError.message });
          this.isProcessing = false;
          return;
        }
      }
      
      if (iteration >= maxIterations) {
        console.warn('');
        console.warn('⚠️ WARNING: Max iterations reached!');
        console.warn('   Tool execution loop stopped to prevent infinite loop');
        console.warn('');
      }
      
      // Handle empty response from LLM
      if (!fullResponse || fullResponse.trim().length === 0) {
        console.warn('⚠️ LLM returned empty response, using fallback');
        fullResponse = "I'm sorry, I didn't catch that. Could you please repeat?";
      }
      
      console.log('✅ [LLM] Final response:', fullResponse);
      this.emit('llm_completed', { text: fullResponse });
      
      // Add final response to conversation history (only if not empty)
      if (fullResponse && fullResponse.trim().length > 0) {
        this.conversationHistory.push({
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date().toISOString()
        });
      }
      
      // Step 3: Text-to-Speech
      const ttsStartTime = Date.now();
      console.log('🔊 [TTS] Starting synthesis...');
      console.log(`⏱️ [TIMING] TTS processing started at: ${ttsStartTime}ms`);
      this.emit('tts_started');
      
      try {
        await this.synthesizeSpeech(fullResponse);
        const ttsTime = Date.now() - ttsStartTime;
        console.log(`⏱️ [TIMING] TTS processing completed: ${ttsTime}ms`);
        console.log('✅ [TTS] Completed');
        this.emit('tts_completed');
      } catch (ttsError) {
        const ttsTime = Date.now() - ttsStartTime;
        console.log(`⏱️ [TIMING] TTS failed after: ${ttsTime}ms`);
        console.error('❌ [TTS] Error:', ttsError.message);
        this.emit('error', { error: 'TTS error: ' + ttsError.message });
        this.isProcessing = false;
        return;
      }
      
      // Emit processing complete
      this.emit('processing_completed', {
        transcript,
        response: fullResponse,
        toolsUsed: toolExecutionResults
      });
      
      this.isProcessing = false;
      
    } catch (error) {
      console.error('❌ Pipeline error:', error.message);
      console.error('Stack:', error.stack);
      this.emit('error', { error: error.message });
      this.isProcessing = false;
    }
  }
  
  /**
   * Detect if audio buffer is PCM format
   * @param {Buffer} buffer - Audio buffer
   * @returns {boolean} True if PCM, false if WebM/Opus
   */
  detectPCMFormat(buffer) {
    // WebM files start with specific magic bytes
    // WebM: 0x1A 0x45 0xDF 0xA3
    // Ogg: 0x4F 0x67 0x67 0x53
    
    if (buffer.length < 4) return false;
    
    // Check for WebM signature
    if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
      return false; // WebM format
    }
    
    // Check for Ogg signature
    if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
      return false; // Ogg format
    }
    
    // If no known container format signature, assume PCM
    return true;
  }
  
  /**
   * Convert PCM to WebM for Groq Whisper compatibility
   * @param {Buffer} pcmBuffer - PCM audio buffer
   * @returns {Promise<Buffer>} WebM audio buffer
   */
  async convertPCMToWebM(pcmBuffer) {
    console.log('🔄 [CONVERT] Converting PCM to WebM for Groq...');
    
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    ffmpeg.setFfmpegPath(ffmpegPath);
    
    return new Promise((resolve, reject) => {
      const tempInputPath = path.join(os.tmpdir(), `pcm_input_${Date.now()}.raw`);
      const tempOutputPath = path.join(os.tmpdir(), `webm_output_${Date.now()}.webm`);
      
      try {
        // Write PCM data
        fs.writeFileSync(tempInputPath, pcmBuffer);
        
        // Convert PCM to WebM
        ffmpeg()
          .input(tempInputPath)
          .inputFormat('s16le')
          .inputOptions([
            '-ar 48000',
            '-ac 1'
          ])
          .audioCodec('libopus')
          .format('webm')
          .on('end', () => {
            try {
              const webmData = fs.readFileSync(tempOutputPath);
              console.log(`✅ [CONVERT] Converted ${pcmBuffer.length} bytes PCM to ${webmData.length} bytes WebM`);
              
              // Cleanup
              fs.unlinkSync(tempInputPath);
              fs.unlinkSync(tempOutputPath);
              
              resolve(webmData);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', (error) => {
            console.error('❌ [CONVERT] FFmpeg error:', error);
            reject(error);
          })
          .save(tempOutputPath);
          
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Synthesize speech with proper streaming based on provider
   */
  async synthesizeSpeech(text) {
    console.log(`🔊 [TTS] Synthesizing with ${this.config.voiceProvider}`);
    
    this.isSpeaking = true;
    this.emit('tts_started');
    
    try {
      // NEW: Deduct TTS credits before processing
      if (this.config.userId && text) {
        try {
          const CreditsService = require('../services/creditsService');
          const characterCount = text.length;
          
          await CreditsService.deductTTSCredits(this.config.userId, characterCount, {
            provider: this.config.voiceProvider,
            voiceId: this.config.voiceId,
            sessionId: this.config.sessionId,
            type: 'tts_synthesis'
          });
          
          console.log(`💳 TTS Credits deducted: ${characterCount} characters for user ${this.config.userId}`);
        } catch (creditsError) {
          console.error('❌ TTS Credits deduction failed:', creditsError.message);
          
          // If insufficient credits, stop TTS processing
          if (creditsError.message.includes('Insufficient credits')) {
            this.isSpeaking = false;
            this.emit('error', { error: 'Insufficient credits for text-to-speech' });
            throw new Error('Insufficient credits for text-to-speech');
          }
          // For other credit errors, continue processing but log error
        }
      }
      
      // ElevenLabs WebSocket Streaming
      if (this.config.voiceProvider === 'elevenlabs') {
        await this.synthesizeWithElevenLabs(text);
      }
      // Cartesia WebSocket Streaming (ULTRA-FAST - like VAPI!)
      else if (this.config.voiceProvider === 'cartesia') {
        await this.synthesizeWithCartesiaStreaming(text);
      } else {
        throw new Error(`Unknown voice provider: ${this.config.voiceProvider}`);
      }
      
      console.log('✅ [TTS] Completed');
      this.isSpeaking = false;
      this.emit('tts_completed');
    } catch (error) {
      console.error('❌ [TTS] Error:', error);
      this.isSpeaking = false;
      this.emit('tts_completed');
      throw error;
    }
  }
  
  /**
   * Stop current TTS playback (for interruptions)
   */
  stopSpeaking() {
    if (!this.isSpeaking) {
      return;
    }
    
    console.log('🛑 [TTS] Stopping current speech...');
    
    // Abort current TTS if possible
    if (this.currentTTSAbortController) {
      this.currentTTSAbortController.abort();
      this.currentTTSAbortController = null;
    }
    
    // Close streaming connections
    if (this.cartesiaStreamingService) {
      this.cartesiaStreamingService.close();
    }
    
    this.isSpeaking = false;
    this.emit('tts_completed');
    console.log('✅ [TTS] Stopped');
  }
  
  /**
   * Synthesize with ElevenLabs HTTP API (NON-STREAMING for free tier)
   */
  async synthesizeWithElevenLabs(text) {
    console.log('🎙️ [ElevenLabs] Using HTTP API...');
    
    const ElevenLabsService = require('./elevenLabsService');
    
    if (!ElevenLabsService.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }
    
    // Use free tier model
    const modelId = 'eleven_turbo_v2_5'; // Free tier model
    const voiceId = this.config.voiceId || '21m00Tcm4TlvDq8ikWAM';
    
    console.log(`   Model: ${modelId} (FREE TIER)`);
    console.log(`   Voice: ${voiceId}`);
    
    try {
      // Get audio stream from HTTP API
      const audioStream = await ElevenLabsService.synthesizeSpeech(
        text,
        voiceId,
        modelId,
        {
          stability: 0.5,
          similarity_boost: 0.8,
          use_speaker_boost: false
        }
      );
      
      // Convert stream to buffer
      const audioBuffer = await ElevenLabsService.streamToBuffer(audioStream);
      
      console.log(`✅ [ElevenLabs] Generated complete audio: ${audioBuffer.length} bytes`);
      
      // Emit complete audio as single chunk
      this.emit('audio_chunk', audioBuffer);
      
    } catch (error) {
      console.error('❌ [ElevenLabs] TTS error:', error);
      throw error;
    }
  }
  
  /**
   * Synthesize with Cartesia WebSocket Streaming (VAPI-LEVEL SPEED)
   */
  async synthesizeWithCartesiaStreaming(text) {
    console.log('🎙️ [Cartesia] Streaming audio...');
    
    let chunkCount = 0;
    try {
      // Use WebSocket streaming for immediate audio chunks
      await this.cartesiaStreamingService.streamTextToSpeech(
        text,
        (audioChunk) => {
          // Emit each chunk immediately as it arrives
          this.emit('audio_chunk', audioChunk);
          chunkCount++;
        },
        () => {
          // Streaming complete
          console.log(`✅ [Cartesia] Streamed ${chunkCount} chunks`);
        },
        {
          model: this.config.voiceModel || 'sonic-english',
          voiceId: this.config.voiceId,
          language: this.config.voiceLanguage,
          dialect: this.config.voiceDialect,
          speed: this.config.voiceSpeed,
          emotion: this.config.voiceEmotion,
          volume: this.config.voiceVolume,
          pitch: this.config.voicePitch
        }
      );
      
    } catch (error) {
      console.error('❌ [Cartesia] Streaming TTS error:', error);
      throw error;
    }
  }
  
  /**
   * Synthesize with Cartesia HTTP API (FALLBACK - for smooth audio if streaming fails)
   */
  async synthesizeWithCartesia(text) {
    console.log('🎙️ [Cartesia] Generating audio...');
    
    try {
      // Use HTTP API for complete audio (no streaming artifacts)
      const audioBuffer = await this.cartesiaService.textToSpeech(text, {
        model: this.config.voiceModel || 'sonic-english',
        voiceId: this.config.voiceId,
        language: this.config.voiceLanguage,
        dialect: this.config.voiceDialect,
        speed: this.config.voiceSpeed,
        emotion: this.config.voiceEmotion,
        volume: this.config.voiceVolume,
        pitch: this.config.voicePitch
      });
      
      console.log(`✅ [Cartesia] Generated ${audioBuffer.length} bytes`);
      
      // Emit complete audio as single chunk
      this.emit('audio_chunk', audioBuffer);
      
    } catch (error) {
      console.error('❌ [Cartesia] TTS error:', error);
      throw error;
    }
  }
  
  /**
   * Build messages array for LLM
   * @returns {Array} Messages array
   */
  buildMessages() {
    const messages = [];
    
    // Add system prompt
    if (this.config.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.config.systemPrompt
      });
    }
    
    // Add conversation history (last 10 messages)
    const recentHistory = this.conversationHistory.slice(-10);
    messages.push(...recentHistory);
    
    return messages;
  }
  
  /**
   * Generate first message from assistant
   * @returns {Promise<Buffer>} Audio data for first message
   */
  async generateFirstMessage() {
    if (this.config.firstMessageMode !== 'assistant-speaks-first') {
      return null;
    }
    
    console.log('🗣️ Generating first message:', this.config.firstMessage);
    
    try {
      const audioData = await this.synthesizeSpeech(this.config.firstMessage);
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: this.config.firstMessage,
        timestamp: new Date().toISOString()
      });
      
      return audioData;
    } catch (error) {
      console.error('❌ Error generating first message:', error);
      return null;
    }
  }
  
  /**
   * Get conversation history
   * @returns {Array} Conversation history
   */
  getConversationHistory() {
    return this.conversationHistory;
  }
  
  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
    console.log('🗑️ Conversation history cleared');
  }
  
  /**
   * Start backoff period (Vapi-style interruption handling)
   * Prevents multiple rapid-fire requests after user interruption
   */
  startBackoff() {
    if (this.isInBackoff) return;
    
    console.log('⏳ Starting backoff period:', this.BACKOFF_DURATION, 'ms');
    this.isInBackoff = true;
    
    // Clear any existing backoff timeout
    if (this.backoffTimeout) {
      clearTimeout(this.backoffTimeout);
    }
    
    // Set new backoff timeout
    this.backoffTimeout = setTimeout(() => {
      this.isInBackoff = false;
      this.backoffTimeout = null;
      console.log('✅ Backoff period ended, ready for new input');
    }, this.BACKOFF_DURATION);
  }
  
  /**
   * Get pipeline status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      isInBackoff: this.isInBackoff,
      historyLength: this.conversationHistory.length,
      config: this.config
    };
  }
  
  /**
   * Stop current processing (e.g., for human transfer)
   */
  stopProcessing() {
    console.log('🛑 Stopping pipeline processing');
    this.shouldStopProcessing = true;
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    this.clearHistory();
    this.isProcessing = false;
    this.isInBackoff = false;
    
    // Clear backoff timeout
    if (this.backoffTimeout) {
      clearTimeout(this.backoffTimeout);
      this.backoffTimeout = null;
    }
    
    // Close streaming services
    if (this.cartesiaStreamingService) {
      this.cartesiaStreamingService.close();
    }
    
    this.removeAllListeners();
    // Add a no-op error listener to prevent process crashes if promises
    // (e.g. cancelled TTS requests) emit an 'error' event after cleanup
    this.on('error', (err) => {
      console.log(`[Pipeline] Ignored post-cleanup error: ${err?.error || err?.message || 'Unknown'}`);
    });
    
    console.log('🧹 Pipeline cleaned up');
  }
  
  /**
   * Transcribe audio using Deepgram (batch mode - reliable and fast)
   * Accepts PCM Int16 directly from browser
   * @param {Buffer} audioBuffer - Audio data (PCM Int16 format from browser)
   * @returns {Promise<string>} Transcript
   */
  async transcribeWithDeepgram(audioBuffer) {
    console.log('🚀 [Deepgram] Starting batch transcription...');
    console.log(`📦 [Deepgram] Received audio buffer: ${audioBuffer.length} bytes`);
    
    const DeepgramService = require('./deepgramService');
    
    if (!DeepgramService.isAvailable()) {
      throw new Error('Deepgram API key not configured');
    }
    
    try {
      // Use Deepgram REST API for batch transcription (simpler and more reliable)
      const { createClient } = require('@deepgram/sdk');
      const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
      
      console.log('📤 [Deepgram] Sending audio for transcription...');
      
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          punctuate: true,
          encoding: 'linear16',
          sample_rate: 16000,  // FIXED: Was 48000, but our audio is 16kHz
          channels: 1
        }
      );
      
      if (error) {
        console.error('❌ [Deepgram] Transcription error:', error);
        throw error;
      }
      
      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      const confidence = result?.results?.channels?.[0]?.alternatives?.[0]?.confidence;
      
      if (!transcript || transcript.trim().length === 0) {
        console.log('🔇 [Deepgram] No speech detected');
        return '';
      }
      
      console.log('✅ [Deepgram] Transcript:', transcript);
      console.log('📊 [Deepgram] Confidence:', (confidence * 100).toFixed(1) + '%');
      
      return transcript;
      
    } catch (error) {
      console.error('❌ [Deepgram] Error:', error.message);
      throw error;
    }
  }
  
  /**
   * Execute a tool call
   */
  async executeTool(toolName, toolArgs) {
    try {
      const tool = this.toolDefinitions?.find(t => t.function.name === toolName);
      
      if (!tool) {
        console.error(`❌ Tool not found: ${toolName}`);
        return { error: `Tool ${toolName} not found` };
      }
      
      console.log(`🔧 Executing tool: ${toolName}`);
      console.log(`📋 Arguments:`, toolArgs);
      
      const axios = require('axios');
      const toolData = tool._toolData;
      
      const response = await axios({
        method: toolData.method,
        url: toolData.url,
        headers: toolData.headers,
        data: toolArgs
      });
      
      console.log(`✅ Tool executed successfully: ${toolName}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Tool execution error: ${toolName}`, error.message);
      return { error: error.message };
    }
  }
}

module.exports = VapiStylePipeline;
