/**
 * Voice AI Calling Platform - Main Server
 * WebSocket server for real-time voice AI interactions
 * Similar to VAPI.ai architecture
 */

require('dotenv').config({ override: true });
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const StreamingPipeline = require('./services/streamingPipeline');
const VoiceCallWorkflow = require('./workflows/voiceCallWorkflow');
const MainPipeline = require('./pipelines/mainPipeline');
const APIDataManager = require('./services/apiDataManager');

// MongoDB connection
const { connectDB, checkConnection, getCollection } = require('./config/database');
const AssistantModel = require('./models/Assistant');
const CallHistoryModel = require('./models/CallHistory');
const LLMModel = require('./models/LLMModel');

// Auth Middleware
const { authenticate } = require('./middleware/auth');

// Server configuration
const PORT = process.env.PORT || 5000;
const WS_HEARTBEAT_INTERVAL = parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000;
const WS_MAX_PAYLOAD = parseInt(process.env.WS_MAX_PAYLOAD) || 10485760; // 10MB

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // CRITICAL: Parse Twilio form data

// Serve frontend static files
app.use(express.static('../frontend/dist'));

// CORS headers for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Initialize WebSocket server (noServer mode for manual routing)
const wss = new WebSocket.Server({
  noServer: true,
  maxPayload: WS_MAX_PAYLOAD,
});

