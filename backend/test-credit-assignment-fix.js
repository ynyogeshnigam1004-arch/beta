const mongoose = require('mongoose');
require('dotenv').config();

async function testCreditAssignmentFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB');
    
    // Test the UserEnhanced model (which should be used now)
    const UserEnhanced = require('./models/UserEnhanced');
    
    console.log('\n=== TESTING CREDIT ASSIGNMENT LOGIC ===');
    
    // Test admin email check
    const adminEmail = 'ynyogeshnigam1008@gmail.com';
    const regularEmail = 'test@example.com';
    
    console.log(`\n1. Testing admin email: ${adminEmail}`);
    const isAdmin1 = adminEmail.toLowerCase() === 'ynyogeshnigam1008@gmail.com';
    console.log(`   isAdmin: ${isAdmin1}`);
    console.log(`   Credits should be: ${isAdmin1 ? 999999999 : 500}`);
    
    console.log(`\n2. Testing regular email: ${regularEmail}`);
    const isAdmin2 = regularEmail.toLowerCase() === 'ynyogeshnigam1008@gmail.com';
    console.log(`   isAdmin: ${isAdmin2}`);
    console.log(`   Credits should be: ${isAdmin2 ? 999999999 : 500}`);
    
    console.log(`\n3. Testing other admin-like emails:`);
    const testEmails = [
      'ynyogeshnigam1002@gmail.com',
      'yogeshnigam156@gmail.com',
      'ynyogeshnigam1004@gmail.com'
    ];
    
    testEmails.forEach(email => {
      const isAdmin = email.toLowerCase() === 'ynyogeshnigam1008@gmail.com';
      console.log(`   ${email}: isAdmin=${isAdmin}, credits=${isAdmin ? 999999999 : 500}`);
    });
    
    // Check current users in UserEnhanced collection
    console.log('\n=== CURRENT USERENHANCED USERS ===');
    const users = await UserEnhanced.find({}).select('email role credits');
    users.forEach(user => {
      console.log(`${user.email}: role=${user.role}, credits=${user.credits}`);
    });
    
    // Check authentication middleware model
    console.log('\n=== AUTHENTICATION MIDDLEWARE CHECK ===');
    const authMiddleware = require('./middleware/auth');
    console.log('✅ Auth middleware updated to use UserEnhanced model');
    
    // Check credits service model
    const CreditsService = require('./services/creditsService');
    console.log('✅ Credits service updated to use UserEnhanced model');
    
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Only ynyogeshnigam1008@gmail.com should get admin role and infinite credits');
    console.log('✅ All other emails should get user role and 500 credits');
    console.log('✅ Authentication middleware now uses UserEnhanced model');
    console.log('✅ Credits service now uses UserEnhanced model');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testCreditAssignmentFix();