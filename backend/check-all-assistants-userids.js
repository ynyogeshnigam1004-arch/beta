/**
 * Check all assistants and their userIds
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');

async function checkAllAssistants() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    const collection = getCollection('assistants');
    
    // Get ALL assistants without filtering
    const allAssistants = await collection.find({}).toArray();
    
    console.log(`\n📊 Total assistants in database: ${allAssistants.length}\n`);
    
    if (allAssistants.length === 0) {
      console.log('❌ No assistants found in database');
      process.exit(0);
    }
    
    // Group by userId
    const byUserId = {};
    
    allAssistants.forEach((assistant, index) => {
      console.log(`\n--- Assistant ${index + 1} ---`);
      console.log(`Name: ${assistant.name}`);
      console.log(`ID: ${assistant.id}`);
      console.log(`Status: ${assistant.status}`);
      console.log(`UserId: ${assistant.userId}`);
      console.log(`UserId Type: ${typeof assistant.userId}`);
      console.log(`UserId String: ${assistant.userId?.toString()}`);
      console.log(`Created: ${assistant.createdAt}`);
      
      // Group by userId
      const userIdStr = assistant.userId?.toString() || 'null';
      if (!byUserId[userIdStr]) {
        byUserId[userIdStr] = [];
      }
      byUserId[userIdStr].push(assistant.name);
    });
    
    console.log('\n\n📊 SUMMARY BY USERID:\n');
    Object.entries(byUserId).forEach(([userId, names]) => {
      console.log(`UserId: ${userId}`);
      console.log(`  Assistants (${names.length}): ${names.join(', ')}`);
      console.log('');
    });
    
    console.log('\n✅ Check complete');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllAssistants();
