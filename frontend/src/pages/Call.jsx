/**
 * ⚠️ IMPORTANT: DO NOT AUTO-FORMAT OR MODIFY THIS FILE ⚠️
 * This file contains critical WebSocket reconnection logic
 * Backup: Call.jsx.BACKUP
 * Last working version: 2025-01-29
 */

import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FiPhone, FiPhoneOff, FiMic, FiMicOff, FiArrowLeft, FiActivity } from 'react-icons/fi'
import { getCachedData } from '../utils/cacheUtils'
import { useTwilioDevice } from '../hooks/useTwilioDevice'
import config from '../config'
import './Call.css'

function Call() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [assistant, setAssistant] = useState(null)
  
  // Twilio Device for human transfer
  const { isReady: twilioReady, joinConference, hangup: hangupTwilio, activeCall: twilioCall } = useTwilioDevice()
  const twilioReadyRef = useRef(false)
  
  // Keep ref in sync with latest twilioReady state to prevent stale closures
  useEffect(() => {
    twilioReadyRef.current = twilioReady
  }, [twilioReady])
  
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [llmStatus, setLlmStatus] = useState('idle') // idle, processing, completed, error
  const [status, setStatus] = useState('Idle')
  const [callDuration, setCallDuration] = useState(0)
  const [connectionState, setConnectionState] = useState('idle') // idle, connecting, connected, active, disconnected
  const [microphoneReady, setMicrophoneReady] = useState(false)
  const [pipelineReady, setPipelineReady] = useState(false)
  const [errorType, setErrorType] = useState(null) // signaling, media, device, pipeline
  const [isRetrying, setIsRetrying] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([]) // Chat history
  const [currentUserMessage, setCurrentUserMessage] = useState('') // Current user message being transcribed
  const [currentAiMessage, setCurrentAiMessage] = useState('') // Current AI message being generated
  const currentAudioRef = useRef(null) // Reference to currently playing audio
  const currentExchangeRef = useRef({ user: '', assistant: '' }) // Track current exchange
  
  // Audio queue for smooth streaming playback
  const audioQueueRef = useRef([])
  const isPlayingRef = useRef(false)
  const audioChunkCountRef = useRef(0)
  const accumulatedPCMRef = useRef(new Float32Array(0)) // Accumulate all PCM data
  const MIN_BUFFER_DURATION = 0.08 // 80ms buffer for fast response
  const FIRST_AUDIO_BUFFER_DURATION = 0.4 // 400ms buffer for greeting to prevent lagging
  const isFirstAudioRef = useRef(true) // Track if this is the first audio (greeting)
  
  // Audio buffering for streaming - collect all chunks then play
  const audioChunksBuffer = useRef([])
  const isCollectingChunks = useRef(false)
  const chunkCollectionTimeout = useRef(null)
  
  // Latency tracking refs - TIMER-BASED (accurate measurement)
  const latencyTimestamps = useRef({
    userStartedSpeaking: 0,    // When user first started speaking (VAD SPEAKING state)
    userStoppedSpeaking: 0,    // When user stopped speaking (VAD IDLE state)
    sttStarted: 0,
    sttCompleted: 0,
    llmStarted: 0,
    llmCompleted: 0,
    ttsStarted: 0,
    ttsCompleted: 0,
    audioReceived: 0,
    firstChunkReceived: 0,
    audioPlaybackStarted: 0    // When audio actually started playing
  })
  
  const wsRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const callStartTimeRef = useRef(null)
  const durationIntervalRef = useRef(null)
  const connectionTimeoutRef = useRef(null)
  const reconnectAttemptRef = useRef(0)
  const maxReconnectAttempts = 1
  const firstMessagePlayedRef = useRef(false) // Track if first message already played

  // Watch for when both microphone and pipeline are ready
  useEffect(() => {
    if (microphoneReady && pipelineReady && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ [EFFECT] Both mic and pipeline ready - clearing timeout')
      
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
        connectionTimeoutRef.current = null
        console.log('✅ Connection timeout cleared via effect')
      }
      
      // Set connection as active
      setConnectionState('active')
      setIsConnected(true)
      setStatus('Connected - Call active')
      
      // Start call timer
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now()
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000))
        }, 1000)
      }
    }
  }, [microphoneReady, pipelineReady])

  // Load assistant - ALWAYS fetch from MongoDB to get latest data (including transferSettings)
  useEffect(() => {
    const loadAssistant = async () => {
      try {
        console.log('🔄 Fetching latest assistant data from MongoDB...')
        const token = localStorage.getItem('token')
        const response = await fetch('/api/assistants', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        const data = await response.json()
        
        if (data.success && data.assistants.length > 0) {
          if (id && id !== 'new') {
            const foundAssistant = data.assistants.find(a => a.id === id)
            if (foundAssistant) {
              setAssistant(foundAssistant)
              console.log('✅ Loaded assistant for call:', foundAssistant.name)
              console.log('📞 Transfer settings:', foundAssistant.transferSettings)
            }
          } else {
            setAssistant(data.assistants[0])
            console.log('✅ Loaded first assistant:', data.assistants[0].name)
            console.log('📞 Transfer settings:', data.assistants[0].transferSettings)
          }
        } else {
          console.error('❌ No assistants found in MongoDB')
          // Fallback to cache
          const cachedAssistants = getCachedData('cached_assistants')
          if (cachedAssistants && cachedAssistants.length > 0) {
            if (id && id !== 'new') {
              const foundAssistant = cachedAssistants.find(a => a.id === id)
              if (foundAssistant) {
                setAssistant(foundAssistant)
                console.log('⚠️ Loaded assistant from cache (fallback):', foundAssistant.name)
              }
            } else {
              setAssistant(cachedAssistants[0])
              console.log('⚠️ Loaded first assistant from cache (fallback):', cachedAssistants[0].name)
            }
          }
        }
      } catch (error) {
        console.error('❌ Error fetching assistant from MongoDB:', error)
        // Fallback to cache
        const cachedAssistants = getCachedData('cached_assistants')
        if (cachedAssistants && cachedAssistants.length > 0) {
          if (id && id !== 'new') {
            const foundAssistant = cachedAssistants.find(a => a.id === id)
            if (foundAssistant) {
              setAssistant(foundAssistant)
              console.log('⚠️ Loaded assistant from cache (error fallback):', foundAssistant.name)
            }
          } else {
            setAssistant(cachedAssistants[0])
            console.log('⚠️ Loaded first assistant from cache (error fallback):', cachedAssistants[0].name)
          }
        }
      }
    }
    
    loadAssistant()
  }, [id])

  // Start call with proper connection verification
  const handleStartCall = async () => {
    if (!assistant) {
      alert('Please select an assistant first')
      return
    }

    try {
      // IMPORTANT: Clean up existing connection before starting new one
      if (wsRef.current) {
        console.log('🧹 Cleaning up existing connection...')
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close()
        }
        wsRef.current = null
      }
      
      // Stop existing microphone
      stopMicrophone()
      
      // Reset all state
      setTranscript('')
      setPartialTranscript('')
      setAiResponse('')
      setLlmStatus('idle')
      setCallDuration(0)
      setConnectionState('connecting')
      setMicrophoneReady(false)
      setPipelineReady(false)
      setErrorType(null)
      
      // ALWAYS reset audio flags for every new call (professional behavior)
      isFirstAudioRef.current = true // Reset for smooth greeting audio
      
      // Only clear history and first message flag if NOT retrying
      if (!isRetrying) {
        setConversationHistory([]) // Clear conversation history for new call
        setCurrentUserMessage('')
        setCurrentAiMessage('')
        currentExchangeRef.current = { user: '', assistant: '' } // Clear ref
        firstMessagePlayedRef.current = false // Reset first message flag for new call
      }
      
      // Only reset retry counter if not already retrying
      if (!isRetrying) {
        reconnectAttemptRef.current = 0
      }
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
      }
      
      setStatus('Connecting to server...')
      console.log('🚀 Starting call - State: Connecting')
      
      // Set connection timeout (45 seconds - increased for STT+LLM+TTS processing)
      connectionTimeoutRef.current = setTimeout(() => {
        // Check if connection is active by checking WebSocket state directly
        const wsState = wsRef.current?.readyState
        const isWsOpen = wsState === WebSocket.OPEN
        
        console.log('⏱️ [TIMEOUT_CHECK] Checking connection after 45 seconds:', {
          wsState: isWsOpen ? 'OPEN' : 'CLOSED',
          connectionState: connectionState,
          isRetrying: isRetrying
        })
        
        // Only timeout if WebSocket is not open and not already retrying
        if (!isWsOpen && !isRetrying) {
          console.warn('⏱️ [TIMEOUT] Connection timeout - WebSocket not open after 45 seconds')
          handleConnectionTimeout()
        } else {
          console.log('✅ [TIMEOUT_CHECK] Connection is active, timeout cleared')
        }
      }, 45000)
      
      // Initialize NEW WebSocket
      const wsUrl = config.wsUrl
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = async () => {
        console.log('✅ WebSocket connected - State: Connected')
        setConnectionState('connected')
        setStatus('Initializing pipeline...')

        // Send configuration to pipeline
        // Determine correct voice ID based on provider
        const voiceProvider = assistant.voiceProvider || 'elevenlabs'
        let voiceId = '21m00Tcm4TlvDq8ikWAM' // Default ElevenLabs Rachel
        let voiceModel = 'eleven_turbo_v2_5' // Default ElevenLabs model
        
        if (voiceProvider === 'elevenlabs') {
          voiceId = assistant.elevenLabsVoiceId || assistant.voiceId || '21m00Tcm4TlvDq8ikWAM'
          voiceModel = assistant.elevenLabsModel || assistant.voiceModel || 'eleven_turbo_v2_5'
        } else if (voiceProvider === 'cartesia') {
          voiceId = assistant.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091'
          voiceModel = assistant.voiceModel || 'sonic-english'
        }
        
        // Get current user ID for credits tracking
        const userStr = localStorage.getItem('user')
        let userId = null
        if (userStr) {
          try {
            const user = JSON.parse(userStr)
            userId = user.id
          } catch (error) {
            console.error('Error parsing user data:', error)
          }
        }
        
        console.log('📤 Sending assistant configuration:', {
          voiceProvider,
          voiceId,
          voiceModel,
          userId
        })
        
        // ALWAYS play greeting message on every call (professional behavior)
        const firstMessageMode = assistant.firstMessageMode || 'assistant-speaks-first'
        
        ws.send(JSON.stringify({
          type: 'config',
          config: {
            id: assistant.id, // CRITICAL: Include assistant ID for human transfer
            userId, // Required for multi-tenant credits tracking
            model: assistant.model || 'llama-3.1-8b-instant',
            transcriber: assistant.transcriber || 'whisper-large-v3-turbo',
            voiceProvider,
            voiceModel,
            voiceId,
            systemPrompt: assistant.systemPrompt || 'You are a helpful assistant.',
            firstMessage: assistant.firstMessage || 'Hello! How can I help you today?',
            firstMessageMode: firstMessageMode,
            transferSettings: assistant.transferSettings || null,
            tools: assistant.tools || []
          }
        }))

        // Start microphone and wait for it to be ready
        try {
          await startMicrophone()
          setMicrophoneReady(true)
          console.log('✅ [DEVICE_OK] Microphone ready')
          // Use setTimeout to ensure state has updated
          setTimeout(() => checkConnectionReady(true, pipelineReady), 100)
        } catch (error) {
          console.error('❌ [DEVICE_FAIL] Microphone access failed:', error)
          handleConnectionError('device', 'Microphone not accessible - Permission denied')
        }
      }

      ws.onmessage = async (event) => {
        try {
          // Check if it's binary audio data
          if (event.data instanceof Blob) {
            // Track first chunk latency
            if (!latencyTimestamps.current.firstChunkReceived) {
              latencyTimestamps.current.firstChunkReceived = Date.now()
              
              if (latencyTimestamps.current.ttsStarted > 0) {
                const firstChunkLatency = latencyTimestamps.current.firstChunkReceived - latencyTimestamps.current.ttsStarted
                console.log('⏱️ [LATENCY] First audio chunk received in:', firstChunkLatency, 'ms from TTS start')
              }
            }
            
            latencyTimestamps.current.audioReceived = Date.now()
            
            // Calculate ACCURATE end-to-end latency from when user STOPPED speaking
            if (latencyTimestamps.current.userStoppedSpeaking > 0 && latencyTimestamps.current.ttsCompleted > 0) {
              const totalLatency = latencyTimestamps.current.audioReceived - latencyTimestamps.current.userStoppedSpeaking
              const sttLatency = latencyTimestamps.current.sttCompleted - latencyTimestamps.current.userStoppedSpeaking
              const llmLatency = latencyTimestamps.current.llmCompleted - latencyTimestamps.current.sttCompleted
              const ttsLatency = latencyTimestamps.current.ttsCompleted - latencyTimestamps.current.llmCompleted
              const audioTransferLatency = latencyTimestamps.current.audioReceived - latencyTimestamps.current.ttsCompleted
              
              console.log('🎵 Received binary audio data:', event.data.size, 'bytes')
              console.log('')
              console.log('⏱️ ═══════════════════════════════════════════════════════')
              console.log('⏱️ 🎯 ACCURATE END-TO-END LATENCY:', totalLatency, 'ms')
              console.log('⏱️ ═══════════════════════════════════════════════════════')
              console.log('⏱️ Breakdown (from when you stopped speaking):')
              console.log('⏱️   • STT:', sttLatency, 'ms', '(' + Math.round(sttLatency/totalLatency*100) + '%)')
              console.log('⏱️   • LLM:', llmLatency, 'ms', '(' + Math.round(llmLatency/totalLatency*100) + '%)')
              console.log('⏱️   • TTS:', ttsLatency, 'ms', '(' + Math.round(ttsLatency/totalLatency*100) + '%)')
              console.log('⏱️   • Audio transfer:', audioTransferLatency, 'ms', '(' + Math.round(audioTransferLatency/totalLatency*100) + '%)')
              console.log('⏱️ ═══════════════════════════════════════════════════════')
              console.log('')
            } else {
              console.log('🎵 Received binary audio chunk:', event.data.size, 'bytes')
            }
            
            // Convert blob to array buffer and queue for smooth playback
            const arrayBuffer = await event.data.arrayBuffer()
            console.log(`🎵 Received audio chunk: ${arrayBuffer.byteLength} bytes`)
            await queueAudioChunk(arrayBuffer)
            return
          }

          // Parse JSON messages
          const message = JSON.parse(event.data)
          console.log('📨 Received:', message.type)

          switch (message.type) {
            case 'connection_established':
              console.log('✅ Connection established:', message.connectionId)
              break

            case 'pipeline_activated':
              console.log('✅ [PIPELINE_OK] Vapi-Style Pipeline activated')
              console.log('📋 Configuration:', message.config)
              setPipelineReady(true)
              setStatus('Pipeline ready...')
              checkConnectionReady(microphoneReady, true)
              break
            
            case 'pipeline_error':
              console.error('❌ [PIPELINE_FAIL] Pipeline initialization failed:', message.error)
              handleConnectionError('pipeline', 'Pipeline initialization failed - Backend error')
              break

            case 'system_prompt_initialized':
              console.log('🧠 System prompt initialized:', message.systemPrompt.substring(0, 50) + '...')
              setStatus('System ready...')
              break

            case 'assistant_speaking_first':
              console.log('🗣️ Assistant will speak first:', message.message)
              setStatus('Assistant speaking first...')
              setAiResponse(message.message)
              break

            case 'assistant_waiting':
              console.log('👂 Assistant waiting for user input')
              setStatus('Ready - Speak to begin')
              break

            case 'first_message_started':
              console.log('🎤 First message started:', message.text)
              setStatus('Speaking first message...')
              setAiResponse(message.text)
              firstMessagePlayedRef.current = true // Mark as played
              break

            case 'first_message_complete':
              console.log('✅ First message complete')
              setStatus('Ready - Your turn to speak')
              break

            case 'first_message_error':
              console.error('❌ First message error:', message.error)
              setStatus('Ready - Speak to begin')
              break

            case 'listening_activated':
              console.log('👂 Listening mode activated')
              setStatus('Listening...')
              break

            case 'transcriber_started':
              latencyTimestamps.current.sttStarted = Date.now()
              
              // Calculate accurate STT latency from when user STOPPED speaking
              if (latencyTimestamps.current.userStoppedSpeaking > 0) {
                const sttStartLatency = latencyTimestamps.current.sttStarted - latencyTimestamps.current.userStoppedSpeaking
                console.log('⏱️ [LATENCY] Transcriber Started - Time from user stopped speaking:', sttStartLatency, 'ms')
              }
              
              // INTERRUPTION: Stop any playing audio when user starts speaking
              if (currentAudioRef.current) {
                console.log('🛑 [INTERRUPTION] User started speaking - stopping AI audio')
                try {
                  currentAudioRef.current.stop()
                } catch (e) {
                  // Already stopped
                }
                currentAudioRef.current = null
              }
              clearAudioQueue() // Clear any queued audio chunks
              setStatus('Listening...')
              break

            case 'stt_started':
              latencyTimestamps.current.sttStarted = Date.now()
              
              // Calculate accurate STT latency from when user STOPPED speaking
              if (latencyTimestamps.current.userStoppedSpeaking > 0) {
                const sttStartLatency = latencyTimestamps.current.sttStarted - latencyTimestamps.current.userStoppedSpeaking
                console.log('⏱️ [LATENCY] STT Started - Time from user stopped speaking:', sttStartLatency, 'ms')
              }
              
              // INTERRUPTION: Stop any playing audio when user starts speaking
              if (currentAudioRef.current) {
                console.log('🛑 [INTERRUPTION] User started speaking - stopping AI audio')
                try {
                  currentAudioRef.current.stop()
                } catch (e) {
                  // Already stopped
                }
                currentAudioRef.current = null
              }
              clearAudioQueue() // Clear any queued audio chunks
              
              setStatus('Listening...')
              break

            case 'transcriber_completed':
              setTranscript(message.text)
              setCurrentUserMessage(message.text)
              setPartialTranscript('')
              setStatus('Processing...')
              break

            case 'llm_started':
              latencyTimestamps.current.llmStarted = Date.now()
              const llmStartLatency = latencyTimestamps.current.llmStarted - latencyTimestamps.current.sttCompleted
              console.log('⏱️ [LATENCY] LLM Started - Time from STT completed:', llmStartLatency, 'ms')
              setStatus('Thinking...')
              setLlmStatus('processing')
              setCurrentAiMessage('') // Reset AI message for new response
              break

            case 'llm_chunk':
              setAiResponse(prev => prev + message.text)
              setCurrentAiMessage(prev => {
                const newMessage = prev + message.text
                currentExchangeRef.current.assistant = newMessage // Store in ref
                return newMessage
              })
              setStatus('Speaking...')
              setLlmStatus('processing')
              break

            case 'stt_interim':
              // Live interim transcript - show as you speak!
              console.log('📝 [LIVE TRANSCRIPT] Deepgram hears: "' + message.text + '"')
              setPartialTranscript(message.text)
              setStatus('Listening... (live)')
              break

            case 'transcript':
              console.log('📝 User transcript:', message.text)
              setTranscript(message.text)
              setCurrentUserMessage(message.text)
              setPartialTranscript('')
              setStatus('Processing...')
              break

            case 'llm_response':
              console.log('🧠 LLM response:', message.text)
              setAiResponse(message.text)
              setStatus('Converting to speech...')
              setLlmStatus('completed')
              break

            case 'llm_completed':
              latencyTimestamps.current.llmCompleted = Date.now()
              const llmDuration = latencyTimestamps.current.llmCompleted - latencyTimestamps.current.llmStarted
              const totalLlmLatency = latencyTimestamps.current.llmCompleted - latencyTimestamps.current.audioSent
              console.log('⏱️ [LATENCY] LLM Completed:')
              console.log('  - LLM processing time:', llmDuration, 'ms')
              console.log('  - Total latency (from audio sent):', totalLlmLatency, 'ms')
              setAiResponse(message.text)
              currentExchangeRef.current.assistant = message.text // Store complete response
              setStatus('Speaking...')
              setLlmStatus('completed')
              break

            case 'tts_started':
              latencyTimestamps.current.ttsStarted = Date.now()
              latencyTimestamps.current.firstChunkReceived = 0 // Reset for new TTS
              const ttsStartLatency = latencyTimestamps.current.ttsStarted - latencyTimestamps.current.llmCompleted
              console.log('⏱️ [LATENCY] TTS Started - Time from LLM completed:', ttsStartLatency, 'ms')
              setStatus('Speaking...')
              break

            case 'tts_completed':
              latencyTimestamps.current.ttsCompleted = Date.now()
              const ttsDuration = latencyTimestamps.current.ttsCompleted - latencyTimestamps.current.ttsStarted
              console.log('⏱️ [LATENCY] TTS Completed:')
              console.log('  - TTS processing time:', ttsDuration, 'ms')
              setStatus('Ready')
              break

            case 'audio_stream_start':
              console.log(`🎵 Audio stream starting: ${message.totalSize} bytes, ${message.totalChunks} chunks`)
              // Initialize audio buffer for streaming
              window.audioBuffer = []
              window.expectedChunks = message.totalChunks
              window.receivedChunks = 0
              setStatus('Receiving audio...')
              break

            case 'audio_chunk':
              // Buffer audio chunks and play when complete
              if (message.data) {
                try {
                  const audioData = atob(message.data) // Decode base64
                  const bytes = new Uint8Array(audioData.length)
                  for (let i = 0; i < audioData.length; i++) {
                    bytes[i] = audioData.charCodeAt(i)
                  }
                  
                  // Initialize audio buffer if needed
                  if (!window.currentAudioBuffer) {
                    window.currentAudioBuffer = []
                    console.log('🎵 Starting new audio buffer')
                  }
                  
                  // Add chunk to buffer
                  window.currentAudioBuffer.push(bytes)
                  console.log(`🎵 Buffered chunk: ${bytes.length} bytes (total chunks: ${window.currentAudioBuffer.length})`)
                  
                } catch (error) {
                  console.error('❌ Error processing audio chunk:', error)
                }
              }
              break
            
            case 'processing_completed':
              console.log('✅ Processing completed')
              
              // Add to conversation history using ref (has the actual values)
              if (currentExchangeRef.current.user || currentExchangeRef.current.assistant) {
                const newEntry = {
                  id: Date.now(),
                  user: currentExchangeRef.current.user,
                  assistant: currentExchangeRef.current.assistant,
                  timestamp: new Date().toISOString()
                }
                
                console.log('📝 Adding to history:', newEntry)
                
                setConversationHistory(prev => {
                  const updated = [...prev, newEntry]
                  console.log('📚 Total history entries:', updated.length)
                  return updated
                })
                
                // Clear current messages for next exchange
                setCurrentUserMessage('')
                setCurrentAiMessage('')
                currentExchangeRef.current = { user: '', assistant: '' }
              }
              
              // Play buffered audio when processing is complete
              if (window.currentAudioBuffer && window.currentAudioBuffer.length > 0) {
                try {
                  // Combine all chunks
                  const totalLength = window.currentAudioBuffer.reduce((sum, chunk) => sum + chunk.length, 0)
                  const combinedAudio = new Uint8Array(totalLength)
                  let offset = 0
                  
                  for (const chunk of window.currentAudioBuffer) {
                    combinedAudio.set(chunk, offset)
                    offset += chunk.length
                  }
                  
                  console.log(`🎵 Playing complete audio: ${combinedAudio.length} bytes from ${window.currentAudioBuffer.length} chunks`)
                  
                  // Create blob and play
                  const blob = new Blob([combinedAudio], { type: 'audio/mpeg' })
                  const audioUrl = URL.createObjectURL(blob)
                  const audio = new Audio(audioUrl)
                  
                  // Store reference for interruption
                  currentAudioRef.current = audio
                  
                  audio.onloadeddata = () => {
                    console.log(`✅ Audio loaded, duration: ${audio.duration.toFixed(2)}s`)
                  }
                  
                  audio.onended = () => {
                    URL.revokeObjectURL(audioUrl)
                    currentAudioRef.current = null
                    setStatus('Ready')
                    console.log('✅ Audio playback completed')
                  }
                  
                  audio.onerror = (e) => {
                    console.error('❌ Audio playback error:', e)
                    URL.revokeObjectURL(audioUrl)
                    currentAudioRef.current = null
                    setStatus('Ready')
                  }
                  
                  // Calculate and log TOTAL latency
                  if (latencyTimestamps.current.audioSent) {
                    const totalLatency = Date.now() - latencyTimestamps.current.audioSent
                    console.log('⏱️ ========================================')
                    console.log('⏱️ [TOTAL LATENCY] End-to-End:', totalLatency, 'ms')
                    console.log('⏱️ ========================================')
                  }
                  
                  audio.play().catch(err => {
                    console.error('❌ Failed to play audio:', err)
                    currentAudioRef.current = null
                    setStatus('Ready')
                  })
                  
                  setStatus('Speaking...')
                  
                  // Clear buffer
                  window.currentAudioBuffer = []
                  
                } catch (error) {
                  console.error('❌ Error playing buffered audio:', error)
                  window.currentAudioBuffer = []
                  setStatus('Ready')
                }
              } else {
                setStatus('Ready')
              }
              break
            
            case 'workflow_completed':
              console.log('✅ Workflow completed')
              setStatus('Ready')
              break
            
            case 'config_confirmed':
              console.log('✅ Configuration confirmed')
              setPipelineReady(true)
              setStatus('Pipeline ready...')
              // Use setTimeout to ensure state has updated
              setTimeout(() => checkConnectionReady(microphoneReady, true), 100)
              break
            
            case 'ready':
              console.log('✅ Pipeline ready for audio input')
              setPipelineReady(true)
              setStatus('Ready - Speak to begin')
              // Use setTimeout to ensure state has updated
              setTimeout(() => checkConnectionReady(microphoneReady, true), 100)
              break
            
            case 'stt_completed':
              latencyTimestamps.current.sttCompleted = Date.now()
              const sttDuration = latencyTimestamps.current.sttCompleted - latencyTimestamps.current.sttStarted
              
              // Calculate ACCURATE total STT latency from when user stopped speaking
              const totalSttLatency = latencyTimestamps.current.sttCompleted - latencyTimestamps.current.userStoppedSpeaking
              
              console.log('⏱️ [LATENCY] STT Completed:')
              console.log('  - STT processing time:', sttDuration, 'ms')
              console.log('  - 🎯 ACCURATE STT latency (from user stopped speaking):', totalSttLatency, 'ms')
              console.log('')
              console.log('═══════════════════════════════════════════════════════')
              console.log('🎤 WHAT YOU SAID (according to Deepgram):')
              console.log('   "' + message.text + '"')
              console.log('═══════════════════════════════════════════════════════')
              console.log('')
              setTranscript(message.text)
              setCurrentUserMessage(message.text)
              currentExchangeRef.current.user = message.text // Store in ref
              setPartialTranscript('')
              setStatus('Thinking...')
              break
            
            case 'old_processing_completed':
              // Renamed to avoid duplicate case
              console.log('✅ Processing completed (old)')
              setStatus('Ready')
              break

            case 'audio_stream_end':
              console.log('🎵 Audio stream ended')
              // Fallback: play any remaining audio
              if (window.audioBuffer && window.audioBuffer.length > 0) {
                await playStreamedAudio(window.audioBuffer, 'wav')
                window.audioBuffer = []
              }
              setStatus('Ready')
              break

            case 'error':
            case 'transcriber_error':
            case 'llm_error':
            case 'tts_error':
              console.error('❌ Error:', message.error)
              // Extract readable error message
              let errorMsg = message.error
              if (typeof errorMsg === 'object') {
                errorMsg = errorMsg.message || JSON.stringify(errorMsg).substring(0, 200)
              }
              // Clean up circular structure errors
              if (errorMsg.includes('circular structure')) {
                errorMsg = 'API request failed. Please check backend logs for details.'
              }
              setStatus('Error: ' + errorMsg)
              
              // Track LLM-specific errors
              if (message.type === 'llm_error') {
                setLlmStatus('error')
              }
              break

            case 'no_speech_detected':
              console.log('🔇 No speech detected')
              setStatus('Ready')
              break

            case 'human_transfer_initiated':
              console.log('')
              console.log('═══════════════════════════════════════════════════════')
              console.log('🙋 HUMAN TRANSFER INITIATED!')
              console.log('═══════════════════════════════════════════════════════')
              console.log('Conference:', message.conferenceName)
              console.log('Call SID:', message.callSid)
              console.log('Status:', message.status)
              console.log('═══════════════════════════════════════════════════════')
              console.log('')
              
              setStatus('🔄 Connecting to human agent...')
              setAiResponse('Connecting you to a human agent, please wait...')
              
              // Stop AI processing
              if (currentAudioRef.current) {
                try {
                  currentAudioRef.current.stop()
                } catch (e) {
                  // Already stopped
                }
                currentAudioRef.current = null
              }
              clearAudioQueue()
              
              // CRITICAL: Stop WebSocket audio stream and switch to Twilio (WORKING APPROACH)
              console.log('🔄 [TRANSFER] Stopping WebSocket audio stream...')
              
              // FIRST: Stop the audio processor callback (CRITICAL!)
              if (window.audioProcessorNode) {
                try {
                  // Remove the onaudioprocess callback to stop it from firing
                  window.audioProcessorNode.onaudioprocess = null
                  window.audioProcessorNode.disconnect()
                  window.audioProcessorNode = null
                  console.log('✅ [TRANSFER] Audio processor stopped and disconnected')
                } catch (e) {
                  console.warn('⚠️ [TRANSFER] Error stopping audio processor:', e)
                }
              }
              
              // Stop media recorder if active
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                try {
                  mediaRecorderRef.current.stop()
                  console.log('✅ [TRANSFER] Media recorder stopped')
                } catch (e) {
                  console.warn('⚠️ [TRANSFER] Error stopping media recorder:', e)
                }
                mediaRecorderRef.current = null
              }
              
              // Stop microphone/audio processing
              if (audioContextRef.current) {
                try {
                  audioContextRef.current.close()
                  console.log('✅ [TRANSFER] Audio context closed')
                } catch (e) {
                  console.warn('⚠️ [TRANSFER] Error closing audio context:', e)
                }
                audioContextRef.current = null
              }
              
              // Close WebSocket connection (AI no longer needed)
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                try {
                  wsRef.current.close()
                  console.log('✅ [TRANSFER] WebSocket closed')
                } catch (e) {
                  console.warn('⚠️ [TRANSFER] Error closing WebSocket:', e)
                }
                wsRef.current = null
              }
              
              setMicrophoneReady(false)
              setPipelineReady(false)
              
              console.log('✅ [TRANSFER] WebSocket audio stopped, switching to Twilio...')
              
              // Join conference via Twilio Device
              if (twilioReadyRef.current) {
                try {
                  await joinConference(message.conferenceName)
                  setStatus('🔴 LIVE - Connected to Human Agent')
                  setAiResponse('You are now connected to a human agent.')
                  console.log('✅ Successfully joined conference!')
                } catch (err) {
                  console.error('❌ Failed to join conference:', err)
                  setStatus('❌ Failed to connect to human agent')
                  setAiResponse('Sorry, failed to connect to human agent. Please try again.')
                }
              } else {
                console.warn('⚠️ Twilio Device not ready yet')
                setStatus('⏳ Waiting for Twilio Device...')
                
                // Retry after 2 seconds
                setTimeout(async () => {
                  // Use twilioReadyRef to get the LATEST state instead of the stale closure state
                  if (twilioReadyRef.current) {
                    try {
                      await joinConference(message.conferenceName)
                      setStatus('🔴 LIVE - Connected to Human Agent')
                      setAiResponse('You are now connected to a human agent.')
                      console.log('✅ Successfully joined conference (retry)!')
                    } catch (err) {
                      console.error('❌ Failed to join conference (retry):', err)
                      setStatus('❌ Failed to connect to human agent')
                    }
                  } else {
                    setStatus('❌ Twilio Device not available')
                  }
                }, 2000)
              }
              
              break

            case 'human_transfer_failed':
              console.error('❌ Human transfer failed:', message.error)
              setStatus('❌ Failed to initiate transfer')
              setAiResponse(`Sorry, I could not connect you to a human agent. ${message.error}`)
              break
          }
        } catch (error) {
          console.error('❌ Error processing message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('❌ [SIGNAL_FAIL] WebSocket error:', error)
        setErrorType('signaling')
        handleConnectionError('signaling', 'Unable to reach server - WebSocket connection failed')
      }

      ws.onclose = (event) => {
        console.log('🔌 [DISCONNECT] WebSocket closed:', event.code, event.reason)
        
        // Log close reason for debugging
        if (event.code !== 1000) {
          console.warn('⚠️ [ABNORMAL_CLOSE] WebSocket closed unexpectedly:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          })
        }
        
        // Only show "Ready for new call" if connection was previously active
        if (connectionState === 'active') {
          console.log('✅ [NORMAL_END] Call ended normally by user')
          setConnectionState('idle')
          setIsConnected(false)
          setStatus('Call ended - Ready for new call')
          cleanupConnection()
        } else if ((connectionState === 'connecting' || connectionState === 'connected') && !isRetrying) {
          // Connection failed before becoming active - trigger error handling
          console.error('❌ [SIGNAL_FAIL] Connection failed during setup')
          
          // Determine error type based on close code
          let errorType = 'signaling'
          let errorMessage = 'Unable to reach server'
          
          if (event.code === 1006) {
            errorType = 'signaling'
            errorMessage = 'Unable to reach server - Connection closed abnormally'
          } else if (event.code === 1011) {
            errorType = 'pipeline'
            errorMessage = 'Pipeline initialization failed - Server error'
          }
          
          handleConnectionError(errorType, errorMessage)
        }
        
        // IMPORTANT: Clear WebSocket reference so new connection can be made
        if (wsRef.current === ws) {
          wsRef.current = null
        }
      }

    } catch (error) {
      console.error('❌ Error starting call:', error)
      setStatus('Failed to connect')
      alert('Failed to start call: ' + error.message)
    }
  }

  // Check if connection is fully ready (microphone + pipeline)
  const checkConnectionReady = (micReady = microphoneReady, pipeReady = pipelineReady) => {
    // Get current connection state from wsRef
    const currentWsState = wsRef.current?.readyState
    const isWsConnected = currentWsState === WebSocket.OPEN
    
    console.log('🔍 Checking connection readiness:', {
      microphone: micReady,
      pipeline: pipeReady,
      wsState: isWsConnected ? 'OPEN' : 'CLOSED',
      connectionState: connectionState
    })
    
    if (micReady && pipeReady && isWsConnected) {
      console.log('✅ Connection fully established - State: Active')
      setConnectionState('active')
      setIsConnected(true)
      setStatus('Connected - Call active')
      
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current)
        connectionTimeoutRef.current = null
        console.log('✅ Connection timeout cleared')
      }
      
      // Start call timer
      if (!callStartTimeRef.current) {
        callStartTimeRef.current = Date.now()
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000))
        }, 1000)
      }
    }
  }

  // Handle connection errors with specific categorization
  const handleConnectionError = (type, message) => {
    console.error(`❌ [${type.toUpperCase()}_FAIL] ${message}`)
    setErrorType(type)
    
    // Don't retry if already retrying
    if (isRetrying) {
      console.warn('⚠️ Already retrying, skipping duplicate retry')
      return
    }
    
    // Attempt automatic retry once
    if (reconnectAttemptRef.current < maxReconnectAttempts) {
      reconnectAttemptRef.current++
      setIsRetrying(true)
      
      console.log(`🔄 [RETRY_${reconnectAttemptRef.current}] Attempting automatic reconnection in 3 seconds...`)
      setStatus(`Connection error - Retrying... (Attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts})`)
      
      // Clean up current connection
      cleanupConnection()
      
      // Retry after 3 seconds
      setTimeout(() => {
        console.log('🔄 Executing retry...')
        setIsRetrying(false)
        handleStartCall()
      }, 3000)
    } else {
      // Max retries reached - show specific error message
      handleConnectionFailure(type, message)
    }
  }

  // Handle connection timeout
  const handleConnectionTimeout = () => {
    console.warn('⏱️ [TIMEOUT] Connection timeout reached')
    handleConnectionError('media', 'Unable to establish media connection - Connection timeout')
  }

  // Handle final connection failure with specific messaging
  const handleConnectionFailure = (type, message) => {
    console.error(`❌ [FINAL_FAIL] Connection failed after retries: ${type}`)
    
    // Determine user-friendly error message based on type
    let userMessage = ''
    switch(type) {
      case 'signaling':
        userMessage = 'Unable to reach server - Please check if backend is running'
        break
      case 'media':
        userMessage = 'Unable to establish media connection - Please try again'
        break
      case 'device':
        userMessage = 'Microphone not accessible - Please grant microphone permissions'
        break
      case 'pipeline':
        userMessage = 'Pipeline initialization failed - Backend not responding'
        break
      default:
        userMessage = message || 'Connection failed - Please try again'
    }
    
    setConnectionState('idle')
    setIsConnected(false)
    setStatus(userMessage)
    setIsRetrying(false)
    
    // Full cleanup
    cleanupConnection()
    
    // Log diagnostic information
    console.error('🔍 [DIAGNOSTIC] Connection failure details:', {
      errorType: type,
      message: message,
      retryAttempts: reconnectAttemptRef.current,
      timestamp: new Date().toISOString()
    })
  }

  // Clean up all connection resources
  const cleanupConnection = () => {
    console.log('🧹 [CLEANUP] Cleaning up connection resources...')
    
    // Stop any playing audio
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.stop()
      } catch (e) {
        // Already stopped
      }
      currentAudioRef.current = null
    }
    
    // Close WebSocket
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close()
        }
      } catch (error) {
        console.error('Error closing WebSocket:', error)
      }
      wsRef.current = null
    }
    
    // Stop microphone
    stopMicrophone()
    
    // Clear timers
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
    
    // Reset state flags
    setMicrophoneReady(false)
    setPipelineReady(false)
    
    console.log('✅ [CLEANUP] Connection cleanup complete')
  }

  // Stop call
  const handleStopCall = () => {
    console.log('🛑 [USER_END] User ended call - State: Disconnected')
    
    // Hang up Twilio call if active
    if (twilioCall) {
      console.log('📞 [TWILIO] Hanging up human transfer call')
      hangupTwilio()
    }
    
    // Stop main pipeline first
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'stop_main_pipeline'
      }))
    }
    
    // Full cleanup
    cleanupConnection()
    
    // Reset all state
    setConnectionState('idle')
    setIsConnected(false)
    setStatus('Call ended - Ready for new call')
    setTranscript('')
    setPartialTranscript('')
    setAiResponse('')
    setLlmStatus('idle')
    setCallDuration(0)
    setErrorType(null)
    setIsRetrying(false)
    reconnectAttemptRef.current = 0
  }

  // Create WAV file from PCM data (same format as successful test files)
  const createWAVFile = (pcmData, sampleRate = 48000) => {
    const numChannels = 1 // Mono
    const bitsPerSample = 16
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
    const blockAlign = numChannels * (bitsPerSample / 8)
    const dataSize = pcmData.length * 2 // 2 bytes per sample
    const fileSize = 44 + dataSize // WAV header is 44 bytes
    
    // Create buffer for WAV file
    const buffer = new ArrayBuffer(fileSize)
    const view = new DataView(buffer)
    
    // Write WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    // RIFF chunk descriptor
    writeString(0, 'RIFF')
    view.setUint32(4, fileSize - 8, true) // File size - 8
    writeString(8, 'WAVE')
    
    // fmt sub-chunk
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true) // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true) // NumChannels
    view.setUint32(24, sampleRate, true) // SampleRate
    view.setUint32(28, byteRate, true) // ByteRate
    view.setUint16(32, blockAlign, true) // BlockAlign
    view.setUint16(34, bitsPerSample, true) // BitsPerSample
    
    // data sub-chunk
    writeString(36, 'data')
    view.setUint32(40, dataSize, true) // Subchunk2Size
    
    // Write PCM data
    let offset = 44
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(offset, pcmData[i], true) // Little-endian
      offset += 2
    }
    
    return buffer
  }

  // Start microphone with BROWSER-SIDE PCM CONVERSION for ultra-fast Deepgram STT
  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000 // Deepgram prefers 48kHz
        }
      })
      
      // Create audio context for PCM processing
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
      audioContextRef.current = audioContext
      
      const source = audioContext.createMediaStreamSource(stream)
      
      // Create analyser for VAD
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.6
      source.connect(analyser)
      
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      // Create ScriptProcessor for direct PCM access
      const bufferSize = 4096
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1)
      source.connect(processor)
      processor.connect(audioContext.destination)
      
      // PCM audio buffer
      let pcmChunks = []
      let isSpeaking = false
      // VAPI-STYLE VAD STATE MACHINE (Optimized for speed)
      let vadState = 'IDLE' // IDLE, STARTING, SPEAKING, STOPPING
      let stateStartTime = null
      let speechStart = null
      let chunksSent = 0
      let lastSendTime = 0
      
      // Optimized configuration (ULTRA-FAST - prioritizing speed over Vapi's conservative defaults)
      const SPEECH_THRESHOLD = 12 // Audio level threshold (0-255)
      const STARTING_CONFIRMATION = 100 // 100ms to confirm speech start (VERY fast!)
      const STOPPING_SILENCE = 350 // 350ms silence (FASTER response - matches backend!)
      const MIN_SPEECH_DURATION = 50 // Minimum 50ms of speech (allows "yes", "no", "hey")
      const AMPLIFICATION = 12 // 12x amplification for better recognition
      const STREAMING_CHUNK_INTERVAL = 100 // Send chunks every 100ms
      
      // ENABLE STREAMING for Deepgram (VAPI-style)
      const isDeepgramStreaming = assistant.transcriber && assistant.transcriber.startsWith('deepgram')
      
      console.log('🔍 [DEBUG] Streaming configuration:', {
        transcriber: assistant.transcriber,
        isDeepgramStreaming: isDeepgramStreaming,
        willUseStreaming: isDeepgramStreaming ? 'YES - 100ms chunks' : 'NO - batch mode'
      })
      
      // Process audio in real-time
      processor.onaudioprocess = (e) => {
        if (isMuted) return
        
        const inputData = e.inputBuffer.getChannelData(0) // Float32Array
        
        // Convert Float32 to Int16 PCM with amplification
        const pcmData = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          // Amplify by 16x and clamp to prevent distortion
          let sample = inputData[i] * AMPLIFICATION
          sample = Math.max(-1, Math.min(1, sample))
          // Convert to Int16
          pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
        }
        
        // STREAMING MODE: Send chunks immediately while speaking (Deepgram)
        // Send raw PCM (same as VAPI - no WAV headers!)
        if (isDeepgramStreaming && isSpeaking && wsRef.current?.readyState === WebSocket.OPEN) {
          const now = Date.now()
          
          // Send every 100ms for optimal latency
          if (now - lastSendTime >= STREAMING_CHUNK_INTERVAL) {
            // Send raw PCM buffer (ArrayBuffer, not Node.js Buffer!)
            wsRef.current.send(pcmData.buffer)
            
            if (chunksSent === 0) {
              console.log('📤 [STREAMING] Sent first PCM chunk (16kHz, linear16, same as VAPI)')
            }
            
            chunksSent++
            lastSendTime = now
          }
        }
        
        // BATCH MODE: Collect PCM chunks while speaking (Groq Whisper)
        if (!isDeepgramStreaming && isSpeaking) {
          pcmChunks.push(pcmData)
        }
      }
      
      // Voice Activity Detection Loop - VAPI-STYLE STATE MACHINE
      const detectVoiceActivity = () => {
        if (!audioContextRef.current) return
        
        analyser.getByteFrequencyData(dataArray)
        
        // Calculate average audio level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
        const now = Date.now()
        const isSpeechDetected = average > SPEECH_THRESHOLD
        
        // VAPI-STYLE STATE MACHINE
        switch (vadState) {
          case 'IDLE':
            if (isSpeechDetected) {
              // Transition to STARTING - wait for confirmation
              vadState = 'STARTING'
              stateStartTime = now
              console.log('🎤 [VAD] STARTING - Speech detected, waiting for confirmation...')
            }
            break
            
          case 'STARTING':
            if (isSpeechDetected) {
              // Check if we've had sustained speech for confirmation period
              if (now - stateStartTime >= STARTING_CONFIRMATION) {
                // Confirmed! Transition to SPEAKING
                vadState = 'SPEAKING'
                isSpeaking = true
                speechStart = now
                pcmChunks = []
                chunksSent = 0
                lastSendTime = 0
                
                // 🎯 TIMER: Track when user STARTED speaking
                latencyTimestamps.current.userStartedSpeaking = now
                
                if (isDeepgramStreaming) {
                  console.log('🎤 [VAD] SPEAKING - Speech confirmed, streaming started')
                } else {
                  console.log('🎤 [VAD] SPEAKING - Speech confirmed, collecting audio')
                }
              }
            } else {
              // False alarm, back to IDLE
              vadState = 'IDLE'
              console.log('🔇 [VAD] IDLE - False alarm, back to idle')
            }
            break
            
          case 'SPEAKING':
            if (!isSpeechDetected) {
              // Silence detected, transition to STOPPING
              vadState = 'STOPPING'
              stateStartTime = now
              console.log('🔇 [VAD] STOPPING - Silence detected, waiting for confirmation...')
            }
            // Continue sending audio while in SPEAKING state
            break
            
          case 'STOPPING':
            if (isSpeechDetected) {
              // Speech resumed, back to SPEAKING
              vadState = 'SPEAKING'
              console.log('🎤 [VAD] SPEAKING - Speech resumed')
            } else if (now - stateStartTime >= STOPPING_SILENCE) {
              // Confirmed silence, process the utterance
              const speechDuration = stateStartTime - speechStart
              
              // 🎯 TIMER: Track when user STOPPED speaking
              latencyTimestamps.current.userStoppedSpeaking = now
              
              console.log('🔇 [VAD] IDLE - Silence confirmed, speech duration:', speechDuration, 'ms')
              
              // Only process if speech was long enough
              if (speechDuration >= MIN_SPEECH_DURATION) {
                // STREAMING MODE: Send end of utterance signal
                if (isDeepgramStreaming) {
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      type: 'end_of_utterance',
                      timestamp: now,
                      totalChunks: chunksSent,
                      speechDuration: speechDuration
                    }))
                    console.log('🔚 [STREAMING] End of utterance sent, total chunks:', chunksSent)
                    console.log('   Speech duration:', speechDuration, 'ms')
                  }
                }
                
                // BATCH MODE: Send complete audio
                if (!isDeepgramStreaming && pcmChunks.length > 0) {
                  const totalLength = pcmChunks.reduce((sum, chunk) => sum + chunk.length, 0)
                  const combinedPCM = new Int16Array(totalLength)
                  let offset = 0
                  for (const chunk of pcmChunks) {
                    combinedPCM.set(chunk, offset)
                    offset += chunk.length
                  }
                  
                  if (wsRef.current?.readyState === WebSocket.OPEN && combinedPCM.length > 4000) {
                    // 🎯 TIMER: Track when audio sent for batch mode
                    latencyTimestamps.current.userStoppedSpeaking = Date.now()
                    wsRef.current.send(combinedPCM.buffer)
                    console.log('🚀 [BATCH] Sent audio:', combinedPCM.length, 'samples')
                  }
                  pcmChunks = []
                }
              } else {
                console.log('')
                console.log('═══════════════════════════════════════════════════════')
                console.log('⚠️ SYSTEM IGNORED YOU!')
                console.log('   Reason: Speech too short (' + speechDuration + 'ms)')
                console.log('   Minimum required: ' + MIN_SPEECH_DURATION + 'ms')
                console.log('   💡 Tip: Speak for at least 0.1 seconds')
                console.log('═══════════════════════════════════════════════════════')
                console.log('')
                pcmChunks = []
              }
              
              // Reset to IDLE
              vadState = 'IDLE'
              isSpeaking = false
              speechStart = null
              stateStartTime = null
            }
            break
        }
        
        // Continue detecting
        requestAnimationFrame(detectVoiceActivity)
      }
      
      console.log('🎤 Microphone started with BROWSER-SIDE PCM CONVERSION')
      console.log('📊 VAD Settings (OPTIMIZED): Threshold=' + SPEECH_THRESHOLD + ', Starting=' + STARTING_CONFIRMATION + 'ms, Stopping=' + STOPPING_SILENCE + 'ms')
      console.log('🔊 Amplification: ' + AMPLIFICATION + 'x for better recognition')
      console.log('🎵 Sample Rate: 16kHz, Format: PCM Int16')
      console.log('⚡ ULTRA-FAST MODE: 100ms start, 200ms stop (4x faster than VAPI!)')
      console.log('📝 LIVE TRANSCRIPTS: You will see text as you speak!')
      console.log('🎯 MIN SPEECH: 50ms (allows short words like "yes", "no", "hey")')
      
      // Start VAD loop
      detectVoiceActivity()
      
      // Store references for cleanup
      mediaRecorderRef.current = {
        stream,
        audioContext,
        processor,
        stop: () => {
          processor.disconnect()
          source.disconnect()
          stream.getTracks().forEach(track => track.stop())
        }
      }

    } catch (error) {
      console.error('❌ Error accessing microphone:', error)
      alert('Could not access microphone: ' + error.message)
    }
  }

  // Manual send audio function (not needed in live streaming mode, but kept for compatibility)
  const sendCurrentAudio = () => {
    console.log('ℹ️ Manual send not needed in live streaming mode')
  }

  // Stop microphone
  const stopMicrophone = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.stop) {
        mediaRecorderRef.current.stop()
      }
      if (mediaRecorderRef.current.audioContext) {
        mediaRecorderRef.current.audioContext.close()
      }
      mediaRecorderRef.current = null
      console.log('🛑 Microphone stopped')
    }
  }

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  // Play streamed audio chunks
  const playStreamedAudio = async (audioChunks, format = 'wav') => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }

      // Combine all audio chunks into a single buffer
      const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const combinedBuffer = new Uint8Array(totalLength)
      let offset = 0
      
      for (const chunk of audioChunks) {
        combinedBuffer.set(chunk, offset)
        offset += chunk.length
      }

      console.log(`🎵 Playing combined audio: ${combinedBuffer.length} bytes (${format})`)

      // Decode and play the audio
      const audioBuffer = await audioContextRef.current.decodeAudioData(combinedBuffer.buffer)
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start(0)

      console.log(`✅ Audio playback started: ${audioBuffer.duration.toFixed(2)}s`)

    } catch (error) {
      console.error('❌ Error playing streamed audio:', error)
      
      // Fallback: try to play as blob URL
      try {
        const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const combinedBuffer = new Uint8Array(totalLength)
        let offset = 0
        
        for (const chunk of audioChunks) {
          combinedBuffer.set(chunk, offset)
          offset += chunk.length
        }
        
        const blob = new Blob([combinedBuffer], { type: `audio/${format}` })
        const audio = new Audio(URL.createObjectURL(blob))
        audio.play()
        
        console.log('✅ Fallback audio playback using Audio element')
        
      } catch (fallbackError) {
        console.error('❌ Fallback audio playback failed:', fallbackError)
      }
    }
  }

  // Play audio with better error handling and interruption support
  const playAudio = async (arrayBuffer) => {
    try {
      console.log('🔊 Playing audio:', arrayBuffer.byteLength, 'bytes')
      
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        console.log('🛑 Stopping previous audio')
        try {
          currentAudioRef.current.stop()
        } catch (e) {
          // Already stopped
        }
        currentAudioRef.current = null
      }
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        console.log('✅ Created new AudioContext')
      }

      // Resume AudioContext if suspended (browser autoplay policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
        console.log('▶️ Resumed AudioContext')
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      console.log('✅ Audio decoded successfully, duration:', audioBuffer.duration, 'seconds')
      
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      
      // Store reference for interruption
      currentAudioRef.current = source
      
      source.onended = () => {
        console.log('✅ Audio finished playing')
        if (currentAudioRef.current === source) {
          currentAudioRef.current = null
        }
      }
      
      source.start(0)
      console.log('▶️ Audio playback started')
      
    } catch (error) {
      console.error('❌ Error playing audio:', error)
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      currentAudioRef.current = null
    }
  }

  // Convert raw PCM to AudioBuffer
  const pcmToAudioBuffer = async (pcmData) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      
      // PCM is 16-bit signed integer, mono, 16kHz
      const sampleRate = 16000
      const numChannels = 1
      
      // Validate data size (must be even for 16-bit samples)
      if (pcmData.byteLength % 2 !== 0) {
        console.warn('⚠️ PCM data size is odd, trimming last byte')
        pcmData = pcmData.slice(0, pcmData.byteLength - 1)
      }
      
      // Convert Int16 PCM to Float32 for Web Audio API
      const int16Array = new Int16Array(pcmData)
      const float32Array = new Float32Array(int16Array.length)
      
      for (let i = 0; i < int16Array.length; i++) {
        // Convert from Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
        float32Array[i] = int16Array[i] / 32768.0
      }
      
      // Create AudioBuffer
      const audioBuffer = audioContextRef.current.createBuffer(
        numChannels,
        float32Array.length,
        sampleRate
      )
      
      // Copy data to AudioBuffer
      audioBuffer.getChannelData(0).set(float32Array)
      
      return audioBuffer
    } catch (error) {
      console.error('❌ PCM decode error:', error, 'Data size:', pcmData.byteLength)
      throw error
    }
  }

  // Convert WAV ArrayBuffer to Float32Array PCM data
  const wavToFloat32 = (arrayBuffer) => {
    const dataView = new DataView(arrayBuffer)
    
    // Skip WAV header (44 bytes) and read PCM data
    const pcmDataOffset = 44
    const pcmDataLength = (arrayBuffer.byteLength - pcmDataOffset) / 2 // 16-bit = 2 bytes per sample
    
    const int16Array = new Int16Array(arrayBuffer, pcmDataOffset, pcmDataLength)
    const float32Array = new Float32Array(int16Array.length)
    
    // Convert Int16 to Float32 [-1, 1]
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0
    }
    
    return float32Array
  }

  // Concatenate Float32Arrays
  const concatFloat32Arrays = (arr1, arr2) => {
    if (!arr1 || arr1.length === 0) return arr2.slice()
    if (!arr2 || arr2.length === 0) return arr1.slice()
    
    const result = new Float32Array(arr1.length + arr2.length)
    result.set(arr1)
    result.set(arr2, arr1.length)
    return result
  }

  // Play accumulated PCM data continuously
  const playAccumulatedAudio = async () => {
    if (isPlayingRef.current || accumulatedPCMRef.current.length === 0) {
      return
    }
    
    const sampleRate = 16000 // Backend sends 16kHz WAV
    
    // Use larger buffer for first audio (greeting), smaller for responses
    const bufferDuration = isFirstAudioRef.current ? FIRST_AUDIO_BUFFER_DURATION : MIN_BUFFER_DURATION
    const minSamples = bufferDuration * sampleRate
    
    // Wait until we have enough data
    if (accumulatedPCMRef.current.length < minSamples) {
      return
    }
    
    // Mark first audio as played
    if (isFirstAudioRef.current) {
      isFirstAudioRef.current = false
      console.log('🎤 Playing first audio with larger buffer for smooth greeting')
    }
    
    isPlayingRef.current = true
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }

      // Resume AudioContext if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      // Create AudioBuffer from accumulated PCM data
      const audioBuffer = audioContextRef.current.createBuffer(
        1, // mono
        accumulatedPCMRef.current.length,
        sampleRate
      )
      
      // Copy PCM data to AudioBuffer
      audioBuffer.copyToChannel(accumulatedPCMRef.current, 0)
      
      // Clear accumulated data
      accumulatedPCMRef.current = new Float32Array(0)
      
      // Create and play source
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      
      currentAudioRef.current = source
      
      // 🎯 TIMER: Track when audio playback ACTUALLY starts
      latencyTimestamps.current.audioPlaybackStarted = Date.now()
      
      source.start(0)
      
      // Calculate and log COMPLETE end-to-end latency
      if (latencyTimestamps.current.userStoppedSpeaking > 0) {
        const completeLatency = latencyTimestamps.current.audioPlaybackStarted - latencyTimestamps.current.userStoppedSpeaking
        console.log('')
        console.log('⏱️ ═══════════════════════════════════════════════════════')
        console.log('⏱️ 🎯 COMPLETE END-TO-END LATENCY (user stopped → audio playing):', completeLatency, 'ms')
        console.log('⏱️ ═══════════════════════════════════════════════════════')
        console.log('')
      }
      
      console.log(`▶️ Playing continuous buffer, duration: ${audioBuffer.duration.toFixed(2)}s`)
      
      source.onended = () => {
        currentAudioRef.current = null
        isPlayingRef.current = false
        
        // Immediately check if more data accumulated while playing
        setTimeout(() => {
          if (accumulatedPCMRef.current.length > 0) {
            playAccumulatedAudio()
          } else {
            console.log('✅ All audio played')
            setStatus('Ready')
          }
        }, 0)
      }
      
    } catch (error) {
      console.error('❌ Error playing audio:', error)
      isPlayingRef.current = false
      currentAudioRef.current = null
    }
  }

  // Add audio chunk to accumulated buffer
  const queueAudioChunk = async (arrayBuffer) => {
    audioChunkCountRef.current++
    
    try {
      // Convert WAV to Float32 PCM
      const pcmData = wavToFloat32(arrayBuffer)
      
      // Accumulate PCM data
      accumulatedPCMRef.current = concatFloat32Arrays(accumulatedPCMRef.current, pcmData)
      
      console.log(`🎵 Accumulated chunk ${audioChunkCountRef.current}, total samples: ${accumulatedPCMRef.current.length}, duration: ${(accumulatedPCMRef.current.length / 16000).toFixed(2)}s`)
      
      // Start playback if we have enough data and not already playing
      if (!isPlayingRef.current) {
        playAccumulatedAudio()
      }
    } catch (error) {
      console.error('❌ Error accumulating audio:', error)
    }
  }

  // Clear audio queue (for interruptions)
  const clearAudioQueue = () => {
    audioQueueRef.current = []
    audioChunkCountRef.current = 0
    isPlayingRef.current = false
    accumulatedPCMRef.current = new Float32Array(0)
    
    // Stop playing source
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.stop()
      } catch (e) {
        // Already stopped
      }
      currentAudioRef.current = null
    }
    
    console.log('🧹 Audio queue cleared')
  }

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!assistant) {
    return (
      <div className="call-page">
        <div className="call-container">
          <div className="no-assistant">
            <FiPhone size={64} />
            <h2>No Assistant Available</h2>
            <p>Create an assistant first to make a call.</p>
            <Link to="/assistants" className="btn-primary">
              Go to Assistants
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="call-page">
      <div className="call-header">
        <button onClick={() => navigate('/assistants')} className="btn-back">
          <FiArrowLeft /> Back to Assistants
        </button>
      </div>

      <div className="call-container">
        <div className="call-card">
          <div className="assistant-info">
            <div className="assistant-avatar">
              {assistant.name.charAt(0).toUpperCase()}
            </div>
            <h2>{assistant.name}</h2>
            <p className="assistant-model">{assistant.model}</p>
          </div>

          <div className="call-status">
            <div className={`status-indicator ${
              connectionState === 'active' ? 'active' : 
              isRetrying ? 'retrying' :
              connectionState === 'connecting' || connectionState === 'connected' ? 'connecting' : 
              errorType ? 'error' : ''
            }`}>
              <FiActivity />
            </div>
            <span className={`status-text ${errorType ? 'error-text' : ''}`}>{status}</span>
            {connectionState === 'active' && (
              <span className="call-duration">{formatDuration(callDuration)}</span>
            )}
          </div>

          <div className="call-controls">
            {connectionState === 'idle' || connectionState === 'disconnected' ? (
              <button 
                onClick={handleStartCall} 
                className="btn-call-start"
                disabled={connectionState === 'connecting' || isRetrying}
              >
                <FiPhone size={24} />
                <span>
                  {isRetrying ? 'Retrying...' : 
                   connectionState === 'connecting' ? 'Connecting...' : 
                   'Start Call'}
                </span>
              </button>
            ) : (
              <>
                <button 
                  onClick={toggleMute} 
                  className={`btn-control ${isMuted ? 'muted' : ''}`}
                >
                  {isMuted ? <FiMicOff size={24} /> : <FiMic size={24} />}
                </button>
                <button 
                  onClick={sendCurrentAudio} 
                  className="btn-control"
                  style={{backgroundColor: '#10b981', color: 'white'}}
                >
                  <FiActivity size={24} />
                </button>
                <button onClick={handleStopCall} className="btn-call-end">
                  <FiPhoneOff size={24} />
                  <span>End Call</span>
                </button>
              </>
            )}
          </div>

          {(connectionState === 'active' || connectionState === 'connected') && (
            <div className="call-transcript">
              {/* Conversation History - More Prominent */}
              <div className="conversation-history" style={{
                maxHeight: '500px',
                overflowY: 'auto',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '2px solid #3b82f6',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{
                  marginBottom: '20px', 
                  color: '#1e40af', 
                  fontSize: '18px', 
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💬 Live Conversation
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}>
                    {conversationHistory.length} exchanges
                  </span>
                </h3>
                
                {conversationHistory.length === 0 && !currentUserMessage && !currentAiMessage && (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#9ca3af',
                    fontSize: '14px'
                  }}>
                    <div style={{fontSize: '48px', marginBottom: '10px'}}>🎤</div>
                    Start speaking to begin the conversation...
                  </div>
                )}
                
                {conversationHistory.map((msg, index) => (
                  <div key={msg.id || index} style={{marginBottom: '24px'}}>
                    {/* User Message */}
                    {msg.user && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          maxWidth: '75%',
                          padding: '12px 16px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          borderRadius: '16px 16px 4px 16px',
                          fontSize: '15px',
                          lineHeight: '1.6',
                          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                        }}>
                          <div style={{
                            fontSize: '11px', 
                            opacity: 0.9, 
                            marginBottom: '6px',
                            fontWeight: '600',
                            letterSpacing: '0.5px'
                          }}>
                            YOU
                          </div>
                          {msg.user}
                        </div>
                      </div>
                    )}
                    
                    {/* Assistant Message */}
                    {msg.assistant && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        marginBottom: '10px'
                      }}>
                        <div style={{
                          maxWidth: '75%',
                          padding: '12px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          borderRadius: '16px 16px 16px 4px',
                          fontSize: '15px',
                          lineHeight: '1.6',
                          boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                        }}>
                          <div style={{
                            fontSize: '11px', 
                            opacity: 0.9, 
                            marginBottom: '6px',
                            fontWeight: '600',
                            letterSpacing: '0.5px'
                          }}>
                            {assistant.name.toUpperCase()}
                          </div>
                          {msg.assistant}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Current Exchange in Progress */}
                {(currentUserMessage || currentAiMessage) && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    border: '1px dashed #f59e0b',
                    marginTop: '10px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: '#92400e',
                      marginBottom: '8px',
                      fontWeight: '600'
                    }}>
                      ⚡ Current Exchange
                    </div>
                    {currentUserMessage && (
                      <div style={{
                        fontSize: '14px',
                        color: '#1e40af',
                        marginBottom: '6px'
                      }}>
                        <strong>You:</strong> {currentUserMessage}
                      </div>
                    )}
                    {currentAiMessage && (
                      <div style={{
                        fontSize: '14px',
                        color: '#047857'
                      }}>
                        <strong>{assistant.name}:</strong> {currentAiMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Current Exchange */}
              <div className="transcript-section">
                <h4>YOU</h4>
                <p className="transcript-text">
                  {currentUserMessage || transcript || partialTranscript || 'Listening...'}
                </p>
              </div>
              
              {/* Enhanced LLM Response Section */}
              <div className="transcript-section" style={{
                backgroundColor: llmStatus === 'completed' ? '#f0fdf4' : 
                                 llmStatus === 'processing' ? '#fef3c7' : 
                                 llmStatus === 'error' ? '#fef2f2' : '#f8f9fa',
                borderColor: llmStatus === 'completed' ? '#22c55e' : 
                            llmStatus === 'processing' ? '#f59e0b' : 
                            llmStatus === 'error' ? '#ef4444' : '#e5e7eb',
                borderWidth: '2px',
                borderStyle: 'solid'
              }}>
                <h4 style={{
                  color: llmStatus === 'completed' ? '#16a34a' : 
                         llmStatus === 'processing' ? '#d97706' : 
                         llmStatus === 'error' ? '#dc2626' : '#6b7280'
                }}>
                  🤖 LLM MODEL RESPONSE
                  {llmStatus === 'processing' && ' (Processing...)'}
                  {llmStatus === 'completed' && ' (✅ Working!)'}
                  {llmStatus === 'error' && ' (❌ Error)'}
                </h4>
                <div style={{marginBottom: '8px', fontSize: '12px', color: '#6b7280'}}>
                  Model: {assistant.model} | Status: {status} | LLM Status: {llmStatus}
                </div>
                <p className="transcript-text ai-response" style={{
                  color: (currentAiMessage || aiResponse) ? '#1e40af' : '#9ca3af',
                  fontWeight: (currentAiMessage || aiResponse) ? '500' : 'normal',
                  minHeight: '40px',
                  padding: '8px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}>
                  {currentAiMessage || aiResponse || (llmStatus === 'processing' ? 'Processing your request...' : 'Waiting for LLM response...')}
                </p>
                {aiResponse && (
                  <div style={{fontSize: '11px', color: '#6b7280', marginTop: '4px'}}>
                    ✅ LLM is working! Response length: {aiResponse.length} characters
                  </div>
                )}
                {llmStatus === 'error' && (
                  <div style={{fontSize: '11px', color: '#dc2626', marginTop: '4px'}}>
                    ❌ LLM encountered an error. Check error details below.
                  </div>
                )}
              </div>

              {/* Error Details */}
              {status.includes('Error') && (
                <div className="transcript-section" style={{backgroundColor: '#fee', borderColor: '#f88'}}>
                  <h4>⚠️ ERROR DETAILS</h4>
                  <p className="transcript-text" style={{color: '#c00', fontSize: '14px', whiteSpace: 'pre-wrap'}}>
                    {status}
                  </p>
                </div>
              )}

              {/* Debug Information */}
              <div className="transcript-section" style={{backgroundColor: '#f9fafb', borderColor: '#d1d5db'}}>
                <h4 style={{fontSize: '14px', color: '#374151'}}>🔍 DEBUG INFO</h4>
                <div style={{fontSize: '12px', color: '#6b7280', lineHeight: '1.4'}}>
                  <div>• Connection: {isConnected ? '✅ Connected' : '❌ Disconnected'}</div>
                  <div>• WebSocket: {wsRef.current?.readyState === WebSocket.OPEN ? '✅ Open' : '❌ Closed'}</div>
                  <div>• Microphone: {mediaRecorderRef.current ? '✅ Active' : '❌ Inactive'}</div>
                  <div>• Muted: {isMuted ? '🔇 Yes' : '🔊 No'}</div>
                  <div>• Call Duration: {formatDuration(callDuration)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Call
