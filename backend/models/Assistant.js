/**
 * Assistant Model
 * Handles CRUD operations for voice assistants
 */

const { getCollection } = require('../config/database');
const { ObjectId } = require('mongodb');

const COLLECTION_NAME = 'assistants';

/**
 * Create a new assistant
 */
async function createAssistant(assistantData) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    const assistant = {
      ...assistantData,
      id: `asst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: assistantData.status || 'inactive'
    };

    const result = await collection.insertOne(assistant);
    
    return {
      ...assistant,
      _id: result.insertedId
    };
  } catch (error) {
    console.error('❌ Error creating assistant:', error);
    throw error;
  }
}

/**
 * Get all assistants (optionally filtered by userId)
 */
async function getAllAssistants(userId = null) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    let query = {};
    
    if (userId) {
      console.log('🔍 Fetching assistants for userId:', userId, 'Type:', typeof userId);
      
      // IMPROVED: Try both ObjectId and string formats in a single query
      try {
        const objectIdUserId = new ObjectId(userId);
        // Query for BOTH ObjectId and string formats
        query = {
          $or: [
            { userId: objectIdUserId },  // ObjectId format
            { userId: userId }           // String format
          ]
        };
        console.log('✅ Using dual format query (ObjectId + String)');
      } catch (err) {
        console.log('⚠️ Invalid ObjectId format, using string only:', err.message);
        query = { userId: userId };
      }
    }
    
    const assistants = await collection.find(query).sort({ createdAt: -1 }).toArray();
    console.log(`📊 Found ${assistants.length} assistants with dual query`);
    
    // Debug: Show first assistant's userId format
    if (assistants.length > 0) {
      console.log('🔍 First assistant userId:', assistants[0].userId, 'Type:', typeof assistants[0].userId);
    }
    
    return assistants;
  } catch (error) {
    console.error('❌ Error fetching assistants:', error);
    throw error;
  }
}

/**
 * Get assistant by ID
 */
async function getAssistantById(id) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    const assistant = await collection.findOne({ id: id });
    return assistant;
  } catch (error) {
    console.error('❌ Error fetching assistant:', error);
    throw error;
  }
}

/**
 * Update assistant
 */
async function updateAssistant(id, updates) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    // Remove _id from updates to prevent immutable field error
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
    console.error('❌ Error updating assistant:', error);
    throw error;
  }
}

/**
 * Delete assistant
 */
async function deleteAssistant(id) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    const result = await collection.deleteOne({ id: id });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('❌ Error deleting assistant:', error);
    throw error;
  }
}

/**
 * Update assistant status
 */
async function updateAssistantStatus(id, status) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    const result = await collection.findOneAndUpdate(
      { id: id },
      { 
        $set: { 
          status: status,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    return result.value || result;
  } catch (error) {
    console.error('❌ Error updating assistant status:', error);
    throw error;
  }
}

/**
 * Get active assistants
 * @param {string|ObjectId} userId - Optional: Filter by user ID
 */
async function getActiveAssistants(userId = null) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    // Build query
    const query = { status: 'active' };
    
    // Add userId filter if provided
    if (userId) {
      const { ObjectId } = require('mongodb');
      query.userId = typeof userId === 'string' ? new ObjectId(userId) : userId;
    }
    
    const assistants = await collection.find(query).sort({ createdAt: -1 }).toArray();
    return assistants;
  } catch (error) {
    console.error('❌ Error fetching active assistants:', error);
    throw error;
  }
}

module.exports = {
  createAssistant,
  getAllAssistants,
  getAssistantById,
  updateAssistant,
  deleteAssistant,
  updateAssistantStatus,
  getActiveAssistants
};

