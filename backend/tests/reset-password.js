/**
 * Reset user password
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('voiceai');
    const usersCollection = db.collection('users');
    
    const email = 'ynyogeshnigam1008@gmail.com';
    const newPassword = 'test123';
    
    // Find user
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found:', email);
      return;
    }
    
    console.log('✅ User found:', email);
    console.log('User ID:', user._id);
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );
    
    console.log('\n✅ Password reset successfully!');
    console.log('Email:', email);
    console.log('New Password:', newPassword);
    console.log('\nYou can now login with these credentials.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

resetPassword();
