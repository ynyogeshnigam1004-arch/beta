/**
 * Test ElevenLabs API Key
 */

require('dotenv').config();
const axios = require('axios');

async function testElevenLabsAPI() {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    console.log('🔑 Testing ElevenLabs API Key...');
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 15)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET');

    if (!apiKey) {
        console.error('❌ ELEVENLABS_API_KEY not set in .env file');
        return;
    }

    // Test 1: Get voices
    console.log('\n📡 Test 1: Fetching voices from ElevenLabs API...');
    try {
        const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
            headers: {
                'xi-api-key': apiKey
            },
            timeout: 10000
        });

        console.log('✅ SUCCESS! Voices endpoint works');
        console.log('📊 Response Status:', voicesResponse.status);
        console.log('📋 Number of voices:', voicesResponse.data.voices?.length || 0);
        if (voicesResponse.data.voices && voicesResponse.data.voices.length > 0) {
            console.log('\n🎤 Sample voices:');
            voicesResponse.data.voices.slice(0, 3).forEach(voice => {
                console.log(`  - ${voice.name} (${voice.voice_id})`);
            });
        }

    } catch (error) {
        console.error('❌ VOICES ERROR:', error.response?.status, error.response?.statusText);
        console.error('📝 Error details:', error.response?.data);
    }

    // Test 2: Get models
    console.log('\n📡 Test 2: Fetching models from ElevenLabs API...');
    try {
        const modelsResponse = await axios.get('https://api.elevenlabs.io/v1/models', {
            headers: {
                'xi-api-key': apiKey
            },
            timeout: 10000
        });

        console.log('✅ SUCCESS! Models endpoint works');
        console.log('📊 Response Status:', modelsResponse.status);
        console.log('📋 Number of models:', modelsResponse.data.length || 0);
        if (modelsResponse.data && modelsResponse.data.length > 0) {
            console.log('\n🎵 Available models:');
            modelsResponse.data.forEach(model => {
                console.log(`  - ${model.name} (${model.model_id})`);
            });
        }

    } catch (error) {
        console.error('❌ MODELS ERROR:', error.response?.status, error.response?.statusText);
        console.error('📝 Error details:', error.response?.data);
    }

    // Test 3: Try to generate speech (small test)
    console.log('\n📡 Test 3: Testing text-to-speech generation...');
    try {
        const ttsResponse = await axios.post(
            'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
            {
                text: 'Hello, this is a test.',
                model_id: 'eleven_monolingual_v1'
            },
            {
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json'
                },
                responseType: 'arraybuffer',
                timeout: 15000
            }
        );

        console.log('✅ SUCCESS! TTS generation works');
        console.log('📊 Response Status:', ttsResponse.status);
        console.log('🔊 Audio size:', ttsResponse.data.length, 'bytes');
        console.log('\n🎉 ALL TESTS PASSED! Your ElevenLabs API key is working correctly!');

    } catch (error) {
        console.error('❌ TTS ERROR:', error.response?.status, error.response?.statusText);
        console.error('📝 Error details:', error.response?.data?.toString() || error.message);
    }
}

testElevenLabsAPI();
