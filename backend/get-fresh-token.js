/**
 * Generate Fresh JWT Token for Admin
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

async function getFreshToken() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { userId: adminUser._id, email: adminUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Fresh JWT Token for admin:');
    console.log(token);
    console.log('\n📋 Copy this token and use it in browser localStorage:');
    console.log(`localStorage.setItem('token', '${token}');`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

getFreshToken();