/**
 * Voice Routes
 * Provides available TTS voices
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/voices
 * Get available TTS voices
 */
router.get('/', (req, res) => {
  try {
    const voices = [
      {
        id: 'cartesia-sonic-english',
        name: 'Sonic (English)',
        provider: 'Cartesia',
        language: 'en',
        gender: 'male',
        description: 'Natural and expressive'
      },
      {
        id: 'cartesia-luna-english',
        name: 'Luna (English)',
        provider: 'Cartesia',
        language: 'en',
        gender: 'female',
        description: 'Warm and friendly'
      },
      {
        id: 'elevenlabs-rachel',
        name: 'Rachel',
        provider: 'ElevenLabs',
        language: 'en',
        gender: 'female',
        description: 'Professional and clear'
      },
      {
        id: 'elevenlabs-adam',
        name: 'Adam',
        provider: 'ElevenLabs',
        language: 'en',
        gender: 'male',
        description: 'Deep and authoritative'
      },
      {
        id: 'openai-alloy',
        name: 'Alloy',
        provider: 'OpenAI',
        language: 'en',
        gender: 'neutral',
        description: 'Balanced and versatile'
      },
      {
        id: 'openai-nova',
        name: 'Nova',
        provider: 'OpenAI',
        language: 'en',
        gender: 'female',
        description: 'Energetic and engaging'
      }
    ];

    res.json({
      success: true,
      voices
    });
  } catch (error) {
    console.error('❌ Error fetching voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voices'
    });
  }
});

module.exports = router;
