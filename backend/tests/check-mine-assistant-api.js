/**
 * Check "mine" Assistant via API
 * Fetches the assistant named "mine" through the API endpoint
 */

const http = require('http');

const API_URL = 'http://localhost:5001';

async function makeRequest(path, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function checkMineAssistant() {
  console.log('🔍 Checking assistant named "mine" via API...\n');
  console.log('=' .repeat(60));
  
  try {
    // First, get all assistants
    console.log('📡 Fetching all assistants from API...\n');
    const response = await makeRequest('/api/assistants');
    
    if (!response.success) {
      console.log('❌ Failed to fetch assistants:', response.error || response.message);
      return;
    }
    
    const assistants = response.assistants || [];
    console.log(`✅ Found ${assistants.length} total assistant(s)\n`);
    
    // Find "mine" assistant (trim spaces for comparison)
    const mineAssistant = assistants.find(a => a.name && a.name.trim().toLowerCase() === 'mine');
    
    if (!mineAssistant) {
      console.log('❌ No assistant found with name "mine"\n');
      console.log('💡 Available assistants:');
      assistants.forEach(a => {
        console.log(`   - ${a.name} (ID: ${a.id}, Status: ${a.status})`);
      });
      return;
    }
    
    console.log('✅ Found assistant "mine"!\n');
    
    // Display basic info
    console.log('📋 BASIC INFORMATION:');
    console.log(`   Name: ${mineAssistant.name}`);
    console.log(`   ID: ${mineAssistant.id}`);
    console.log(`   Status: ${mineAssistant.status}`);
    console.log(`   Created: ${mineAssistant.createdAt}`);
    console.log(`   Updated: ${mineAssistant.updatedAt}`);
    console.log(`   User ID: ${mineAssistant.userId}`);
    
    // Display model configuration
    console.log('\n🤖 MODEL CONFIGURATION:');
    console.log(`   Provider: ${mineAssistant.provider || 'Not set'}`);
    console.log(`   Model: ${mineAssistant.model || 'Not set'}`);
    console.log(`   Max Tokens: ${mineAssistant.maxTokens || 'Not set'}`);
    console.log(`   Temperature: ${mineAssistant.temperature !== undefined ? mineAssistant.temperature : 'Not set'}`);
    
    // Display conversation settings
    console.log('\n💬 CONVERSATION SETTINGS:');
    console.log(`   First Message Mode: ${mineAssistant.firstMessageMode || 'Not set'}`);
    console.log(`   First Message: ${mineAssistant.firstMessage || 'Not set'}`);
    if (mineAssistant.systemPrompt) {
      const preview = mineAssistant.systemPrompt.length > 100 
        ? mineAssistant.systemPrompt.substring(0, 100) + '...' 
        : mineAssistant.systemPrompt;
      console.log(`   System Prompt: ${preview}`);
    } else {
      console.log(`   System Prompt: Not set`);
    }
    
    // Display tools
    console.log('\n🔧 TOOLS:');
    if (mineAssistant.tools && mineAssistant.tools.length > 0) {
      console.log(`   ${mineAssistant.tools.length} tool(s) configured:`);
      mineAssistant.tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool}`);
      });
    } else {
      console.log('   No tools configured');
    }
    
    // Display voice configuration
    console.log('\n🎤 VOICE CONFIGURATION:');
    if (mineAssistant.voice) {
      console.log(`   Provider: ${mineAssistant.voice.provider || 'Not set'}`);
      console.log(`   Voice ID: ${mineAssistant.voice.voiceId || 'Not set'}`);
      console.log(`   Stability: ${mineAssistant.voice.stability !== undefined ? mineAssistant.voice.stability : 'Not set'}`);
      console.log(`   Similarity Boost: ${mineAssistant.voice.similarityBoost !== undefined ? mineAssistant.voice.similarityBoost : 'Not set'}`);
    } else {
      console.log('   Not configured');
    }
    
    // Display transcriber configuration
    console.log('\n🎧 TRANSCRIBER CONFIGURATION:');
    if (mineAssistant.transcriber) {
      console.log(`   Provider: ${mineAssistant.transcriber.provider || 'Not set'}`);
      console.log(`   Model: ${mineAssistant.transcriber.model || 'Not set'}`);
      console.log(`   Language: ${mineAssistant.transcriber.language || 'Not set'}`);
    } else {
      console.log('   Not configured');
    }
    
    // Display advanced settings
    console.log('\n⚙️  ADVANCED SETTINGS:');
    if (mineAssistant.advanced) {
      console.log(`   Recording Enabled: ${mineAssistant.advanced.recordingEnabled !== undefined ? mineAssistant.advanced.recordingEnabled : 'Not set'}`);
      console.log(`   Max Duration: ${mineAssistant.advanced.maxDuration || 'Not set'}`);
      console.log(`   End Call Message: ${mineAssistant.advanced.endCallMessage || 'Not set'}`);
      console.log(`   Silence Timeout: ${mineAssistant.advanced.silenceTimeout || 'Not set'}`);
      console.log(`   HIPAA Enabled: ${mineAssistant.advanced.hipaaEnabled !== undefined ? mineAssistant.advanced.hipaaEnabled : 'Not set'}`);
    } else {
      console.log('   Not configured');
    }
    
    // Display phone configuration
    console.log('\n📞 PHONE CONFIGURATION:');
    if (mineAssistant.phone) {
      console.log(`   Number: ${mineAssistant.phone.number || 'Not set'}`);
      console.log(`   Forwarding Number: ${mineAssistant.phone.forwardingNumber || 'Not set'}`);
    } else {
      console.log('   Not configured');
    }
    
    // Display full JSON
    console.log('\n' + '='.repeat(60));
    console.log('📄 FULL CONFIGURATION (JSON):');
    console.log('='.repeat(60));
    console.log(JSON.stringify(mineAssistant, null, 2));
    
    // Check for missing required fields
    console.log('\n' + '='.repeat(60));
    console.log('✅ VALIDATION:');
    console.log('='.repeat(60));
    
    const requiredFields = [
      'name',
      'provider',
      'model',
      'firstMessageMode',
      'firstMessage',
      'systemPrompt'
    ];
    
    const missingFields = requiredFields.filter(field => !mineAssistant[field]);
    
    if (missingFields.length === 0) {
      console.log('✅ All required fields are present');
    } else {
      console.log('⚠️  Missing required fields:');
      missingFields.forEach(field => {
        console.log(`   ❌ ${field}`);
      });
    }
    
    // Check field types
    console.log('\n📊 FIELD TYPE CHECK:');
    const typeChecks = [
      { field: 'name', expected: 'string', actual: typeof mineAssistant.name },
      { field: 'status', expected: 'string', actual: typeof mineAssistant.status },
      { field: 'provider', expected: 'string', actual: typeof mineAssistant.provider },
      { field: 'model', expected: 'string', actual: typeof mineAssistant.model },
      { field: 'maxTokens', expected: 'number', actual: typeof mineAssistant.maxTokens },
      { field: 'temperature', expected: 'number', actual: typeof mineAssistant.temperature },
      { field: 'tools', expected: 'array', actual: Array.isArray(mineAssistant.tools) ? 'array' : typeof mineAssistant.tools }
    ];
    
    typeChecks.forEach(({ field, expected, actual }) => {
      if (mineAssistant[field] !== undefined) {
        const isValid = expected === actual;
        console.log(`   ${isValid ? '✅' : '❌'} ${field}: ${actual} ${isValid ? '' : `(expected ${expected})`}`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Make sure your backend server is running on port 5001');
    console.error('   Run: cd backend && node server.js');
  }
}

// Run the check
checkMineAssistant();
