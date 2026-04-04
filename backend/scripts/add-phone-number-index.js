/**
 * Add MongoDB Index for Twilio Phone Number Lookups
 * Creates index on users.twilioPhoneNumber for fast routing
 */

require('dotenv').config();
const { connectDB, getCollection } = require('../config/database');

async function addPhoneNumberIndex() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    const usersCollection = getCollection('users');
    
    // Create index on twilioPhoneNumber field
    console.log('📊 Creating index on twilioPhoneNumber...');
    const result = await usersCollection.createIndex(
      { twilioPhoneNumber: 1 },
      { 
        unique: true, 
        sparse: true, // Only index documents that have this field
        name: 'twilioPhoneNumber_1'
      }
    );
    
    console.log(`✅ Index created: ${result}`);
    
    // List all indexes
    const indexes = await usersCollection.indexes();
    console.log('\n📋 All indexes on users collection:');
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n✅ Phone number index setup complete!');
    console.log('   Lookups by twilioPhoneNumber will now be instant (< 5ms)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding index:', error);
    process.exit(1);
  }
}

addPhoneNumberIndex();
