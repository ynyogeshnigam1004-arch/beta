/**
 * Test Voice Accent Controls
 * This script tests if the new voice accent controls are working properly
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testVoiceAccentControls() {
    console.log('🧪 Testing Voice Accent Controls...\n');

    // Test 1: Basic TTS with accent controls
    console.log('1️⃣ Testing basic TTS with US English accent...');
    try {
        const response1 = await axios.post(`${BASE_URL}/api/tts/synthesize`, {
            text: "Hello! This is a test of US English accent with normal speed.",
            voiceProvider: 'cartesia',
            voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
            modelId: 'sonic-3',
            voiceSettings: {
                language: 'en',
                dialect: 'us',
                speed: 1.0,
                emotion: 'neutral',
                volume: 1.0,
                pitch: 1.0
            }
        }, {
            responseType: 'arraybuffer'
        });

        fs.writeFileSync('test-us-english.wav', response1.data);
        console.log('✅ US English test completed - saved as test-us-english.wav');
    } catch (error) {
        console.error('❌ US English test failed:', error.response?.data || error.message);
    }

    // Test 2: British English accent
    console.log('\n2️⃣ Testing British English accent...');
    try {
        const response2 = await axios.post(`${BASE_URL}/api/tts/synthesize`, {
            text: "Good day! This is a test of British English accent, quite lovely indeed.",
            voiceProvider: 'cartesia',
            voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
            modelId: 'sonic-3',
            voiceSettings: {
                language: 'en',
                dialect: 'uk',
                speed: 1.0,
                emotion: 'confident',
                volume: 1.0,
                pitch: 1.0
            }
        }, {
            responseType: 'arraybuffer'
        });

        fs.writeFileSync('test-british-english.wav', response2.data);
        console.log('✅ British English test completed - saved as test-british-english.wav');
    } catch (error) {
        console.error('❌ British English test failed:', error.response?.data || error.message);
    }

    // Test 3: Fast speed with emotion
    console.log('\n3️⃣ Testing fast speed with happy emotion...');
    try {
        const response3 = await axios.post(`${BASE_URL}/api/tts/synthesize`, {
            text: "This is exciting! I'm speaking really fast with a happy emotion!",
            voiceProvider: 'cartesia',
            voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
            modelId: 'sonic-3',
            voiceSettings: {
                language: 'en',
                dialect: 'us',
                speed: 1.8,
                emotion: 'happy',
                volume: 1.2,
                pitch: 1.1
            }
        }, {
            responseType: 'arraybuffer'
        });

        fs.writeFileSync('test-fast-happy.wav', response3.data);
        console.log('✅ Fast happy test completed - saved as test-fast-happy.wav');
    } catch (error) {
        console.error('❌ Fast happy test failed:', error.response?.data || error.message);
    }

    // Test 4: Spanish accent
    console.log('\n4️⃣ Testing Spanish language...');
    try {
        const response4 = await axios.post(`${BASE_URL}/api/tts/synthesize`, {
            text: "Hola! Esta es una prueba del idioma español con acento mexicano.",
            voiceProvider: 'cartesia',
            voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
            modelId: 'sonic-3',
            voiceSettings: {
                language: 'es',
                dialect: 'mx',
                speed: 1.0,
                emotion: 'calm',
                volume: 1.0,
                pitch: 1.0
            }
        }, {
            responseType: 'arraybuffer'
        });

        fs.writeFileSync('test-spanish-mexican.wav', response4.data);
        console.log('✅ Spanish Mexican test completed - saved as test-spanish-mexican.wav');
    } catch (error) {
        console.error('❌ Spanish Mexican test failed:', error.response?.data || error.message);
    }

    // Test 5: Slow and deep voice
    console.log('\n5️⃣ Testing slow speed with low pitch...');
    try {
        const response5 = await axios.post(`${BASE_URL}/api/tts/synthesize`, {
            text: "This is a very slow and deep voice speaking with low pitch and volume.",
            voiceProvider: 'cartesia',
            voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
            modelId: 'sonic-3',
            voiceSettings: {
                language: 'en',
                dialect: 'us',
                speed: 0.6,
                emotion: 'calm',
                volume: 0.8,
                pitch: 0.7
            }
        }, {
            responseType: 'arraybuffer'
        });

        fs.writeFileSync('test-slow-deep.wav', response5.data);
        console.log('✅ Slow deep test completed - saved as test-slow-deep.wav');
    } catch (error) {
        console.error('❌ Slow deep test failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Voice accent control tests completed!');
    console.log('📁 Check the generated .wav files to hear the differences:');
    console.log('   - test-us-english.wav (US English, normal)');
    console.log('   - test-british-english.wav (British English, confident)');
    console.log('   - test-fast-happy.wav (Fast speed, happy emotion)');
    console.log('   - test-spanish-mexican.wav (Spanish Mexican accent)');
    console.log('   - test-slow-deep.wav (Slow speed, low pitch)');
}

// Run the tests
testVoiceAccentControls().catch(console.error);