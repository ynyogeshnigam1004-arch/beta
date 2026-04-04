/**
 * Tool Model
 * Handles CRUD operations for function calling tools
 */

const { getCollection } = require('../config/database');
const { ObjectId } = require('mongodb');

const COLLECTION_NAME = 'tools';

/**
 * Create a new tool
 */
async function createTool(toolData) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    // Ensure userId is stored as ObjectId for consistent querying
    const userId = toolData.userId instanceof ObjectId 
      ? toolData.userId 
      : new ObjectId(toolData.userId);
    
    const tool = {
      ...toolData,
      userId, // Store as ObjectId
      id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(tool);
    
    console.log('✅ Tool created successfully:', tool.id);
    
    return {
      ...tool,
      _id: result.insertedId
    };
  } catch (error) {
    console.error('❌ Error creating tool:', error);
    throw error;
  }
}

/**
 * Get all tools for a user
 */
async function getAllTools(userId) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    // Ensure userId is ObjectId for querying
    const userObjectId = userId instanceof ObjectId 
      ? userId 
      : new ObjectId(userId);
    
    const query = { userId: userObjectId };
    const tools = await collection.find(query).sort({ createdAt: -1 }).toArray();
    
    console.log(`📋 Found ${tools.length} tool(s) for user ${userId}`);
    
    return tools;
  } catch (error) {
    console.error('❌ Error fetching tools:', error);
    throw error;
  }
}

/**
 * Get tool by ID
 */
async function getToolById(id) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    const tool = await collection.findOne({ id: id });
    return tool;
  } catch (error) {
    console.error('❌ Error fetching tool:', error);
    throw error;
  }
}

/**
 * Update tool
 */
async function updateTool(id, updates) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    const { _id, ...updateFields } = updates;
    
    const updateData = {
      ...updateFields,
      updatedAt: new Date().toISOString()
    };

    const result = await collection.findOneAndUpdate(
      { id: id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    return result.value || result;
  } catch (error) {
    console.error('❌ Error updating tool:', error);
    throw error;
  }
}

/**
 * Delete tool
 */
async function deleteTool(id) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    const result = await collection.deleteOne({ id: id });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('❌ Error deleting tool:', error);
    throw error;
  }
}

/**
 * Get tools by IDs (for assistant tool linking)
 */
async function getToolsByIds(toolIds) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    const tools = await collection.find({ id: { $in: toolIds } }).toArray();
    return tools;
  } catch (error) {
    console.error('❌ Error fetching tools by IDs:', error);
    throw error;
  }
}

module.exports = {
  createTool,
  getAllTools,
  getToolById,
  updateTool,
  deleteTool,
  getToolsByIds
};
