/**
 * Check all collections in the database
 */

const { MongoClient } = require('mongodb');

async function checkAllCollections() {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    console.log('📍 URI:', uri.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    const db = client.db('voiceai'); // Changed from 'voice-ai' to 'voiceai'
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\n📚 Collections in database:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Check tools collection
    console.log('\n🔧 Tools Collection:');
    const toolsCollection = db.collection('tools');
    const toolsCount = await toolsCollection.countDocuments();
    console.log(`  Total documents: ${toolsCount}`);
    
    if (toolsCount > 0) {
      const allTools = await toolsCollection.find({}).toArray();
      console.log('\n  Tools found:');
      allTools.forEach((tool, index) => {
        console.log(`  ${index + 1}. ${tool.name || 'Unnamed'} (${tool.id || 'No ID'})`);
        console.log(`     User ID: ${tool.userId}`);
        console.log(`     Created: ${tool.createdAt}`);
      });
    } else {
      console.log('  ⚠️  No tools found in database');
    }
    
    // Check users collection
    console.log('\n👥 Users Collection:');
    const usersCollection = db.collection('users');
    const usersCount = await usersCollection.countDocuments();
    console.log(`  Total users: ${usersCount}`);
    
    if (usersCount > 0) {
      const users = await usersCollection.find({}).toArray();
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email}`);
        console.log(`     ID: ${user._id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.close();
  }
}

checkAllCollections();
