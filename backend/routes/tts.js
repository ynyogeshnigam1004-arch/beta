const express = require('express');
const router = express.Router();
const CartesiaService = require('../services/cartesiaService');
const elevenLabsService = require('../services/elevenLabsService');
const { getAssistantById } = require('../models/Assistant');

// Create CartesiaService instance
const cartesiaService = new CartesiaService();

/**
 * Get available TTS providers
 */
router.get('/providers', (req, res) => {
    const providers = [];
    
    // Check Cartesia availability
    if (cartesiaService.apiKey) {
        providers.push({
            id: 'cartesia',
            name: 'Cartesia',
            available: true
        });
    }
    
    // Check ElevenLabs availability
    if (elevenLabsService.isAvailable()) {
        providers.push({
            id: 'elevenlabs',
            name: 'ElevenLabs',
            available: true
        });
    }
    
    res.json({ providers });
});

/**
 * Get ElevenLabs voices
 */
router.get('/elevenlabs/voices', async (req, res) => {
    try {
        if (!elevenLabsService.isAvailable()) {
            // Return comprehensive fallback voices instead of error
            return res.json({ 
                voices: [
                    { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade', description: 'Calm and professional' },
                    { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade', description: 'Soft and friendly' },
                    { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', category: 'premade', description: 'Well-rounded and versatile' },
                    { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade', description: 'Deep and authoritative' },
                    { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', category: 'premade', description: 'Young and energetic' },
                    { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade', description: 'Strong and confident' },
                    { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', category: 'premade', description: 'Crisp and clear' },
                    { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', category: 'premade', description: 'Trustworthy narrator' },
                    { voice_id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', category: 'premade', description: 'Hoarse and intense' },
                    { voice_id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', category: 'premade', description: 'Casual Australian' },
                    { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', category: 'premade', description: 'Seductive English' },
                    { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', category: 'premade', description: 'Casual American' },
                    { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'premade', description: 'Deep British' },
                    { voice_id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', category: 'premade', description: 'Middle-aged American' },
                    { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'premade', description: 'Warm British' },
                    { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Lily', category: 'premade', description: 'Warm British woman' },
                    { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Matilda', category: 'premade', description: 'Warm American woman' },
                    { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Sarah', category: 'premade', description: 'Soft American woman' },
                    { voice_id: 'bVMeCyTHy58xNoL34h3p', name: 'Jeremy', category: 'premade', description: 'Excited Irish' },
                    { voice_id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', category: 'premade', description: 'Emotional young woman' }
                ],
                warning: 'Using fallback voices - API key not configured'
            });
        }
        
        const voices = await elevenLabsService.getVoices();
        res.json({ voices });
    } catch (error) {
        console.error('❌ Error fetching ElevenLabs voices:', error.response?.data || error.message);
        // Return comprehensive fallback voices instead of 500 error
        res.json({ 
            voices: [
                {
                    voice_id: '21m00Tcm4TlvDq8ikWAM',
                    name: 'Rachel',
                    category: 'premade',
                    description: 'Calm and professional'
                },
                {
                    voice_id: 'EXAVITQu4vr4xnSDxMaL',
                    name: 'Bella',
                    category: 'premade',
                    description: 'Soft and friendly'
                },
                {
                    voice_id: 'ErXwobaYiN019PkySvjV',
                    name: 'Antoni',
                    category: 'premade',
                    description: 'Well-rounded and versatile'
                },
                {
                    voice_id: 'pNInz6obpgDQGcFmaJgB',
                    name: 'Adam',
                    category: 'premade',
                    description: 'Deep and authoritative'
                },
                {
                    voice_id: 'yoZ06aMxZJJ28mfd3POQ',
                    name: 'Sam',
                    category: 'premade',
                    description: 'Young and energetic'
                },
                {
                    voice_id: 'AZnzlk1XvdvUeBnXmlld',
                    name: 'Domi',
                    category: 'premade',
                    description: 'Strong and confident'
                },
                {
                    voice_id: 'VR6AewLTigWG4xSOukaG',
                    name: 'Arnold',
                    category: 'premade',
                    description: 'Crisp and clear'
                },
                {
                    voice_id: 'pqHfZKP75CvOlQylNhV4',
                    name: 'Bill',
                    category: 'premade',
                    description: 'Trustworthy narrator'
                },
                {
                    voice_id: 'N2lVS1w4EtoT3dr4eOWO',
                    name: 'Callum',
                    category: 'premade',
                    description: 'Hoarse and intense'
                },
                {
                    voice_id: 'IKne3meq5aSn9XLyUdCD',
                    name: 'Charlie',
                    category: 'premade',
                    description: 'Casual Australian'
                },
                {
                    voice_id: 'XB0fDUnXU5powFXDhCwa',
                    name: 'Charlotte',
                    category: 'premade',
                    description: 'Seductive English'
                },
                {
                    voice_id: 'iP95p4xoKVk53GoZ742B',
                    name: 'Chris',
                    category: 'premade',
                    description: 'Casual American'
                },
                {
                    voice_id: 'onwK4e9ZLuTAKqWW03F9',
                    name: 'Daniel',
                    category: 'premade',
                    description: 'Deep British'
                },
                {
                    voice_id: 'cjVigY5qzO86Huf0OWal',
                    name: 'Eric',
                    category: 'premade',
                    description: 'Middle-aged American'
                },
                {
                    voice_id: 'JBFqnCBsd6RMkjVDRZzb',
                    name: 'George',
                    category: 'premade',
                    description: 'Warm British'
                },
                {
                    voice_id: 'TX3LPaxmHKxFdv7VOQHJ',
                    name: 'Lily',
                    category: 'premade',
                    description: 'Warm British woman'
                },
                {
                    voice_id: 'pFZP5JQG7iQjIQuC4Bku',
                    name: 'Matilda',
                    category: 'premade',
                    description: 'Warm American woman'
                },
                {
                    voice_id: 'XrExE9yKIg1WjnnlVkGX',
                    name: 'Sarah',
                    category: 'premade',
                    description: 'Soft American woman'
                },
                {
                    voice_id: 'bVMeCyTHy58xNoL34h3p',
                    name: 'Jeremy',
                    category: 'premade',
                    description: 'Excited Irish'
                },
                {
                    voice_id: 'MF3mGyEYCl7XYWbV9V6O',
                    name: 'Elli',
                    category: 'premade',
                    description: 'Emotional young woman'
                }
            ],
            warning: 'Using fallback voices - API error: ' + (error.response?.data?.detail?.message || error.message)
        });
    }
});

/**
 * Get ElevenLabs models
 */
router.get('/elevenlabs/models', async (req, res) => {
    try {
        if (!elevenLabsService.isAvailable()) {
            // Return fallback models instead of error
            return res.json({ 
                models: [
                    { 
                        model_id: 'eleven_monolingual_v1', 
                        name: 'Eleven Monolingual v1', 
                        description: 'English only, fast and reliable',
                        can_do_text_to_speech: true
                    },
                    { 
                        model_id: 'eleven_multilingual_v2', 
                        name: 'Eleven Multilingual v2', 
                        description: 'Supports multiple languages',
                        can_do_text_to_speech: true
                    },
                    { 
                        model_id: 'eleven_turbo_v2', 
                        name: 'Eleven Turbo v2', 
                        description: 'Fastest model with good quality',
                        can_do_text_to_speech: true
                    },
                    { 
                        model_id: 'eleven_turbo_v2_5', 
                        name: 'Eleven Turbo v2.5', 
                        description: 'Latest turbo model (Free tier)',
                        can_do_text_to_speech: true
                    }
                ],
                warning: 'Using fallback models - API key not configured'
            });
        }
        
        const models = await elevenLabsService.getModels();
        res.json({ models });
    } catch (error) {
        console.error('❌ Error fetching ElevenLabs models:', error.response?.data || error.message);
        
        // Return fallback models if API fails
        console.log('📋 Returning fallback models due to API error');
        res.json({ 
            models: [
                { 
                    model_id: 'eleven_monolingual_v1', 
                    name: 'Eleven Monolingual v1', 
                    description: 'English only, fast and reliable',
                    can_do_text_to_speech: true
                },
                { 
                    model_id: 'eleven_multilingual_v2', 
                    name: 'Eleven Multilingual v2', 
                    description: 'Supports multiple languages',
                    can_do_text_to_speech: true
                },
                { 
                    model_id: 'eleven_turbo_v2', 
                    name: 'Eleven Turbo v2', 
                    description: 'Fastest model with good quality',
                    can_do_text_to_speech: true
                },
                { 
                    model_id: 'eleven_turbo_v2_5', 
                    name: 'Eleven Turbo v2.5', 
                    description: 'Latest turbo model (Free tier)',
                    can_do_text_to_speech: true
                }
            ],
            warning: 'Using fallback models - API error: ' + (error.response?.data?.detail?.message || error.message)
        });
    }
});

/**
 * Get Cartesia voices (existing endpoint compatibility)
 */
router.get('/cartesia/voices', async (req, res) => {
    try {
        if (!cartesiaService.apiKey) {
            return res.status(400).json({ 
                error: 'Cartesia service not available',
                message: 'API key not configured'
            });
        }
        
        const voices = cartesiaService.getVoices();
        res.json({ voices });
    } catch (error) {
        console.error('❌ Error fetching Cartesia voices:', error);
        res.status(500).json({ 
            error: 'Failed to fetch voices',
            message: error.message
        });
    }
});

/**
 * Synthesize speech using the appropriate provider
 */
router.post('/synthesize', async (req, res) => {
    try {
        const { text, assistantId, voiceProvider, voiceId, modelId, voiceSettings } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        let provider = voiceProvider;
        let finalVoiceId = voiceId;
        let finalModelId = modelId;
        let finalVoiceSettings = voiceSettings;
        let voiceOptions = {};
        
        // If assistantId provided, get settings from database
        if (assistantId) {
            const assistant = await getAssistantById(assistantId);
            if (assistant) {
                provider = assistant.voiceProvider || 'cartesia';
                
                if (provider === 'elevenlabs') {
                    finalVoiceId = assistant.elevenLabsVoiceId || voiceId;
                    finalModelId = assistant.elevenLabsModel || modelId || 'eleven_monolingual_v1';
                    finalVoiceSettings = assistant.elevenLabsSettings || voiceSettings || {};
                } else {
                    // Cartesia with new voice controls
                    finalVoiceId = assistant.voiceId || voiceId;
                    finalModelId = assistant.voiceModel || modelId || 'sonic-english';
                    
                    // Include new voice accent controls
                    voiceOptions = {
                        model: finalModelId,
                        voiceId: finalVoiceId,
                        language: assistant.voiceLanguage || 'en',
                        dialect: assistant.voiceDialect || 'us',
                        speed: assistant.voiceSpeed || 1.0,
                        emotion: assistant.voiceEmotion || 'neutral',
                        volume: assistant.voiceVolume || 1.0,
                        pitch: assistant.voicePitch || 1.0
                    };
                }
            }
        }
        
        // Default to cartesia if no provider specified
        provider = provider || 'cartesia';
        
        let audioStream;
        
        if (provider === 'elevenlabs') {
            if (!elevenLabsService.isAvailable()) {
                return res.status(400).json({ 
                    error: 'ElevenLabs service not available',
                    message: 'API key not configured'
                });
            }
            
            audioStream = await elevenLabsService.synthesizeSpeech(
                text, 
                finalVoiceId || process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
                finalModelId || 'eleven_monolingual_v1',
                finalVoiceSettings || {}
            );
            
            res.setHeader('Content-Type', 'audio/mpeg');
        } else {
            // Default to Cartesia with new voice controls
            if (!cartesiaService.apiKey) {
                return res.status(400).json({ 
                    error: 'Cartesia service not available',
                    message: 'API key not configured'
                });
            }
            
            // Use the new voice options or fallback to basic settings
            const options = voiceOptions.model ? voiceOptions : {
                model: finalModelId || 'sonic-english',
                voiceId: finalVoiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091'
            };
            
            console.log('🎤 TTS API using voice options:', options);
            
            const audioBuffer = await cartesiaService.textToSpeech(text, options);
            
            res.setHeader('Content-Type', 'audio/wav');
            res.send(audioBuffer);
        }
        
    } catch (error) {
        console.error('❌ TTS Synthesis Error:', error);
        res.status(500).json({ 
            error: 'TTS synthesis failed',
            message: error.message
        });
    }
});

module.exports = router;