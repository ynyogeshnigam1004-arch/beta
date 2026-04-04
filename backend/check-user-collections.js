const mongoose = require('mongoose');
require('dotenv').config();

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB');
    
    // Check both possible collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📋 Available collections:', collections.map(c => c.name));
    
    // Check users collection
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}).toArray();
    console.log('\n=== USERS COLLECTION ===');
    users.forEach(user => {
      console.log(`ID: ${user._id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Credits: ${user.credits}`);
      console.log('---');
    });
    
    // Check userenhanceds collection
    const userEnhancedCollection = db.collection('userenhanceds');
    const userEnhanceds = await userEnhancedCollection.find({}).toArray();
    console.log('\n=== USERENHANCEDS COLLECTION ===');
    userEnhanceds.forEach(user => {
      console.log(`ID: ${user._id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Credits: ${user.credits}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsers();