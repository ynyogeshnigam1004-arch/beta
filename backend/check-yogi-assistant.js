const { connectDB, getCollection } = require('./config/database');
require('dotenv').config();

async function checkAssistant() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');
    console.log('');
    
    // Get the assistants collection
    const collection = getCollection('assistants');
    
    // Find the "yogi" assistant
    const assistant = await collection.findOne({ name: 'yogi' });
    
    if (!assistant) {
      console.log('');
      console.log('❌ Assistant "yogi" not found in MongoDB!');
      console.log('');
      
      // List all assistants
      const allAssistants = await collection.find({}).toArray();
      console.log(`📋 Found ${allAssistants.length} assistants in database:`);
      allAssistants.forEach(a => {
        console.log(`   - ${a.name} (ID: ${a.id})`);
      });
      console.log('');
    } else {
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('✅ FOUND ASSISTANT: yogi');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      console.log('📋 Basic Info:');
      console.log(`   Name: ${assistant.name}`);
      console.log(`   ID: ${assistant.id}`);
      console.log(`   Status: ${assistant.status}`);
      console.log('');
      console.log('🔧 Transfer Settings:');
      console.log(`   transferSettings exists: ${!!assistant.transferSettings}`);
      
      if (assistant.transferSettings) {
        console.log(`   Phone Number: ${assistant.transferSettings.phoneNumber || 'NOT SET'}`);
        console.log(`   Country Code: ${assistant.transferSettings.countryCode || 'NOT SET'}`);
        console.log(`   End Call Enabled: ${assistant.transferSettings.endCallEnabled || false}`);
        console.log(`   Dial Keypad Enabled: ${assistant.transferSettings.dialKeypadEnabled || false}`);
        console.log('');
        console.log('📱 Complete Phone Number:');
        if (assistant.transferSettings.phoneNumber && assistant.transferSettings.countryCode) {
          console.log(`   ${assistant.transferSettings.countryCode}${assistant.transferSettings.phoneNumber}`);
        } else {
          console.log('   ❌ INCOMPLETE - Missing phone number or country code');
        }
      } else {
        console.log('   ❌ transferSettings is NULL or undefined!');
        console.log('');
        console.log('💡 This is why human transfer is not working!');
        console.log('   The phone number was never saved to MongoDB.');
      }
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      
      // Show full assistant object for debugging
      console.log('🔍 Full Assistant Object (JSON):');
      console.log(JSON.stringify(assistant, null, 2));
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error checking assistant:', error);
  } finally {
    process.exit(0);
  }
}

checkAssistant();
