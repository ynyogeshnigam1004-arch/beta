/**
 * Migrate Admin Assistants to Current User ID
 * Move all assistants from old admin user IDs to current admin user ID
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const { getCollection } = require('./config/database');

async function migrateAdminAssistants() {
  try {
    console.log('🔄 Migrating admin assistants to current user ID...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find current admin user
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    const currentAdminId = adminUser._id;
    console.log('✅ Current admin user ID:', currentAdminId.toString());

    // Old admin user IDs that should be migrated
    const oldAdminUserIds = [
      '69bbc17792cb7db7e2c9a6e6', // Has "mine", "hey", and other assistants
      '69a49c0bfdd5376624854e09', // Has some assistants
      '69b6e615bc874517c48edd32', // Has some assistants
      '69bbbd0d0840333aba95f934'  // Has some assistants
    ];

    const assistantsCollection = getCollection('assistants');

    // Find assistants to migrate
    const assistantsToMigrate = await assistantsCollection.find({
      userId: { $in: oldAdminUserIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).toArray();

    console.log(`\n📊 Found ${assistantsToMigrate.length} assistants to migrate:`);
    assistantsToMigrate.forEach(assistant => {
      console.log(`   - ${assistant.name} (ID: ${assistant.id}) from userId: ${assistant.userId}`);
    });

    if (assistantsToMigrate.length === 0) {
      console.log('✅ No assistants need migration');
      return;
    }

    // Confirm migration
    console.log(`\n🔄 Migrating ${assistantsToMigrate.length} assistants to current admin ID: ${currentAdminId}`);

    // Perform migration
    const result = await assistantsCollection.updateMany(
      { userId: { $in: oldAdminUserIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { userId: currentAdminId } }
    );

    console.log(`✅ Migration completed: ${result.modifiedCount} assistants updated`);

    // Verify migration
    const adminAssistants = await assistantsCollection.find({
      userId: currentAdminId
    }).toArray();

    console.log(`\n✅ Admin now has ${adminAssistants.length} total assistants:`);
    adminAssistants.forEach((assistant, index) => {
      console.log(`   ${index + 1}. ${assistant.name} (ID: ${assistant.id})`);
    });

    console.log('\n🎉 Migration successful! Admin should now see all assistants.');

  } catch (error) {
    console.error('❌ Error migrating assistants:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

migrateAdminAssistants();