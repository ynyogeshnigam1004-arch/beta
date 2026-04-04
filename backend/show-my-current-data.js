/**
 * Show My Current Data
 * Display exactly what's in your voiceai database
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');

async function showMyCurrentData() {
  try {
    console.log('🔍 Showing your current data in voiceai database...\n');
    
    // Connect to database
    await connectDB();
    
    // Check each collection
    const collections = ['users', 'assistants', 'call_history', 'credits'];
    
    for (const collectionName of collections) {
      console.log(`📊 ${collectionName.toUpperCase()} COLLECTION:`);
      console.log('='.repeat(50));
      
      try {
        const collection = getCollection(collectionName);
        const count = await collection.countDocuments();
        
        console.log(`   Total documents: ${count}`);
        
        if (count > 0) {
          const samples = await collection.find({}).limit(5).toArray();
          
          samples.forEach((doc, index) => {
            console.log(`\n   ${index + 1}. Document:`);
            
            if (collectionName === 'users') {
              console.log(`      _id: ${doc._id}`);
              console.log(`      email: ${doc.email}`);
              console.log(`      role: ${doc.role || 'user'}`);
              console.log(`      credits: ${doc.credits || 0}`);
              console.log(`      googleId: ${doc.googleId ? 'Yes' : 'No'}`);
              console.log(`      password: ${doc.password ? 'Yes (hashed)' : 'No'}`);
              console.log(`      phoneNumbers: ${doc.phoneNumbers?.length || 0}`);
            } else if (collectionName === 'assistants') {
              console.log(`      _id: ${doc._id}`);
              console.log(`      id: ${doc.id}`);
              console.log(`      name: ${doc.name}`);
              console.log(`      userId: ${doc.userId}`);
              console.log(`      status: ${doc.status}`);
              console.log(`      model: ${doc.model}`);
            } else if (collectionName === 'call_history') {
              console.log(`      _id: ${doc._id}`);
              console.log(`      userId: ${doc.userId}`);
              console.log(`      callType: ${doc.callType}`);
              console.log(`      status: ${doc.status}`);
              console.log(`      createdAt: ${doc.createdAt}`);
            } else if (collectionName === 'credits') {
              console.log(`      _id: ${doc._id}`);
              console.log(`      userId: ${doc.userId}`);
              console.log(`      credits: ${doc.credits}`);
              console.log(`      totalSpent: ${doc.totalSpent || 0}`);
            }
          });
        } else {
          console.log('   📭 No documents found');
        }
        
      } catch (err) {
        console.log(`   ❌ Error accessing collection: ${err.message}`);
      }
      
      console.log('\n');
    }
    
    console.log('🎯 SUMMARY:');
    console.log('='.repeat(40));
    console.log('This is what\'s currently in your voiceai database.');
    console.log('If you see data above, that\'s what will be reset.');
    console.log('If it\'s empty or confusing, the reset will clean it up!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

showMyCurrentData();