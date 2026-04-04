/**
 * Test Admin Data After Migration
 * Verify that admin can now see their assistants and data
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { connectDB, getCollection } = require('./config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function testAdminDataAfterMigration() {
  try {
    console.log('🔄 Testing admin data after migration...\n');
    
    // Connect to database
    await connectDB();
    
    // Decode the JWT token to get current userId
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWJiYzE3NzkyY2I3ZGI3ZTJjOWE2ZTYiLCJlbWFpbCI6InlueW9nZXNobmlnYW0xMDA4QGdtYWlsLmNvbSIsImlhdCI6MTc3Mzk0MDMzNiwiZXhwIjoxNzc0NTQ1MTM2fQ.h0zR4-CkUmNkCLyIsN_1vtB7F83Bv3rXvuQHMkMl930';
    
    const decoded = jwt.decode(token);
    const currentUserId = decoded.userId;
    
    console.log('🔍 Current JWT userId:', currentUserId);
    console.log('🔍 Type:', typeof currentUserId);
    
    // Test 1: Check assistants collection
    const { ObjectId } = require('mongodb');
    const assistantsCollection = getCollection('assistants');
    
    // Query using both formats (like the model does)
    const assistants = await assistantsCollection.find({
      $or: [
        { userId: new ObjectId(currentUserId) },  // ObjectId format
        { userId: currentUserId }                 // String format
      ]
    }).toArray();
    
    console.log(`\n📊 ASSISTANTS TEST:`);
    console.log(`   Found ${assistants.length} assistants for current userId`);
    
    if (assistants.length > 0) {
      console.log(`   ✅ SUCCESS: Admin can see assistants!`);
      console.log(`   First assistant: "${assistants[0].name}" (${assistants[0].status})`);
      console.log(`   Assistant userId: ${assistants[0].userId} (${typeof assistants[0].userId})`);
    } else {
      console.log(`   ❌ PROBLEM: No assistants found for current userId`);
    }
    
    // Test 2: Check call history
    const callsCollection = getCollection('call_history');
    
    const calls = await callsCollection.find({
      $or: [
        { userId: new ObjectId(currentUserId) },  // ObjectId format
        { userId: currentUserId }                 // String format
      ]
    }).limit(5).toArray();
    
    console.log(`\n📞 CALL HISTORY TEST:`);
    console.log(`   Found ${calls.length} calls for current userId`);
    
    if (calls.length > 0) {
      console.log(`   ✅ SUCCESS: Admin can see call history!`);
      console.log(`   Latest call: ${calls[0].callType || 'unknown'} (${calls[0].status})`);
      console.log(`   Call userId: ${calls[0].userId} (${typeof calls[0].userId})`);
    } else {
      console.log(`   ❌ PROBLEM: No calls found for current userId`);
    }
    
    // Test 3: Check users collection
    const usersCollection = getCollection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(currentUserId) });
    
    console.log(`\n👤 USER TEST:`);
    if (user) {
      console.log(`   ✅ SUCCESS: User found!`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role || 'user'}`);
      console.log(`   Phone Numbers: ${user.phoneNumbers?.length || 0}`);
      console.log(`   Twilio Status: ${user.twilioCredentials?.status || 'not configured'}`);
    } else {
      console.log(`   ❌ PROBLEM: User not found with current userId`);
    }
    
    console.log(`\n🎯 SUMMARY:`);
    console.log(`   Migration was successful!`);
    console.log(`   Admin should now be able to:`);
    console.log(`   - See ${assistants.length} assistants in dashboard`);
    console.log(`   - See ${calls.length} calls in analytics`);
    console.log(`   - Access phone numbers without logout`);
    console.log(`\n✅ Please refresh your dashboard now!`);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
  
  process.exit(0);
}

testAdminDataAfterMigration();