/**
 * Check Current Data Ownership
 * Shows which user owns which assistants
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const { getCollection } = require('./config/database');

async function checkDataOwnership() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({}).select('email role _id');
    console.log('📊 Users in database:');
    users.forEach(user => {
      console.log(`   ${user.email} (${user.role}) - ID: ${user._id}`);
    });
    console.log('');

    // Get assistants collection
    const assistantsCollection = getCollection('assistants');
    const allAssistants = await assistantsCollection.find({}).toArray();
    
    console.log(`📊 Total assistants: ${allAssistants.length}\n`);

    // Group by userId
    const assistantsByUser = {};
    const noUserId = [];

    allAssistants.forEach(asst => {
      if (!asst.userId) {
        noUserId.push(asst);
      } else {
        const userIdStr = asst.userId.toString();
        if (!assistantsByUser[userIdStr]) {
          assistantsByUser[userIdStr] = [];
        }
        assistantsByUser[userIdStr].push(asst);
      }
    });

    // Show ownership
    console.log('📋 Assistant Ownership:\n');
    
    if (noUserId.length > 0) {
      console.log(`❌ Unassigned (no userId): ${noUserId.length} assistants`);
      noUserId.forEach(asst => {
        console.log(`   - ${asst.name || asst.id}`);
      });
      console.log('');
    }

    users.forEach(user => {
      const userIdStr = user._id.toString();
      const userAssistants = assistantsByUser[userIdStr] || [];
      console.log(`${user.role === 'admin' ? '👑' : '👤'} ${user.email}:`);
      console.log(`   ${userAssistants.length} assistants`);
      if (userAssistants.length > 0) {
        userAssistants.forEach(asst => {
          console.log(`   - ${asst.name || asst.id}`);
        });
      }
      console.log('');
    });

    // Get call history
    const callsCollection = getCollection('call_history');
    const allCalls = await callsCollection.find({}).toArray();
    console.log(`📊 Total call records: ${allCalls.length}\n`);

    const callsByUser = {};
    const noUserIdCalls = [];

    allCalls.forEach(call => {
      if (!call.userId) {
        noUserIdCalls.push(call);
      } else {
        const userIdStr = call.userId.toString();
        if (!callsByUser[userIdStr]) {
          callsByUser[userIdStr] = 0;
        }
        callsByUser[userIdStr]++;
      }
    });

    console.log('📋 Call History Ownership:\n');
    
    if (noUserIdCalls.length > 0) {
      console.log(`❌ Unassigned (no userId): ${noUserIdCalls.length} calls\n`);
    }

    users.forEach(user => {
      const userIdStr = user._id.toString();
      const userCalls = callsByUser[userIdStr] || 0;
      console.log(`${user.role === 'admin' ? '👑' : '👤'} ${user.email}: ${userCalls} calls`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Next Step:');
    console.log('   Run: .\\ASSIGN_DATA_NOW.ps1');
    console.log('   This will assign ALL data to admin account\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDataOwnership();
