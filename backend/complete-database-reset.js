/**
 * Complete Database Reset - USER DATA ONLY
 * Wipe only user-related data, keep platform data (models, voices, etc.)
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');

async function completeDatabaseReset() {
  try {
    console.log('🚨 USER DATA RESET STARTING...\n');
    console.log('⚠️  This will ONLY delete user data, platform data will be preserved');
    
    // Connect to database
    await connectDB();
    
    const { ObjectId } = require('mongodb');
    
    // Step 1: Wipe ONLY user-related collections
    console.log('🗑️ Step 1: Wiping user data collections...');
    
    const usersCollection = getCollection('users');
    const assistantsCollection = getCollection('assistants');
    const callsCollection = getCollection('call_history');
    const creditsCollection = getCollection('credits');
    
    // Delete ONLY user data (keep platform data like models, voices, etc.)
    const usersDeleted = await usersCollection.deleteMany({});
    const assistantsDeleted = await assistantsCollection.deleteMany({});
    const callsDeleted = await callsCollection.deleteMany({});
    const creditsDeleted = await creditsCollection.deleteMany({});
    
    console.log(`   ✅ Deleted ${usersDeleted.deletedCount} users`);
    console.log(`   ✅ Deleted ${assistantsDeleted.deletedCount} assistants`);
    console.log(`   ✅ Deleted ${callsDeleted.deletedCount} calls`);
    console.log(`   ✅ Deleted ${creditsDeleted.deletedCount} credit records`);
    console.log('   ✅ Platform data (models, voices, etc.) preserved');
    
    // Step 2: Create Admin User
    console.log('\n👑 Step 2: Creating Admin User...');
    
    const adminId = new ObjectId();
    const adminUser = {
      _id: adminId,
      email: 'ynyogeshnigam1008@gmail.com',
      role: 'admin',
      fullName: 'Admin User',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: true,
      phoneNumbers: [],
      twilioCredentials: {
        status: 'pending',
        configuredAt: null,
        errorMessage: null
      },
      isLocked: false,
      loginAttempts: 0,
      credits: 999999999, // Infinite credits (999 million)
      bonusCredits: 0
    };
    
    const adminResult = await usersCollection.insertOne(adminUser);
    console.log(`   ✅ Admin created with ID: ${adminResult.insertedId}`);
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   💰 Credits: ${adminUser.credits} (infinite)`);
    
    // Step 3: Create Admin Credits Record
    console.log('\n💰 Step 3: Creating Admin Credits Record...');
    
    const adminCredits = {
      _id: new ObjectId(),
      userId: adminId,
      credits: 999999999, // Infinite credits
      bonusCredits: 0,
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      transactions: []
    };
    
    await creditsCollection.insertOne(adminCredits);
    console.log(`   ✅ Admin credits record created`);
    
    // Step 4: Create Default Assistant for Admin
    console.log('\n🤖 Step 4: Creating Default Assistant for Admin...');
    
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
    
    const assistantResult = await assistantsCollection.insertOne(defaultAssistant);
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
    console.log('='.repeat(50));
    console.log('✅ Fresh user data with:');
    console.log(`   - Admin: ynyogeshnigam1008@gmail.com (${adminId})`);
    console.log(`   - Credits: 999,999,999 (infinite)`);
    console.log(`   - Default Assistant: "My First Assistant"`);
    console.log(`   - All old user data wiped clean`);
    console.log(`   - Platform data (models, voices) preserved`);
    console.log('\n🔄 Now you can login fresh and everything should work!');
    
  } catch (error) {
    console.error('❌ Reset error:', error);
  }
  
  process.exit(0);
}

completeDatabaseReset();