// Track active connections
const activeConnections = new Map();

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const pipeline = new StreamingPipeline();
    const health = await pipeline.healthCheck();
    const dbStatus = await checkConnection();
    
    res.json({
      status: health.overall && dbStatus.connected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: health,
      database: dbStatus,
      connections: activeConnections.size,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

/**
 * Get server status
 */
app.get('/status', (req, res) => {
  res.json({
    uptime: process.uptime(),
    connections: activeConnections.size,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get all available models (LLM + STT + TTS) from Groq API
 * FORCES fresh API fetch - NO FALLBACKS
 */
app.get('/api/models', async (req, res) => {
  try {
    console.log('🚀 FORCING fresh model fetch from Groq API...');
    
    const apiManager = new APIDataManager();
    const groqData = await apiManager.fetchAllGroqModels();
    
    // Add Deepgram STT models if API key is configured
    if (process.env.DEEPGRAM_API_KEY) {
      console.log('✅ Adding Deepgram STT models to response...');
      groqData.stt['deepgram-nova-2'] = {
        id: 'deepgram-nova-2',
        name: 'Deepgram Nova-2 (ULTRA-FAST)',
        description: 'Ultra-fast real-time transcription - 3x faster than Whisper',
        category: 'stt',
        ownedBy: 'Deepgram',
        latency: 400,
        speedFactor: 'Real-time',
        accuracy: 'High',
        pricing: {
          pricePerHour: 0.258,
          pricePerMinute: 0.0043
        },
        active: true
      };
      groqData.stt['deepgram-nova-2-general'] = {
        id: 'deepgram-nova-2-general',
        name: 'Deepgram Nova-2 General',
        description: 'General purpose ultra-fast transcription',
        category: 'stt',
        ownedBy: 'Deepgram',
        latency: 400,
        speedFactor: 'Real-time',
        accuracy: 'High',
        pricing: {
          pricePerHour: 0.258,
          pricePerMinute: 0.0043
        },
        active: true
      };
      groqData.stt['deepgram-nova-2-phonecall'] = {
        id: 'deepgram-nova-2-phonecall',
        name: 'Deepgram Nova-2 Phone Call',
        description: 'Optimized for phone call transcription',
        category: 'stt',
        ownedBy: 'Deepgram',
        latency: 400,
        speedFactor: 'Real-time',
        accuracy: 'High',
        pricing: {
          pricePerHour: 0.258,
          pricePerMinute: 0.0043
        },
        active: true
      };
      console.log('✅ Added 3 Deepgram models to STT list');
    }
    
    res.json({
      success: true,
      models: groqData,
      source: 'groq_api_fresh',
      timestamp: new Date().toISOString(),
      summary: {
        llm: Object.keys(groqData.llm).length,
        stt: Object.keys(groqData.stt).length,
        tts: Object.keys(groqData.tts).length,
        total: Object.keys(groqData.llm).length + Object.keys(groqData.stt).length + Object.keys(groqData.tts).length
      }
    });
  } catch (error) {
    console.error('❌ CRITICAL ERROR fetching models:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch models from Groq API. Check your API key configuration.'
    });
  }
});

/**
 * Refresh all models from Groq API and update MongoDB
 */
app.post('/api/models/refresh', async (req, res) => {
  try {
    const pipeline = new StreamingPipeline();
    
    console.log('🔄 Refreshing all models from Groq API...');
    const allModels = await pipeline.groqService.fetchAllModelsFromAPI();
    
    // Save LLM models to MongoDB
    await LLMModel.saveModels(allModels.llm);
    
    res.json({
      success: true,
      message: `Refreshed ${Object.keys(allModels.llm).length} LLM models, ${Object.keys(allModels.stt).length} STT models, ${Object.keys(allModels.tts).length} TTS models`,
      models: allModels,
      timestamp: new Date().toISOString(),
      summary: {
        llm: Object.keys(allModels.llm).length,
        stt: Object.keys(allModels.stt).length,
        tts: Object.keys(allModels.tts).length,
        total: Object.keys(allModels.llm).length + Object.keys(allModels.stt).length + Object.keys(allModels.tts).length
      }
    });
  } catch (error) {
    console.error('❌ Error refreshing all models:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get available Whisper transcriber models (STT models from Groq)
 * FORCES fresh API fetch - NO FALLBACKS
 */
app.get('/api/transcribers', async (req, res) => {
  try {
    console.log('🚀 FORCING fresh transcriber fetch from Groq API...');
    
    const apiManager = new APIDataManager();
    const groqData = await apiManager.fetchAllGroqModels();
    
    // Add Deepgram STT models if API key is configured
    if (process.env.DEEPGRAM_API_KEY) {
      console.log('✅ Adding Deepgram STT models to transcribers response...');
      groqData.stt['deepgram-nova-2'] = {
        id: 'deepgram-nova-2',
        name: 'Deepgram Nova-2 (ULTRA-FAST)',
        description: 'Ultra-fast real-time transcription - 3x faster than Whisper',
        category: 'stt',
        ownedBy: 'Deepgram',
        latency: 400,
        speedFactor: 'Real-time',
        accuracy: 'High',
        pricing: {
          inputPerHour: 0.258,
          inputPerMinute: 0.0043
        },
        active: true
      };
      groqData.stt['deepgram-nova-2-general'] = {
        id: 'deepgram-nova-2-general',
        name: 'Deepgram Nova-2 General',
        description: 'General purpose ultra-fast transcription',
        category: 'stt',
        ownedBy: 'Deepgram',
        latency: 400,
        speedFactor: 'Real-time',
        accuracy: 'High',
        pricing: {
          inputPerHour: 0.258,
          inputPerMinute: 0.0043
        },
        active: true
      };
      groqData.stt['deepgram-nova-2-phonecall'] = {
        id: 'deepgram-nova-2-phonecall',
        name: 'Deepgram Nova-2 Phone Call',
        description: 'Optimized for phone call transcription',
        category: 'stt',
        ownedBy: 'Deepgram',
        latency: 400,
        speedFactor: 'Real-time',
        accuracy: 'High',
        pricing: {
          inputPerHour: 0.258,
          inputPerMinute: 0.0043
        },
        active: true
      };
      console.log('✅ Added 3 Deepgram models to transcribers list');
    }
    
    res.json({
      success: true,
      models: { stt: groqData.stt },  // Match the format frontend expects
      transcribers: groqData.stt,
      source: 'groq_api_fresh',
      timestamp: new Date().toISOString(),
      count: Object.keys(groqData.stt).length
    });
  } catch (error) {
    console.error('❌ CRITICAL ERROR fetching transcribers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch transcribers from Groq API. Check your API key configuration.'
    });
  }
});

/**
 * Get available voice models and voices (Cartesia) - Fetched from API
 * FORCES fresh API fetch - NO FALLBACKS
 */
app.get('/api/voices', async (req, res) => {
  try {
    console.log('🚀 FORCING fresh voices fetch from Cartesia API...');
    
    const apiManager = new APIDataManager();
    const cartesiaData = await apiManager.fetchAllCartesiaData();
    
    res.json({
      success: true,
      models: cartesiaData.models,
      voices: cartesiaData.voices,
      source: 'cartesia_api_fresh',
      timestamp: cartesiaData.fetchedAt,
      summary: {
        models: cartesiaData.totalModels,
        voices: cartesiaData.totalVoices,
        total: cartesiaData.totalModels + cartesiaData.totalVoices
      }
    });
  } catch (error) {
    console.error('❌ CRITICAL ERROR fetching voices:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch voices from Cartesia API. Check your API key configuration.'
    });
  }
});

/**
 * Get all available data from all providers (Groq + Cartesia)
 * FORCES fresh API fetch - NO FALLBACKS
 */
app.get('/api/all', async (req, res) => {
  try {
    console.log('🚀 FORCING fresh fetch of ALL data from ALL providers...');
    
    const apiManager = new APIDataManager();
    const completeData = await apiManager.fetchAndSaveAllData();
    
    res.json({
      success: true,
      providers: {
        groq: {
          models: completeData.groq,
          summary: {
            llm: Object.keys(completeData.groq.llm).length,
            stt: Object.keys(completeData.groq.stt).length,
            tts: Object.keys(completeData.groq.tts).length,
            total: Object.keys(completeData.groq.llm).length + Object.keys(completeData.groq.stt).length + Object.keys(completeData.groq.tts).length
          }
        },
        cartesia: {
          models: completeData.cartesia.models,
          voices: completeData.cartesia.voices,
          summary: {
            models: completeData.cartesia.totalModels,
            voices: completeData.cartesia.totalVoices,
            total: completeData.cartesia.totalModels + completeData.cartesia.totalVoices
          }
        }
      },
      timestamp: completeData.fetchedAt,
      totalSummary: completeData.summary
    });
  } catch (error) {
    console.error('❌ CRITICAL ERROR fetching all data:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch data from APIs. Check your API key configuration.'
    });
  }
});

/**
 * Get pricing information with dual currency display
 */
app.get('/api/pricing', async (req, res) => {
  try {
    const pricingService = require('./services/pricingService');
    
    res.json({
      success: true,
      pricing: await pricingService.getAllModelPricing(),
      platformFee: {
        usd: pricingService.PLATFORM_FEE.USD,
        inr: pricingService.PLATFORM_FEE.INR,
        display: `$${pricingService.PLATFORM_FEE.USD}/₹${pricingService.PLATFORM_FEE.INR}`,
        unit: 'per minute'
      },
      exchangeRate: pricingService.EXCHANGE_RATES.INR,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Calculate cost estimate for assistant configuration
 */
app.post('/api/calculate-cost', async (req, res) => {
  try {
    const pricingService = require('./services/pricingService');
    const config = req.body;
    
    // Validate required fields
    if (!config.model || !config.transcriber || !config.voiceModel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: model, transcriber, voiceModel'
      });
    }
    
    const costs = await pricingService.calculateAssistantCosts(config);
    
    res.json({
      success: true,
      costs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get all assistants
 */
app.get('/api/assistants', async (req, res) => {
  try {
    // Get userId from token
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
        console.log('🔐 Decoded userId from token:', userId, 'Type:', typeof userId);
      } catch (err) {
        console.log('⚠️ Invalid token, returning empty assistants');
      }
    }
    
    const dbStatus = await checkConnection();
    if (!dbStatus.connected) {
      return res.json({
        success: true,
        assistants: [],
        warning: 'Database not connected',
        timestamp: new Date().toISOString(),
      });
    }
    
    console.log('📡 Fetching assistants for userId:', userId);
    
    // Get assistants filtered by userId
    const assistants = await AssistantModel.getAllAssistants(userId);
    
    console.log(`✅ Returning ${assistants.length} assistants to frontend`);
    
    res.json({
      success: true,
      assistants: assistants,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching assistants:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Create new assistant
 */
app.post('/api/assistants', async (req, res) => {
  try {
    // Get userId from token
    const token = req.headers.authorization?.replace('Bearer ', '');
    let userId = null;
    
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Check if database is connected
    const dbStatus = await checkConnection();
    if (!dbStatus.connected) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Cannot save assistant - MongoDB is not connected. Please check your database configuration.',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Add userId to assistant data
    const { ObjectId } = require('mongodb');
    const assistantData = {
      ...req.body,
      userId: new ObjectId(userId)
    };
    
    const newAssistant = await AssistantModel.createAssistant(assistantData);
    
    console.log(`✅ Created assistant: ${newAssistant.id} for user: ${userId}`);
    
    res.json({
      success: true,
      assistant: newAssistant,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error creating assistant:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Update assistant
 */
app.put('/api/assistants/:id', async (req, res) => {
  try {
    // Check if database is connected
    const dbStatus = await checkConnection();
    if (!dbStatus.connected) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Cannot update assistant - MongoDB is not connected. Please check your database configuration.',
        timestamp: new Date().toISOString(),
      });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Get the existing assistant first to preserve userId
    const existingAssistant = await AssistantModel.getAssistantById(id);
    if (!existingAssistant) {
      return res.status(404).json({
        success: false,
        error: 'Assistant not found',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Ensure userId is preserved from existing assistant (don't allow frontend to change it)
    const { ObjectId } = require('mongodb');
    const updatesWithUserId = {
      ...updates,
      userId: existingAssistant.userId // Preserve the original userId
    };
    
    const updatedAssistant = await AssistantModel.updateAssistant(id, updatesWithUserId);
    
    console.log(`✅ Updated assistant: ${id} (userId preserved: ${existingAssistant.userId})`);
    
    res.json({
      success: true,
      assistant: updatedAssistant,
      message: `Assistant ${id} updated successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error updating assistant:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Cleanup: Delete all assistants except "mine" and save as default template
 */
app.post('/api/admin/cleanup-assistants', async (req, res) => {
  try {
    const assistantsCollection = getCollection('assistants');
    const usersCollection = getCollection('users');
    
    // Find admin user
    const adminUser = await usersCollection.findOne({ role: 'admin' });
    
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        error: 'No admin user found'
      });
    }
    
    // Get all assistants
    const allAssistants = await assistantsCollection.find({}).toArray();
    
    // Find "mine" assistant
    const mineAssistant = allAssistants.find(a => a.name === 'mine');
    
    if (!mineAssistant) {
      return res.status(404).json({
        success: false,
        error: '"mine" assistant not found',
        available: allAssistants.map(a => a.name)
      });
    }
    
    // Update "mine" assistant to belong to admin
    await assistantsCollection.updateOne(
      { _id: mineAssistant._id },
      { $set: { userId: adminUser._id } }
    );
    
    // Delete all other assistants
    const toDelete = allAssistants.filter(a => a.name !== 'mine');
    let deletedCount = 0;
    
    if (toDelete.length > 0) {
      const deleteResult = await assistantsCollection.deleteMany({
        name: { $ne: 'mine' }
      });
      deletedCount = deleteResult.deletedCount;
    }
    
    // Save "mine" assistant config as default template
    const defaultTemplate = {
      name: 'My First Assistant',
      model: mineAssistant.model || 'llama-3.1-8b-instant',
      transcriber: mineAssistant.transcriber || 'whisper-large-v3-turbo',
      voiceProvider: mineAssistant.voiceProvider || 'cartesia',
      voiceModel: mineAssistant.voiceModel || 'sonic-2024-10',
      voiceId: mineAssistant.voiceId || 'a0e99841-438c-4a64-b679-ae501e7d6091',
      elevenLabsVoiceId: mineAssistant.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
      elevenLabsModel: mineAssistant.elevenLabsModel || 'eleven_turbo_v2',
      elevenLabsSettings: mineAssistant.elevenLabsSettings || {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true
      },
      useCustomVoiceId: mineAssistant.useCustomVoiceId || false,
      customVoiceId: mineAssistant.customVoiceId || '',
      voice: mineAssistant.voice || 'Cartesia Sonic',
      status: 'active',
      firstMessageMode: mineAssistant.firstMessageMode || 'assistant-speaks-first',
      firstMessage: mineAssistant.firstMessage || 'Hello! How can I help you today?',
      systemPrompt: mineAssistant.systemPrompt || 'You are a helpful voice assistant. Be friendly and professional.',
      transferSettings: mineAssistant.transferSettings || {
        enabled: false,
        phoneNumber: '',
        phrases: []
      }
    };
    
    // Save to config file
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, 'config', 'defaultAssistant.json');
    
    // Create config directory if it doesn't exist
    const configDir = path.join(__dirname, 'config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(defaultTemplate, null, 2));
    
    res.json({
      success: true,
      message: 'Cleanup complete',
      kept: 'mine',
      deleted: deletedCount,
      deletedNames: toDelete.map(a => a.name),
      defaultTemplate,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Admin: Check current assistants in database
 */
app.get('/api/admin/check-assistants', async (req, res) => {
  try {
    const assistantsCollection = getCollection('assistants');
    const usersCollection = getCollection('users');
    
    // Get all assistants
    const allAssistants = await assistantsCollection.find({}).toArray();
    
    // Get admin user
    const adminUser = await usersCollection.findOne({ role: 'admin' });
    
    // Format response
    const assistants = allAssistants.map(a => ({
      name: a.name,
      id: a.id,
      userId: a.userId ? a.userId.toString() : 'null',
      status: a.status,
      model: a.model,
      transcriber: a.transcriber,
      voiceProvider: a.voiceProvider
    }));
    
    res.json({
      success: true,
      total: allAssistants.length,
      adminUserId: adminUser ? adminUser._id.toString() : 'not found',
      assistants
    });
    
  } catch (error) {
    console.error('❌ Error checking assistants:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Debug: Check all assistants and their userIds
 */
app.get('/api/debug/all-assistants', async (req, res) => {
  try {
    const collection = getCollection('assistants');
    
    // Get ALL assistants without filtering
    const allAssistants = await collection.find({}).toArray();
    
    // Group by userId
    const byUserId = {};
    const details = [];
    
    allAssistants.forEach((assistant) => {
      const userIdStr = assistant.userId?.toString() || 'null';
      
      details.push({
        name: assistant.name,
        id: assistant.id,
        status: assistant.status,
        userId: userIdStr,
        userIdType: typeof assistant.userId,
        createdAt: assistant.createdAt
      });
      
      if (!byUserId[userIdStr]) {
        byUserId[userIdStr] = [];
      }
      byUserId[userIdStr].push(assistant.name);
    });
    
    res.json({
      success: true,
      total: allAssistants.length,
      details,
      byUserId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error checking assistants:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Debug: Get assistant config details
 */
app.get('/api/assistants/:id/debug', async (req, res) => {
  try {
    const { id } = req.params;
    const assistant = await AssistantModel.getAssistantById(id);
    
    if (!assistant) {
      return res.status(404).json({
        success: false,
        error: 'Assistant not found',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Return detailed config info
    res.json({
      success: true,
      assistant: {
        id: assistant.id,
        name: assistant.name,
        status: assistant.status,
        model: assistant.model,
        transcriber: assistant.transcriber,
        voiceProvider: assistant.voiceProvider,
        voiceModel: assistant.voiceModel,
        voiceId: assistant.voiceId,
        firstMessageMode: assistant.firstMessageMode,
        firstMessage: assistant.firstMessage,
        transferSettings: assistant.transferSettings || null,
        hasTransferSettings: !!assistant.transferSettings,
        hasPhoneNumber: !!(assistant.transferSettings && assistant.transferSettings.phoneNumber),
        fullPhoneNumber: assistant.transferSettings 
          ? `${assistant.transferSettings.countryCode || ''}${assistant.transferSettings.phoneNumber || ''}`
          : null,
        createdAt: assistant.createdAt,
        updatedAt: assistant.updatedAt
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching assistant debug info:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Delete assistant
 */
app.delete('/api/assistants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await AssistantModel.deleteAssistant(id);
    
    if (deleted) {
      console.log(`✅ Deleted assistant: ${id}`);
      res.json({
        success: true,
        message: `Assistant ${id} deleted successfully`,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Assistant ${id} not found`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('❌ Error deleting assistant:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get call history
 */
app.get('/api/calls', authenticate, async (req, res) => {
  try {
    const { assistantId, limit, callType } = req.query;
    const userId = req.userId; // Get current user ID from middleware
    const { ObjectId } = require('mongodb');
    
    // Handle both string and ObjectId formats for userId
    let userIdQuery;
    try {
      userIdQuery = { $in: [userId, new ObjectId(userId), userId.toString()] };
    } catch (error) {
      userIdQuery = userId;
    }
    
    let calls;
    
    if (assistantId) {
      calls = await CallHistoryModel.getCallsByAssistant(assistantId, parseInt(limit) || 20, userIdQuery, callType);
    } else {
      calls = await CallHistoryModel.getAllCalls(parseInt(limit) || 50, userIdQuery, callType);
    }
    
    console.log(`📞 /api/calls - Found ${calls.length} calls for user ${userId}`);
    
    res.json({
      success: true,
      calls: calls,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching calls:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get comprehensive analytics data
 */
app.get('/api/analytics', authenticate, async (req, res) => {
  try {
    const { period = '7d', assistantId } = req.query;
    const userId = req.userId; // Get current user ID from middleware
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get calls for the current user only - PHONE CALLS ONLY
    const collection = require('./config/database').getCollection('call_history');
    const { ObjectId } = require('mongodb');
    
    // Handle both string and ObjectId formats for userId - IMPROVED
    let userIdQuery;
    try {
      const objectIdUserId = new ObjectId(userId);
      // Use $or to match both ObjectId and string formats
      userIdQuery = {
        $or: [
          { userId: objectIdUserId },  // ObjectId format
          { userId: userId }           // String format
        ]
      };
    } catch (error) {
      // If ObjectId creation fails, use string comparison only
      userIdQuery = { userId: userId };
    }
    
    const query = {
      ...userIdQuery, // Apply flexible userId matching
      callType: 'inbound', // ONLY phone calls, exclude browser calls
      startTime: { $gte: startDate.toISOString() }
    };
    
    if (assistantId) {
      query.assistantId = assistantId;
    }

    console.log('🔍 Analytics query:', JSON.stringify(query));
    console.log('📊 User ID from token:', userId, 'Type:', typeof userId);
    
    const calls = await collection.find(query).toArray();
    console.log(`📞 Found ${calls.length} calls for analytics`);
    
    // Debug: Check all calls for this user (without date filter)
    const allUserCalls = await collection.find(userIdQuery).toArray();
    console.log(`📊 Total calls for user (all time): ${allUserCalls.length}`);
    
    // Debug: Check recent calls regardless of user
    const recentCalls = await collection.find({ 
      callType: 'inbound',
      startTime: { $gte: startDate.toISOString() }
    }).limit(5).toArray();
    console.log(`📊 Recent calls (any user): ${recentCalls.length}`);
    if (recentCalls.length > 0) {
      console.log('📋 Sample call userIds:', recentCalls.map(c => `${c.userId} (${typeof c.userId})`));
    }
    
    // Calculate analytics
    const analytics = {
      overview: {
        totalCalls: calls.length,
        completedCalls: calls.filter(call => call.status === 'completed').length,
        failedCalls: calls.filter(call => call.status === 'failed').length,
        activeCalls: calls.filter(call => call.status === 'active').length,
        totalDuration: calls.reduce((sum, call) => sum + (call.duration || 0), 0),
        averageDuration: calls.length > 0 ? calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length : 0,
        successRate: calls.length > 0 ? (calls.filter(call => call.status === 'completed').length / calls.length) * 100 : 0
      },
      
      // Daily breakdown
      dailyStats: [],
      
      // Assistant performance
      assistantStats: {},
      
      // Performance metrics
      performance: {
        averageLatency: 0,
        averageSttLatency: 0,
        averageLlmLatency: 0,
        averageTtsLatency: 0
      },
      
      // Recent calls
      recentCalls: calls.slice(-10).reverse()
    };

    // Calculate daily stats
    const dailyMap = new Map();
    calls.forEach(call => {
      const date = new Date(call.startTime).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { date, calls: 0, duration: 0, completed: 0, failed: 0 });
      }
      const dayStats = dailyMap.get(date);
      dayStats.calls++;
      dayStats.duration += call.duration || 0;
      if (call.status === 'completed') dayStats.completed++;
      if (call.status === 'failed') dayStats.failed++;
    });
    analytics.dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate assistant stats
    const assistantMap = new Map();
    calls.forEach(call => {
      if (!assistantMap.has(call.assistantId)) {
        assistantMap.set(call.assistantId, { 
          assistantId: call.assistantId, 
          calls: 0, 
          duration: 0, 
          completed: 0, 
          failed: 0 
        });
      }
      const assistantStats = assistantMap.get(call.assistantId);
      assistantStats.calls++;
      assistantStats.duration += call.duration || 0;
      if (call.status === 'completed') assistantStats.completed++;
      if (call.status === 'failed') assistantStats.failed++;
    });
    analytics.assistantStats = Array.from(assistantMap.values());

    // Calculate performance metrics
    const callsWithMetrics = calls.filter(call => call.metrics);
    if (callsWithMetrics.length > 0) {
      analytics.performance.averageLatency = callsWithMetrics.reduce((sum, call) => sum + (call.metrics.totalLatency || 0), 0) / callsWithMetrics.length;
      analytics.performance.averageSttLatency = callsWithMetrics.reduce((sum, call) => sum + (call.metrics.sttLatency || 0), 0) / callsWithMetrics.length;
      analytics.performance.averageLlmLatency = callsWithMetrics.reduce((sum, call) => sum + (call.metrics.llmLatency || 0), 0) / callsWithMetrics.length;
      analytics.performance.averageTtsLatency = callsWithMetrics.reduce((sum, call) => sum + (call.metrics.ttsLatency || 0), 0) / callsWithMetrics.length;
    }

    res.json({
      success: true,
      analytics,
      period,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get call statistics
 */
app.get('/api/stats', authenticate, async (req, res) => {
  try {
    const { assistantId } = req.query;
    const userId = req.userId; // Get current user ID from middleware
    const { ObjectId } = require('mongodb');
    
    // Handle both string and ObjectId formats for userId
    let userIdQuery;
    try {
      userIdQuery = { $in: [userId, new ObjectId(userId), userId.toString()] };
    } catch (error) {
      userIdQuery = userId;
    }
    
    // Get stats for current user only
    const stats = await CallHistoryModel.getCallStats(assistantId || null, userIdQuery);
    
    console.log(`📊 /api/stats - Stats for user ${userId}:`, stats);
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Enhanced Auth Routes
const authEnhancedRoutes = require('./routes/authEnhanced');
app.use('/api/auth', authEnhancedRoutes);

// Two-Factor Authentication Routes
const twoFactorRoutes = require('./routes/twoFactor');
app.use('/api/2fa', twoFactorRoutes);

// Credit Routes (Protected)
const creditRoutes = require('./routes/credits');
app.use('/api/credits', authenticate, creditRoutes);

// Payment Routes (Protected)
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', authenticate, paymentRoutes);

// TTS Routes
const ttsRoutes = require('./routes/tts');
app.use('/api/tts', ttsRoutes);

// Twilio Routes (Human Transfer)
const twilioRoutes = require('./routes/twilio');
app.use('/api/twilio', twilioRoutes);

// Phone Numbers Routes (Multi-tenant)
const phoneNumbersRoutes = require('./routes/twilioCredentials');
app.use('/api/phone-numbers', phoneNumbersRoutes);

// Tools Routes (Protected)
const toolsRoutes = require('./routes/tools');
app.use('/api/tools', toolsRoutes);

// EMERGENCY: Complete database reset - USER DATA ONLY
app.post('/api/emergency/reset-database', async (req, res) => {
  try {
    console.log('🚨 EMERGENCY: User data reset requested (platform data preserved)');
    
    const { ObjectId } = require('mongodb');
    const { getCollection } = require('./config/database');
    
    // Wipe ONLY user-related collections (preserve platform data)
    const usersCollection = getCollection('users');
    const assistantsCollection = getCollection('assistants');
    const callsCollection = getCollection('call_history');
    const creditsCollection = getCollection('credits');
    
    const usersDeleted = await usersCollection.deleteMany({});
    const assistantsDeleted = await assistantsCollection.deleteMany({});
    const callsDeleted = await callsCollection.deleteMany({});
    const creditsDeleted = await creditsCollection.deleteMany({});
    
    // Create Admin User
    const adminId = new ObjectId();
    const adminUser = {
      _id: adminId,
      email: 'ynyogeshnigam1008@gmail.com',
      role: 'admin',
      fullName: 'Admin User',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: true,
      phoneNumbers: [],
      twilioCredentials: {
        status: 'pending'
      },
      isLocked: false,
      loginAttempts: 0,
      credits: 999999999 // Infinite credits
    };
    
    await usersCollection.insertOne(adminUser);
    
    // Create Admin Credits Record
    const adminCredits = {
      _id: new ObjectId(),
      userId: adminId,
      credits: 999999999,
      bonusCredits: 0,
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactions: []
    };
    
    await creditsCollection.insertOne(adminCredits);
    
    // Create Default Assistant
    const defaultAssistant = {
      _id: new ObjectId(),
      id: `asst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: adminId,
      name: 'My First Assistant',
      model: 'llama-3.1-8b-instant',
      transcriber: 'whisper-large-v3-turbo',
      voiceProvider: 'cartesia',
      voiceModel: 'sonic-2024-10',
      voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
      voice: 'Cartesia Sonic',
      status: 'active',
      firstMessageMode: 'assistant-speaks-first',
      firstMessage: 'Hello! How can I help you today?',
      systemPrompt: 'You are a helpful voice assistant. Be friendly and professional.',
      transferSettings: {
        enabled: false,
        phoneNumber: '',
        phrases: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await assistantsCollection.insertOne(defaultAssistant);
    
    console.log('✅ User data reset complete (platform data preserved)');
    
    res.json({
      success: true,
      message: 'User data reset complete, platform data preserved',
      admin: {
        id: adminId,
        email: adminUser.email,
        credits: adminUser.credits
      },
      deleted: {
        users: usersDeleted.deletedCount,
        assistants: assistantsDeleted.deletedCount,
        calls: callsDeleted.deletedCount,
        credits: creditsDeleted.deletedCount
      },
      preserved: 'Platform data (models, voices, etc.) kept intact'
    });
    
  } catch (error) {
    console.error('❌ User data reset failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// EMERGENCY: Create user without auth (REMOVE AFTER FIXING)
app.post('/api/emergency/create-user', async (req, res) => {
  try {
    console.log('🚨 EMERGENCY: Creating user without authentication');
    
    const userId = '69bbc17792cb7db7e2c9a6e6';
    const email = 'ynyogeshnigam1008@gmail.com';
    
    const { ObjectId } = require('mongodb');
    const { getCollection } = require('./config/database');
    
    const usersCollection = getCollection('users');
    
    // Check if user exists
    let existingUser = null;
    try {
      existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
    } catch (err) {
      existingUser = await usersCollection.findOne({ _id: userId });
    }
    
    if (existingUser) {
      return res.json({
        success: true,
        message: 'User already exists',
        user: {
          id: existingUser._id,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }
    
    // Create user
    const newUser = {
      _id: new ObjectId(userId),
      email: email,
      role: 'admin',
      fullName: 'Admin User',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: true,
      phoneNumbers: [],
      twilioCredentials: {
        status: 'pending'
      },
      isLocked: false,
      loginAttempts: 0
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    console.log('✅ Emergency user creation successful');
    
    res.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: result.insertedId,
        email: newUser.email,
        role: newUser.role
      }
    });
    
  } catch (error) {
    console.error('❌ Emergency user creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORARY: Create missing user record
app.post('/api/admin/create-missing-user', async (req, res) => {
  try {
    const { email, userId, role } = req.body;
    
    if (!email || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Email and userId are required'
      });
    }
    
    console.log('🔄 Creating missing user record...');
    console.log('   Email:', email);
    console.log('   UserId:', userId);
    console.log('   Role:', role);
    
    const { ObjectId } = require('mongodb');
    const { getCollection } = require('./config/database');
    
    // Check if user already exists
    const usersCollection = getCollection('users');
    
    let existingUser = null;
    try {
      existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
    } catch (err) {
      // Try string format
      existingUser = await usersCollection.findOne({ _id: userId });
    }
    
    if (existingUser) {
      return res.json({
        success: true,
        message: 'User already exists',
        user: {
          id: existingUser._id,
          email: existingUser.email,
          role: existingUser.role
        }
      });
    }
    
    // Create new user record
    const newUser = {
      _id: new ObjectId(userId),
      email: email,
      role: role || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: true,
      phoneNumbers: [],
      twilioCredentials: {
        status: 'pending'
      }
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    console.log('✅ User record created successfully!');
    
    res.json({
      success: true,
      message: 'User record created successfully',
      user: {
        id: result.insertedId,
        email: newUser.email,
        role: newUser.role
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORARY: Check current admin status after migration
app.get('/api/admin/check-current-status', async (req, res) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    const jwtUserId = decoded.userId;
    
    console.log('🔍 Checking admin status for JWT userId:', jwtUserId);
    
    const { ObjectId } = require('mongodb');
    const { getCollection } = require('./config/database');
    
    // Check ALL users in database
    const usersCollection = getCollection('users');
    const allUsers = await usersCollection.find({}).toArray();
    
    // Check user exists by JWT userId
    let user = null;
    try {
      user = await usersCollection.findOne({ _id: new ObjectId(jwtUserId) });
    } catch (err) {
      // Try string format if ObjectId fails
      user = await usersCollection.findOne({ _id: jwtUserId });
    }
    
    // Check user by email if not found by ID
    let userByEmail = null;
    if (!user) {
      userByEmail = await usersCollection.findOne({ email: decoded.email });
    }
    
    // Check assistants
    const assistantsCollection = getCollection('assistants');
    const assistants = await assistantsCollection.find({
      $or: [
        { userId: new ObjectId(jwtUserId) },
        { userId: jwtUserId }
      ]
    }).toArray();
    
    // Check calls
    const callsCollection = getCollection('call_history');
    const calls = await callsCollection.find({
      $or: [
        { userId: new ObjectId(jwtUserId) },
        { userId: jwtUserId }
      ]
    }).limit(10).toArray();
    
    res.json({
      success: true,
      jwtInfo: {
        userId: jwtUserId,
        email: decoded.email,
        type: typeof jwtUserId
      },
      allUsers: allUsers.map(u => ({
        id: u._id,
        email: u.email,
        role: u.role,
        matchesJWTId: u._id.toString() === jwtUserId,
        matchesJWTEmail: u.email === decoded.email
      })),
      userFoundById: !!user,
      userFoundByEmail: !!userByEmail,
      userDetails: user ? {
        id: user._id,
        email: user.email,
        role: user.role,
        phoneNumbers: user.phoneNumbers?.length || 0,
        twilioStatus: user.twilioCredentials?.status || 'not configured'
      } : null,
      userByEmailDetails: userByEmail ? {
        id: userByEmail._id,
        email: userByEmail.email,
        role: userByEmail.role,
        phoneNumbers: userByEmail.phoneNumbers?.length || 0,
        twilioStatus: userByEmail.twilioCredentials?.status || 'not configured'
      } : null,
      assistantsCount: assistants.length,
      callsCount: calls.length,
      sampleAssistant: assistants[0] ? {
        name: assistants[0].name,
        userId: assistants[0].userId,
        userIdType: typeof assistants[0].userId
      } : null,
      sampleCall: calls[0] ? {
        userId: calls[0].userId,
        userIdType: typeof calls[0].userId,
        callType: calls[0].callType
      } : null
    });
    
  } catch (error) {
    console.error('❌ Admin status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Serve React app for all non-API routes (client-side routing)
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

/**
 * WebSocket connection handler - VAPI-Style Implementation
 */
const CallHandler = require('./handlers/callHandler');

wss.on('connection', (ws, req) => {
  const connectionId = generateConnectionId();
  const clientIP = req.socket.remoteAddress;
  
  console.log(`\n🔌 New WebSocket connection: ${connectionId} from ${clientIP}`);

  // Create call handler for this connection
  const callHandler = new CallHandler(ws, connectionId);
  
  // Store connection info
  activeConnections.set(connectionId, {
    ws,
    callHandler,
    clientIP,
    connectedAt: new Date(),
    lastActivity: new Date(),
    isAlive: true
  });

  // Send welcome message
  sendMessage(ws, {
    type: 'connection_established',
    connectionId,
    timestamp: new Date().toISOString(),
    message: 'Connected to Voice AI Platform - Send configuration to begin',
  });

  /**
   * Handle incoming messages
   */
  ws.on('message', async (message) => {
    try {
      updateLastActivity(connectionId);
      await callHandler.handleMessage(message);
    } catch (error) {
      console.error(`❌ Error handling message from ${connectionId}:`, error);
      sendMessage(ws, {
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * Handle connection close
   */
  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed: ${connectionId} - Code: ${code}, Reason: ${reason || 'None'}`);
    callHandler.cleanup();
    cleanupConnection(connectionId);
  });

  /**
   * Handle connection errors
   */
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${connectionId}:`, error);
    callHandler.cleanup();
    cleanupConnection(connectionId);
  });

  /**
   * Handle pong responses (heartbeat)
   */
  ws.on('pong', () => {
    const connection = activeConnections.get(connectionId);
    if (connection) {
      connection.isAlive = true;
      updateLastActivity(connectionId);
    }
  });
});

/**
 * Set up pipeline event handlers to forward events to WebSocket client
 */
function setupPipelineEvents(ws, pipeline, connectionId) {
  // Processing started
  pipeline.on('processing_started', () => {
    sendMessage(ws, {
      type: 'processing_started',
      timestamp: new Date().toISOString(),
    });
  });

  // STT events
  pipeline.on('stt_started', () => {
    sendMessage(ws, {
      type: 'stt_started',
      timestamp: new Date().toISOString(),
    });
  });

  pipeline.on('stt_completed', (data) => {
    sendMessage(ws, {
      type: 'stt_completed',
      text: data.text,
      timestamp: new Date().toISOString(),
    });
  });

  // LLM events
  pipeline.on('llm_started', () => {
    sendMessage(ws, {
      type: 'llm_started',
      timestamp: new Date().toISOString(),
    });
  });

  pipeline.on('llm_chunk', (data) => {
    sendMessage(ws, {
      type: 'llm_chunk',
      text: data.text,
      timestamp: new Date().toISOString(),
    });
  });

  pipeline.on('llm_completed', (data) => {
    sendMessage(ws, {
      type: 'llm_completed',
      text: data.text,
      timestamp: new Date().toISOString(),
    });
  });

  // Audio chunk event (TTS output)
  pipeline.on('audio_chunk', (data) => {
    // Send audio data as base64 encoded message
    if (ws.readyState === WebSocket.OPEN) {
      sendMessage(ws, {
        type: 'audio_chunk',
        data: data.audio ? data.audio.toString('base64') : data.data,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Processing completed
  pipeline.on('processing_completed', (data) => {
    sendMessage(ws, {
      type: 'processing_completed',
      userText: data.userText,
      assistantText: data.assistantText,
      timestamp: new Date().toISOString(),
    });
  });

  // Error events
  pipeline.on('error', (data) => {
    sendMessage(ws, {
      type: 'error',
      stage: data.stage,
      error: data.error,
      timestamp: new Date().toISOString(),
    });
  });

  // No speech detected
  pipeline.on('no_speech_detected', () => {
    sendMessage(ws, {
      type: 'no_speech_detected',
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Handle audio message (binary data)
 */
async function handleAudioMessage(ws, pipeline, audioBuffer, connectionId) {
  console.log(`🎤 Received audio data from ${connectionId}: ${audioBuffer.length} bytes`);

  try {
    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      return; // Skip silently
    }

    // Check if buffer is too small - skip silently
    if (audioBuffer.length < 100) {
      return;
    }

    // Process audio through the pipeline
    await pipeline.processAudioInput(audioBuffer, 'webm');
    
  } catch (error) {
    console.error(`❌ Error processing audio for ${connectionId}:`, error);
    
    // Handle specific error types
    let errorMessage = error.message;
    let errorStage = 'audio_processing';
    
    if (error.message.includes('Audio format conversion failed')) {
      errorMessage = 'Audio format conversion failed. Please try speaking again.';
      errorStage = 'audio_conversion';
    } else if (error.message.includes('Rate limit exceeded')) {
      errorMessage = 'Rate limit exceeded. Please wait a moment before trying again.';
      errorStage = 'rate_limit';
    } else if (error.message.includes('Empty or invalid audio buffer')) {
      errorMessage = 'Invalid audio data received. Please try again.';
      errorStage = 'invalid_audio';
    }
    
    sendMessage(ws, {
      type: 'error',
      stage: errorStage,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
    
    // Don't clear conversation history for audio conversion errors
    if (!error.message.includes('Audio format conversion failed')) {
      console.warn('⚠️ Clearing conversation history due to error');
      pipeline.clearHistory();
    }
  }
}

/**
 * Handle text/JSON message
 */
async function handleTextMessage(ws, pipeline, data, connectionId, connection) {
  console.log(`📨 Received message from ${connectionId}:`, data.type);

  try {
    switch (data.type) {
      case 'start_main_pipeline':
        // NEW: Activate Main Pipeline (Transcriber → LLM → TTS)
        console.log(`\n🎯 STARTING MAIN PIPELINE for ${connectionId}`);
        connection.mode = 'main';
        connection.mainPipeline = new MainPipeline(connectionId, ws);
        
        // Activate pipeline with config
        if (data.config) {
          await connection.mainPipeline.activate(data.config);
        }
        
        // Update active connection
        activeConnections.set(connectionId, connection);
        break;

      case 'start_vapi_pipeline':
        // NEW: Activate Vapi-Style Pipeline (Optimized STT → LLM → TTS)
        try {
          console.log(`\n🎯 STARTING VAPI-STYLE PIPELINE for ${connectionId}`);
          const VapiStylePipeline = require('./pipelines/vapiStylePipeline');
          connection.mode = 'vapi';
          connection.vapiPipeline = new VapiStylePipeline(connectionId, ws);
          
          // Activate pipeline with config
          if (data.config) {
            await connection.vapiPipeline.activate(data.config);
          }
          
          // Update active connection
          activeConnections.set(connectionId, connection);
          
          sendMessage(ws, {
            type: 'vapi_pipeline_started',
            timestamp: new Date().toISOString(),
          });
          
        } catch (error) {
          console.error(`❌ Error starting Vapi pipeline for ${connectionId}:`, error);
          sendMessage(ws, {
            type: 'pipeline_error',
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'stop_main_pipeline':
        // Stop Main Pipeline
        console.log(`🛑 Stopping Main Pipeline for ${connectionId}`);
        if (connection.mainPipeline) {
          await connection.mainPipeline.deactivate();
          connection.mainPipeline.cleanup();
          connection.mainPipeline = null;
        }
        connection.mode = 'legacy';
        activeConnections.set(connectionId, connection);
        
        sendMessage(ws, {
          type: 'main_pipeline_stopped',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'stop_vapi_pipeline':
        // Stop Vapi-Style Pipeline
        console.log(`🛑 Stopping Vapi-Style Pipeline for ${connectionId}`);
        if (connection.vapiPipeline) {
          await connection.vapiPipeline.deactivate();
          connection.vapiPipeline.cleanup();
          connection.vapiPipeline = null;
        }
        connection.mode = 'legacy';
        activeConnections.set(connectionId, connection);
        
        sendMessage(ws, {
          type: 'vapi_pipeline_stopped',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'start_workflow':
        // Initialize voice call workflow mode
        console.log(`🎯 Starting voice call workflow for ${connectionId}`);
        connection.mode = 'workflow';
        connection.workflow = new VoiceCallWorkflow(connectionId, ws);
        
        // Start workflow with config
        if (data.config) {
          await connection.workflow.startWorkflow(data.config);
        }
        
        // Update active connection
        activeConnections.set(connectionId, connection);
        break;

      case 'stop_workflow':
        // Stop workflow mode
        console.log(`🛑 Stopping voice call workflow for ${connectionId}`);
        if (connection.workflow) {
          await connection.workflow.stopWorkflow();
          connection.workflow.cleanup();
          connection.workflow = null;
        }
        connection.mode = 'legacy';
        activeConnections.set(connectionId, connection);
        
        sendMessage(ws, {
          type: 'workflow_stopped',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'start_realtime':
        // Initialize realtime streaming mode
        console.log(`🎙️ Starting realtime mode for ${connectionId}`);
        connection.mode = 'realtime';
        connection.realtimeHandler = new RealtimePipelineHandler(ws, connectionId);
        
        // Initialize with config
        if (data.config) {
          await connection.realtimeHandler.initialize(data.config);
        }
        
        // Update active connection
        activeConnections.set(connectionId, connection);
        break;

      case 'stop_realtime':
        // Stop realtime mode
        console.log(`🛑 Stopping realtime mode for ${connectionId}`);
        if (connection.realtimeHandler) {
          connection.realtimeHandler.cleanup();
          connection.realtimeHandler = null;
        }
        connection.mode = 'legacy';
        activeConnections.set(connectionId, connection);
        
        sendMessage(ws, {
          type: 'realtime_stopped',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'config':
        // Configure the pipeline with assistant settings
        console.log(`⚙️ Configuring pipeline for ${connectionId}`);
        console.log('📋 Received config:', JSON.stringify(data.config, null, 2));
        
        if (data.config) {
          if (data.config.model) {
            pipeline.groqService.model = data.config.model;
            console.log(`🤖 Set LLM model: ${data.config.model}`);
          }
          if (data.config.systemPrompt) {
            pipeline.setSystemPrompt(data.config.systemPrompt);
            console.log(`📝 Set system prompt: ${data.config.systemPrompt.substring(0, 50)}...`);
          }
          if (data.config.voiceModel && data.config.voiceId) {
            pipeline.voiceModel = data.config.voiceModel;
            pipeline.voiceId = data.config.voiceId;
            console.log(`🎤 Set voice ID: ${data.config.voiceId}`);
            console.log(`🎵 Set voice model: ${data.config.voiceModel}`);
          }
          if (data.config.voiceProvider) {
            pipeline.voiceProvider = data.config.voiceProvider;
            console.log(`🔊 Set voice provider: ${data.config.voiceProvider}`);
          }
          
          // Send first message if configured
          if (data.config.firstMessage && data.config.firstMessageMode === 'assistant-speaks-first') {
            sendMessage(ws, {
              type: 'ai_response',
              text: data.config.firstMessage,
              timestamp: new Date().toISOString(),
            });
            
            // Convert first message to speech
            try {
              const ttsService = pipeline.getTTSService(data.config.voiceProvider || 'cartesia');
              const audioBuffer = await ttsService.textToSpeech(data.config.firstMessage, {
                model: data.config.voiceModel || 'sonic-english',
                voiceId: data.config.voiceId
              });
              ws.send(audioBuffer);
            } catch (error) {
              console.error('Error generating first message audio:', error);
            }
          }
        }
        sendMessage(ws, {
          type: 'config_confirmed',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'ping':
        // Respond to ping
        sendMessage(ws, {
          type: 'pong',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'text_input':
        // Process text input directly
        if (data.text) {
          await pipeline.processTextInput(data.text, {
            enableTTS: data.enableTTS !== false,
          });
        }
        break;

      case 'tts_only':
        // Convert text to speech without LLM
        if (data.text) {
          await pipeline.textToSpeechOnly(data.text);
        }
        break;

      case 'set_system_prompt':
        // Update system prompt
        if (data.prompt) {
          pipeline.setSystemPrompt(data.prompt);
          sendMessage(ws, {
            type: 'system_prompt_set',
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'clear_history':
        // Clear conversation history
        pipeline.clearHistory();
        sendMessage(ws, {
          type: 'history_cleared',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'get_history':
        // Send conversation history
        sendMessage(ws, {
          type: 'conversation_history',
          history: pipeline.getConversationHistory(),
          timestamp: new Date().toISOString(),
        });
        break;

      case 'get_status':
        // Send pipeline status
        sendMessage(ws, {
          type: 'pipeline_status',
          status: pipeline.getStatus(),
          timestamp: new Date().toISOString(),
        });
        break;

      case 'reset':
        // Reset pipeline
        pipeline.reset();
        sendMessage(ws, {
          type: 'pipeline_reset',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'set_tts_provider':
        // Switch TTS provider
        if (data.provider) {
          const success = pipeline.setTTSProvider(data.provider);
          sendMessage(ws, {
            type: success ? 'tts_provider_set' : 'error',
            provider: data.provider,
            success: success,
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'set_llm_model':
        // Switch LLM model
        if (data.model) {
          const success = pipeline.groqService.setModel(data.model);
          sendMessage(ws, {
            type: success ? 'llm_model_set' : 'error',
            model: data.model,
            success: success,
            timestamp: new Date().toISOString(),
          });
        }
        break;

      case 'get_available_models':
        // Get available LLM models
        const category = data.category || null;
        sendMessage(ws, {
          type: 'available_models',
          llm: pipeline.groqService.getAvailableModels(category),
          whisper: pipeline.groqService.getAvailableWhisperModels(),
          tts: {
            cartesia: pipeline.cartesiaService.getAvailableModels(),
            elevenlabs: ['Default']
          },
          timestamp: new Date().toISOString(),
        });
        break;

      case 'get_reasoning_models':
        // Get models with reasoning capabilities
        sendMessage(ws, {
          type: 'reasoning_models',
          models: pipeline.groqService.getReasoningModels(),
          timestamp: new Date().toISOString(),
        });
        break;

      case 'get_function_calling_models':
        // Get models with function calling capabilities
        sendMessage(ws, {
          type: 'function_calling_models',
          models: pipeline.groqService.getFunctionCallingModels(),
          timestamp: new Date().toISOString(),
        });
        break;

      case 'get_models_by_category':
        // Get models by category
        if (data.category) {
          sendMessage(ws, {
            type: 'models_by_category',
            category: data.category,
            models: pipeline.groqService.getAvailableModels(data.category),
            timestamp: new Date().toISOString(),
          });
        }
        break;

      default:
        console.warn(`⚠️  Unknown message type: ${data.type}`);
        sendMessage(ws, {
          type: 'error',
          error: `Unknown message type: ${data.type}`,
          timestamp: new Date().toISOString(),
        });
    }

  } catch (error) {
    console.error(`❌ Error handling text message:`, error);
    sendMessage(ws, {
      type: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Send JSON message to WebSocket client
 */
function sendMessage(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Set up heartbeat mechanism to detect dead connections
 */
function setupHeartbeat(ws, connectionId) {
  const interval = setInterval(() => {
    const connection = activeConnections.get(connectionId);
    
    if (!connection) {
      clearInterval(interval);
      return;
    }

    if (connection.isAlive === false) {
      console.log(`💀 Connection ${connectionId} appears dead, terminating...`);
      ws.terminate();
      clearInterval(interval);
      return;
    }

    connection.isAlive = false;
    ws.ping();
  }, WS_HEARTBEAT_INTERVAL);

  // Store interval ID for cleanup
  const connection = activeConnections.get(connectionId);
  if (connection) {
    connection.heartbeatInterval = interval;
  }
}

/**
 * Update last activity timestamp
 */
function updateLastActivity(connectionId) {
  const connection = activeConnections.get(connectionId);
  if (connection) {
    connection.lastActivity = new Date();
  }
}

/**
 * Clean up connection resources
 */
function cleanupConnection(connectionId) {
  const connection = activeConnections.get(connectionId);
  
  if (connection) {
    // Clear heartbeat interval
    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval);
    }

    // Cleanup realtime handler
    if (connection.realtimeHandler) {
      connection.realtimeHandler.cleanup();
    }

    // Cleanup main pipeline
    if (connection.mainPipeline) {
      connection.mainPipeline.cleanup();
    }

    // Cleanup workflow handler
    if (connection.workflow) {
      connection.workflow.cleanup();
    }

    // Reset pipeline
    if (connection.pipeline) {
      connection.pipeline.reset();
      connection.pipeline.removeAllListeners();
    }

    // Remove from active connections
    activeConnections.delete(connectionId);
    console.log(`🧹 Cleaned up connection ${connectionId}. Active connections: ${activeConnections.size}`);
  }
}

/**
 * Generate unique connection ID
 */
function generateConnectionId() {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ========================================
 * WEBSOCKET UPGRADE HANDLER
 * ========================================
 * Routes WebSocket connections based on path:
 * - / = Browser calling (CallHandler)
 * - /media-stream = Inbound phone calls (InboundCallHandler)
 */
const InboundCallHandler = require('./handlers/inboundCallHandler');
const inboundCallHandlers = new Map();

// Handle WebSocket upgrade - route based on path
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;
  const sessionId = url.searchParams.get('sessionId');
  
  console.log(`🔌 WebSocket upgrade request: ${pathname}${sessionId ? ` (sessionId: ${sessionId})` : ''}`);
  
  if (pathname === '/media-stream') {
    if (sessionId) {
      // Browser bridge - connect Twilio media stream to existing browser WebSocket
      console.log('🌐 Routing to browser bridge handler');
      wss.handleUpgrade(request, socket, head, (ws) => {
        handleBrowserBridge(ws, sessionId);
      });
    } else {
      // Regular inbound phone call
      console.log('📞 Routing to Twilio Media Stream handler');
      wss.handleUpgrade(request, socket, head, (ws) => {
        handleTwilioMediaStream(ws);
      });
    }
  } else if (pathname === '/' || pathname === '') {
    // Browser calling
    console.log('🌐 Routing to browser calling handler');
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    console.log(`❌ Unknown WebSocket path: ${pathname}`);
    socket.destroy();
  }
});

/**
 * Handle Twilio Media Stream WebSocket connection
 */
function handleTwilioMediaStream(ws) {
  let callHandler = null;
  let callSid = null;

  console.log('📞 Twilio Media Stream WebSocket connected');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.event) {
        case 'connected':
          console.log('📞 Twilio Media Stream connected:', data);
          break;

        case 'start':
          console.log('📞 Twilio Media Stream started:', data.start);
          callSid = data.start.callSid;
          
          // Create inbound call handler
          callHandler = new InboundCallHandler(ws, callSid);
          inboundCallHandlers.set(callSid, callHandler);
          
          // Initialize the call
          await callHandler.initialize(data.start);
          break;

        case 'media':
          // Handle incoming audio from caller
          if (callHandler) {
            await callHandler.handleMedia(data);
          }
          break;

        case 'stop':
          console.log('📞 Twilio Media Stream stopped:', data.stop);
          if (callHandler) {
            await callHandler.handleStop();
            inboundCallHandlers.delete(callSid);
          }
          break;

        case 'mark':
          console.log('📞 Twilio Media Stream mark:', data.mark);
          break;

        default:
          console.log('📞 Unknown Twilio event:', data.event);
      }
    } catch (error) {
      console.error('❌ Error handling Twilio Media Stream message:', error);
    }
  });

  ws.on('close', async () => {
    console.log('📞 Twilio Media Stream WebSocket closed');
    if (callHandler) {
      await callHandler.cleanup();
      if (callSid) {
        inboundCallHandlers.delete(callSid);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Twilio Media Stream WebSocket error:', error);
    if (callHandler) {
      callHandler.cleanup();
      if (callSid) {
        inboundCallHandlers.delete(callSid);
      }
    }
  });
}

/**
 * Handle Browser Bridge WebSocket connection
 * Bridges Twilio media stream to existing browser WebSocket for human transfer
 */
function handleBrowserBridge(ws, sessionId) {
  console.log(`🌐 Browser bridge WebSocket connected for session: ${sessionId}`);
  console.log(`🔍 Active connections: ${Array.from(activeConnections.keys()).join(', ')}`);
  
  // Find the existing browser WebSocket connection
  const browserConnection = activeConnections.get(sessionId);
  
  if (!browserConnection) {
    console.error(`❌ No browser connection found for session: ${sessionId}`);
    console.error(`❌ Available sessions: ${Array.from(activeConnections.keys()).join(', ')}`);
    ws.close(1000, 'No browser connection found');
    return;
  }
  
  const browserWs = browserConnection.ws;
  console.log(`✅ Found browser connection for session: ${sessionId}`);
  console.log(`✅ Browser WebSocket state: ${browserWs.readyState} (1=OPEN)`);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.event) {
        case 'connected':
          console.log('🌐 Browser bridge connected:', data);
          break;

        case 'start':
          console.log('🌐 Browser bridge started:', data.start);
          break;

        case 'media':
          // Convert Twilio audio (mulaw) to browser audio (PCM) and forward
          if (browserWs && browserWs.readyState === 1) {
            const { base64MulawToPCM } = require('./services/audioConverter');
            const pcmAudio = base64MulawToPCM(data.media.payload);
            
            // Send PCM audio to browser
            browserWs.send(pcmAudio);
            console.log(`🔊 Forwarded audio from phone to browser (${pcmAudio.length} bytes)`);
          } else {
            console.warn(`⚠️ Browser WebSocket not ready: state=${browserWs?.readyState}`);
          }
          break;

        case 'stop':
          console.log('🌐 Browser bridge stopped:', data.stop);
          break;

        default:
          console.log('🌐 Unknown bridge event:', data.event);
      }
    } catch (error) {
      console.error('❌ Error handling browser bridge message:', error);
    }
  });
  
  // Forward browser audio to Twilio
  const originalSend = browserWs.send.bind(browserWs);
  browserWs.send = function(data) {
    // If it's audio data (Buffer), also send to Twilio bridge
    if (data instanceof Buffer && ws.readyState === 1) {
      try {
        const { pcmToBase64Mulaw } = require('./services/audioConverter');
        const mulawBase64 = pcmToBase64Mulaw(data);
        
        const message = {
          event: 'media',
          media: {
            payload: mulawBase64
          }
        };
        
        ws.send(JSON.stringify(message));
        console.log(`🎤 Forwarded audio from browser to phone (${data.length} bytes PCM → mulaw)`);
      } catch (error) {
        console.error('❌ Error forwarding browser audio to phone:', error);
      }
    }
    
    // Call original send method
    return originalSend(data);
  };

  ws.on('close', () => {
    console.log(`🌐 Browser bridge WebSocket closed for session: ${sessionId}`);
    // Restore original send method
    if (browserWs && originalSend) {
      browserWs.send = originalSend;
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Browser bridge WebSocket error:', error);
    // Restore original send method
    if (browserWs && originalSend) {
      browserWs.send = originalSend;
    }
  });
}

/**
 * Graceful shutdown handler
 */
function gracefulShutdown() {
  console.log('\n🛑 Graceful shutdown initiated...');

  // Close WebSocket server
  wss.close(() => {
    console.log('✅ WebSocket server closed');
  });

  // Close all active connections
  activeConnections.forEach((connection, connectionId) => {
    console.log(`🔌 Closing connection: ${connectionId}`);
    connection.ws.close(1001, 'Server shutting down');
    cleanupConnection(connectionId);
  });

  // Cleanup inbound call handlers
  inboundCallHandlers.forEach((handler, callSid) => {
    console.log(`📞 Closing inbound call: ${callSid}`);
    handler.cleanup();
  });
  inboundCallHandlers.clear();

  // Close HTTP server
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

/**
 * Start the server
 */
async function startServer() {
  try {
    // Try to connect to MongoDB (optional - server will work without it)
    console.log('🔌 Connecting to MongoDB...');
    try {
      await connectDB();
      console.log('✅ MongoDB connected successfully!');
    } catch (dbError) {
      console.error('⚠️  MongoDB connection failed:', dbError.message);
      console.log('⚠️  Server will start WITHOUT database functionality');
      console.log('⚠️  To fix: Add your IP to MongoDB Atlas whitelist or check connection string');
    }
    
    // Migration completed - endpoint removed for security
    
    // Start the HTTP server regardless of MongoDB status
    server.listen(PORT, async () => {
      console.log('\n' + '='.repeat(60));
      console.log('🚀 Voice AI Calling Platform Server');
      console.log('='.repeat(60));
      console.log(`📡 HTTP Server: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`📊 Status: http://localhost:${PORT}/status`);
      console.log('='.repeat(60));
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`MongoDB: ${process.env.MONGODB_URI ? '✅ Connected' : '❌ Not configured'}`);
      console.log(`Groq API: ${process.env.GROQ_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`ElevenLabs API: ${process.env.ELEVENLABS_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`Cartesia API: ${process.env.CARTESIA_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`Default TTS: ${process.env.DEFAULT_TTS_PROVIDER || 'cartesia'}`);
      console.log(`Default LLM: ${process.env.DEFAULT_LLM_MODEL || 'llama-3.1-70b-versatile'}`);
      console.log('='.repeat(60));
      console.log('Server is ready to accept connections! 🎉\n');
      
      // FORCE fresh data fetch on startup (only if DB is connected)
      const dbStatus = await checkConnection();
      if (dbStatus.connected) {
        console.log('🔄 STARTUP: Forcing fresh API data fetch...');
        try {
          const apiManager = new APIDataManager();
          await apiManager.fetchAndSaveAllData();
          console.log('✅ STARTUP: All API data fetched and saved successfully!');
        } catch (startupError) {
          console.error('❌ STARTUP ERROR: Failed to fetch API data:', startupError.message);
          console.error('⚠️  Server will continue but some features may not work properly.');
        }
      } else {
        console.log('⚠️  STARTUP: Skipping data fetch (database not connected)');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  
  // Don't crash for WebSocket-related errors
  if (error.message?.includes('WebSocket') || 
      error.message?.includes('connection') ||
      error.code === 'ECONNRESET' ||
      error.code === 'EPIPE') {
    console.warn('⚠️ Non-critical error handled, continuing server operation');
    return;
  }
  
  // For critical errors, shutdown gracefully
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Handle specific unhandled rejection types
  if (reason && reason.code === 'ERR_UNHANDLED_ERROR') {
    console.error('💥 Unhandled Error Details:', reason.context);
    
    // If it's an audio processing error, don't crash the server
    if (reason.context && reason.context.stage === 'pipeline') {
      console.warn('⚠️ Audio processing error handled gracefully, continuing server operation');
      return;
    }
  }
  
  // Log but DON'T crash the server for WebSocket-related errors
  if (reason && (
    reason.message?.includes('WebSocket') ||
    reason.message?.includes('connection') ||
    reason.code === 'ECONNRESET' ||
    reason.code === 'EPIPE'
  )) {
    console.warn('⚠️ WebSocket/Connection error handled gracefully, continuing server operation');
    return;
  }
  
  // For critical errors only, consider graceful shutdown
  console.error('💥 Critical unhandled rejection, initiating graceful shutdown...');
  gracefulShutdown();
});

module.exports = { app, server, wss };


