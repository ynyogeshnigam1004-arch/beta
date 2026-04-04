/**
 * Check Assistant UserId Mismatch
 * Find why admin can't see original assistants
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Assistant = require('./models/Assistant');
const { getCollection } = require('./config/database');

async function checkAssistantUserIdMismatch() {
  try {
    console.log('🔍 Checking assistant userId mismatch...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`   Current User ID: ${adminUser._id}`);
    console.log(`   Type: ${typeof adminUser._id}`);

    // Check assistants collection directly
    const assistantsCollection = getCollection('assistants');
    
    // Find all assistants
    const allAssistants = await assistantsCollection.find({}).toArray();
    console.log(`\n📊 Total assistants in database: ${allAssistants.length}`);

    // Group by userId format
    const userIdGroups = {};
    allAssistants.forEach(assistant => {
      const userIdType = typeof assistant.userId;
      const userIdValue = assistant.userId ? assistant.userId.toString() : 'null';
      
      if (!userIdGroups[userIdType]) {
        userIdGroups[userIdType] = {};
      }
      if (!userIdGroups[userIdType][userIdValue]) {
        userIdGroups[userIdType][userIdValue] = [];
      }
      userIdGroups[userIdType][userIdValue].push(assistant);
    });

    console.log('\n📋 Assistants grouped by userId format:');
    Object.keys(userIdGroups).forEach(type => {
      console.log(`\n  ${type.toUpperCase()} userId format:`);
      Object.keys(userIdGroups[type]).forEach(value => {
        const assistants = userIdGroups[type][value];
        console.log(`    ${value}: ${assistants.length} assistants`);
        assistants.forEach(assistant => {
          console.log(`      - ${assistant.name} (ID: ${assistant.id})`);
        });
      });
    });

    // Check assistants without userId
    const assistantsWithoutUserId = allAssistants.filter(a => !a.userId);
    console.log(`\n🔍 Assistants without userId: ${assistantsWithoutUserId.length}`);
    assistantsWithoutUserId.forEach(assistant => {
      console.log(`   - ${assistant.name} (ID: ${assistant.id})`);
    });

    // Check assistants that match current admin ID
    const matchingAssistants = allAssistants.filter(a => 
      a.userId && a.userId.toString() === adminUser._id.toString()
    );
    console.log(`\n✅ Assistants matching current admin ID: ${matchingAssistants.length}`);
    matchingAssistants.forEach(assistant => {
      console.log(`   - ${assistant.name} (ID: ${assistant.id})`);
    });

    // Suggest fix
    console.log('\n🔧 Suggested Fix:');
    if (assistantsWithoutUserId.length > 0) {
      console.log('   1. Assign assistants without userId to admin account');
    }
    
    const otherUserIdAssistants = allAssistants.filter(a => 
      a.userId && a.userId.toString() !== adminUser._id.toString()
    );
    if (otherUserIdAssistants.length > 0) {
      console.log('   2. Check if other userId formats belong to admin account');
      console.log('   3. Migrate assistants from old userId format to current format');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkAssistantUserIdMismatch();