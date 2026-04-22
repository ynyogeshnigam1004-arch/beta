/**
 * Transcriber Routes
 * Provides available speech-to-text transcribers
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/transcribers
 * Get available transcribers
 */
router.get('/', (req, res) => {
  try {
    const transcribers = [
      {
        id: 'deepgram-nova-2',
        name: 'Deepgram Nova 2',
        provider: 'Deepgram',
        description: 'Latest and most accurate model',
        languages: ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'],
        pricing: 0.0043
      },
      {
        id: 'deepgram-nova',
        name: 'Deepgram Nova',
        provider: 'Deepgram',
        description: 'Fast and accurate',
        languages: ['en', 'es', 'fr', 'de', 'pt'],
        pricing: 0.0059
      },
      {
        id: 'whisper-large',
        name: 'Whisper Large',
        provider: 'OpenAI',
        description: 'High accuracy, supports many languages',
        languages: ['en', 'es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh', 'ar', 'hi'],
        pricing: 0.006
      },
      {
        id: 'whisper-medium',
        name: 'Whisper Medium',
        provider: 'OpenAI',
        description: 'Balanced speed and accuracy',
        languages: ['en', 'es', 'fr', 'de', 'pt'],
        pricing: 0.004
      },
      {
        id: 'whisper-small',
        name: 'Whisper Small',
        provider: 'OpenAI',
        description: 'Fast and cost-effective',
        languages: ['en', 'es', 'fr'],
        pricing: 0.002
      }
    ];

    res.json({
      success: true,
      transcribers
    });
  } catch (error) {
    console.error('❌ Error fetching transcribers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transcribers'
    });
  }
});

module.exports = router;
