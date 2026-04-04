/**
 * Tools API Routes
 * Handles CRUD operations for function calling tools
 */

const express = require('express');
const router = express.Router();
const {
  createTool,
  getAllTools,
  getToolById,
  updateTool,
  deleteTool
} = require('../models/Tool');
const { authenticate } = require('../middleware/auth');

/**
 * GET /api/tools
 * Get all tools for authenticated user
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('📥 Fetching tools for user:', userId);
    
    const tools = await getAllTools(userId);
    
    console.log(`✅ Returning ${tools.length} tool(s)`);
    
    res.json({
      success: true,
      tools
    });
  } catch (error) {
    console.error('❌ Error fetching tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tools'
    });
  }
});

/**
 * GET /api/tools/:id
 * Get specific tool by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const tool = await getToolById(req.params.id);
    
    if (!tool) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found'
      });
    }
    
    // Verify ownership
    if (tool.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      tool
    });
  } catch (error) {
    console.error('❌ Error fetching tool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tool'
    });
  }
});

/**
 * POST /api/tools
 * Create new tool
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log('📥 Creating tool for user:', userId);
    console.log('📦 Tool data:', JSON.stringify(req.body, null, 2));
    
    const toolData = {
      ...req.body,
      userId
    };
    
    const tool = await createTool(toolData);
    
    console.log('✅ Tool created successfully:', tool.id);
    
    res.json({
      success: true,
      tool
    });
  } catch (error) {
    console.error('❌ Error creating tool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tool',
      details: error.message
    });
  }
});

/**
 * PUT /api/tools/:id
 * Update tool
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const tool = await getToolById(req.params.id);
    
    if (!tool) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found'
      });
    }
    
    // Verify ownership
    if (tool.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const updatedTool = await updateTool(req.params.id, req.body);
    
    res.json({
      success: true,
      tool: updatedTool
    });
  } catch (error) {
    console.error('❌ Error updating tool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tool'
    });
  }
});

/**
 * DELETE /api/tools/:id
 * Delete tool
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const tool = await getToolById(req.params.id);
    
    if (!tool) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found'
      });
    }
    
    // Verify ownership
    if (tool.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    await deleteTool(req.params.id);
    
    res.json({
      success: true,
      message: 'Tool deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting tool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tool'
    });
  }
});

module.exports = router;
