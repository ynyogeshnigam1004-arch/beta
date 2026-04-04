/**
 * Fix assistant userIds - assign all assistants to admin user
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');
const { ObjectId } = require('mongodb');

async function fixAssistantUserIds() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    const assistantsCollection = getCollection('assistants');
    const usersCollection = getCollection('users');
    
    // Find admin user
    const adminUser = await usersCollection.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('❌ No admin user found');
      process.exit(1);
    }
    
    console.log(`\n✅ Found admin user:`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   UserId: ${adminUser._id}`);
    console.log(`   UserId String: ${adminUser._id.toString()}`);
    
    // Get all assistants
    const allAssistants = await assistantsCollection.find({}).toArray();
    console.log(`\n📊 Total assistants: ${allAssistants.length}`);
    
    if (allAssistants.length === 0) {
      console.log('❌ No assistants found');
      process.exit(0);
    }
    
    // Check which assistants need fixing
    const needsFixing = [];
    const alreadyCorrect = [];
    
    allAssistants.forEach(assistant => {
      const currentUserId = assistant.userId?.toString();
      const adminUserId = adminUser._id.toString();
      
      if (currentUserId === adminUserId) {
        alreadyCorrect.push(assistant.name);
      } else {
        needsFixing.push({
          name: assistant.name,
          id: assistant.id,
          currentUserId: currentUserId || 'null',
          _id: assistant._id
        });
      }
    });
    
    console.log(`\n✅ Already correct (${alreadyCorrect.length}): ${alreadyCorrect.join(', ')}`);
    console.log(`\n⚠️  Need fixing (${needsFixing.length}):`);
    needsFixing.forEach(a => {
      console.log(`   - ${a.name} (current userId: ${a.currentUserId})`);
    });
    
    if (needsFixing.length === 0) {
      console.log('\n✅ All assistants already have correct userId!');
      process.exit(0);
    }
    
    // Ask for confirmation
    console.log(`\n🔧 Will update ${needsFixing.length} assistants to userId: ${adminUser._id}`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Update all assistants
    let updated = 0;
    for (const assistant of needsFixing) {
      const result = await assistantsCollection.updateOne(
        { _id: assistant._id },
        { $set: { userId: adminUser._id } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated: ${assistant.name}`);
        updated++;
      } else {
        console.log(`⚠️  Failed to update: ${assistant.name}`);
      }
    }
    
    console.log(`\n✅ Updated ${updated} assistants`);
    console.log('✅ All assistants now belong to admin user');
    console.log('\n🔄 Refresh your frontend to see all assistants!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAssistantUserIds();
