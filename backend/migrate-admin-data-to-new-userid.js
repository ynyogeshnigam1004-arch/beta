/**
 * Migrate Admin Data to New User ID
 * Move all data from old userId to new userId
 */

const { connectDB, getCollection } = require('./config/database');
const { ObjectId } = require('mongodb');

async function migrateAdminData() {
  try {
    await connectDB();
    console.log('✅ Connected to database');
    
    const oldUserId = '69a49be0fdd5376624854e06';  // Old userId (from logs)
    const newUserId = '69bbc17792cb7db7e2c9a6e6';  // New userId (from JWT)
    
    console.log('\n📋 Migration Plan:');
    console.log('   FROM (old):', oldUserId);
    console.log('   TO (new):', newUserId);
    
    // 1. Migrate Assistants
    console.log('\n🤖 Migrating Assistants...');
    const assistantsCollection = getCollection('assistants');
    
    // Check current assistants with old userId (try both formats)
    const oldAssistants1 = await assistantsCollection.find({ userId: oldUserId }).toArray();
    const oldAssistants2 = await assistantsCollection.find({ userId: new ObjectId(oldUserId) }).toArray();
    
    console.log('   Found with string userId:', oldAssistants1.length);
    console.log('   Found with ObjectId userId:', oldAssistants2.length);
    
    // Migrate string format
    if (oldAssistants1.length > 0) {
      const result1 = await assistantsCollection.updateMany(
        { userId: oldUserId },
        { $set: { userId: new ObjectId(newUserId) } }
      );
      console.log('   ✅ Migrated', result1.modifiedCount, 'assistants (string format)');
    }
    
    // Migrate ObjectId format
    if (oldAssistants2.length > 0) {
      const result2 = await assistantsCollection.updateMany(
        { userId: new ObjectId(oldUserId) },
        { $set: { userId: new ObjectId(newUserId) } }
      );
      console.log('   ✅ Migrated', result2.modifiedCount, 'assistants (ObjectId format)');
    }
    
    // 2. Migrate Call History
    console.log('\n📞 Migrating Call History...');
    const callsCollection = getCollection('call_history');
    
    const oldCalls1 = await callsCollection.find({ userId: oldUserId }).toArray();
    const oldCalls2 = await callsCollection.find({ userId: new ObjectId(oldUserId) }).toArray();
    
    console.log('   Found with string userId:', oldCalls1.length);
    console.log('   Found with ObjectId userId:', oldCalls2.length);
    
    // Migrate string format
    if (oldCalls1.length > 0) {
      const result1 = await callsCollection.updateMany(
        { userId: oldUserId },
        { $set: { userId: new ObjectId(newUserId) } }
      );
      console.log('   ✅ Migrated', result1.modifiedCount, 'calls (string format)');
    }
    
    // Migrate ObjectId format
    if (oldCalls2.length > 0) {
      const result2 = await callsCollection.updateMany(
        { userId: new ObjectId(oldUserId) },
        { $set: { userId: new ObjectId(newUserId) } }
      );
      console.log('   ✅ Migrated', result2.modifiedCount, 'calls (ObjectId format)');
    }
    
    // 3. Check final counts
    console.log('\n📊 Final Verification:');
    const finalAssistants = await assistantsCollection.find({ userId: new ObjectId(newUserId) }).toArray();
    const finalCalls = await callsCollection.find({ userId: new ObjectId(newUserId) }).toArray();
    
    console.log('   New userId assistants:', finalAssistants.length);
    console.log('   New userId calls:', finalCalls.length);
    
    console.log('\n✅ Migration Complete!');
    console.log('   Now refresh your dashboard - your data should appear!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateAdminData();