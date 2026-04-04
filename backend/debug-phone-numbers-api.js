/**
 * Debug Phone Numbers API
 * Test the phone numbers API to see what's happening
 */

require('dotenv').config();
const axios = require('axios');

async function debugPhoneNumbersAPI() {
  console.log('🔍 Debugging Phone Numbers API...\n');
  
  try {
    // First, let's test login to get a valid token
    console.log('🔐 Step 1: Testing login...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'ynyogeshnigam1008@gmail.com',
      password: 'your_password_here' // You'll need to replace this
    });
    
    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.error);
      console.log('ℹ️  Please update the password in this script and try again');
      return;
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('✅ Login successful');
    console.log('📋 User info:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Step 2: Test phone numbers API
    console.log('\n📞 Step 2: Testing phone numbers API...');
    
    try {
      const phoneResponse = await axios.get('http://localhost:5001/api/phone-numbers', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Phone Numbers API Response:', phoneResponse.data);
      
    } catch (phoneError) {
      console.log('❌ Phone Numbers API Error:', phoneError.response?.data || phoneError.message);
      console.log('📋 Status Code:', phoneError.response?.status);
    }
    
    // Step 3: Test user lookup directly in database
    console.log('\n🔍 Step 3: Testing direct database lookup...');
    
    const { connectDB, getCollection } = require('./config/database');
    await connectDB();
    
    const newUsersCollection = getCollection('userenhanceds');
    const dbUser = await newUsersCollection.findOne({ 
      email: 'ynyogeshnigam1008@gmail.com' 
    });
    
    if (dbUser) {
      console.log('✅ User found in database');
      console.log('📋 Database user info:');
      console.log(`   - ID: ${dbUser._id}`);
      console.log(`   - Email: ${dbUser.email}`);
      console.log(`   - Phone Numbers: ${dbUser.phoneNumbers ? dbUser.phoneNumbers.length : 0}`);
      console.log(`   - Credits: ${dbUser.credits}`);
      
      if (dbUser.phoneNumbers && dbUser.phoneNumbers.length > 0) {
        console.log('📞 Phone Numbers in database:');
        dbUser.phoneNumbers.forEach((phone, index) => {
          console.log(`   ${index + 1}. ${phone.phoneNumber} (${phone.label})`);
        });
      }
    } else {
      console.log('❌ User not found in database');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('ℹ️  Make sure your backend server is running on port 5001');
    }
  }
  
  process.exit(0);
}

console.log('⚠️  Please update the password in this script before running');
console.log('📝 Edit line 17 to add your actual password');
console.log('');

// Uncomment the line below after updating the password
// debugPhoneNumbersAPI();