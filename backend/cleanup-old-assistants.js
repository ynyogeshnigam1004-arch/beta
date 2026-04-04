/**
 * Cleanup Script: Remove old test assistants
 * Keeps only the 2 assistants visible in UI for admin user
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_USER_ID = '69a49be0fdd5376624854e06'; // Your admin userId

async function cleanupOldAssistants() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('voiceai');
    const assistantsCollection = db.collection('assistants');
    
    // Get all assistants
    const allAssistants = await assistantsCollection.find({}).toArray();
    console.log(`📊 Total assistants in database: ${allAssistants.length}`);
    
    // Get admin's assistants
    const adminAssistants = await assistantsCollection.find({
      userId: new ObjectId(ADMIN_USER_ID)
    }).sort({ createdAt: -1 }).toArray();
    
    console.log(`\n👤 Admin's assistants: ${adminAssistants.length}`);
    adminAssistants.forEach((asst, i) => {
      console.log(`  ${i + 1}. ${asst.name} (${asst.id}) - ${asst.status || 'no status'}`);
    });
    
    // Keep only the 2 most recent admin assistants
    const assistantsToKeep = adminAssistants.slice(0, 2).map(a => a._id);
    
    console.log(`\n🔒 Keeping these ${assistantsToKeep.length} assistants:`);
    assistantsToKeep.forEach(id => {
      const asst = adminAssistants.find(a => a._id.equals(id));
      console.log(`  - ${asst.name} (${asst.id})`);
    });
    
    // Delete all others
    const result = await assistantsCollection.deleteMany({
      _id: { $nin: assistantsToKeep }
    });
    
    console.log(`\n🗑️  Deleted ${result.deletedCount} old assistants`);
    
    // Verify final count
    const finalCount = await assistantsCollection.countDocuments({});
    console.log(`✅ Final assistant count: ${finalCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Cleanup complete');
  }
}

cleanupOldAssistants();
