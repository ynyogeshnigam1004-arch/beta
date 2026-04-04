/**
 * Create a test user
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function createUser() {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('voiceai'); // Use correct database name
    const usersCollection = db.collection('users');
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ 
      email: 'ynyogeshsinigam1008@gmail.com' 
    });
    
    if (existingUser) {
      console.log('✅ User already exists!');
      console.log('Email:', existingUser.email);
      console.log('User ID:', existingUser._id);
      return;
    }
    
    // Create new user
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const user = {
      email: 'ynyogeshsinigam1008@gmail.com',
      password: hashedPassword,
      name: 'Test User',
      createdAt: new Date().toISOString()
    };
    
    const result = await usersCollection.insertOne(user);
    
    console.log('✅ User created successfully!');
    console.log('Email:', user.email);
    console.log('Password: test123');
    console.log('User ID:', result.insertedId);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

createUser();
