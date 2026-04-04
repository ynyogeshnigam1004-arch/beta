/**
 * Check Current Admin ID After Migration
 * Verify what userId the admin actually has now
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { connectDB, getCollection } = require('./config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function checkCurrentAdminId() {
  try {
    console.log('🔍 Checking current admin ID after migration...\n');
    
    // Connect to database
    await connectDB();
    
    // Decode the JWT token to get current userId
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJiYzE3NzkyY2I3ZGI3ZTJjOWE2ZTYiLCJlbWFpbCI6InlueW9nZXNobmlnYW0xMDA4QGdtYWlsLmNvbSIsImlhdCI6MTc3Mzk0MDMzNiwiZXhwIjoxNzc0NTQ1MTM2fQ.h0zR4-CkUmNkCLyIsN_1vtB7F83Bv3rXvuQHMkMl930';
    
    const decoded = jwt.decode(token);
    const jwtUserId = decoded.userId;
    
    console.log('🎯 JWT Token Info:');
    console.log('   userId from JWT:', jwtUserId);
    console.log('   email from JWT:', decoded.email);
    console.log('   type:', typeof jwtUserId);
    
    // Check users collection
    const { ObjectId } = require('mongodb');
    const usersCollection = getCollection('users');
    
    // Find user by the JWT userId
    let user = null;
    try {
      user = await usersCollection.findOne({ _id: new ObjectId(jwtUserId) });
    } catch (err) {
      console.log('   ⚠️ Could not find user with ObjectId format');
    }
    
    if (!user) {
      // Try string format
      user = await usersCollection.findOne({ _id: jwtUserId });
    }
    
    console.log('\n👤 USER IN DATABASE:');
    if (user) {
      console.log('   ✅ User found!');
      console.log('   _id:', user._id);
      console.log('   _id type:', typeof user._id);
      console.log('   email:', user.email);
      console.log('   role:', user.role || 'user');
      console.log('   phoneNumbers:', user.phoneNumbers?.length || 0);
      console.log('   twilioCredentials:', user.twilioCredentials?.status || 'not configured');
    } else {
      console.log('   ❌ User NOT found with JWT userId!');
      
      // Let's find the admin user by email
      const adminByEmail = await usersCollection.findOne({ email: decoded.email });
      if (adminByEmail) {
        console.log('   🔍 Found user by email instead:');
        console.log('   _id:', adminByEmail._id);
        console.log('   _id type:', typeof adminByEmail._id);
        console.log('   ❌ MISMATCH: JWT userId ≠ Database _id');
      }
    }
    
    // Check assistants collection
    const assistantsCollection = getCollection('assistants');
    
    // Count assistants for JWT userId
    const assistantsForJWT = await assistantsCollection.find({
      $or: [
        { userId: new ObjectId(jwtUserId) },
        { userId: jwtUserId }
      ]
    }).toArray();
    
    console.log('\n📊 ASSISTANTS CHECK:');
    console.log('   Assistants for JWT userId:', assistantsForJWT.length);
    
    if (assistantsForJWT.length > 0) {
      console.log('   ✅ Migration successful - assistants found!');
      console.log('   First assistant:', assistantsForJWT[0].name);
      console.log('   Assistant userId:', assistantsForJWT[0].userId);
      console.log('   Assistant userId type:', typeof assistantsForJWT[0].userId);
    } else {
      console.log('   ❌ No assistants found for JWT userId');
      
      // Check if there are assistants with old userId
      const oldUserId = '69a49be0fdd5376624854e06';
      const assistantsForOld = await assistantsCollection.find({
        $or: [
          { userId: new ObjectId(oldUserId) },
          { userId: oldUserId }
        ]
      }).toArray();
      
      console.log('   Assistants for old userId:', assistantsForOld.length);
      if (assistantsForOld.length > 0) {
        console.log('   ⚠️ Migration may not have worked completely');
      }
    }
    
    // Check call history
    const callsCollection = getCollection('call_history');
    
    const callsForJWT = await callsCollection.find({
      $or: [
        { userId: new ObjectId(jwtUserId) },
        { userId: jwtUserId }
      ]
    }).limit(5).toArray();
    
    console.log('\n📞 CALL HISTORY CHECK:');
    console.log('   Calls for JWT userId:', callsForJWT.length);
    
    if (callsForJWT.length > 0) {
      console.log('   ✅ Migration successful - calls found!');
      console.log('   Latest call userId:', callsForJWT[0].userId);
      console.log('   Latest call userId type:', typeof callsForJWT[0].userId);
    }
    
    console.log('\n🎯 FINAL STATUS:');
    if (user && assistantsForJWT.length > 0) {
      console.log('   ✅ Everything looks good!');
      console.log('   Admin should be able to see data now');
      console.log('   Please refresh your dashboard');
    } else {
      console.log('   ❌ There are still issues');
      if (!user) console.log('   - User not found with JWT userId');
      if (assistantsForJWT.length === 0) console.log('   - No assistants found for JWT userId');
    }
    
  } catch (error) {
    console.error('❌ Check error:', error);
  }
  
  process.exit(0);
}

checkCurrentAdminId();