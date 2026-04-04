/**
 * Check Call History in Database
 * Debug script to see what call records exist and why analytics might be empty
 */

const { connectDB, getCollection } = require('./backend/config/database');

async function checkCallHistory() {
  try {
    console.log('🔌 Connecting to database...');
    await connectDB();
    
    const collection = getCollection('call_history');
    
    // Get all call records
    console.log('\n📊 ALL CALL RECORDS:');
    const allCalls = await collection.find({}).toArray();
    console.log(`Found ${allCalls.length} total call records\n`);
    
    if (allCalls.length > 0) {
      allCalls.forEach((call, index) => {
        console.log(`📞 Call ${index + 1}:`);
        console.log(`   Call ID: ${call.callId || call._id}`);
        console.log(`   Call Type: ${call.callType}`);
        console.log(`   User ID: ${call.userId}`);
        console.log(`   Assistant ID: ${call.assistantId}`);
        console.log(`   Duration: ${call.duration}s`);
        console.log(`   Status: ${call.status}`);
        console.log(`   Start Time: ${call.startTime}`);
        console.log(`   From: ${call.callerNumber} → To: ${call.twilioNumber}`);
        console.log('   ─────────────────────────────────────');
      });
      
      // Check for specific user
      const targetUserId = '69a49be0fdd5376624854e06'; // From the logs
      console.log(`\n🔍 CALLS FOR USER: ${targetUserId}`);
      const userCalls = await collection.find({ userId: targetUserId }).toArray();
      console.log(`Found ${userCalls.length} calls for this user`);
      
      if (userCalls.length > 0) {
        userCalls.forEach((call, index) => {
          console.log(`   ${index + 1}. ${call.callType} call - ${call.duration}s - ${call.status}`);
        });
      }
      
      // Check phone calls only (what analytics should show)
      console.log(`\n📱 PHONE CALLS ONLY (callType: 'inbound'):`);
      const phoneCalls = await collection.find({ 
        userId: targetUserId,
        callType: 'inbound'
      }).toArray();
      console.log(`Found ${phoneCalls.length} phone calls for analytics`);
      
      if (phoneCalls.length > 0) {
        phoneCalls.forEach((call, index) => {
          console.log(`   ${index + 1}. Duration: ${call.duration}s, Status: ${call.status}, Time: ${call.startTime}`);
        });
      }
      
    } else {
      console.log('❌ No call records found in database!');
    }
    
  } catch (error) {
    console.error('❌ Error checking call history:', error);
  }
  
  process.exit(0);
}

checkCallHistory();