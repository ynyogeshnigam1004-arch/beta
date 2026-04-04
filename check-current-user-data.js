/**
 * Check current user data - READ ONLY
 */

const { connectDB } = require('./backend/config/database');
const User = require('./backend/models/User');

async function checkUserData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    // Find user by email
    const userEmail = 'ynvyogeshnjigam008@gmail.com';
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ Found user:', user.email);
    console.log('');
    console.log('📋 TWILIO CREDENTIALS:');
    console.log('  Account SID:', user.twilioCredentials?.accountSid || 'NOT SET');
    console.log('  Auth Token:', user.twilioCredentials?.authToken ? 'SET (hidden)' : 'NOT SET');
    console.log('  API Key:', user.twilioCredentials?.apiKey || 'NOT SET');
    console.log('  API Secret:', user.twilioCredentials?.apiSecret ? 'SET (hidden)' : 'NOT SET');
    console.log('  TwiML App SID:', user.twilioCredentials?.twimlAppSid || 'NOT SET');
    console.log('  Status:', user.twilioCredentials?.status || 'NOT SET');
    console.log('  Configured At:', user.twilioCredentials?.configuredAt || 'NOT SET');
    console.log('  Error:', user.twilioCredentials?.errorMessage || 'NONE');
    console.log('');
    console.log('📞 PHONE NUMBERS:');
    console.log('  Total:', user.phoneNumbers?.length || 0);
    
    if (user.phoneNumbers && user.phoneNumbers.length > 0) {
      user.phoneNumbers.forEach((phone, index) => {
        console.log(`  ${index + 1}. ${phone.phoneNumber}`);
        console.log(`     Label: ${phone.label}`);
        console.log(`     Assistant: ${phone.assignedAssistantId}`);
        console.log(`     Status: ${phone.status}`);
        console.log(`     TwiML App: ${phone.twimlAppSid || 'NOT SET'}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUserData();