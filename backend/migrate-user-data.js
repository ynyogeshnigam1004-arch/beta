/**
 * Migrate User Data to New Enhanced User ID
 * This script links existing assistants, calls, etc. to the new enhanced user ID
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');
const { ObjectId } = require('mongodb');

async function migrateUserData() {
  console.log('🔄 Starting User Data Migration...\n');
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Get collections
    const oldUsersCollection = getCollection('users');
    const newUsersCollection = getCollection('userenhanceds');
    const assistantsCollection = getCollection('assistants');
    const callsCollection = getCollection('callhistories');
    
    // Find old and new user IDs
    const oldUser = await oldUsersCollection.findOne({ 
      email: 'ynyogeshnigam1008@gmail.com' 
    });
    
    const newUser = await newUsersCollection.findOne({ 
      email: 'ynyogeshnigam1008@gmail.com' 
    });
    
    if (!oldUser || !newUser) {
      console.log('❌ Could not find old or new user');
      return;
    }
    
    console.log('📋 User IDs:');
    console.log(`   - Old User ID: ${oldUser._id}`);
    console.log(`   - New User ID: ${newUser._id}`);
    
    // Check existing data linked to old user ID
    console.log('\n🔍 Checking existing data...');
    
    const assistantsCount = await assistantsCollection.countDocuments({ 
      userId: oldUser._id 
    });
    console.log(`   - Assistants linked to old ID: ${assistantsCount}`);
    
    const callsCount = await callsCollection.countDocuments({ 
      userId: oldUser._id.toString() // Calls might store userId as string
    });
    console.log(`   - Calls linked to old ID: ${callsCount}`);
    
    // Migrate assistants
    if (assistantsCount > 0) {
      console.log('\n🔄 Migrating assistants...');
      const assistantsResult = await assistantsCollection.updateMany(
        { userId: oldUser._id },
        { $set: { userId: newUser._id } }
      );
      console.log(`✅ Updated ${assistantsResult.modifiedCount} assistants`);
    }
    
    // Migrate calls (try both ObjectId and string formats)
    if (callsCount > 0) {
      console.log('\n🔄 Migrating calls...');
      
      // Try string format first
      const callsResult1 = await callsCollection.updateMany(
        { userId: oldUser._id.toString() },
        { $set: { userId: newUser._id.toString() } }
      );
      console.log(`✅ Updated ${callsResult1.modifiedCount} calls (string format)`);
      
      // Try ObjectId format
      const callsResult2 = await callsCollection.updateMany(
        { userId: oldUser._id },
        { $set: { userId: newUser._id } }
      );
      console.log(`✅ Updated ${callsResult2.modifiedCount} calls (ObjectId format)`);
    }
    
    // Verify migration
    console.log('\n🧪 Verifying migration...');
    
    const newAssistantsCount = await assistantsCollection.countDocuments({ 
      userId: newUser._id 
    });
    console.log(`   - Assistants now linked to new ID: ${newAssistantsCount}`);
    
    const newCallsCount = await callsCollection.countDocuments({ 
      $or: [
        { userId: newUser._id.toString() },
        { userId: newUser._id }
      ]
    });
    console.log(`   - Calls now linked to new ID: ${newCallsCount}`);
    
    // Show sample assistants
    if (newAssistantsCount > 0) {
      console.log('\n📋 Sample assistants:');
      const sampleAssistants = await assistantsCollection.find({ 
        userId: newUser._id 
      }).limit(3).toArray();
      
      sampleAssistants.forEach(assistant => {
        console.log(`   - ${assistant.name} (${assistant.status})`);
      });
    }
    
    console.log('\n🎉 Data migration completed successfully!');
    console.log('📋 Your dashboard should now show your data when you refresh');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
  
  process.exit(0);
}

migrateUserData();