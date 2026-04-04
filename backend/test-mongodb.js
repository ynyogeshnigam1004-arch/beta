/**
 * MongoDB Connection Test Script
 * Run: node test-mongodb.js
 */

require('dotenv').config();
const { connectDB, checkConnection, getDB } = require('./config/database');

async function testMongoDB() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 MongoDB Connection Test');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Check environment variables
    console.log('\n📋 Step 1: Checking environment variables...');
    if (process.env.MONGODB_URI) {
      console.log('✅ MONGODB_URI is set');
      console.log('   URI:', process.env.MONGODB_URI.substring(0, 50) + '...');
    } else {
      console.log('❌ MONGODB_URI is not set in .env file');
      return;
    }
    
    if (process.env.MONGODB_DB_NAME) {
      console.log('✅ MONGODB_DB_NAME is set:', process.env.MONGODB_DB_NAME);
    } else {
      console.log('⚠️  MONGODB_DB_NAME not set, using default');
    }
    
    // Test 2: Connect to MongoDB
    console.log('\n🔌 Step 2: Connecting to MongoDB Atlas...');
    await connectDB();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test 3: Check connection status
    console.log('\n📊 Step 3: Checking connection status...');
    const status = await checkConnection();
    if (status.connected) {
      console.log('✅ Connection is active and healthy');
    } else {
      console.log('❌ Connection check failed:', status.error);
      return;
    }
    
    // Test 4: Test database operations
    console.log('\n💾 Step 4: Testing database operations...');
    const db = getDB();
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`✅ Database accessible. Collections found: ${collections.length}`);
    
    if (collections.length > 0) {
      console.log('   Collections:', collections.map(c => c.name).join(', '));
    } else {
      console.log('   No collections yet (will be created on first insert)');
    }
    
    // Test 5: Try a simple query
    console.log('\n🔍 Step 5: Testing query operation...');
    const assistants = await db.collection('assistants').find({}).limit(5).toArray();
    console.log(`✅ Query successful. Found ${assistants.length} assistants`);
    
    if (assistants.length > 0) {
      console.log('   Sample assistant:', assistants[0].name || assistants[0].id);
    }
    
    // Test 6: Test insert (and remove)
    console.log('\n✍️  Step 6: Testing write operation...');
    const testDoc = {
      _test: true,
      name: 'Connection Test',
      timestamp: new Date().toISOString()
    };
    
    const insertResult = await db.collection('_test').insertOne(testDoc);
    console.log('✅ Insert successful. Document ID:', insertResult.insertedId);
    
    // Clean up test document
    await db.collection('_test').deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Cleanup successful. Test document removed');
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('✅ MongoDB is connected and working perfectly!');
    console.log('✅ Database:', process.env.MONGODB_DB_NAME || 'voice_ai_platform');
    console.log('✅ Collections:', collections.length);
    console.log('✅ Ready to use!');
    console.log('='.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(60));
    console.error('Error:', error.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Check your .env file has MONGODB_URI');
    console.log('2. Verify MongoDB Atlas IP whitelist');
    console.log('3. Check username/password in connection string');
    console.log('4. Ensure internet connection is working');
    console.log('='.repeat(60) + '\n');
    
    process.exit(1);
  }
}

// Run the test
testMongoDB();

