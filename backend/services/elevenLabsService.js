const axios = require('axios');
const { Readable } = require('stream');

class ElevenLabsService {
    constructor() {
        this.apiKey = process.env.ELEVENLABS_API_KEY;
        this.baseUrl = 'https://api.elevenlabs.io/v1';
        
        if (!this.apiKey) {
            console.warn('⚠️ ElevenLabs API key not found. ElevenLabs TTS will be disabled.');
            return;
        }
        
        console.log('🔊 ElevenLabs Service initialized');
        console.log(`🔑 ElevenLabs API Key: ${this.apiKey.substring(0, 8)}...${this.apiKey.slice(-4)} (${this.apiKey.length} chars)`);
    }

    isAvailable() {
        return !!this.apiKey;
    }

    async getVoices() {
        if (!this.isAvailable()) {
            throw new Error('ElevenLabs API key not configured');
        }

        try {
            console.log('🎤 Fetching ElevenLabs voices...');
            
            const response = await axios.get(`${this.baseUrl}/voices`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            const voices = response.data.voices.map(voice => ({
                voice_id: voice.voice_id,
                name: voice.name,
                category: voice.category,
                description: voice.description || '',
                preview_url: voice.preview_url,
                labels: voice.labels || {}
            }));

            console.log(`✅ Retrieved ${voices.length} ElevenLabs voices`);
            return voices;
        } catch (error) {
            console.error('❌ Error fetching ElevenLabs voices:', error.response?.data || error.message);
            throw error;
        }
    }

    async getModels() {
        if (!this.isAvailable()) {
            throw new Error('ElevenLabs API key not configured');
        }

        try {
            console.log('🤖 Fetching ElevenLabs models...');
            
            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: {
                    'xi-api-key': this.apiKey
                }
            });

            const models = response.data.map(model => ({
                model_id: model.model_id,
                name: model.name,
                description: model.description || '',
                can_be_finetuned: model.can_be_finetuned,
                can_do_text_to_speech: model.can_do_text_to_speech,
                can_do_voice_conversion: model.can_do_voice_conversion,
                token_cost_factor: model.token_cost_factor,
                languages: model.languages || []
            }));

            console.log(`✅ Retrieved ${models.length} ElevenLabs models`);
            return models;
        } catch (error) {
            console.error('❌ Error fetching ElevenLabs models:', error.response?.data || error.message);
            throw error;
        }
    }

    async synthesizeSpeech(text, voiceId, modelId = 'eleven_turbo_v2_5', voiceSettings = {}) {
        if (!this.isAvailable()) {
            throw new Error('ElevenLabs API key not configured');
        }

        try {
            // IMPORTANT: Force free tier model for free accounts
            // Free tier models: eleven_turbo_v2_5, eleven_turbo_v2
            // Paid models: eleven_multilingual_v2, eleven_monolingual_v1
            const freeModels = ['eleven_turbo_v2_5', 'eleven_turbo_v2'];
            const paidModels = ['eleven_multilingual_v2', 'eleven_monolingual_v1', 'eleven_multilingual_v1'];
            
            // If a paid model is requested, switch to free model
            if (paidModels.includes(modelId)) {
                console.warn(`⚠️ [FREE_TIER] Paid model '${modelId}' requested, switching to 'eleven_turbo_v2_5'`);
                modelId = 'eleven_turbo_v2_5';
            }
            
            console.log('🔍 ElevenLabs TTS Request Details:');
            console.log(`   API URL: ${this.baseUrl}/text-to-speech/${voiceId}/stream`);
            console.log(`   API Key: ${this.apiKey.substring(0, 8)}...${this.apiKey.slice(-4)}`);
            console.log(`   Model: ${modelId} ${freeModels.includes(modelId) ? '(FREE TIER ✅)' : '(PAID ❌)'}`);
            console.log(`   Voice ID: ${voiceId}`);
            console.log(`   Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
            console.log(`   Voice Settings:`, voiceSettings);

            const defaultSettings = {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0,
                use_speaker_boost: true
            };

            const finalSettings = { ...defaultSettings, ...voiceSettings };

            const requestData = {
                text: text,
                model_id: modelId,
                voice_settings: finalSettings
            };

            const response = await axios.post(
                `${this.baseUrl}/text-to-speech/${voiceId}/stream`,
                requestData,
                {
                    headers: {
                        'xi-api-key': this.apiKey,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    responseType: 'stream'
                }
            );

            console.log('✅ ElevenLabs TTS request successful');
            return response.data;

        } catch (error) {
            console.error('❌ ElevenLabs TTS Error:', error.response?.data || error.message);
            
            if (error.response?.status === 401) {
                console.error('🔑 401 UNAUTHORIZED ERROR - DETAILED DIAGNOSIS:');
                console.error(`   API Key being used: ${this.apiKey.substring(0, 8)}...${this.apiKey.slice(-4)}`);
                console.error('   Possible Causes:');
                console.error('   1. API key is invalid or expired');
                console.error('   2. API key format is incorrect');
                console.error('   3. Usage limits exceeded');
                console.error('   4. API key not activated');
                console.error('   5. Insufficient permissions for this endpoint');
                console.error('   Solution: Check your API key at https://elevenlabs.io/');
            }
            
            throw error;
        }
    }

    // Convert stream to buffer for WebRTC compatibility
    async streamToBuffer(stream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    }

    // Compatibility method for streamingPipeline - flushBuffer equivalent
    async flushBuffer(buffer, onAudioChunk, options = {}) {
        if (!buffer || !buffer.text || !buffer.text.trim()) {
            console.log('📝 ElevenLabs flushBuffer: No text to process');
            return;
        }

        try {
            console.log(`🔊 ElevenLabs flushBuffer: Processing "${buffer.text}"`);
            
            // Use synthesizeSpeech to generate audio
            const audioStream = await this.synthesizeSpeech(
                buffer.text,
                options.voiceId || '21m00Tcm4TlvDq8ikWAM',
                options.modelId || 'eleven_turbo_v2_5',  // Use free tier model
                options.voiceSettings || {}
            );

            // Convert stream to buffer and call onAudioChunk
            const audioBuffer = await this.streamToBuffer(audioStream);
            
            if (onAudioChunk && typeof onAudioChunk === 'function') {
                onAudioChunk(audioBuffer);
            }

            // Clear the buffer
            buffer.text = '';
            
            console.log('✅ ElevenLabs flushBuffer: Complete');
        } catch (error) {
            console.error('❌ ElevenLabs flushBuffer error:', error.message);
            throw error;
        }
    }

    // Compatibility method for streamingPipeline - bufferAndConvertText
    async bufferAndConvertText(textChunk, buffer, onAudioChunk, options = {}) {
        // Add text chunk to buffer
        buffer.text = (buffer.text || '') + textChunk;
        
        // Check if we should flush (sentence end or buffer full)
        const shouldFlush = /[.!?]\s*$/.test(buffer.text) || buffer.text.length > 200;
        
        if (shouldFlush) {
            await this.flushBuffer(buffer, onAudioChunk, options);
        }
    }
}


module.exports = new ElevenLabsService();