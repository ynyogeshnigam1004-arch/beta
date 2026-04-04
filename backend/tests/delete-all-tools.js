/**
 * Delete all tools from database
 */

const { MongoClient } = require('mongodb');

async function deleteAllTools() {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('voiceai');
    const toolsCollection = db.collection('tools');
    
    // Count tools before deletion
    const countBefore = await toolsCollection.countDocuments();
    console.log(`📋 Found ${countBefore} tool(s) in database`);
    
    if (countBefore === 0) {
      console.log('✅ No tools to delete');
      return;
    }
    
    // Delete all tools
    const result = await toolsCollection.deleteMany({});
    
    console.log(`\n🗑️  Deleted ${result.deletedCount} tool(s)`);
    
    // Verify deletion
    const countAfter = await toolsCollection.countDocuments();
    console.log(`📋 Tools remaining: ${countAfter}`);
    
    if (countAfter === 0) {
      console.log('\n✅ All tools deleted successfully!');
    } else {
      console.log('\n⚠️  Some tools still remain');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

deleteAllTools();
