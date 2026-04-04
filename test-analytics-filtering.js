/**
 * Test Analytics Filtering - Phone Calls Only
 * This script tests if analytics properly filters for phone calls only
 */

const { connectDB, getCollection } = require('./backend/config/database');

async function testAnalyticsFiltering() {
  try {
    console.log('🧪 TESTING ANALYTICS FILTERING...\n');
    
    // Connect to database
    await connectDB();
    const collection = getCollection('call_history');
    
    // Get all calls to see what we have
    const allCalls = await collection.find({}).toArray();
    console.log(`📊 Total calls in database: ${allCalls.length}`);
    
    // Group by call type
    const callTypes = {};
    allCalls.forEach(call => {
      const type = call.callType || 'unknown';
      callTypes[type] = (callTypes[type] || 0) + 1;
    });
    
    console.log('📋 Call types breakdown:');
    Object.entries(callTypes).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} calls`);
    });
    
    // Test the filtering query (same as analytics API)
    const userId = '69a49be0fdd5376624854e06'; // Admin user
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    
    const analyticsQuery = {
      userId: userId,
      callType: 'inbound', // ONLY phone calls
      startTime: { $gte: startDate.toISOString() }
    };
    
    const phoneCalls = await collection.find(analyticsQuery).toArray();
    console.log(`\n📞 Phone calls for analytics (userId: ${userId}):`);
    console.log(`   Found: ${phoneCalls.length} phone calls`);
    
    // Test browser calls query
    const browserQuery = {
      userId: userId,
      callType: 'browser',
      startTime: { $gte: startDate.toISOString() }
    };
    
    const browserCalls = await collection.find(browserQuery).toArray();
    console.log(`🌐 Browser calls (excluded from analytics):`);
    console.log(`   Found: ${browserCalls.length} browser calls`);
    
    console.log('\n✅ TEST RESULTS:');
    console.log(`   Analytics will show: ${phoneCalls.length} calls (phone only)`);
    console.log(`   Hidden from analytics: ${browserCalls.length} calls (browser)`);
    
    if (phoneCalls.length > 0) {
      console.log('\n📋 Sample phone call data:');
      console.log(`   Call ID: ${phoneCalls[0].callId}`);
      console.log(`   Type: ${phoneCalls[0].callType}`);
      console.log(`   Duration: ${phoneCalls[0].duration}s`);
      console.log(`   From: ${phoneCalls[0].callerNumber || 'N/A'}`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAnalyticsFiltering();