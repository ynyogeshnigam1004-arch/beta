/**
 * Test Admin Data Access with Single User Model
 * Verifies that admin account can access all their data
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Assistant = require('./models/Assistant');

async function testAdminDataAccess() {
  try {
    console.log('🔍 Testing admin data access with single User model...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user by email
    const adminEmail = 'ynyogeshnigam1008@gmail.com';
    const adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      console.log('❌ Admin user not found in User model');
      console.log('   This means the admin account needs to be created or migrated');
      return;
    }

    console.log('✅ Admin user found in User model:');
    console.log(`   ID: ${adminUser._id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Google ID: ${adminUser.googleId || 'Not set'}`);
    console.log(`   Email Verified: ${adminUser.emailVerified}`);
    console.log(`   Created: ${adminUser.createdAt}`);
    console.log(`   Last Login: ${adminUser.lastLogin || 'Never'}`);

    // Check Twilio credentials
    console.log('\n📞 Twilio Credentials:');
    if (adminUser.twilioCredentials && adminUser.twilioCredentials.accountSid) {
      console.log(`   Account SID: ${adminUser.twilioCredentials.accountSid}`);
      console.log(`   Status: ${adminUser.twilioCredentials.status}`);
      console.log(`   Configured: ${adminUser.twilioCredentials.configuredAt || 'Not configured'}`);
    } else {
      console.log('   No Twilio credentials configured');
    }

    // Check phone numbers
    console.log('\n📱 Phone Numbers:');
    if (adminUser.phoneNumbers && adminUser.phoneNumbers.length > 0) {
      adminUser.phoneNumbers.forEach((phone, index) => {
        console.log(`   ${index + 1}. ${phone.phoneNumber} (${phone.label})`);
        console.log(`      Assistant ID: ${phone.assignedAssistantId}`);
        console.log(`      Status: ${phone.status}`);
      });
    } else {
      console.log('   No phone numbers configured');
    }

    // Check assistants
    console.log('\n🤖 Assistants:');
    const assistants = await Assistant.getAllAssistants(adminUser._id);
    
    if (assistants.length > 0) {
      console.log(`   Found ${assistants.length} assistants:`);
      assistants.forEach((assistant, index) => {
        console.log(`   ${index + 1}. ${assistant.name} (ID: ${assistant.id})`);
        console.log(`      Model: ${assistant.model}`);
        console.log(`      Voice: ${assistant.voice}`);
        console.log(`      Status: ${assistant.status}`);
      });
    } else {
      console.log('   No assistants found');
    }

    console.log('\n✅ Admin data access test completed successfully!');
    console.log('   The single User model is working correctly for admin account.');

  } catch (error) {
    console.error('❌ Error testing admin data access:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testAdminDataAccess();