/**
 * Fix Admin User ID Format
 * Check and fix the admin user ID format issue
 */

const mongoose = require('mongoose');

async function fixAdminUserId() {
  try {
    // Connect directly with mongoose
    const MONGODB_URI = process.env.MONGODB_URI || 
      "mongodb+srv://ynyogeshnigam1002_db_user:zPEw2UqCF0ilRS3A@cluster0.u5ddbbd.mongodb.net/voiceai?retryWrites=true&w=majority&appName=Cluster0";
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find admin user by email
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found by email');
      return;
    }
    
    console.log('\n📋 Admin User Found:');
    console.log('   ID:', adminUser._id);
    console.log('   ID Type:', typeof adminUser._id);
    console.log('   ID String:', adminUser._id.toString());
    console.log('   Email:', adminUser.email);
    console.log('   Role:', adminUser.role);
    
    // Check if this matches the JWT userId
    const jwtUserId = '69a49be0fdd5376624854e06';
    const matches = adminUser._id.toString() === jwtUserId;
    
    console.log('\n🔍 JWT Comparison:');
    console.log('   JWT userId:', jwtUserId);
    console.log('   DB User ID:', adminUser._id.toString());
    console.log('   Match:', matches ? '✅ YES' : '❌ NO');
    
    if (matches) {
      console.log('\n✅ IDs match! The issue is in the authentication middleware.');
      console.log('   The middleware should be able to find this user.');
    } else {
      console.log('\n❌ IDs do NOT match! This is the problem.');
      console.log('   Your JWT token has a different userId than your database record.');
    }
    
    // Also check assistants with this userId
    const Assistant = mongoose.model('Assistant', new mongoose.Schema({}, { strict: false }));
    const assistants1 = await Assistant.find({ userId: adminUser._id });
    const assistants2 = await Assistant.find({ userId: adminUser._id.toString() });
    
    console.log('\n🤖 Assistant Data:');
    console.log('   With ObjectId:', assistants1.length, 'assistants');
    console.log('   With String:', assistants2.length, 'assistants');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Load environment variables
require('dotenv').config();
fixAdminUserId();