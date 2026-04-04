import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FiPlus, FiEdit2, FiTrash2, FiPhone, FiUsers, FiCode } from 'react-icons/fi'
import config from '../config'
import './Assistants.css'
import ToolsTab from '../components/ToolsTab'

function Assistants() {
  const [assistants, setAssistants] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedAssistant, setSelectedAssistant] = useState(null)
  const [availableModels, setAvailableModels] = useState([])
  const [availableTranscribers, setAvailableTranscribers] = useState([])
  const [availableVoiceModels, setAvailableVoiceModels] = useState([])
  const [availableVoices, setAvailableVoices] = useState([])
  const [availableProviders, setAvailableProviders] = useState([])
  const [elevenLabsVoices, setElevenLabsVoices] = useState([])
  const [elevenLabsModels, setElevenLabsModels] = useState([])
  const [pricing, setPricing] = useState(null)
  const [costBreakdown, setCostBreakdown] = useState(null)
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [activeTab, setActiveTab] = useState('model')
  const [showJsonModal, setShowJsonModal] = useState(false)
  
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [previewAudio, setPreviewAudio] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    model: 'llama-3.1-8b-instant',
    transcriber: 'whisper-large-v3',
    voice: 'Cartesia Sonic'
  })
  const [configData, setConfigData] = useState({
    provider: 'Groq',
    model: 'llama-3.1-8b-instant',
    firstMessageMode: 'assistant-speaks-first',
    firstMessage: 'Hello.',
    systemPrompt: 'This is a blank template with minimal defaults, you can change the model, temperature, and messages.'
  })

  // Fetch available models, transcribers, and voices from backend
  useEffect(() => {
    fetchAvailableModels()
    fetchAvailableTranscribers()
    fetchAvailableVoices()
    fetchTTSProviders()
    fetchPricing()
  }, [])

  // Fetch ElevenLabs data when providers are loaded
  useEffect(() => {
    if (availableProviders.length > 0) {
      const elevenLabsProvider = availableProviders.find(p => p.id === 'elevenlabs')
      if (elevenLabsProvider && elevenLabsProvider.available) {
        fetchElevenLabsData()
      }
    }
  }, [availableProviders])

  // Handle 401 Unauthorized (token expired)
  const handle401Error = () => {
    console.log('🔒 Token expired - logging out...')
    localStorage.clear()
    alert('Your session has expired. Please log in again.')
    window.location.href = '/auth'
  }

  const fetchAvailableModels = async () => {
    try {
      setIsLoadingModels(true)
      console.log('🔄 Fetching LLM models from API...')
      const response = await fetch('/api/models')
      const data = await response.json()
      console.log('📊 LLM Models API response:', data)
      
      if (data.success) {
        // Store LLM models with pricing information - access the llm section
        const llmModels = data.models.llm || {}
        const modelsList = Object.entries(llmModels).map(([key, value]) => ({
          key,
          name: value.name || key,
          latency: value.latency,
          speed: value.speed, // Tokens per second
          pricing: value.pricing, // { input, output }
          description: value.description,
          contextWindow: value.contextWindow,
          ownedBy: value.ownedBy
        }))
        setAvailableModels(modelsList)
        console.log('✅ LLM Models loaded:', modelsList.length, 'models')
        console.log('📋 Available LLM models:', modelsList.map(m => `${m.name} (${m.speed} TPS, $${m.pricing?.input}/${m.pricing?.output})`))
      } else {
        console.error('❌ LLM Models API failed:', data.error)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('❌ Error fetching LLM models:', error)
      // Fallback to default LLM models if API fails
      const fallbackModels = [
        { 
          key: 'llama-3.1-70b-versatile', 
          name: 'Llama 3.3 70B Versatile', 
          latency: 145, 
          speed: 394,
          pricing: { input: 0.59, output: 0.79 },
          description: 'Latest Llama model - best for conversation'
        },
        { 
          key: 'llama-3.1-8b-instant', 
          name: 'Llama 3.1 8B Instant', 
          latency: 95, 
          speed: 840,
          pricing: { input: 0.05, output: 0.08 },
          description: 'Ultra-fast responses'
        },
        { 
          key: 'mixtral-8x7b-32768', 
          name: 'Mixtral 8x7b 32768', 
          latency: 120, 
          speed: 500,
          pricing: { input: 0.27, output: 0.27 },
          description: 'High-quality reasoning'
        },
        { 
          key: 'gpt-oss-120b-128k', 
          name: 'GPT OSS 120B 128k', 
          latency: 180, 
          speed: 500,
          pricing: { input: 0.15, output: 0.75 },
          description: 'Advanced reasoning and function calling'
        },
        { 
          key: 'gpt-oss-20b-128k', 
          name: 'GPT OSS 20B 128k', 
          latency: 110, 
          speed: 1000,
          pricing: { input: 0.10, output: 0.50 },
          description: 'Fast reasoning and function calling'
        }
      ]
      setAvailableModels(fallbackModels)
      console.log('⚠️ Using fallback LLM models:', fallbackModels.length)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const fetchAvailableTranscribers = async () => {
    try {
      console.log('🔄 Fetching transcribers from API...')
      const response = await fetch('/api/transcribers')
      const data = await response.json()
      console.log('🎙️ Transcribers API response:', data)
      
      if (data.success) {
        // Access the stt section from the models response
        const sttModels = data.models?.stt || {}
        const transcribersList = Object.entries(sttModels).map(([key, value]) => ({
          key,
          name: value.name || key,
          speedFactor: value.speedFactor,
          pricePerHour: value.pricing?.inputPerHour,
          pricePerMinute: value.pricing?.inputPerMinute,
          latency: value.latency,
          description: value.description
        }))
        setAvailableTranscribers(transcribersList)
        console.log('✅ Transcribers loaded:', transcribersList.length, 'models')
        console.log('📋 Available transcribers:', transcribersList.map(t => `${t.name} (${t.latency}ms)`))
      } else {
        console.error('❌ Transcribers API failed:', data.error)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('❌ Error fetching transcribers:', error)
      // Fallback with both Groq Whisper and Deepgram options
      const fallbackTranscribers = [
        // Groq Whisper (FREE)
        { key: 'whisper-large-v3', name: 'Whisper V3 Large (FREE)', speedFactor: '217x', pricePerHour: 0, pricePerMinute: 0, latency: 1500, description: 'High accuracy, FREE forever' },
        { key: 'whisper-large-v3-turbo', name: 'Whisper Large v3 Turbo (FREE)', speedFactor: '228x', pricePerHour: 0, pricePerMinute: 0, latency: 1000, description: 'Fast processing, FREE forever' },
        // Deepgram (ULTRA-FAST, $200 free credits)
        { key: 'deepgram-nova-2', name: 'Deepgram Nova-2 (ULTRA-FAST)', speedFactor: 'Real-time', pricePerHour: 0.258, pricePerMinute: 0.0043, latency: 400, description: '3x faster than Whisper, $200 free credits' },
        { key: 'deepgram-nova-2-general', name: 'Deepgram Nova-2 General', speedFactor: 'Real-time', pricePerHour: 0.258, pricePerMinute: 0.0043, latency: 400, description: 'General purpose, ultra-fast' },
        { key: 'deepgram-nova-2-phonecall', name: 'Deepgram Nova-2 Phone Call', speedFactor: 'Real-time', pricePerHour: 0.258, pricePerMinute: 0.0043, latency: 400, description: 'Optimized for phone calls' }
      ]
      setAvailableTranscribers(fallbackTranscribers)
      console.log('⚠️ Using fallback transcribers:', fallbackTranscribers.length)
    }
  }

  const fetchPricing = async () => {
    try {
      console.log('🔄 Fetching pricing from API...')
      const response = await fetch('/api/pricing')
      const data = await response.json()
      console.log('💰 Pricing API response:', data)
      
      if (data.success) {
        setPricing(data.pricing)
        console.log('✅ Pricing loaded successfully')
      } else {
        console.error('❌ Pricing API failed:', data.error)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('❌ Error fetching pricing:', error)
      console.log('⚠️ Pricing will be calculated per-request')
    }
  }

  const fetchAvailableVoices = async () => {
    try {
      console.log('🔄 Fetching voices from API...')
      const response = await fetch('/api/voices')
      const data = await response.json()
      console.log('🎤 Voices API response:', data)
      
      if (data.success) {
        // Store voice models - access the models section
        const voiceModels = data.models || {}
        const voiceModelsList = Object.entries(voiceModels).map(([key, value]) => ({
          key,
          name: value.name || key,
          latency: value.latency,
          description: value.description
        }))
        setAvailableVoiceModels(voiceModelsList)
        console.log('✅ Voice models loaded:', voiceModelsList.length, 'models')
        
        // Store voices
        const voicesList = Object.entries(data.voices).map(([key, value]) => ({
          key,
          id: value.id,
          name: value.name,
          language: value.language,
          gender: value.gender,
          accent: value.accent,
          description: value.description
        }))
        setAvailableVoices(voicesList)
        console.log('✅ Voices loaded:', voicesList.length, 'voices')
        console.log('🎵 Sample voices:', voicesList.slice(0, 5).map(v => `${v.name} (${v.gender}, ${v.accent})`))
      } else {
        console.error('❌ Voices API failed:', data.error)
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('❌ Error fetching voices:', error)
      // Fallback
      const fallbackVoiceModels = [
        { key: 'sonic-2024-10', name: 'Sonic 2.0', latency: 95, description: 'Latest Sonic model with improved quality and speed' },
        { key: 'sonic-turbo', name: 'Sonic Turbo', latency: 110, description: 'High-speed synthesis with balanced quality' },
        { key: 'sonic', name: 'Sonic', latency: 135, description: 'Original Sonic model - reliable and fast' },
        { key: 'sonic-english', name: 'Sonic English', latency: 125, description: 'English-only, optimized for clarity' }
      ]
      setAvailableVoiceModels(fallbackVoiceModels)
      setAvailableVoices([
        { key: 'a0e99841-438c-4a64-b679-ae501e7d6091', id: 'a0e99841-438c-4a64-b679-ae501e7d6091', name: 'British Lady', language: 'en', gender: 'female', accent: 'british' }
      ])
      console.log('⚠️ Using fallback voices:', fallbackVoiceModels.length, 'models')
    }
  }

  const fetchTTSProviders = async () => {
    try {
      console.log('🔄 Fetching TTS providers...')
      const response = await fetch('/api/tts/providers')
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ TTS providers endpoint returned non-JSON response (likely HTML)')
        throw new Error('Invalid response format')
      }
      
      const data = await response.json()
      
      if (data.providers && data.providers.length > 0) {
        setAvailableProviders(data.providers)
        console.log('✅ TTS providers loaded:', data.providers)
        
        // Fetch ElevenLabs data if available
        const elevenLabsProvider = data.providers.find(p => p.id === 'elevenlabs')
        if (elevenLabsProvider && elevenLabsProvider.available) {
          await fetchElevenLabsData()
        }
      } else {
        console.warn('⚠️ No providers returned from API, using fallback')
        // Fallback to both providers
        setAvailableProviders([
          { id: 'cartesia', name: 'Cartesia', available: true },
          { id: 'elevenlabs', name: 'ElevenLabs', available: true }
        ])
      }
    } catch (error) {
      console.error('❌ Error fetching TTS providers:', error)
      console.log('📋 Using fallback providers (both Cartesia and ElevenLabs)')
      // Fallback to both providers
      setAvailableProviders([
        { id: 'cartesia', name: 'Cartesia', available: true },
        { id: 'elevenlabs', name: 'ElevenLabs', available: true }
      ])
    }
  }

  // Validate ElevenLabs voice ID format
  const validateVoiceId = (voiceId) => {
    if (!voiceId) return false;
    // ElevenLabs voice IDs are typically 20-30 characters long and alphanumeric
    const voiceIdRegex = /^[a-zA-Z0-9]{20,30}$/;
    return voiceIdRegex.test(voiceId);
  }

  const fetchElevenLabsData = async () => {
    try {
      // Fetch voices and models in parallel
      const [voicesResponse, modelsResponse] = await Promise.all([
        fetch('/api/tts/elevenlabs/voices'),
        fetch('/api/tts/elevenlabs/models')
      ])
      
      const voicesData = await voicesResponse.json()
      const modelsData = await modelsResponse.json()
      
      if (voicesData.voices) {
        setElevenLabsVoices(voicesData.voices)
        console.log('✅ ElevenLabs voices loaded:', voicesData.voices.length)
      } else {
        console.warn('⚠️ No voices returned, using fallback')
        setElevenLabsVoices([
          { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade' },
          { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade' },
          { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', category: 'premade' }
        ])
      }
      
      if (modelsData.models) {
        setElevenLabsModels(modelsData.models)
        console.log('✅ ElevenLabs models loaded:', modelsData.models.length)
      } else {
        console.warn('⚠️ No models returned, using fallback')
        setElevenLabsModels([
          { model_id: 'eleven_monolingual_v1', name: 'Eleven Monolingual v1', description: 'English only, fast and reliable' },
          { model_id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', description: 'Supports multiple languages' },
          { model_id: 'eleven_turbo_v2', name: 'Eleven Turbo v2', description: 'Fastest model with good quality' }
        ])
      }
    } catch (error) {
      console.error('❌ Error fetching ElevenLabs data:', error)
      // Set fallback data
      console.log('📋 Using fallback ElevenLabs data')
      setElevenLabsVoices([
        { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade' },
        { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade' },
        { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', category: 'premade' }
      ])
      setElevenLabsModels([
        { model_id: 'eleven_monolingual_v1', name: 'Eleven Monolingual v1', description: 'English only, fast and reliable' },
        { model_id: 'eleven_multilingual_v2', name: 'Eleven Multilingual v2', description: 'Supports multiple languages' },
        { model_id: 'eleven_turbo_v2', name: 'Eleven Turbo v2', description: 'Fastest model with good quality' }
      ])
    }
  }

  const calculateCost = useCallback(async (assistant) => {
    if (!assistant) return
    try {
      console.log('🔄 Calculating cost for assistant:', assistant)
      
      // Map assistant fields to pricing service expected format
      const costRequest = {
        model: assistant.model || 'llama-3.1-8b-instant',
        transcriber: assistant.transcriber || 'whisper-large-v3',
        voiceModel: assistant.voiceModel || 'sonic-english'
      }
      
      console.log('💰 Cost request payload:', costRequest)
      
      const response = await fetch('/api/calculate-cost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(costRequest)
      })
      
      const data = await response.json()
      console.log('💰 Cost calculation response:', data)
      
      if (data.success && data.costs) {
        setCostBreakdown(data.costs)
        console.log('✅ Cost breakdown set:', data.costs)
        console.log('📊 Breakdown details:')
        console.log('   LLM:', data.costs.breakdown?.llm?.display)
        console.log('   STT:', data.costs.breakdown?.stt?.display)
        console.log('   TTS:', data.costs.breakdown?.tts?.display)
        console.log('   Total:', data.costs.total?.display)
      } else {
        console.error('❌ Cost calculation failed:', data.error)
        setCostBreakdown(null)
      }
    } catch (error) {
      console.error('❌ Error calculating cost:', error)
      setCostBreakdown(null)
    }
  }, [])

  // Fetch assistants from MongoDB on component mount
  useEffect(() => {
    fetchAssistantsFromDB()
  }, [])

  const fetchAssistantsFromDB = async () => {
    try {
      console.log('🔄 Fetching assistants from MongoDB...')
      const token = localStorage.getItem('token')
      const response = await fetch('/api/assistants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      // Handle 401 Unauthorized (token expired)
      if (response.status === 401) {
        handle401Error()
        return
      }
      
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Assistants loaded from MongoDB:', data.assistants.length)
        
        if (data.assistants.length > 0) {
          setAssistants(data.assistants)
          setSelectedAssistant(data.assistants[0])
          
        } else {
          console.log('📝 No assistants found in MongoDB, creating default...')
          // Create a default assistant if none exist
          await createDefaultAssistant()
        }
      } else {
        console.error('❌ Failed to fetch assistants:', data.error)
      }
    } catch (error) {
      console.error('❌ Error fetching assistants from MongoDB:', error)
    }
  }

  const createDefaultAssistant = async () => {
    try {
      const defaultAssistant = {
        name: 'My First Assistant',
        model: 'llama-3.1-8b-instant',
        transcriber: 'whisper-large-v3-turbo',
        voiceProvider: 'cartesia',
        voiceModel: 'sonic-2024-10',
        voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
        elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
        elevenLabsModel: 'eleven_monolingual_v1',
        elevenLabsSettings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true
        },
        useCustomVoiceId: false,
        customVoiceId: '',
        voice: 'Cartesia Sonic',
        status: 'active',
        firstMessageMode: 'assistant-speaks-first',
        firstMessage: 'Hello! How can I help you today?',
        systemPrompt: 'You are a helpful voice assistant. Be friendly and professional.'
      }

      const token = localStorage.getItem('token')
      const response = await fetch('/api/assistants', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(defaultAssistant)
      })

      // Handle 401 Unauthorized
      if (response.status === 401) {
        handle401Error()
        return
      }

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Default assistant created:', data.assistant)
        setAssistants([data.assistant])
        setSelectedAssistant(data.assistant)
      }
    } catch (error) {
      console.error('❌ Error creating default assistant:', error)
    }
  }

  // Calculate cost when assistant is first selected or when model/transcriber changes
  useEffect(() => {
    if (selectedAssistant && pricing) {
      calculateCost(selectedAssistant)
    }
  }, [selectedAssistant?.id, selectedAssistant?.model, selectedAssistant?.transcriber, pricing, calculateCost])

  // Filter assistant config to show only actively used settings
  const getFilteredConfig = (assistant) => {
    if (!assistant) return {}
    
    const baseConfig = {
      _id: assistant._id,
      name: assistant.name,
      status: assistant.status,
      model: assistant.model,
      transcriber: assistant.transcriber,
      voiceProvider: assistant.voiceProvider,
      voiceModel: assistant.voiceModel,
      firstMessageMode: assistant.firstMessageMode,
      firstMessage: assistant.firstMessage,
      systemPrompt: assistant.systemPrompt,
      userId: assistant.userId,
      createdAt: assistant.createdAt,
      updatedAt: assistant.updatedAt
    }
    
    // Add voice-specific settings based on provider
    if (assistant.voiceProvider === 'cartesia') {
      baseConfig.voiceId = assistant.voiceId
    } else if (assistant.voiceProvider === 'elevenlabs') {
      baseConfig.elevenLabsVoiceId = assistant.elevenLabsVoiceId
      baseConfig.elevenLabsModel = assistant.elevenLabsModel
      if (assistant.elevenLabsSettings) {
        baseConfig.elevenLabsSettings = assistant.elevenLabsSettings
      }
    }
    
    // Add transfer settings if configured
    if (assistant.transferSettings && assistant.transferSettings.phoneNumber) {
      baseConfig.transferSettings = assistant.transferSettings
    }
    
    // Add tools if any
    if (assistant.tools && assistant.tools.length > 0) {
      baseConfig.tools = assistant.tools
    }
    
    return baseConfig
  }

  const handleCreateAssistant = () => {
    setShowModal(true)
  }

  const handleSubmitAssistant = async (newAssistant) => {
    try {
      const assistant = {
        name: newAssistant.name,
        model: newAssistant.model,
        transcriber: 'whisper-large-v3-turbo',
        voiceProvider: 'cartesia',
        voiceModel: 'sonic-2024-10',
        voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
        elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
        elevenLabsModel: 'eleven_monolingual_v1',
        elevenLabsSettings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true
        },
        useCustomVoiceId: false,
        customVoiceId: '',
        voice: newAssistant.voice,
        status: 'active',
        firstMessageMode: 'assistant-speaks-first',
        firstMessage: 'Hello! How can I help you today?',
        systemPrompt: 'You are a helpful voice assistant. Be friendly and professional.'
      }

      console.log('🔄 Creating assistant in MongoDB...')
      const token = localStorage.getItem('token')
      const response = await fetch('/api/assistants', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assistant)
      })

      // Handle 401 Unauthorized
      if (response.status === 401) {
        handle401Error()
        return
      }

      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Assistant created in MongoDB:', data.assistant)
        // Re-fetch all assistants from MongoDB to ensure sync
        await fetchAssistantsFromDB()
        setShowModal(false)
      } else {
        console.error('❌ Failed to create assistant:', data.error)
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('❌ Error creating assistant:', error)
      alert(`Error: ${error.message}`)
    }
  }

  const handleDeleteAssistant = async (id) => {
    if (window.confirm('Are you sure you want to delete this assistant?')) {
      try {
        console.log('🔄 Deleting assistant from MongoDB...')
        const token = localStorage.getItem('token')
        const response = await fetch(config.getApiUrl(`/api/assistants/${id}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        // Handle 401 Unauthorized
        if (response.status === 401) {
          handle401Error()
          return
        }

        const data = await response.json()
        
        if (data.success) {
          console.log('✅ Assistant deleted from MongoDB:', id)
          // Re-fetch all assistants from MongoDB to ensure sync
          await fetchAssistantsFromDB()
        } else {
          console.error('❌ Failed to delete assistant:', data.error)
          alert(`Error: ${data.error}`)
        }
      } catch (error) {
        console.error('❌ Error deleting assistant:', error)
        alert(`Error: ${error.message}`)
      }
    }
  }

  const handleSelectAssistant = (assistant) => {
    setSelectedAssistant(assistant)
    // Cost will be calculated automatically by useEffect
  }

  const handleConfigChange = async (field, value) => {
    if (selectedAssistant) {
      const updatedAssistant = { ...selectedAssistant, [field]: value }
      setSelectedAssistant(updatedAssistant)
      
      // Update in the assistants list immediately for UI responsiveness
      const updatedAssistants = assistants.map(a => a.id === selectedAssistant.id ? updatedAssistant : a)
      setAssistants(updatedAssistants)
      
      console.log('💾 Assistant config updated locally:', field, value)
      
      // Debounce MongoDB save (save after 1 second of no changes)
      if (window.saveTimeout) clearTimeout(window.saveTimeout)
      window.saveTimeout = setTimeout(async () => {
        try {
          console.log('🔄 Saving assistant to MongoDB...')
          const token = localStorage.getItem('token')
          const response = await fetch(config.getApiUrl(`/api/assistants/${selectedAssistant.id}`), {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updatedAssistant)
          })

          // Handle 401 Unauthorized
          if (response.status === 401) {
            handle401Error()
            return
          }

          const data = await response.json()
          
          if (data.success) {
            console.log('✅ Assistant saved to MongoDB:', field)
            // Re-fetch all assistants from MongoDB to ensure sync
            await fetchAssistantsFromDB()
          } else {
            console.error('❌ Failed to save assistant:', data.error)
            alert(`❌ Failed to save: ${data.error}`)
          }
        } catch (error) {
          console.error('❌ Error saving assistant to MongoDB:', error)
          alert(`❌ Error saving: ${error.message}`)
        }
      }, 1000) // Save after 1 second of no changes
    }
  }

  // Voice preview functionality
  const handleVoicePreview = async (previewText) => {
    if (!selectedAssistant || isPreviewPlaying) return
    
    try {
      setIsPreviewPlaying(true)
      console.log('🔊 Previewing voice with current settings...')
      
      // Stop any currently playing audio
      if (previewAudio) {
        previewAudio.pause()
        previewAudio.currentTime = 0
      }
      
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: previewText || "Hello! This is how I will sound with the current voice settings.",
          assistantId: selectedAssistant.id,
          voiceProvider: selectedAssistant.voiceProvider || 'cartesia',
          voiceId: selectedAssistant.voiceId,
          modelId: selectedAssistant.voiceModel,
          voiceSettings: {
            language: selectedAssistant.voiceLanguage || 'en',
            dialect: selectedAssistant.voiceDialect || 'us',
            speed: selectedAssistant.voiceSpeed || 1.0,
            emotion: selectedAssistant.voiceEmotion || 'neutral',
            volume: selectedAssistant.voiceVolume || 1.0,
            pitch: selectedAssistant.voicePitch || 1.0
          }
        })
      })
      
      if (!response.ok) {
        throw new Error(`Preview failed: ${response.statusText}`)
      }
      
      // Convert response to audio blob
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Create and play audio
      const audio = new Audio(audioUrl)
      setPreviewAudio(audio)
      
      audio.onended = () => {
        setIsPreviewPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
      
      audio.onerror = () => {
        setIsPreviewPlaying(false)
        URL.revokeObjectURL(audioUrl)
        console.error('❌ Audio playback error')
      }
      
      await audio.play()
      console.log('✅ Voice preview playing')
      
    } catch (error) {
      console.error('❌ Voice preview error:', error)
      setIsPreviewPlaying(false)
      alert('Failed to preview voice. Please check your settings and try again.')
    }
  }

  const handlePublish = async () => {
    if (selectedAssistant) {
      try {
        // Save all settings
        const updatedAssistant = {
          ...selectedAssistant,
          status: 'active',
          lastSaved: new Date().toISOString()
        }
        
        console.log('🔄 Publishing assistant to MongoDB...', updatedAssistant)
        
        // Send to backend API
        const token = localStorage.getItem('token')
        const response = await fetch(config.getApiUrl(`/api/assistants/${selectedAssistant.id}`), {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updatedAssistant)
        })
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
          handle401Error()
          return
        }
        
        const data = await response.json()
        
        if (data.success) {
          console.log('✅ Assistant published:', updatedAssistant)
          // Re-fetch all assistants from MongoDB to ensure sync
          await fetchAssistantsFromDB()
          // Show success message
          alert(`✅ Assistant "${selectedAssistant.name}" has been published and all settings saved!`)
        } else {
          throw new Error(data.error || 'Failed to publish assistant')
        }
      } catch (error) {
        console.error('❌ Error publishing assistant:', error)
        alert(`❌ Error: ${error.message}`)
      }
    }
  }

  // Helper function to format assistant config for display (SANITIZED)
  const formatAssistantConfig = (assistant) => {
    if (!assistant) return {}
    
    return {
      id: "asst_xxxxxxxxxx", // Sanitized ID
      name: assistant.name || "Your Assistant Name",
      model: {
        provider: "groq",
        model: assistant.model || "llama-3.1-8b-instant",
        temperature: 0.7,
        maxTokens: 1000
      },
      voice: {
        provider: assistant.voiceProvider || "cartesia",
        voiceId: "voice_xxxxxxxxxx", // Sanitized voice ID
        model: assistant.voiceModel || "sonic-english",
        language: assistant.voiceLanguage || "en",
        dialect: assistant.voiceDialect || "us",
        speed: assistant.voiceSpeed || 1.0,
        volume: assistant.voiceVolume || 1.0,
        pitch: assistant.voicePitch || 1.0,
        emotion: assistant.voiceEmotion || "neutral"
      },
      transcriber: {
        provider: "groq",
        model: assistant.transcriber || "whisper-large-v3",
        language: "en"
      },
      firstMessage: "Hello! How can I help you today?", // Generic message
      systemMessage: "You are a helpful AI assistant.", // Generic prompt
      recordingEnabled: true,
      endCallMessage: "Thank you for calling. Have a great day!",
      endCallPhrases: ["goodbye", "bye", "see you later"],
      backgroundSound: "office",
      backchannelingEnabled: true,
      backgroundDenoisingEnabled: true,
      modelOutputInMessagesEnabled: true,
      transportConfigurations: [
        {
          provider: "twilio",
          timeout: 60,
          record: true
        }
      ],
      // Timestamps removed for security
      note: "This is a sanitized configuration template. Replace with your actual values."
    }
  }

  // Helper function to copy assistant config to clipboard
  const copyAssistantConfig = async () => {
    if (!selectedAssistant) return
    
    try {
      const config = formatAssistantConfig(selectedAssistant)
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2))
      alert('✅ Assistant configuration copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      alert('❌ Failed to copy to clipboard')
    }
  }

  return (
    <div className="assistants">
      <div className="assistants-layout">
        {/* Left Sidebar - List View */}
        <div className="assistants-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-tabs">
              <button className="tab-btn active">
                <FiUsers /> Assistants
              </button>
              <button className="tab-btn">
                <FiPhone /> Docs
              </button>
            </div>
            <button onClick={handleCreateAssistant} className="btn-create-small">
              <FiPlus /> Create Assistant
            </button>
          </div>
          
          <div className="sidebar-search">
            <input 
              type="text" 
              placeholder="Search Assistants" 
              className="search-input"
            />
          </div>

          <div className="assistants-list">
            {assistants.map((assistant) => (
              <div 
                key={assistant.id} 
                className={`assistant-list-item ${selectedAssistant?.id === assistant.id ? 'selected' : ''}`}
                onClick={() => handleSelectAssistant(assistant)}
              >
                <div className="list-item-avatar">
                  {assistant.name.charAt(0)}
                </div>
                <div className="list-item-info">
                  <h4>{assistant.name}</h4>
                  <span className={`status-dot ${assistant.status}`}></span>
                </div>
              </div>
            ))}
          </div>
        </div>

         {/* Right Content - Configuration Panel */}
         <div className="assistants-content">
           {selectedAssistant ? (
             <>
               {/* Header */}
               <div className="config-header">
                 <h1>{selectedAssistant.name}</h1>
                 <span className="assistant-id">{selectedAssistant.id.substring(0, 24)}...</span>
                 <div className="header-actions">
                  <button 
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/models/refresh', { method: 'POST' });
                        const data = await response.json();
                        if (data.success) {
                          await fetchAvailableModels();
                          alert(`✅ Refreshed ${Object.keys(data.models).length} LLM models from Groq API`);
                        } else {
                          alert(`❌ Error: ${data.error}`);
                        }
                      } catch (error) {
                        alert(`❌ Error refreshing models: ${error.message}`);
                      }
                    }}
                  >
                    🔄 Refresh Models
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowJsonModal(true)}
                    title="View JSON Configuration"
                  >
                    Code
                  </button>
                  <button className="btn-secondary">Test</button>
                  <button className="btn-secondary">Chat</button>
                  <Link to={`/call/${selectedAssistant.id}`} className="btn-primary">
                    <FiPhone size={16} />
                    Make Call
                  </Link>
                  <button
                     className={`btn-success ${selectedAssistant.status === 'active' ? '' : 'btn-inactive'}`}
                     onClick={handlePublish}
                   >
                     {selectedAssistant.status === 'active' ? 'Published' : 'Publish'}
                   </button>
                 </div>
               </div>

          {/* Tabs */}
          <div className="config-tabs">
            <button 
              className={`tab-btn ${activeTab === 'model' ? 'active' : ''}`}
              onClick={() => setActiveTab('model')}
            >
              Model
            </button>
            <button 
              className={`tab-btn ${activeTab === 'transcriber' ? 'active' : ''}`}
              onClick={() => setActiveTab('transcriber')}
            >
              Transcriber
            </button>
            <button 
              className={`tab-btn ${activeTab === 'voice' ? 'active' : ''}`}
              onClick={() => setActiveTab('voice')}
            >
              Voice
            </button>
            <button 
              className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveTab('tools')}
            >
              Tools
            </button>
            <button className="tab-btn">Analysis</button>
            <button className="tab-btn">Advanced</button>
            <button className="tab-btn">Compliance</button>
            <button className="tab-btn">Widget</button>
            <button 
              className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
              onClick={() => setActiveTab('code')}
            >
              Code
            </button>
          </div>

           {/* Cost and Latency */}
           <div className="metrics-bar">
             <div className="metric-item">
              <span className="metric-label">Cost Breakdown (per minute)</span>
              <div className="cost-breakdown-details">
                {costBreakdown ? (
                  <>
                    <div className="cost-item">
                      <span className="cost-label">LLM Cost:</span>
                      <span className="cost-value">{costBreakdown.breakdown?.llm?.display || '$0.0000/₹0.00'}</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">STT Cost:</span>
                      <span className="cost-value">{costBreakdown.breakdown?.stt?.display || '$0.0000/₹0.00'}</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">TTS Cost:</span>
                      <span className="cost-value">{costBreakdown.breakdown?.tts?.display || '$0.0000/₹0.00'}</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">Platform Fee:</span>
                      <span className="cost-value">{costBreakdown.breakdown?.platformFee?.display || '$0.012/₹1.00'}</span>
                    </div>
                    <div className="cost-item total">
                      <span className="cost-label">Total Cost:</span>
                      <span className="cost-value">{costBreakdown.total?.display || '$0.0000/₹0.00'}</span>
                    </div>
                  </>
                ) : (
                  <span className="loading-text">Calculating...</span>
                )}
              </div>
             </div>
            <div className="metric-item">
              <span className="metric-label">Latency (WebSocket Streaming)</span>
              <div className="cost-breakdown-details">
                {costBreakdown && costBreakdown.latency ? (
                  <>
                    <div className="cost-item">
                      <span className="cost-label">STT Latency:</span>
                      <span className="cost-value">{costBreakdown.latency.stt}ms</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">LLM Latency:</span>
                      <span className="cost-value">{costBreakdown.latency.llm}ms</span>
                    </div>
                    <div className="cost-item">
                      <span className="cost-label">WebSocket:</span>
                      <span className="cost-value">{costBreakdown.latency.websocket}ms</span>
                    </div>
                    <div className="cost-item total">
                      <span className="cost-label">Total Latency:</span>
                      <span className="cost-value">{costBreakdown.latency.total}ms</span>
                    </div>
                  </>
                ) : (
                  <span className="loading-text">Calculating...</span>
                )}
              </div>
            </div>
           </div>

           {/* Configuration Form */}
           <div className="config-section">
             {activeTab === 'model' ? (
               <>
                 <h2 className="section-title">MODEL</h2>
                 <p className="section-subtitle">Configure the behavior of the assistant.</p>

                 {/* Model - Groq Only */}
                 <div className="form-group">
                   <label>LLM Model (Groq) <span className="label-info">ⓘ</span></label>
                  <select 
                    value={selectedAssistant.model}
                    onChange={(e) => {
                      handleConfigChange('model', e.target.value)
                      // Cost will be recalculated automatically by useEffect
                    }}
                    disabled={isLoadingModels}
                  >
                     {isLoadingModels ? (
                       <option>Loading LLM models...</option>
                     ) : availableModels.length > 0 ? (
                       availableModels.map(model => (
                         <option key={model.key} value={model.key}>
                           {model.name} - {model.speed} TPS - ${model.pricing?.inputPerMinute}/${model.pricing?.outputPerMinute} per min
                         </option>
                       ))
                     ) : (
                       <>
                         <option value="llama-3.1-70b-versatile">Llama 3.3 70B Versatile - 394 TPS - $0.59/$0.79 per 1M tokens</option>
                         <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant - 840 TPS - $0.05/$0.08 per 1M tokens</option>
                         <option value="mixtral-8x7b-32768">Mixtral 8x7b 32768 - 500 TPS - $0.27/$0.27 per 1M tokens</option>
                         <option value="gpt-oss-120b-128k">GPT OSS 120B 128k - 500 TPS - $0.15/$0.75 per 1M tokens</option>
                         <option value="gpt-oss-20b-128k">GPT OSS 20B 128k - 1000 TPS - $0.10/$0.50 per 1M tokens</option>
                       </>
                     )}
                  </select>
                </div>

                {/* Model Details with Pricing */}
                {selectedAssistant.model && availableModels.find(m => m.key === selectedAssistant.model) && (
                  <div className="transcriber-details">
                    {availableModels.filter(m => m.key === selectedAssistant.model).map(model => (
                      <div key={model.key} className="detail-card">
                        <div className="detail-row">
                          <span className="detail-label">Model:</span>
                          <span className="detail-value">{model.name}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Speed:</span>
                          <span className="detail-value">{model.speed} TPS</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Context Window:</span>
                          <span className="detail-value">{model.contextWindow?.toLocaleString()} tokens</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Input Price:</span>
                          <span className="detail-value">${model.pricing?.inputPerMinute}/min (${model.pricing?.input}/1M tokens)</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Output Price:</span>
                          <span className="detail-value">${model.pricing?.outputPerMinute}/min (${model.pricing?.output}/1M tokens)</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Provider:</span>
                          <span className="detail-value">{model.ownedBy || 'Groq'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Description:</span>
                          <span className="detail-value">{model.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : activeTab === 'transcriber' ? (
               <>
                 <h2 className="section-title">TRANSCRIBER</h2>
                 <p className="section-subtitle">Configure speech-to-text model (Groq Whisper FREE or Deepgram ULTRA-FAST).</p>

                 {/* Transcriber Model */}
                 <div className="form-group">
                   <label>Transcriber Model <span className="label-info">ⓘ</span></label>
                   <select 
                     value={selectedAssistant.transcriber || 'whisper-large-v3'}
                    onChange={(e) => {
                      handleConfigChange('transcriber', e.target.value)
                      // Cost will be recalculated automatically by useEffect
                    }}
                     disabled={availableTranscribers.length === 0}
                   >
                    {availableTranscribers.length > 0 ? (
                      availableTranscribers.map(transcriber => (
                        <option key={transcriber.key} value={transcriber.key}>
                          {transcriber.name} - {transcriber.latency ? `${transcriber.latency}ms` : 'N/A'} - ${transcriber.pricePerMinute ? transcriber.pricePerMinute.toFixed(4) : 'FREE'}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="whisper-large-v3">Whisper V3 Large (FREE) - 1500ms - FREE</option>
                        <option value="whisper-large-v3-turbo">Whisper Large v3 Turbo (FREE) - 1000ms - FREE</option>
                        <option value="deepgram-nova-2">Deepgram Nova-2 (ULTRA-FAST) - 400ms - $0.0043/min</option>
                      </>
                    )}
                   </select>
                 </div>

                 {/* Transcriber Details */}
                 {availableTranscribers.length > 0 && selectedAssistant.transcriber && (
                   <div className="transcriber-details">
                     {availableTranscribers.map(t => t.key === (selectedAssistant.transcriber || 'whisper-large-v3') ? (
                       <div key={t.key} className="detail-card">
                         <div className="detail-row">
                           <span className="detail-label">Latency:</span>
                           <span className="detail-value">{t.latency ? `${t.latency}ms` : 'N/A'}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Price per Minute:</span>
                           <span className="detail-value">${t.pricePerMinute ? t.pricePerMinute.toFixed(4) : '0.0000'}/min</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Description:</span>
                           <span className="detail-value">{t.description}</span>
                         </div>
                       </div>
                     ) : null)}
                   </div>
                 )}
               </>
             ) : activeTab === 'voice' ? (
               <>
                 <h2 className="section-title">VOICE</h2>
                 <p className="section-subtitle">Configure text-to-speech voice provider and settings.</p>

                 {/* Voice Provider Selection */}
                 <div className="form-group">
                   <label>Voice Provider <span className="label-info">ⓘ</span></label>
                   <select 
                     value={selectedAssistant.voiceProvider || 'cartesia'}
                     onChange={(e) => handleConfigChange('voiceProvider', e.target.value)}
                   >
                     {availableProviders.length > 0 ? (
                       availableProviders.map(provider => (
                         <option key={provider.id} value={provider.id} disabled={!provider.available}>
                           {provider.name} {!provider.available ? '(Not Available)' : ''}
                         </option>
                       ))
                     ) : (
                       <>
                         <option value="cartesia">Cartesia</option>
                         <option value="elevenlabs">ElevenLabs</option>
                       </>
                     )}
                   </select>
                 </div>

                 {/* Cartesia Configuration */}
                 {(selectedAssistant.voiceProvider || 'cartesia') === 'cartesia' && (
                   <>
                     {/* Voice Model */}
                     <div className="form-group">
                       <label>Voice Model <span className="label-info">ⓘ</span></label>
                       <select 
                         value={selectedAssistant.voiceModel || 'sonic-2024-10'}
                         onChange={(e) => handleConfigChange('voiceModel', e.target.value)}
                         disabled={availableVoiceModels.length === 0}
                       >
                        {availableVoiceModels.length > 0 ? (
                          availableVoiceModels.map(model => (
                            <option key={model.key} value={model.key}>
                              {model.name} - {model.latency}ms - {model.description}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="sonic-3">Sonic-3 - Latest with Emotion Control</option>
                            <option value="sonic-2">Sonic-2 - Most Capable</option>
                            <option value="sonic-turbo">Sonic Turbo - Fastest</option>
                            <option value="sonic-english">Sonic English - English Only</option>
                          </>
                        )}
                       </select>
                     </div>

                     {/* Voice Selection */}
                     <div className="form-group">
                       <label>Voice <span className="label-info">ⓘ</span></label>
                       <select 
                         value={selectedAssistant.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091'}
                         onChange={(e) => handleConfigChange('voiceId', e.target.value)}
                         disabled={availableVoices.length === 0}
                       >
                        {availableVoices.length > 0 ? (
                          availableVoices.map(voice => (
                            <option key={voice.key} value={voice.id}>
                              {voice.name} - {voice.gender} - {voice.accent}
                            </option>
                          ))
                        ) : (
                          <option value="a0e99841-438c-4a64-b679-ae501e7d6091">British Lady</option>
                        )}
                       </select>
                     </div>

                     {/* Language and Accent Controls */}
                     <div className="form-row">
                       <div className="form-group">
                         <label>Language <span className="label-info">ⓘ</span></label>
                         <select 
                           value={selectedAssistant.voiceLanguage || 'en'}
                           onChange={(e) => handleConfigChange('voiceLanguage', e.target.value)}
                         >
                           <option value="en">English</option>
                           <option value="es">Spanish</option>
                           <option value="fr">French</option>
                           <option value="de">German</option>
                           <option value="it">Italian</option>
                           <option value="pt">Portuguese</option>
                           <option value="zh">Chinese</option>
                           <option value="ja">Japanese</option>
                           <option value="ko">Korean</option>
                           <option value="hi">Hindi</option>
                           <option value="ru">Russian</option>
                           <option value="nl">Dutch</option>
                           <option value="pl">Polish</option>
                           <option value="sv">Swedish</option>
                           <option value="tr">Turkish</option>
                         </select>
                       </div>
                       <div className="form-group">
                         <label>Accent/Dialect <span className="label-info">ⓘ</span></label>
                         <select 
                           value={selectedAssistant.voiceDialect || 'us'}
                           onChange={(e) => handleConfigChange('voiceDialect', e.target.value)}
                           disabled={!['en', 'es', 'pt', 'fr'].includes(selectedAssistant.voiceLanguage || 'en')}
                         >
                           {(selectedAssistant.voiceLanguage || 'en') === 'en' && (
                             <>
                               <option value="us">US English</option>
                               <option value="uk">British English</option>
                               <option value="au">Australian English</option>
                               <option value="in">Indian English</option>
                               <option value="so">South African English</option>
                             </>
                           )}
                           {selectedAssistant.voiceLanguage === 'es' && (
                             <>
                               <option value="es">Spain Spanish</option>
                               <option value="mx">Mexican Spanish</option>
                               <option value="ar">Argentinian Spanish</option>
                             </>
                           )}
                           {selectedAssistant.voiceLanguage === 'pt' && (
                             <>
                               <option value="br">Brazilian Portuguese</option>
                               <option value="pt">European Portuguese</option>
                             </>
                           )}
                           {selectedAssistant.voiceLanguage === 'fr' && (
                             <>
                               <option value="fr">French (France)</option>
                               <option value="ca">Canadian French</option>
                             </>
                           )}
                           {!['en', 'es', 'pt', 'fr'].includes(selectedAssistant.voiceLanguage || 'en') && (
                             <option value="">No dialect options available</option>
                           )}
                         </select>
                       </div>
                     </div>

                     {/* Voice Characteristics */}
                     <div className="voice-controls">
                       <h3>Voice Characteristics</h3>
                       
                       {/* Speed Control */}
                       <div className="form-group">
                         <label>Speed <span className="label-info">ⓘ</span></label>
                         <div className="slider-control">
                           <input
                             type="range"
                             value={selectedAssistant.voiceSpeed || 1.0}
                             onChange={(e) => handleConfigChange('voiceSpeed', parseFloat(e.target.value))}
                             min="0.5"
                             max="2.0"
                             step="0.1"
                           />
                           <span className="slider-value">{selectedAssistant.voiceSpeed || 1.0}x</span>
                         </div>
                         <p className="help-text">Control speaking speed (0.5x = slow, 2.0x = fast)</p>
                       </div>

                       {/* Volume Control */}
                       <div className="form-group">
                         <label>Volume <span className="label-info">ⓘ</span></label>
                         <div className="slider-control">
                           <input
                             type="range"
                             value={selectedAssistant.voiceVolume || 1.0}
                             onChange={(e) => handleConfigChange('voiceVolume', parseFloat(e.target.value))}
                             min="0.5"
                             max="2.0"
                             step="0.1"
                           />
                           <span className="slider-value">{selectedAssistant.voiceVolume || 1.0}x</span>
                         </div>
                         <p className="help-text">Control voice volume (0.5x = quiet, 2.0x = loud)</p>
                       </div>

                       {/* Emotion Control (Sonic-3 only) */}
                       {(selectedAssistant.voiceModel === 'sonic-3') && (
                         <div className="form-group">
                           <label>Emotion <span className="label-info">ⓘ</span></label>
                           <select 
                             value={selectedAssistant.voiceEmotion || 'neutral'}
                             onChange={(e) => handleConfigChange('voiceEmotion', e.target.value)}
                           >
                             <option value="neutral">Neutral</option>
                             <option value="happy">Happy</option>
                             <option value="sad">Sad</option>
                             <option value="angry">Angry</option>
                             <option value="excited">Excited</option>
                             <option value="calm">Calm</option>
                             <option value="confident">Confident</option>
                             <option value="empathetic">Empathetic</option>
                           </select>
                           <p className="help-text">Emotional tone for Sonic-3 model</p>
                         </div>
                       )}

                       {/* Pitch Control */}
                       <div className="form-group">
                         <label>Pitch <span className="label-info">ⓘ</span></label>
                         <div className="slider-control">
                           <input
                             type="range"
                             value={selectedAssistant.voicePitch || 1.0}
                             onChange={(e) => handleConfigChange('voicePitch', parseFloat(e.target.value))}
                             min="0.5"
                             max="2.0"
                             step="0.1"
                           />
                           <span className="slider-value">{selectedAssistant.voicePitch || 1.0}x</span>
                         </div>
                         <p className="help-text">Control voice pitch (0.5x = lower, 2.0x = higher)</p>
                       </div>
                     </div>

                     {/* Voice Preview */}
                     <div className="form-group">
                       <label>Voice Preview</label>
                       <div className="voice-preview">
                         <textarea
                           ref={(el) => { if (el) el.previewTextarea = true }}
                           placeholder="Enter text to preview the voice..."
                           rows={3}
                           defaultValue="Hello! This is how I will sound with the current voice settings."
                           id="voice-preview-text"
                         />
                         <button 
                           className={`btn-secondary preview-btn ${isPreviewPlaying ? 'playing' : ''}`}
                           onClick={() => {
                             const textarea = document.getElementById('voice-preview-text')
                             const text = textarea?.value || "Hello! This is how I will sound with the current voice settings."
                             handleVoicePreview(text)
                           }}
                           disabled={isPreviewPlaying}
                         >
                           {isPreviewPlaying ? '🔊 Playing...' : '🔊 Preview Voice'}
                         </button>
                       </div>
                     </div>
                   </>
                 )}

                 {/* ElevenLabs Configuration */}
                 {selectedAssistant.voiceProvider === 'elevenlabs' && (
                   <>
                     {/* ElevenLabs Model */}
                     <div className="form-group">
                       <label>Voice Model <span className="label-info">ⓘ</span></label>
                       <select 
                         value={selectedAssistant.elevenLabsModel || 'eleven_monolingual_v1'}
                         onChange={(e) => handleConfigChange('elevenLabsModel', e.target.value)}
                         disabled={elevenLabsModels.length === 0}
                       >
                        {elevenLabsModels.length > 0 ? (
                          elevenLabsModels.map(model => (
                            <option key={model.model_id} value={model.model_id}>
                              {model.name} - {model.description}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="eleven_monolingual_v1">Eleven Monolingual v1</option>
                            <option value="eleven_multilingual_v2">Eleven Multilingual v2</option>
                            <option value="eleven_turbo_v2">Eleven Turbo v2</option>
                          </>
                        )}
                       </select>
                     </div>

                     {/* ElevenLabs Voice */}
                     <div className="form-group">
                       <label>Voice <span className="label-info">ⓘ</span></label>
                       <select 
                         value={selectedAssistant.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'}
                         onChange={(e) => handleConfigChange('elevenLabsVoiceId', e.target.value)}
                         disabled={elevenLabsVoices.length === 0 || selectedAssistant.useCustomVoiceId}
                       >
                        {elevenLabsVoices.length > 0 ? (
                          elevenLabsVoices.map(voice => (
                            <option key={voice.voice_id} value={voice.voice_id}>
                              {voice.name} - {voice.category}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="21m00Tcm4TlvDq8ikWAM">Rachel</option>
                            <option value="EXAVITQu4vr4xnSDxMaL">Bella</option>
                            <option value="ErXwobaYiN019PkySvjV">Antoni</option>
                          </>
                        )}
                       </select>
                     </div>

                     {/* Custom Voice ID Toggle */}
                     <div className="form-group">
                       <label>
                         <input
                           type="checkbox"
                           checked={selectedAssistant.useCustomVoiceId || false}
                           onChange={(e) => handleConfigChange('useCustomVoiceId', e.target.checked)}
                         />
                         Add Voice ID Manually <span className="label-info">ⓘ</span>
                       </label>
                     </div>

                     {/* Custom Voice ID Input */}
                     {selectedAssistant.useCustomVoiceId && (
                       <div className="form-group">
                         <label>Custom Voice ID <span className="label-info">ⓘ</span></label>
                         <input
                           type="text"
                           placeholder="Enter Voice ID (e.g., 21m00Tcm4TlvDq8ikWAM)"
                           value={selectedAssistant.customVoiceId || ''}
                           onChange={(e) => handleConfigChange('customVoiceId', e.target.value)}
                           className="custom-voice-input"
                         />
                         <div className="input-help">
                           Enter your custom ElevenLabs voice ID. You can find this in your ElevenLabs dashboard.
                         </div>
                       </div>
                     )}

                     {/* Voice Settings */}
                     <div className="form-group">
                       <label>Stability <span className="label-info">ⓘ</span></label>
                       <div className="slider-container">
                         <input
                           type="range"
                           min="0"
                           max="1"
                           step="0.01"
                           value={selectedAssistant.elevenLabsSettings?.stability || 0.5}
                           onChange={(e) => handleConfigChange('elevenLabsSettings', {
                             ...selectedAssistant.elevenLabsSettings,
                             stability: parseFloat(e.target.value)
                           })}
                           className="slider"
                         />
                         <span className="slider-value">{(selectedAssistant.elevenLabsSettings?.stability || 0.5).toFixed(2)}</span>
                       </div>
                     </div>

                     <div className="form-group">
                       <label>Similarity Boost <span className="label-info">ⓘ</span></label>
                       <div className="slider-container">
                         <input
                           type="range"
                           min="0"
                           max="1"
                           step="0.01"
                           value={selectedAssistant.elevenLabsSettings?.similarity_boost || 0.75}
                           onChange={(e) => handleConfigChange('elevenLabsSettings', {
                             ...selectedAssistant.elevenLabsSettings,
                             similarity_boost: parseFloat(e.target.value)
                           })}
                           className="slider"
                         />
                         <span className="slider-value">{(selectedAssistant.elevenLabsSettings?.similarity_boost || 0.75).toFixed(2)}</span>
                       </div>
                     </div>

                     <div className="form-group">
                       <label>Style <span className="label-info">ⓘ</span></label>
                       <div className="slider-container">
                         <input
                           type="range"
                           min="0"
                           max="1"
                           step="0.01"
                           value={selectedAssistant.elevenLabsSettings?.style || 0}
                           onChange={(e) => handleConfigChange('elevenLabsSettings', {
                             ...selectedAssistant.elevenLabsSettings,
                             style: parseFloat(e.target.value)
                           })}
                           className="slider"
                         />
                         <span className="slider-value">{(selectedAssistant.elevenLabsSettings?.style || 0).toFixed(2)}</span>
                       </div>
                     </div>

                     <div className="form-group">
                       <label>
                         <input
                           type="checkbox"
                           checked={selectedAssistant.elevenLabsSettings?.use_speaker_boost !== false}
                           onChange={(e) => handleConfigChange('elevenLabsSettings', {
                             ...selectedAssistant.elevenLabsSettings,
                             use_speaker_boost: e.target.checked
                           })}
                         />
                         Use Speaker Boost <span className="label-info">ⓘ</span>
                       </label>
                     </div>
                   </>
                 )}

                 {/* Provider Details */}
                 {(selectedAssistant.voiceProvider || 'cartesia') === 'cartesia' && availableVoiceModels.length > 0 && selectedAssistant.voiceModel && (
                   <div className="transcriber-details">
                     {availableVoiceModels.map(model => model.key === (selectedAssistant.voiceModel || 'sonic-2024-10') ? (
                       <div key={model.key} className="detail-card">
                         <div className="detail-row">
                           <span className="detail-label">Model:</span>
                           <span className="detail-value">{model.name}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Latency:</span>
                           <span className="detail-value">{model.latency}ms</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Description:</span>
                           <span className="detail-value">{model.description}</span>
                         </div>
                       </div>
                     ) : null)}
                   </div>
                 )}

                 {/* Selected Voice Details */}
                 {(selectedAssistant.voiceProvider || 'cartesia') === 'cartesia' && availableVoices.length > 0 && selectedAssistant.voiceId && (
                   <div className="transcriber-details">
                     {availableVoices.map(voice => voice.id === (selectedAssistant.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091') ? (
                       <div key={voice.key} className="detail-card">
                         <div className="detail-row">
                           <span className="detail-label">Voice:</span>
                           <span className="detail-value">{voice.name}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Gender:</span>
                           <span className="detail-value">{voice.gender}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Accent:</span>
                           <span className="detail-value">{voice.accent}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Language:</span>
                           <span className="detail-value">{voice.language}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Description:</span>
                           <span className="detail-value">{voice.description}</span>
                         </div>
                       </div>
                     ) : null)}
                   </div>
                 )}

                 {/* ElevenLabs Voice Details */}
                 {selectedAssistant.voiceProvider === 'elevenlabs' && elevenLabsVoices.length > 0 && selectedAssistant.elevenLabsVoiceId && (
                   <div className="transcriber-details">
                     {elevenLabsVoices.map(voice => voice.voice_id === (selectedAssistant.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM') ? (
                       <div key={voice.voice_id} className="detail-card">
                         <div className="detail-row">
                           <span className="detail-label">Voice:</span>
                           <span className="detail-value">{voice.name}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Category:</span>
                           <span className="detail-value">{voice.category}</span>
                         </div>
                         <div className="detail-row">
                           <span className="detail-label">Description:</span>
                           <span className="detail-value">{voice.description}</span>
                         </div>
                       </div>
                     ) : null)}
                   </div>
                 )}
               </>
             ) : activeTab === 'tools' ? (
               <>
                 <h2 className="section-title">TOOLS</h2>
                 <p className="section-subtitle">Configure tools and functions to extend your assistant's capabilities.</p>
                 
                 <ToolsTab 
                   assistant={selectedAssistant}
                   onUpdate={handleConfigChange}
                 />
               </>
             ) : activeTab === 'code' ? (
               <>
                 <h2 className="section-title">ASSISTANT CONFIGURATION</h2>
                 <p className="section-subtitle">JSON configuration for this assistant. Copy this to use in your applications.</p>
                 
                 <div className="code-section">
                   <div className="code-header">
                     <span className="code-title">Assistant Config JSON</span>
                     <button 
                       className="copy-btn"
                       onClick={() => copyAssistantConfig()}
                       title="Copy to clipboard"
                     >
                       📋 Copy
                     </button>
                   </div>
                   <div className="code-container">
                     <pre className="code-block">
                       <code>
                         {selectedAssistant ? JSON.stringify(formatAssistantConfig(selectedAssistant), null, 2) : '// Select an assistant to view configuration'}
                       </code>
                     </pre>
                   </div>
                 </div>
               </>
             ) : null}

             {activeTab === 'model' && (
               <>

             {/* First Message Mode */}
             <div className="form-group">
               <label>First Message Mode <span className="label-info">ⓘ</span></label>
               <select
                 value={selectedAssistant.firstMessageMode}
                 onChange={(e) => handleConfigChange('firstMessageMode', e.target.value)}
               >
                 <option value="assistant-speaks-first">Assistant speaks first</option>
                 <option value="assistant-waits">Assistant waits for user</option>
                 <option value="custom">Custom</option>
               </select>
             </div>

             {/* First Message */}
             <div className="form-group">
               <label>First Message <span className="label-info">ⓘ</span></label>
               <textarea
                 value={selectedAssistant.firstMessage}
                 onChange={(e) => handleConfigChange('firstMessage', e.target.value)}
                 placeholder="Hello."
                 rows={2}
               />
             </div>

             {/* System Prompt */}
             <div className="form-group">
               <label>
                 System Prompt <span className="label-info">ⓘ</span>
                 <button className="generate-btn">Generate</button>
               </label>
               <textarea
                 value={selectedAssistant.systemPrompt}
                 onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
                 placeholder="This is a blank template with minimal defaults, you can change the model, temperature, and messages."
                 rows={6}
               />
             </div>
             </>
             )}
           </div>
           </>
           ) : (
             <div className="empty-config">
               <FiPlus size={64} />
               <h2>No Assistant Selected</h2>
               <p>Select an assistant from the list or create a new one</p>
               <button onClick={handleCreateAssistant} className="btn-primary">
                 <FiPlus /> Create Assistant
               </button>
             </div>
           )}
         </div>
       </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Assistant</h2>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              if (formData.name.trim()) {
                handleSubmitAssistant(formData)
                setFormData({ name: '', model: 'llama-3.1-70b-versatile', voice: 'Cartesia Sonic' })
              }
            }}>
              <div className="form-group">
                <label>Assistant Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Bot"
                  required
                />
              </div>

              <div className="form-group">
                <label>LLM Model (Groq)</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  disabled={isLoadingModels}
                >
                  {isLoadingModels ? (
                    <option>Loading LLM models...</option>
                  ) : availableModels.length > 0 ? (
                    availableModels.map(model => (
                      <option key={model.key} value={model.key}>
                        {model.name} - {model.speed} TPS - ${model.pricing?.inputPerMinute}/${model.pricing?.outputPerMinute} per min
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="llama-3.1-70b-versatile">Llama 3.3 70B Versatile - 394 TPS - $0.59/$0.79 per 1M tokens</option>
                      <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant - 840 TPS - $0.05/$0.08 per 1M tokens</option>
                      <option value="mixtral-8x7b-32768">Mixtral 8x7b 32768 - 500 TPS - $0.27/$0.27 per 1M tokens</option>
                      <option value="gpt-oss-120b-128k">GPT OSS 120B 128k - 500 TPS - $0.15/$0.75 per 1M tokens</option>
                      <option value="gpt-oss-20b-128k">GPT OSS 20B 128k - 1000 TPS - $0.10/$0.50 per 1M tokens</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Voice</label>
                <select
                  value={formData.voice}
                  onChange={(e) => setFormData({ ...formData, voice: e.target.value })}
                >
                  <option value="Cartesia Sonic">Cartesia Sonic</option>
                  <option value="ElevenLabs Rachel">ElevenLabs Rachel</option>
                  <option value="ElevenLabs Antoni">ElevenLabs Antoni</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Create Assistant
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowModal(false)
                    setFormData({ name: '', model: 'llama-3.1-70b-versatile', voice: 'Cartesia Sonic' })
                  }} 
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JSON Configuration Modal */}
      {showJsonModal && selectedAssistant && (
        <div className="modal-overlay" onClick={() => setShowJsonModal(false)}>
          <div className="json-modal" onClick={(e) => e.stopPropagation()}>
            <div className="json-modal-header">
              <h3>Assistant Configuration JSON</h3>
              <button 
                className="close-btn"
                onClick={() => setShowJsonModal(false)}
              >
                ×
              </button>
            </div>
            <div className="json-modal-content">
              <div className="json-info">
                <p><strong>Assistant:</strong> {selectedAssistant.name}</p>
                <p><strong>ID:</strong> {selectedAssistant._id}</p>
                <p><strong>Status:</strong> {selectedAssistant.status}</p>
              </div>
              <div className="json-container">
                <pre className="json-code">
                  {JSON.stringify(getFilteredConfig(selectedAssistant), null, 2)}
                </pre>
              </div>
              <div className="json-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(getFilteredConfig(selectedAssistant), null, 2))
                    alert('JSON copied to clipboard!')
                  }}
                >
                  Copy JSON
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setShowJsonModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Assistants

