/**
 * Check Users in Database
 * See what users actually exist and their IDs
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');
const jwt = require('jsonwebtoken');

async function checkUsersInDB() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    // Connect to database
    await connectDB();
    
    // Get JWT info
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJiYzE3NzkyY2I3ZGI3ZTJjOWE2ZTYiLCJlbWFpbCI6InlueW9nZXNobmlnYW0xMDA4QGdtYWlsLmNvbSIsImlhdCI6MTc3Mzk0MDMzNiwiZXhwIjoxNzc0NTQ1MTM2fQ.h0zR4-CkUmNkCLyIsN_1vtB7F83Bv3rXvuQHMkMl930';
    const decoded = jwt.decode(token);
    const jwtUserId = decoded.userId;
    const jwtEmail = decoded.email;
    
    console.log('🎯 JWT Token Info:');
    console.log('   userId:', jwtUserId);
    console.log('   email:', jwtEmail);
    console.log('   type:', typeof jwtUserId);
    
    // Check users collection
    const { ObjectId } = require('mongodb');
    const usersCollection = getCollection('users');
    
    // Get all users
    const allUsers = await usersCollection.find({}).toArray();
    
    console.log(`\n👥 ALL USERS IN DATABASE (${allUsers.length} total):`);
    console.log('='.repeat(60));
    
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. User:`);
      console.log(`   _id: ${user._id}`);
      console.log(`   _id type: ${typeof user._id}`);
      console.log(`   email: ${user.email}`);
      console.log(`   role: ${user.role || 'user'}`);
      console.log(`   phoneNumbers: ${user.phoneNumbers?.length || 0}`);
      console.log(`   twilioCredentials: ${user.twilioCredentials?.status || 'not configured'}`);
      
      // Check if this matches JWT
      if (user._id.toString() === jwtUserId) {
        console.log(`   ✅ MATCHES JWT userId!`);
      } else if (user.email === jwtEmail) {
        console.log(`   📧 MATCHES JWT email (but different ID)`);
      }
      console.log('');
    });
    
    // Try to find user by JWT userId
    console.log('🔍 SEARCHING FOR JWT USER:');
    console.log('='.repeat(40));
    
    let userByJWTId = null;
    try {
      userByJWTId = await usersCollection.findOne({ _id: new ObjectId(jwtUserId) });
    } catch (err) {
      console.log('   ⚠️ Could not search by ObjectId format');
    }
    
    if (!userByJWTId) {
      // Try string format
      userByJWTId = await usersCollection.findOne({ _id: jwtUserId });
    }
    
    if (userByJWTId) {
      console.log('   ✅ Found user by JWT userId!');
      console.log(`   _id: ${userByJWTId._id}`);
      console.log(`   email: ${userByJWTId.email}`);
    } else {
      console.log('   ❌ No user found with JWT userId');
      
      // Try to find by email
      const userByEmail = await usersCollection.findOne({ email: jwtEmail });
      if (userByEmail) {
        console.log('   📧 But found user by email:');
        console.log(`   _id: ${userByEmail._id}`);
        console.log(`   email: ${userByEmail.email}`);
        console.log('   ❌ ID MISMATCH: JWT userId ≠ Database _id');
        
        console.log('\n🔧 SOLUTION NEEDED:');
        console.log('   Either:');
        console.log('   1. Update JWT to use correct userId, OR');
        console.log('   2. Update user _id in database to match JWT');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkUsersInDB();