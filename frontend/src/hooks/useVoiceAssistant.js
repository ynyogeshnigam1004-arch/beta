/**
 * useVoiceAssistant Hook
 * Manages real-time voice conversation with AI assistant
 * Features: WebSocket streaming, audio capture/playback, <1000ms latency
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import config from '../config'

const WEBSOCKET_URL = config.wsUrl;
const SAMPLE_RATE = 16000; // 16kHz for optimal STT performance
const CHUNK_DURATION = 200; // 200ms chunks for low latency
const CHUNK_SIZE = SAMPLE_RATE * (CHUNK_DURATION / 1000); // samples per chunk

export const useVoiceAssistant = () => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, recording, transcribing, thinking, speaking
  
  // Conversation state
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [conversationLog, setConversationLog] = useState([]);
  
  // Metrics
  const [metrics, setMetrics] = useState({
    sttLatency: 0,
    llmLatency: 0,
    ttsLatency: 0,
    totalLatency: 0
  });
  
  // Refs for persistent objects
  const wsRef = useRef(null);
  const workflowWsRef = useRef(null); // Separate WebSocket for workflow
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const configRef = useRef(null);

  /**
   * Initialize WebSocket connection
   */
  const connect = useCallback(async (config) => {
    try {
      console.log('🔌 Connecting to WebSocket...', config);
      configRef.current = config;

      // Create WebSocket connection
      const ws = new WebSocket(WEBSOCKET_URL);
      wsRef.current = ws;

      return new Promise((resolve, reject) => {
        ws.onopen = () => {
          console.log('✅ WebSocket connected');
          setIsConnected(true);
          
          // Start realtime mode with assistant configuration
          ws.send(JSON.stringify({
            type: 'start_realtime',
            config: {
              model: config.model || 'llama-3.3-70b-versatile-128k',
              transcriber: config.transcriber || 'whisper-large-v3-turbo',
              voiceModel: config.voiceModel || 'sonic-2024-10',
              voiceId: config.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091',
              systemPrompt: config.systemPrompt || 'You are a helpful voice assistant.',
              temperature: config.temperature || 0.7,
              maxTokens: config.maxTokens || 500,
              firstMessage: config.firstMessage || '',
              firstMessageMode: config.firstMessageMode || 'user-speaks-first'
            }
          }));
          
          resolve();
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          setIsConnected(false);
          setIsActive(false);
          setStatus('idle');
        };

        ws.onmessage = (event) => {
          handleWebSocketMessage(JSON.parse(event.data));
        };
      });
    } catch (error) {
      console.error('❌ Connection error:', error);
      throw error;
    }
  }, []);

  /**
   * Handle incoming WebSocket messages
   */
  const handleWebSocketMessage = useCallback((message) => {
    console.log('📨 Received:', message.type);

    switch (message.type) {
      case 'connection_established':
        console.log('✅ Connection established:', message.connectionId);
        break;

      case 'config_confirmed':
        console.log('✅ Realtime configuration confirmed - Ready to stream!');
        setStatus('ready');
        break;

      case 'pipeline_ready':
        console.log('✅ Realtime pipeline ready - You can start speaking!');
        setStatus('ready');
        break;

      case 'audio_received':
        // Audio chunk acknowledgment (no action needed)
        break;

      case 'stt_started':
        setStatus('transcribing');
        setPartialTranscript('Transcribing...');
        break;

      case 'transcript_complete':
        setStatus('thinking');
        setTranscript(message.text);
        setPartialTranscript('');
        addToConversationLog('user', message.text);
        break;

      case 'llm_started':
        setStatus('thinking');
        setAiResponse('');
        break;

      case 'llm_chunk':
        // Stream LLM response text
        setAiResponse(prev => prev + message.text);
        break;

      case 'llm_complete':
        addToConversationLog('assistant', message.text);
        setMetrics(prev => ({ ...prev, llmLatency: message.latency }));
        break;

      case 'tts_started':
        setStatus('speaking');
        break;

      case 'audio_chunk':
        // Queue audio chunk for playback
        queueAudioChunk(message.data);
        break;

      case 'tts_complete':
        setStatus('recording'); // Back to listening
        setMetrics(prev => ({ ...prev, ttsLatency: message.latency }));
        break;

      case 'assistant_speaking':
        // First message from assistant
        setStatus('speaking');
        setAiResponse(message.text);
        addToConversationLog('assistant', message.text);
        break;

      case 'assistant_finished':
        setStatus('ready');
        break;

      case 'metrics':
        setMetrics({
          sttLatency: message.latency.stt || 0,
          llmLatency: message.latency.llm || 0,
          totalLatency: message.latency.total || 0
        });
        break;

      case 'error':
        console.error('❌ Server error:', message.error, message.details);
        addToConversationLog('error', `Error: ${message.error}`);
        setStatus('error');
        break;

      default:
        console.log('⚠️ Unknown message type:', message.type);
    }
  }, []);

  /**
   * Add message to conversation log
   */
  const addToConversationLog = useCallback((role, message) => {
    setConversationLog(prev => [...prev, {
      role,
      message,
      timestamp: new Date().toISOString()
    }]);
  }, []);

  /**
   * Initialize audio capture (microphone input)
   */
  const startAudioCapture = useCallback(async () => {
    try {
      console.log('🎤 Starting audio capture...');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: SAMPLE_RATE,
          channelCount: 1
        }
      });

      mediaStreamRef.current = stream;

      // Create AudioContext for audio processing
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });
      audioContextRef.current = audioContext;

      // Create source from microphone stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Try to use AudioWorklet for better performance, fallback to ScriptProcessor
      if (audioContext.audioWorklet) {
        await setupAudioWorklet(audioContext, source);
      } else {
        setupScriptProcessor(audioContext, source);
      }

      setStatus('recording');
      console.log('✅ Audio capture started');

    } catch (error) {
      console.error('❌ Error starting audio capture:', error);
      throw error;
    }
  }, []);

  /**
   * Setup AudioWorklet for audio processing (preferred method)
   */
  const setupAudioWorklet = async (audioContext, source) => {
    try {
      // For now, we'll use ScriptProcessor as AudioWorklet requires
      // a separate processor file. This is a TODO for optimization.
      setupScriptProcessor(audioContext, source);
    } catch (error) {
      console.error('❌ AudioWorklet setup failed, using ScriptProcessor:', error);
      setupScriptProcessor(audioContext, source);
    }
  };

  /**
   * Setup ScriptProcessor for audio processing (fallback)
   */
  const setupScriptProcessor = (audioContext, source) => {
    const bufferSize = 4096; // Buffer size for processing
    const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

    let audioBuffer = [];
    let bufferSampleCount = 0;

    processor.onaudioprocess = (e) => {
      if (!isActive || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);
      
      // Accumulate samples
      audioBuffer.push(new Float32Array(inputData));
      bufferSampleCount += inputData.length;

      // Send chunk when we have enough samples
      if (bufferSampleCount >= CHUNK_SIZE) {
        sendAudioChunk(audioBuffer, bufferSampleCount);
        audioBuffer = [];
        bufferSampleCount = 0;
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    audioWorkletNodeRef.current = processor;
  };


  /**
   * Convert Float32Array audio to WAV format and send via WebSocket
   */
  const sendAudioChunk = (audioBufferArray, sampleCount) => {
    try {
      // Concatenate all buffers
      const concatenated = new Float32Array(sampleCount);
      let offset = 0;
      for (const buffer of audioBufferArray) {
        concatenated.set(buffer, offset);
        offset += buffer.length;
      }

      // Convert Float32 [-1, 1] to Int16 PCM
      const pcmData = new Int16Array(concatenated.length);
      for (let i = 0; i < concatenated.length; i++) {
        const s = Math.max(-1, Math.min(1, concatenated[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Send raw PCM data via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(pcmData.buffer);
      }
    } catch (error) {
      console.error('❌ Error sending audio chunk:', error);
    }
  };

  /**
   * Queue audio chunk for playback
   */
  const queueAudioChunk = useCallback((base64Audio) => {
    audioQueueRef.current.push(base64Audio);
    
    // Start playing if not already playing
    if (!isPlayingRef.current) {
      playNextAudioChunk();
    }
  }, []);

  /**
   * Play next audio chunk from queue
   */
  const playNextAudioChunk = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const base64Audio = audioQueueRef.current.shift();

    try {
      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: SAMPLE_RATE
        });
      }

      const audioContext = audioContextRef.current;

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);

      // Create buffer source and play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.onended = () => {
        // Play next chunk when this one finishes
        playNextAudioChunk();
      };

      source.start(0);
    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
      // Continue to next chunk even if this one failed
      playNextAudioChunk();
    }
  }, []);

  /**
   * Start voice assistant session
   */
  const startSession = useCallback(async (config) => {
    try {
      setIsActive(true);
      setConversationLog([]);
      setTranscript('');
      setAiResponse('');

      // Connect WebSocket
      await connect(config);

      // Wait for realtime pipeline to initialize (increased from 500ms to 1000ms)
      console.log('⏳ Waiting for realtime pipeline initialization...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start audio capture
      console.log('🎤 Starting audio capture for realtime streaming...');
      await startAudioCapture();

    } catch (error) {
      console.error('❌ Error starting session:', error);
      setIsActive(false);
      throw error;
    }
  }, [connect, startAudioCapture]);

  /**
   * Stop voice assistant session
   */
  const stopSession = useCallback(() => {
    try {
      console.log('🛑 Stopping session...');
      setIsActive(false);

      // Stop audio capture
      if (audioWorkletNodeRef.current) {
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current = null;
      }

      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Clear audio queue
      audioQueueRef.current = [];
      isPlayingRef.current = false;

      // Send stop message to server
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'stop_realtime' }));
      }

      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      setStatus('idle');
      setIsConnected(false);
      console.log('✅ Session stopped');

    } catch (error) {
      console.error('❌ Error stopping session:', error);
    }
  }, []);

  /**
   * Workflow Support Methods
   */
  const setWorkflowActive = useCallback((active) => {
    setIsActive(active);
    if (active) {
      setStatus('ready');
    } else {
      setStatus('idle');
    }
  }, []);

  const setWebSocket = useCallback((ws) => {
    workflowWsRef.current = ws;
  }, []);

  const updatePartialTranscript = useCallback((text) => {
    setPartialTranscript(text);
  }, []);

  const setAIResponse = useCallback((text) => {
    setAiResponse(text);
  }, []);

  const updateMetrics = useCallback((newMetrics) => {
    setMetrics(newMetrics);
  }, []);

  const playAudioChunk = useCallback(async (audioData) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: SAMPLE_RATE
        });
      }

      const audioContext = audioContextRef.current;
      
      // Convert base64 audio data to ArrayBuffer
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
      
      // Play audio
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isActive) {
        stopSession();
      }
    };
  }, [isActive, stopSession]);

  return {
    // State
    isConnected,
    isActive,
    status,
    transcript,
    partialTranscript,
    aiResponse,
    conversationLog,
    metrics,

    // Actions
    startSession,
    stopSession,
    
    // Workflow Support Methods
    setWorkflowActive,
    setWebSocket,
    setPartialTranscript,
    setAIResponse,
    setMetrics,
    playAudioChunk,
    
    // WebSocket reference for external access
    ws: workflowWsRef.current
  };
};

export default useVoiceAssistant;

