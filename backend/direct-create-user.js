/**
 * Direct Create User in MongoDB
 * Directly insert the missing user record
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');

async function createUserDirectly() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    
    const { ObjectId } = require('mongodb');
    const usersCollection = getCollection('users');
    
    const userId = '69bbc17792cb7db7e2c9a6e6';
    const email = 'ynyogeshnigam1008@gmail.com';
    
    console.log('🔍 Checking if user already exists...');
    
    // Check if user already exists
    let existingUser = null;
    try {
      existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
    } catch (err) {
      console.log('   Could not check ObjectId format');
    }
    
    if (!existingUser) {
      existingUser = await usersCollection.findOne({ _id: userId });
    }
    
    if (existingUser) {
      console.log('✅ User already exists!');
      console.log('   _id:', existingUser._id);
      console.log('   email:', existingUser.email);
      console.log('   role:', existingUser.role);
      return;
    }
    
    console.log('🔧 Creating new user record...');
    
    // Create the user record
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
        status: 'pending',
        configuredAt: null,
        errorMessage: null
      },
      // Add any other fields that might be needed
      isLocked: false,
      loginAttempts: 0
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    console.log('✅ User created successfully!');
    console.log('   Inserted ID:', result.insertedId);
    console.log('   Email:', newUser.email);
    console.log('   Role:', newUser.role);
    
    // Verify the user was created
    const verifyUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (verifyUser) {
      console.log('✅ Verification: User found in database');
      console.log('   _id:', verifyUser._id);
      console.log('   email:', verifyUser.email);
    } else {
      console.log('❌ Verification failed: User not found after creation');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

createUserDirectly();