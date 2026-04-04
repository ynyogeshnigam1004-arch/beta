/**
 * Reset Database via Mongoose
 * Use the same connection method as your server
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function resetViaMongoose() {
  try {
    console.log('🚨 RESETTING USER DATA VIA MONGOOSE...\n');
    console.log('⚠️  This will DELETE ONLY USER DATA');
    console.log('✅ Platform data will be PRESERVED\n');
    
    // Use the same connection method as your server
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected successfully!\n');
    
    // Get the database
    const db = mongoose.connection.db;
    
    // Step 1: Wipe user collections
    console.log('🗑️ Step 1: Wiping user data collections...');
    
    const collections = ['users', 'assistants', 'call_history', 'credits'];
    const deletedCounts = {};
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteMany({});
        deletedCounts[collectionName] = result.deletedCount;
        console.log(`   ✅ ${collectionName}: ${result.deletedCount} documents deleted`);
      } catch (err) {
        console.log(`   ⚪ ${collectionName}: collection doesn't exist or empty`);
        deletedCounts[collectionName] = 0;
      }
    }
    
    // Step 2: Create Admin User
    console.log('\n👑 Step 2: Creating Admin User...');
    
    const { ObjectId } = require('mongodb');
    const adminId = new ObjectId();
    
    const adminUser = {
      _id: adminId,
      email: 'ynyogeshnigam1008@gmail.com',
      role: 'admin',
      fullName: 'Admin User',
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: true,
      phoneNumbers: [],
      twilioCredentials: {
        status: 'pending',
        configuredAt: null,
        errorMessage: null
      },
      isLocked: false,
      loginAttempts: 0,
      credits: 999999999, // Infinite credits
      bonusCredits: 0
    };
    
    const usersCollection = db.collection('users');
    await usersCollection.insertOne(adminUser);
    console.log(`   ✅ Admin created with ID: ${adminId}`);
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   💰 Credits: ${adminUser.credits.toLocaleString()} (infinite)`);
    
    // Step 3: Create Admin Credits Record
    console.log('\n💰 Step 3: Creating Admin Credits Record...');
    
    const adminCredits = {
      _id: new ObjectId(),
      userId: adminId,
      credits: 999999999,
      bonusCredits: 0,
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactions: []
    };
    
    const creditsCollection = db.collection('credits');
    await creditsCollection.insertOne(adminCredits);
    console.log(`   ✅ Admin credits record created`);
    
    // Step 4: Create Default Assistant
    console.log('\n🤖 Step 4: Creating Default Assistant...');
    
    const defaultAssistant = {
      _id: new ObjectId(),
      id: `asst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: adminId,
      name: 'My First Assistant',
      model: 'llama-3.1-8b-instant',
      transcriber: 'whisper-large-v3-turbo',
      voiceProvider: 'cartesia',
      voiceModel: 'sonic-2024-10',
      voiceId: 'a0e99841-438c-4a64-b679-ae501e7d6091',
      voice: 'Cartesia Sonic',
      status: 'active',
      firstMessageMode: 'assistant-speaks-first',
      firstMessage: 'Hello! How can I help you today?',
      systemPrompt: 'You are a helpful voice assistant. Be friendly and professional.',
      transferSettings: {
        enabled: false,
        phoneNumber: '',
        phrases: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const assistantsCollection = db.collection('assistants');
    await assistantsCollection.insertOne(defaultAssistant);
    console.log(`   ✅ Default assistant created: ${defaultAssistant.name}`);
    console.log(`   🆔 Assistant ID: ${defaultAssistant.id}`);
    
    // Step 5: Verify Setup
    console.log('\n✅ Step 5: Verifying Setup...');
    
    const verifyAdmin = await usersCollection.findOne({ email: 'ynyogeshnigam1008@gmail.com' });
    const verifyAssistants = await assistantsCollection.find({ userId: adminId }).toArray();
    const verifyCredits = await creditsCollection.findOne({ userId: adminId });
    
    console.log(`   👤 Admin found: ${!!verifyAdmin}`);
    console.log(`   🤖 Assistants: ${verifyAssistants.length}`);
    console.log(`   💰 Credits record: ${!!verifyCredits}`);
    
    console.log('\n🎉 USER DATA RESET COMPLETE!');
    console.log('='.repeat(60));
    console.log('✅ Fresh user data created:');
    console.log(`   - Admin: ynyogeshnigam1008@gmail.com`);
    console.log(`   - Admin ID: ${adminId}`);
    console.log(`   - Credits: 999,999,999 (infinite)`);
    console.log(`   - Default Assistant: "My First Assistant"`);
    
    console.log('\n🗑️ Data Deleted:');
    Object.entries(deletedCounts).forEach(([collection, count]) => {
      console.log(`   - ${collection}: ${count} documents`);
    });
    
    console.log('\n✅ Platform data (models, voices) preserved');
    
    console.log('\n🔄 NEXT STEPS:');
    console.log('1. Clear your browser cache/localStorage');
    console.log('2. Go to login page');
    console.log('3. Login with: ynyogeshnigam1008@gmail.com');
    console.log('4. Should work perfectly with fresh data!');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Reset error:', error);
  }
  
  process.exit(0);
}

resetViaMongoose();