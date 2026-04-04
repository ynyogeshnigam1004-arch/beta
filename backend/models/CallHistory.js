/**
 * Call History Model
 * Stores conversation history and call logs
 */

const { getCollection } = require('../config/database');
const { ObjectId } = require('mongodb');

const COLLECTION_NAME = 'call_history';

/**
 * Create a new call record
 */
async function createCall(callData) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    const call = {
      callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assistantId: callData.assistantId,
      connectionId: callData.connectionId,
      startTime: new Date().toISOString(),
      endTime: null,
      duration: 0,
      conversationHistory: [],
      metrics: {
        totalLatency: 0,
        sttLatency: 0,
        llmLatency: 0,
        ttsLatency: 0,
        audioChunksReceived: 0,
        audioChunksProcessed: 0
      },
      status: 'active'
    };

    const result = await collection.insertOne(call);
    
    return {
      ...call,
      _id: result.insertedId
    };
  } catch (error) {
    console.error('❌ Error creating call record:', error);
    throw error;
  }
}

/**
 * Add conversation message to call
 */
async function addConversationMessage(callId, message) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    const conversationEntry = {
      role: message.role, // 'user' or 'assistant'
      content: message.content,
      timestamp: new Date().toISOString()
    };

    const result = await collection.findOneAndUpdate(
      { callId: callId },
      { 
        $push: { conversationHistory: conversationEntry },
        $set: { updatedAt: new Date().toISOString() }
      },
      { returnDocument: 'after' }
    );

    return result;
  } catch (error) {
    console.error('❌ Error adding conversation message:', error);
    throw error;
  }
}

/**
 * Update call metrics
 */
async function updateCallMetrics(callId, metrics) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    const result = await collection.findOneAndUpdate(
      { callId: callId },
      { 
        $set: { 
          metrics: metrics,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  } catch (error) {
    console.error('❌ Error updating call metrics:', error);
    throw error;
  }
}

/**
 * End a call
 */
async function endCall(callId, finalMetrics) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    // Get the call to calculate duration
    const call = await collection.findOne({ callId: callId });
    
    if (!call) {
      throw new Error(`Call ${callId} not found`);
    }

    const startTime = new Date(call.startTime);
    const endTime = new Date();
    const duration = Math.floor((endTime - startTime) / 1000); // in seconds

    const result = await collection.findOneAndUpdate(
      { callId: callId },
      { 
        $set: { 
          endTime: endTime.toISOString(),
          duration: duration,
          metrics: finalMetrics || call.metrics,
          status: 'completed',
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: 'after' }
    );

    return result;
  } catch (error) {
    console.error('❌ Error ending call:', error);
    throw error;
  }
}

/**
 * Get call by ID
 */
async function getCallById(callId) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    const call = await collection.findOne({ callId: callId });
    return call;
  } catch (error) {
    console.error('❌ Error fetching call:', error);
    throw error;
  }
}

/**
 * Get all calls for a specific user
 */
async function getAllCalls(limit = 50, userId = null, callType = null) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    const query = {};
    
    // Handle flexible userId format (string or ObjectId or query object)
    if (userId) {
      if (typeof userId === 'object' && userId.$in) {
        query.userId = userId; // Already a query object
      } else {
        query.userId = userId; // Simple value
      }
    }
    if (callType) query.callType = callType;
    
    console.log('📞 CallHistory.getAllCalls query:', JSON.stringify(query));
    
    const calls = await collection
      .find(query)
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
      
    console.log(`📞 CallHistory.getAllCalls found ${calls.length} calls`);
    return calls;
  } catch (error) {
    console.error('❌ Error fetching calls:', error);
    throw error;
  }
}

/**
 * Get calls by assistant ID for a specific user
 */
async function getCallsByAssistant(assistantId, limit = 20, userId = null, callType = null) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    const query = { assistantId: assistantId };
    
    // Handle flexible userId format
    if (userId) {
      if (typeof userId === 'object' && userId.$in) {
        query.userId = userId; // Already a query object
      } else {
        query.userId = userId; // Simple value
      }
    }
    if (callType) query.callType = callType;
    
    console.log('📞 CallHistory.getCallsByAssistant query:', JSON.stringify(query));
    
    const calls = await collection
      .find(query)
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();
      
    console.log(`📞 CallHistory.getCallsByAssistant found ${calls.length} calls`);
    return calls;
  } catch (error) {
    console.error('❌ Error fetching calls by assistant:', error);
    throw error;
  }
}

/**
 * Get call statistics for a specific user (PHONE CALLS ONLY)
 */
async function getCallStats(assistantId = null, userId = null) {
  try {
    const collection = getCollection(COLLECTION_NAME);
    
    const matchStage = {
      callType: 'inbound' // ONLY phone calls for analytics
    };
    if (assistantId) matchStage.assistantId = assistantId;
    
    // Handle flexible userId format
    if (userId) {
      if (typeof userId === 'object' && userId.$in) {
        matchStage.userId = userId; // Already a query object
      } else {
        matchStage.userId = userId; // Simple value
      }
    }
    
    console.log('📊 CallHistory.getCallStats matchStage:', JSON.stringify(matchStage));
    
    const stats = await collection.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalCalls: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          avgLatency: { $avg: '$metrics.totalLatency' },
          avgSTTLatency: { $avg: '$metrics.sttLatency' },
          avgLLMLatency: { $avg: '$metrics.llmLatency' },
          avgTTSLatency: { $avg: '$metrics.ttsLatency' }
        }
      }
    ]).toArray();

    return stats[0] || {
      totalCalls: 0,
      totalDuration: 0,
      avgLatency: 0,
      avgSTTLatency: 0,
      avgLLMLatency: 0,
      avgTTSLatency: 0
    };
  } catch (error) {
    console.error('❌ Error fetching call stats:', error);
    throw error;
  }
}

module.exports = {
  createCall,
  addConversationMessage,
  updateCallMetrics,
  endCall,
  getCallById,
  getAllCalls,
  getCallsByAssistant,
  getCallStats
};

