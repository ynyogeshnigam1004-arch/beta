/**
 * Clear phone numbers for testing
 * Run this to clear your current phone numbers so you can re-add them with proper configuration
 */

const { connectDB } = require('./backend/config/database');
const User = require('./backend/models/User');

async function clearPhoneNumbers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    // Find your user by email (replace with your email)
    const userEmail = 'ynvyogeshnjigam008@gmail.com'; // Replace with your actual email
    
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.error('❌ User not found with email:', userEmail);
      process.exit(1);
    }
    
    console.log('✅ Found user:', user.email);
    console.log('📞 Current phone numbers:', user.phoneNumbers?.length || 0);
    
    // Clear phone numbers
    await User.findByIdAndUpdate(user._id, {
      $set: { phoneNumbers: [] }
    });
    
    console.log('✅ Phone numbers cleared successfully!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('1. Go to Phone Numbers page in your app');
    console.log('2. Re-enter your Twilio credentials (this will create API Key & Secret)');
    console.log('3. Add your phone numbers again (they will be configured properly)');
    console.log('4. Test browser calls - they should work now!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearPhoneNumbers();