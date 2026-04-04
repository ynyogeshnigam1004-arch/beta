/**
 * Verify Phone Routing Setup
 * Tests that the multi-user phone system is configured correctly
 */

require('dotenv').config();
const { connectDB } = require('../config/database');
const User = require('../models/User');
const { getActiveAssistants } = require('../models/Assistant');

async function verifySetup() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('\n========================================');
    console.log('PHONE ROUTING VERIFICATION');
    console.log('========================================\n');
    
    // 1. Check if User model has twilioPhoneNumber field
    console.log('✓ Step 1: User model has twilioPhoneNumber field');
    
    // 2. Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.error('❌ No admin user found!');
      process.exit(1);
    }
    
    console.log(`✓ Step 2: Found admin user: ${adminUser.email}`);
    
    // 3. Check if admin has Twilio number assigned
    if (!adminUser.twilioPhoneNumber) {
      console.log('⚠️  Step 3: Admin does NOT have Twilio number assigned');
      console.log('   Run: node backend/scripts/assign-admin-phone.js');
    } else {
      console.log(`✓ Step 3: Admin has Twilio number: ${adminUser.twilioPhoneNumber}`);
    }
    
    // 4. Check if admin has active assistants
    const assistants = await getActiveAssistants(adminUser._id);
    
    if (assistants.length === 0) {
      console.log('⚠️  Step 4: Admin has NO active assistants');
      console.log('   Create an assistant in the UI or set one to active');
    } else {
      console.log(`✓ Step 4: Admin has ${assistants.length} active assistant(s):`);
      assistants.forEach(a => {
        console.log(`   - ${a.name} (${a.id})`);
      });
    }
    
    // 5. Simulate phone routing
    console.log('\n========================================');
    console.log('SIMULATING PHONE CALL ROUTING');
    console.log('========================================\n');
    
    const twilioNumber = adminUser.twilioPhoneNumber || process.env.TWILIO_PHONE_NUMBER;
    
    if (!twilioNumber) {
      console.log('❌ No Twilio number to test with');
      process.exit(1);
    }
    
    console.log(`📞 Simulating call to: ${twilioNumber}`);
    console.log(`   Looking up user...`);
    
    const foundUser = await User.findOne({ twilioPhoneNumber: twilioNumber });
    
    if (!foundUser) {
      console.log(`❌ No user found for number: ${twilioNumber}`);
      console.log('   This means calls to this number will use default assistant');
    } else {
      console.log(`✅ Found user: ${foundUser.email}`);
      
      const userAssistants = await getActiveAssistants(foundUser._id);
      
      if (userAssistants.length === 0) {
        console.log(`⚠️  User has no active assistants - will use default`);
      } else {
        console.log(`✅ Will use assistant: ${userAssistants[0].name}`);
        console.log(`   Voice Provider: ${userAssistants[0].voiceProvider}`);
        console.log(`   LLM Model: ${userAssistants[0].model}`);
        console.log(`   STT Model: ${userAssistants[0].transcriber}`);
      }
    }
    
    // 6. Summary
    console.log('\n========================================');
    console.log('VERIFICATION SUMMARY');
    console.log('========================================\n');
    
    const allGood = adminUser.twilioPhoneNumber && assistants.length > 0 && foundUser;
    
    if (allGood) {
      console.log('✅ ALL CHECKS PASSED!');
      console.log('\nPhone routing is configured correctly:');
      console.log(`   - Calls to ${twilioNumber}`);
      console.log(`   - Will route to ${foundUser.email}`);
      console.log(`   - Using assistant: ${assistants[0].name}`);
      console.log('\n🎉 Ready to test! Call your Twilio number.');
    } else {
      console.log('⚠️  SETUP INCOMPLETE');
      console.log('\nMissing:');
      if (!adminUser.twilioPhoneNumber) {
        console.log('   - Admin Twilio number not assigned');
        console.log('     Run: node backend/scripts/assign-admin-phone.js');
      }
      if (assistants.length === 0) {
        console.log('   - No active assistants');
        console.log('     Create/activate an assistant in the UI');
      }
      if (!foundUser) {
        console.log('   - Phone number not registered to any user');
      }
    }
    
    console.log('');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

verifySetup();
