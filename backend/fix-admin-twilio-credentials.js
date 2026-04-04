/**
 * Fix Admin Twilio Credentials
 * Add Twilio credentials to admin account to restore human transfer functionality
 */

const { connectDB } = require('./config/database');
const User = require('./models/User');

async function fixAdminTwilioCredentials() {
  try {
    await connectDB();
    console.log('✅ Connected to database');
    
    // Find admin user
    const adminUser = await User.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('📋 Current Admin User Status:');
    console.log('   ID:', adminUser._id);
    console.log('   Email:', adminUser.email);
    console.log('   Has twilioCredentials:', adminUser.twilioCredentials ? 'Yes' : 'No');
    
    if (adminUser.twilioCredentials) {
      console.log('   Account SID:', adminUser.twilioCredentials.accountSid ? 'Set' : 'Missing');
      console.log('   Auth Token:', adminUser.twilioCredentials.authToken ? 'Set' : 'Missing');
      console.log('   Status:', adminUser.twilioCredentials.status);
    }
    
    // Check if credentials are already configured
    if (adminUser.twilioCredentials?.accountSid && adminUser.twilioCredentials?.authToken) {
      console.log('✅ Twilio credentials already configured');
      
      if (adminUser.twilioCredentials.status !== 'active') {
        console.log('🔧 Setting status to active...');
        adminUser.twilioCredentials.status = 'active';
        await adminUser.save();
        console.log('✅ Status updated to active');
      }
      
      return;
    }
    
    // Add Twilio credentials (you'll need to provide these)
    console.log('\n🔧 Adding Twilio credentials...');
    console.log('⚠️  You need to provide your Twilio credentials:');
    console.log('   1. Account SID (starts with AC...)');
    console.log('   2. Auth Token');
    console.log('   3. API Key (optional, for browser calls)');
    console.log('   4. API Secret (optional, for browser calls)');
    console.log('   5. TwiML App SID (optional, for browser calls)');
    
    // For now, let's check what's in the .env file
    const fs = require('fs');
    const path = require('path');
    
    try {
      const envPath = path.join(__dirname, '.env');
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      console.log('\n📋 Checking .env file for Twilio credentials...');
      
      const accountSidMatch = envContent.match(/TWILIO_ACCOUNT_SID=(.+)/);
      const authTokenMatch = envContent.match(/TWILIO_AUTH_TOKEN=(.+)/);
      const apiKeyMatch = envContent.match(/TWILIO_API_KEY=(.+)/);
      const apiSecretMatch = envContent.match(/TWILIO_API_SECRET=(.+)/);
      const twimlAppMatch = envContent.match(/TWILIO_TWIML_APP_SID=(.+)/);
      
      if (accountSidMatch && authTokenMatch) {
        const accountSid = accountSidMatch[1].trim();
        const authToken = authTokenMatch[1].trim();
        const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
        const apiSecret = apiSecretMatch ? apiSecretMatch[1].trim() : null;
        const twimlAppSid = twimlAppMatch ? twimlAppMatch[1].trim() : null;
        
        console.log('✅ Found Twilio credentials in .env file');
        console.log('   Account SID:', accountSid.substring(0, 10) + '...');
        console.log('   Auth Token:', authToken.substring(0, 10) + '...');
        console.log('   API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'Not set');
        console.log('   API Secret:', apiSecret ? 'Set' : 'Not set');
        console.log('   TwiML App SID:', twimlAppSid ? twimlAppSid.substring(0, 10) + '...' : 'Not set');
        
        // Update admin user with credentials
        adminUser.twilioCredentials = {
          accountSid: accountSid,
          authToken: authToken,
          apiKey: apiKey,
          apiSecret: apiSecret,
          twimlAppSid: twimlAppSid,
          status: 'active',
          configuredAt: new Date(),
          lastTestedAt: new Date(),
          errorMessage: null
        };
        
        await adminUser.save();
        
        console.log('✅ Admin Twilio credentials updated successfully!');
        console.log('✅ Human transfer should now work');
        
        // Test the credentials
        console.log('\n🧪 Testing credentials...');
        const MultiTenantTwilioService = require('./services/multiTenantTwilioService');
        
        try {
          const testResult = await MultiTenantTwilioService.testCredentials(accountSid, authToken);
          
          if (testResult.success) {
            console.log('✅ Credentials test passed:', testResult.message);
            console.log('   Account Name:', testResult.accountName);
          } else {
            console.log('❌ Credentials test failed:', testResult.error);
          }
        } catch (testError) {
          console.log('❌ Error testing credentials:', testError.message);
        }
        
      } else {
        console.log('❌ Twilio credentials not found in .env file');
        console.log('   Please add these to your .env file:');
        console.log('   TWILIO_ACCOUNT_SID=your_account_sid');
        console.log('   TWILIO_AUTH_TOKEN=your_auth_token');
      }
      
    } catch (envError) {
      console.log('⚠️  Could not read .env file:', envError.message);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAdminTwilioCredentials();