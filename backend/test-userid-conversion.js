/**
 * Test userId conversion and user lookup
 */

const { connectDB } = require('./config/database');
const User = require('./models/User');
const { ObjectId } = require('mongodb');

async function testUserIdConversion() {
  try {
    await connectDB();
    console.log('✅ Connected to database');
    
    // Find the admin user
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('\n📋 Admin User Data:');
    console.log('   ID:', adminUser._id);
    console.log('   ID Type:', typeof adminUser._id);
    console.log('   ID String:', adminUser._id.toString());
    console.log('   Email:', adminUser.email);
    console.log('   Twilio Credentials:', adminUser.twilioCredentials ? 'Present' : 'Missing');
    
    if (adminUser.twilioCredentials) {
      console.log('   Account SID:', adminUser.twilioCredentials.accountSid ? 'Set' : 'Missing');
      console.log('   Auth Token:', adminUser.twilioCredentials.authToken ? 'Set' : 'Missing');
      console.log('   Status:', adminUser.twilioCredentials.status);
    }
    
    // Test different ways of finding the user
    console.log('\n🔍 Testing User Lookup Methods:');
    
    // Method 1: Direct ObjectId
    const user1 = await User.findById(adminUser._id);
    console.log('1. findById(ObjectId):', user1 ? '✅ Found' : '❌ Not found');
    
    // Method 2: String ID
    const user2 = await User.findById(adminUser._id.toString());
    console.log('2. findById(String):', user2 ? '✅ Found' : '❌ Not found');
    
    // Method 3: New ObjectId from string
    const user3 = await User.findById(new ObjectId(adminUser._id.toString()));
    console.log('3. findById(new ObjectId(string)):', user3 ? '✅ Found' : '❌ Not found');
    
    // Test what the frontend would send
    const frontendUserId = adminUser._id.toString(); // This is what frontend sends
    console.log('\n📤 Frontend would send userId:', frontendUserId);
    console.log('   Type:', typeof frontendUserId);
    
    // Test MultiTenantTwilioService.getUserTwilioClient logic
    console.log('\n🧪 Testing getUserTwilioClient Logic:');
    
    try {
      const testUser = await User.findById(frontendUserId);
      console.log('   User found:', testUser ? '✅ Yes' : '❌ No');
      
      if (testUser) {
        console.log('   Has twilioCredentials:', testUser.twilioCredentials ? '✅ Yes' : '❌ No');
        
        if (testUser.twilioCredentials) {
          console.log('   Has accountSid:', testUser.twilioCredentials.accountSid ? '✅ Yes' : '❌ No');
          console.log('   Status:', testUser.twilioCredentials.status);
          
          if (!testUser.twilioCredentials.accountSid) {
            console.log('   ❌ This is the problem - no accountSid!');
          } else if (testUser.twilioCredentials.status !== 'active') {
            console.log('   ❌ This is the problem - status not active!');
          } else {
            console.log('   ✅ Twilio credentials look good');
          }
        } else {
          console.log('   ❌ This is the problem - no twilioCredentials object!');
        }
      }
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testUserIdConversion();