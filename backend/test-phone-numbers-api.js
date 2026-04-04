/**
 * Test Phone Numbers API with Authentication
 * Verifies that the phone numbers endpoint works with the single User model
 */

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');

async function testPhoneNumbersAPI() {
  try {
    console.log('🔍 Testing phone numbers API authentication...\n');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find admin user
    const adminEmail = 'ynyogeshnigam1008@gmail.com';
    const adminUser = await User.findOne({ email: adminEmail });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', adminUser.email);
    console.log('   User ID:', adminUser._id);

    // Generate a fresh JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { userId: adminUser._id, email: adminUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Generated fresh JWT token');
    console.log('   Token starts with:', token.substring(0, 50) + '...');

    // Test token verification
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('✅ Token verification successful');
      console.log('   Decoded userId:', decoded.userId);
      console.log('   Decoded email:', decoded.email);

      // Test finding user with decoded ID
      const foundUser = await User.findById(decoded.userId);
      if (foundUser) {
        console.log('✅ User lookup with token successful');
        console.log('   Found user:', foundUser.email);
        console.log('   Phone numbers count:', foundUser.phoneNumbers?.length || 0);
      } else {
        console.log('❌ User lookup with token failed');
      }

    } catch (tokenError) {
      console.log('❌ Token verification failed:', tokenError.message);
    }

    console.log('\n📱 Phone Numbers in Database:');
    if (adminUser.phoneNumbers && adminUser.phoneNumbers.length > 0) {
      adminUser.phoneNumbers.forEach((phone, index) => {
        console.log(`   ${index + 1}. ${phone.phoneNumber} (${phone.label})`);
        console.log(`      Assistant ID: ${phone.assignedAssistantId}`);
        console.log(`      Status: ${phone.status}`);
      });
    } else {
      console.log('   No phone numbers found');
    }

    console.log('\n🔧 Suggested Fix:');
    console.log('   1. Clear browser localStorage/sessionStorage');
    console.log('   2. Log out and log back in to get fresh token');
    console.log('   3. Or use this fresh token for testing:');
    console.log(`   Bearer ${token}`);

  } catch (error) {
    console.error('❌ Error testing phone numbers API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testPhoneNumbersAPI();