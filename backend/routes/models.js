/**
 * Models Routes
 * Handles LLM model information and pricing
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/models
 * Get available LLM models
 */
router.get('/', async (req, res) => {
  try {
    const models = [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        provider: 'Groq',
        contextLength: 131072,
        pricing: { input: 0.59, output: 0.79 },
        description: 'Most capable model for complex conversations'
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: 'Groq',
        contextLength: 131072,
        pricing: { input: 0.05, output: 0.08 },
        description: 'Fastest model for quick responses'
      }
    ];
    
    res.json({
      success: true,
      models: models
    });
  } catch (error) {
    console.error('❌ Error fetching models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models'
    });
  }
});

/**
 * GET /api/models/pricing
 * Get pricing information
 */
router.get('/pricing', async (req, res) => {
  try {
    const pricing = {
      llm: { input: 0.59, output: 0.79 },
      stt: { perMinute: 0.006 },
      tts: { perCharacter: 0.00003 }
    };
    
    res.json({
      success: true,
      pricing: pricing
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