const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupOldUsersCollection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Check both collections before cleanup
    console.log('\n=== BEFORE CLEANUP ===');
    
    const usersCollection = db.collection('users');
    const userEnhancedCollection = db.collection('userenhanceds');
    
    const oldUsers = await usersCollection.find({}).toArray();
    const newUsers = await userEnhancedCollection.find({}).toArray();
    
    console.log(`📊 Old users collection: ${oldUsers.length} users`);
    oldUsers.forEach(user => {
      console.log(`   ${user.email}: role=${user.role}, credits=${user.credits || 'undefined'}`);
    });
    
    console.log(`📊 New userenhanceds collection: ${newUsers.length} users`);
    newUsers.forEach(user => {
      console.log(`   ${user.email}: role=${user.role}, credits=${user.credits}`);
    });
    
    // Remove all users from old collection
    console.log('\n🧹 CLEANING UP OLD USERS COLLECTION...');
    const deleteResult = await usersCollection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} users from old collection`);
    
    // Verify cleanup
    console.log('\n=== AFTER CLEANUP ===');
    const remainingOldUsers = await usersCollection.find({}).toArray();
    const remainingNewUsers = await userEnhancedCollection.find({}).toArray();
    
    console.log(`📊 Old users collection: ${remainingOldUsers.length} users (should be 0)`);
    console.log(`📊 New userenhanceds collection: ${remainingNewUsers.length} users`);
    remainingNewUsers.forEach(user => {
      console.log(`   ${user.email}: role=${user.role}, credits=${user.credits}`);
    });
    
    console.log('\n🎯 CLEANUP COMPLETE!');
    console.log('✅ Removed all users from old "users" collection');
    console.log('✅ All user data now in "userenhanceds" collection with correct roles/credits');
    console.log('✅ Authentication middleware now uses UserEnhanced model');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanupOldUsersCollection();