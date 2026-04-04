/**
 * Debug Admin Data Issue
 * Check why admin is not seeing assistants/data
 */

const { connectDB } = require('./config/database');
const User = require('./models/User');
const { getAllAssistants } = require('./models/Assistant');
const { getCollection } = require('./config/database');

async function debugAdminDataIssue() {
  try {
    await connectDB();
    console.log('✅ Connected to database');
    
    // Find admin user
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('\n📋 Admin User Info:');
    console.log('   ID:', adminUser._id);
    console.log('   ID Type:', typeof adminUser._id);
    console.log('   ID String:', adminUser._id.toString());
    console.log('   Email:', adminUser.email);
    console.log('   Role:', adminUser.role);
    
    // Check assistants with admin userId
    console.log('\n🤖 Testing Assistant Queries:');
    
    // Method 1: Using ObjectId
    const assistants1 = await getAllAssistants(adminUser._id);
    console.log('1. Using ObjectId:', assistants1.length, 'assistants found');
    
    // Method 2: Using string
    const assistants2 = await getAllAssistants(adminUser._id.toString());
    console.log('2. Using String:', assistants2.length, 'assistants found');
    
    // Method 3: Check all assistants and their userId formats
    console.log('\n📊 All Assistants in Database:');
    const allAssistants = await getAllAssistants(); // No filter
    console.log('Total assistants in DB:', allAssistants.length);
    
    if (allAssistants.length > 0) {
      console.log('\n🔍 Assistant userId Analysis:');
      allAssistants.forEach((assistant, index) => {
        console.log(`${index + 1}. Name: "${assistant.name}"`);
        console.log(`   userId: ${assistant.userId}`);
        console.log(`   userId Type: ${typeof assistant.userId}`);
        console.log(`   Matches Admin ID: ${assistant.userId?.toString() === adminUser._id.toString()}`);
        console.log('');
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugAdminDataIssue();