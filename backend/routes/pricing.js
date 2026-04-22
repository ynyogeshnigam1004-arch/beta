/**
 * Pricing Routes
 * Provides pricing information for various services
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/pricing
 * Get pricing information
 */
router.get('/', (req, res) => {
  try {
    const pricing = {
      llm: {
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
        'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
      },
      transcription: {
        'deepgram-nova-2': 0.0043,
        'deepgram-nova': 0.0059,
        'whisper': 0.006
      },
      tts: {
        'cartesia': 0.000015,
        'elevenlabs': 0.00003,
        'openai': 0.000015
      },
      telephony: {
        'twilio-inbound': 0.0085,
        'twilio-outbound': 0.013,
        'twilio-sms': 0.0075
      }
    };

    res.json({
      success: true,
      pricing
    });
  } catch (error) {
    console.error('❌ Error fetching pricing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pricing'
    });
  }
});

module.exports = router;
