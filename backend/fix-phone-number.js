const mongoose = require('mongoose');
require('dotenv').config();

async function fixPhoneNumber() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    
    const user = await User.findById('69a49be0fdd5376624854e06');
    if (!user) {
      console.log('User not found');
      return;
    }
    
    console.log('User found:', user.email);
    
    // Add phone number to the phoneNumbers array with the correct assistant ID
    user.phoneNumbers = [
      {
        phoneNumber: '+15025211439',
        label: 'Primary',
        assignedAssistantId: 'asst_1772915631010_pouc1agz9', // The "mine" assistant ID
        status: 'active'
      }
    ];
    
    await user.save();
    console.log('✅ Phone number +15025211439 added to user account');
    
    // Verify
    const updatedUser = await User.findById('69a49be0fdd5376624854e06');
    console.log('Verification - Phone numbers:', updatedUser.phoneNumbers);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixPhoneNumber();