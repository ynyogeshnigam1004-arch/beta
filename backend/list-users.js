/**
 * List all users in database to find the correct email
 */

require('dotenv').config();
const { connectDB } = require('./config/database');
const User = require('./models/User');

async function listUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('👥 Finding all users...');
    const users = await User.find({}, 'email fullName twilioCredentials.status phoneNumbers');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      return;
    }
    
    console.log(`\n📋 FOUND ${users.length} USERS:`);
    console.log('═══════════════════════════════════════════════════════');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.fullName} (${user.email})`);
      console.log(`   Twilio Status: ${user.twilioCredentials?.status || 'Not configured'}`);
      console.log(`   Phone Numbers: ${user.phoneNumbers?.length || 0}`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error listing users:', error);
  } finally {
    process.exit(0);
  }
}

listUsers();