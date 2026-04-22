/**
 * LLM Models Routes
 * Provides available LLM models for assistants
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/models
 * Get available LLM models
 */
router.get('/', (req, res) => {
  try {
    const models = [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        description: 'Most capable model, best for complex tasks',
        contextWindow: 128000,
        pricing: { input: 0.005, output: 0.015 }
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        description: 'Fast and affordable, great for most tasks',
        contextWindow: 128000,
        pricing: { input: 0.00015, output: 0.0006 }
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        description: 'Fast and cost-effective',
        contextWindow: 16385,
        pricing: { input: 0.0005, output: 0.0015 }
      },
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        description: 'Excellent reasoning and analysis',
        contextWindow: 200000,
        pricing: { input: 0.003, output: 0.015 }
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        description: 'Fast and efficient',
        contextWindow: 200000,
        pricing: { input: 0.00025, output: 0.00125 }
      }
    ];

    res.json({
      success: true,
      models
    });
  } catch (error) {
    console.error('❌ Error fetching models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch models'
    });
  }
});

module.exports = router;
