/**
 * MongoDB Database Configuration
 * Handles connection to MongoDB Atlas using Mongoose
 */

const mongoose = require('mongoose');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 
  "mongodb+srv://vagledoc_db_user:Maninder%404321@cluster0.jqsarck.mongodb.net/?appName=Cluster0";

/**
 * Connect to MongoDB using Mongoose
 */
async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('📊 Using existing MongoDB connection');
      return mongoose.connection;
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Successfully connected to MongoDB Atlas!');
    console.log(`📊 Using database: ${mongoose.connection.db.databaseName}`);
    
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get database instance
 */
function getDB() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return mongoose.connection.db;
}

/**
 * Get a collection
 */
function getCollection(collectionName) {
  return getDB().collection(collectionName);
}

/**
 * Close MongoDB connection
 */
async function closeDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
    throw error;
  }
}

/**
 * Check connection status
 */
async function checkConnection() {
  try {
    if (mongoose.connection.readyState !== 1) {
      return { connected: false, error: 'Not connected' };
    }
    
    await mongoose.connection.db.admin().ping();
    return { connected: true };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  getDB,
  getCollection,
  closeDB,
  checkConnection,
  mongoose
};

