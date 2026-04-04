/**
 * Check All Databases for User Data
 * Find out which database actually contains your data
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkAllDatabases() {
  try {
    console.log('🔍 Checking all databases for user data...\n');
    
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    // List all databases
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    
    console.log('📊 Found databases:', databases.databases.map(db => db.name));
    console.log('='.repeat(60));
    
    // Check each database for user collections
    for (const dbInfo of databases.databases) {
      const dbName = dbInfo.name;
      
      // Skip system databases
      if (['admin', 'local', 'config'].includes(dbName)) {
        continue;
      }
      
      console.log(`\n🔍 Checking database: ${dbName}`);
      console.log('-'.repeat(40));
      
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      
      console.log(`   Collections: ${collections.map(c => c.name).join(', ')}`);
      
      // Check for user-related collections
      const userCollections = ['users', 'assistants', 'call_history', 'credits'];
      
      for (const collectionName of userCollections) {
        try {
          const collection = db.collection(collectionName);
          const count = await collection.countDocuments();
          
          if (count > 0) {
            console.log(`   ✅ ${collectionName}: ${count} documents`);
            
            // Show sample data for users collection
            if (collectionName === 'users') {
              const sampleUsers = await collection.find({}).limit(3).toArray();
              console.log(`   📋 Sample users:`);
              sampleUsers.forEach((user, index) => {
                console.log(`      ${index + 1}. ${user.email} (${user._id})`);
                console.log(`         Role: ${user.role || 'user'}`);
                console.log(`         Credits: ${user.credits || 0}`);
                console.log(`         Google ID: ${user.googleId ? 'Yes' : 'No'}`);
                console.log(`         Password: ${user.password ? 'Yes' : 'No'}`);
              });
            }
          } else {
            console.log(`   ⚪ ${collectionName}: empty`);
          }
        } catch (err) {
          console.log(`   ❌ ${collectionName}: doesn't exist`);
        }
      }
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('='.repeat(40));
    console.log('Look for the database with the most user data above.');
    console.log('That\'s where your current data is stored!');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkAllDatabases();