/**
 * Assistant Routes
 * Handles CRUD operations for AI assistants
 */

const express = require('express');
const router = express.Router();
const Assistant = require('../models/Assistant');
const { authenticateToken } = require('../middleware/auth');

/**
 * GET /api/assistants
 * Get all assistants for the authenticated user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const assistants = await Assistant.getAllAssistants(userId);
    
    res.json({
      success: true,
      assistants: assistants || []
    });
  } catch (error) {
    console.error('❌ Error fetching assistants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assistants'
    });
  }
});

/**
 * POST /api/assistants
 * Create a new assistant
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const assistantData = {
      ...req.body,
      userId: userId
    };

    const newAssistant = await Assistant.createAssistant(assistantData);
    
    res.json({
      success: true,
      message: 'Assistant created successfully',
      assistant: newAssistant
    });
  } catch (error) {
    console.error('❌ Error creating assistant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create assistant'
    });
  }
});

/**
 * GET /api/assistants/:id
 * Get a specific assistant by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const assistantId = req.params.id;
    
    const assistant = await Assistant.getAssistantById(assistantId, userId);
    
    if (!assistant) {
      return res.status(404).json({
        success: false,
        error: 'Assistant not found'
      });
    }
    
    res.json({
      success: true,
      assistant: assistant
    });
  } catch (error) {
    console.error('❌ Error fetching assistant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assistant'
    });
  }
});

/**
 * PUT /api/assistants/:id
 * Update an existing assistant
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const assistantId = req.params.id;
    const updateData = req.body;
    
    const updatedAssistant = await Assistant.updateAssistant(assistantId, updateData, userId);
    
    if (!updatedAssistant) {
      return res.status(404).json({
        success: false,
        error: 'Assistant not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Assistant updated successfully',
      assistant: updatedAssistant
    });
  } catch (error) {
    console.error('❌ Error updating assistant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update assistant'
    });
  }
});

/**
 * DELETE /api/assistants/:id
 * Delete an assistant
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const assistantId = req.params.id;
    
    const deleted = await Assistant.deleteAssistant(assistantId, userId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Assistant not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Assistant deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting assistant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete assistant'
    });
  }
});

module.exports = router;