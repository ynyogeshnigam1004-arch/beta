/**
 * Test Analytics API - Phone Calls Only
 * Tests the analytics API endpoints to verify phone call filtering
 */

const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:5001';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OWE0OWJlMGZkZDUzNzY2MjQ4NTRlMDYiLCJlbWFpbCI6InlueW9nZXNobmlnYW0xMDA4QGdtYWlsLmNvbSIsImlhdCI6MTczNzM2MzI3NywiZXhwIjoxNzM3NDQ5Njc3fQ.example'; // You'll need a real token

async function makeRequest(endpoint, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: endpoint,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testAnalyticsAPI() {
  console.log('🧪 TESTING ANALYTICS API...\n');
  
  try {
    // Test analytics endpoint
    console.log('📊 Testing /api/analytics...');
    const analyticsResult = await makeRequest('/api/analytics?period=7d', TEST_TOKEN);
    
    if (analyticsResult.status === 401) {
      console.log('❌ Authentication failed - need valid token');
      console.log('ℹ️  Please get a valid JWT token from login and update TEST_TOKEN');
      return;
    }
    
    console.log(`Status: ${analyticsResult.status}`);
    if (analyticsResult.data.success) {
      const analytics = analyticsResult.data.analytics;
      console.log(`✅ Analytics data received:`);
      console.log(`   Total Calls: ${analytics.overview.totalCalls}`);
      console.log(`   Success Rate: ${analytics.overview.successRate.toFixed(1)}%`);
      console.log(`   Recent Calls: ${analytics.recentCalls.length}`);
      
      // Check if recent calls are phone calls only
      const callTypes = analytics.recentCalls.map(call => call.callType || 'unknown');
      const uniqueTypes = [...new Set(callTypes)];
      console.log(`   Call Types in Results: ${uniqueTypes.join(', ')}`);
      
      if (uniqueTypes.length === 1 && uniqueTypes[0] === 'inbound') {
        console.log('✅ SUCCESS: Analytics shows ONLY phone calls (inbound)');
      } else if (uniqueTypes.includes('browser')) {
        console.log('❌ ISSUE: Analytics still includes browser calls');
      } else {
        console.log('ℹ️  No calls found or mixed types');
      }
    } else {
      console.log('❌ Analytics request failed:', analyticsResult.data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Note: This test requires a valid JWT token
console.log('⚠️  NOTE: This test requires a valid JWT token.');
console.log('   Please login to get a token and update TEST_TOKEN in the script.');
console.log('   Or test manually by:');
console.log('   1. Login to the frontend');
console.log('   2. Open browser dev tools');
console.log('   3. Check localStorage.getItem("token")');
console.log('   4. Use that token to test the API\n');

testAnalyticsAPI();