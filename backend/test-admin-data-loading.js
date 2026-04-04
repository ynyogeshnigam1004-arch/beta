/**
 * Test Admin Data Loading
 * Test all API endpoints to see if admin data loads correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

// You'll need to get a fresh token from your browser
const TEST_TOKEN = 'your_jwt_token_here'; // Replace with actual token from localStorage

async function testAdminDataLoading() {
  console.log('🧪 Testing Admin Data Loading...\n');
  
  const endpoints = [
    { name: 'Assistants', url: '/api/assistants' },
    { name: 'Phone Numbers', url: '/api/phone-numbers' },
    { name: 'Analytics', url: '/api/analytics?period=30d' },
    { name: 'Call Credits', url: '/api/call/credits' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing ${endpoint.name}...`);
      
      const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      });
      
      if (response.status === 200) {
        const data = response.data;
        console.log(`✅ ${endpoint.name}: SUCCESS`);
        
        // Show data counts
        if (data.assistants) {
          console.log(`   Assistants: ${data.assistants.length}`);
        }
        if (data.phoneNumbers) {
          console.log(`   Phone Numbers: ${data.phoneNumbers.length}`);
        }
        if (data.twilioCredentials) {
          console.log(`   Twilio Configured: ${data.twilioCredentials.configured}`);
        }
        if (data.analytics) {
          console.log(`   Total Calls: ${data.analytics.totalCalls || 0}`);
        }
        if (data.credits !== undefined) {
          console.log(`   Credits: ${data.credits}`);
        }
      } else {
        console.log(`❌ ${endpoint.name}: HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error || error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🔧 To get your JWT token:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Application tab');
  console.log('3. Local Storage → localhost:3000');
  console.log('4. Copy the "token" value');
  console.log('5. Replace TEST_TOKEN in this script');
  console.log('6. Run again: node backend/test-admin-data-loading.js');
}

testAdminDataLoading();