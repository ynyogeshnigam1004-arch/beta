/**
 * Test Dashboard API Endpoints
 * Verify that dashboard data is user-specific
 */

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_TOKEN = 'your-test-token-here'; // Replace with actual token

async function testDashboardAPIs() {
  console.log('🧪 Testing Dashboard API Endpoints...\n');

  try {
    // Test 1: Analytics API
    console.log('1️⃣ Testing /api/analytics endpoint...');
    const analyticsResponse = await fetch(`${BASE_URL}/api/analytics?period=30d`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (analyticsResponse.ok) {
      const analyticsData = await analyticsResponse.json();
      console.log('✅ Analytics API working');
      console.log(`   Total calls: ${analyticsData.analytics?.overview?.totalCalls || 0}`);
      console.log(`   Success rate: ${analyticsData.analytics?.overview?.successRate || 0}%`);
      console.log(`   Recent calls: ${analyticsData.analytics?.recentCalls?.length || 0}`);
    } else {
      console.log('❌ Analytics API failed:', analyticsResponse.status);
    }

    // Test 2: Assistants API
    console.log('\n2️⃣ Testing /api/assistants endpoint...');
    const assistantsResponse = await fetch(`${BASE_URL}/api/assistants`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (assistantsResponse.ok) {
      const assistantsData = await assistantsResponse.json();
      console.log('✅ Assistants API working');
      console.log(`   Active assistants: ${assistantsData.assistants?.length || 0}`);
    } else {
      console.log('❌ Assistants API failed:', assistantsResponse.status);
    }

    // Test 3: Stats API
    console.log('\n3️⃣ Testing /api/stats endpoint...');
    const statsResponse = await fetch(`${BASE_URL}/api/stats`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Stats API working');
      console.log(`   Total calls: ${statsData.stats?.totalCalls || 0}`);
      console.log(`   Total duration: ${statsData.stats?.totalDuration || 0}s`);
    } else {
      console.log('❌ Stats API failed:', statsResponse.status);
    }

    // Test 4: Calls API
    console.log('\n4️⃣ Testing /api/calls endpoint...');
    const callsResponse = await fetch(`${BASE_URL}/api/calls?limit=5`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (callsResponse.ok) {
      const callsData = await callsResponse.json();
      console.log('✅ Calls API working');
      console.log(`   Recent calls: ${callsData.calls?.length || 0}`);
    } else {
      console.log('❌ Calls API failed:', callsResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\n🏁 Dashboard API tests completed!');
}

// Instructions for running the test
console.log('📋 INSTRUCTIONS:');
console.log('1. Start your backend server: node backend/server.js');
console.log('2. Get a valid JWT token by logging in');
console.log('3. Replace TEST_TOKEN above with your actual token');
console.log('4. Run: node test-dashboard-api.js\n');

// Uncomment to run the test (after setting up token)
// testDashboardAPIs();

module.exports = { testDashboardAPIs };