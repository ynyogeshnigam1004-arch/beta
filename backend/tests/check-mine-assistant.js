/**
 * Check "mine" Assistant Configuration
 * Fetches and displays the configuration of the assistant named "mine"
 */

const { connectDB, closeConnection, getCollection } = require('../config/database');

async function checkMineAssistant() {
  console.log('🔍 Checking assistant named "mine"...\n');
  console.log('=' .repeat(60));
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');
    
    // Get assistants collection
    const collection = getCollection('assistants');
    
    // Find assistant with name "mine"
    const assistant = await collection.findOne({ name: 'mine' });
    
    if (!assistant) {
      console.log('❌ No assistant found with name "mine"');
      console.log('\n💡 Available assistants:');
      const allAssistants = await collection.find({}).toArray();
      allAssistants.forEach(a => {
        console.log(`   - ${a.name} (ID: ${a.id}, Status: ${a.status})`);
      });
      return;
    }
    
    console.log('✅ Found assistant "mine"!\n');
    
    // Display basic info
    console.log('📋 BASIC INFORMATION:');
    console.log(`   Name: ${assistant.name}`);
    console.log(`   ID: ${assistant.id}`);
    console.log(`   Status: ${assistant.status}`);
    console.log(`   Created: ${assistant.createdAt}`);
    console.log(`   Updated: ${assistant.updatedAt}`);
    console.log(`   User ID: ${assistant.userId}`);
    
    // Display model configuration
    console.log('\n🤖 MODEL CONFIGURATION:');
    console.log(`   Provider: ${assistant.provider || 'Not set'}`);
    console.log(`   Model: ${assistant.model || 'Not set'}`);
    console.log(`   Max Tokens: ${assistant.maxTokens || 'Not set'}`);
    console.log(`   Temperature: ${assistant.temperature || 'Not set'}`);
    
    // Display conversation settings
    console.log('\n💬 CONVERSATION SETTINGS:');
    console.log(`   First Message Mode: ${assistant.firstMessageMode || 'Not set'}`);
    console.log(`   First Message: ${assistant.firstMessage || 'Not set'}`);
    console.log(`   System Prompt: ${assistant.systemPrompt ? assistant.systemPrompt.substring(0, 100) + '...' : 'Not set'}`);
    
    // Display tools
    console.log('\n🔧 TOOLS:');
    if (assistant.tools && assistant.tools.length > 0) {
      console.log(`   ${assistant.tools.length} tool(s) configured:`);
      assistant.tools.forEach((tool, index) => {
        console.log(`   ${index + 1}. ${tool}`);
      });
    } else {
      console.log('   No tools configured');
    }
    
    // Display voice configuration
    console.log('\n🎤 VOICE CONFIGURATION:');
    if (assistant.voice) {
      console.log(`   Provider: ${assistant.voice.provider || 'Not set'}`);
      console.log(`   Voice ID: ${assistant.voice.voiceId || 'Not set'}`);
      console.log(`   Stability: ${assistant.voice.stability || 'Not set'}`);
      console.log(`   Similarity Boost: ${assistant.voice.similarityBoost || 'Not set'}`);
    } else {
      console.log('   Not configured');
    }
    
    // Display transcriber configuration
    console.log('\n🎧 TRANSCRIBER CONFIGURATION:');
    if (assistant.transcriber) {
      console.log(`   Provider: ${assistant.transcriber.provider || 'Not set'}`);
      console.log(`   Model: ${assistant.transcriber.model || 'Not set'}`);
      console.log(`   Language: ${assistant.transcriber.language || 'Not set'}`);
    } else {
      console.log('   Not configured');
    }
    
    // Display advanced settings
    console.log('\n⚙️  ADVANCED SETTINGS:');
    if (assistant.advanced) {
      console.log(`   Recording Enabled: ${assistant.advanced.recordingEnabled || 'Not set'}`);
      console.log(`   Max Duration: ${assistant.advanced.maxDuration || 'Not set'}`);
      console.log(`   End Call Message: ${assistant.advanced.endCallMessage || 'Not set'}`);
      console.log(`   Silence Timeout: ${assistant.advanced.silenceTimeout || 'Not set'}`);
      console.log(`   HIPAA Enabled: ${assistant.advanced.hipaaEnabled || 'Not set'}`);
    } else {
      console.log('   Not configured');
    }
    
    // Display phone configuration
    console.log('\n📞 PHONE CONFIGURATION:');
    if (assistant.phone) {
      console.log(`   Number: ${assistant.phone.number || 'Not set'}`);
      console.log(`   Forwarding Number: ${assistant.phone.forwardingNumber || 'Not set'}`);
    } else {
      console.log('   Not configured');
    }
    
    // Display full JSON
    console.log('\n' + '='.repeat(60));
    console.log('📄 FULL CONFIGURATION (JSON):');
    console.log('='.repeat(60));
    console.log(JSON.stringify(assistant, null, 2));
    
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
    
    const missingFields = requiredFields.filter(field => !assistant[field]);
    
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
      { field: 'name', expected: 'string', actual: typeof assistant.name },
      { field: 'status', expected: 'string', actual: typeof assistant.status },
      { field: 'provider', expected: 'string', actual: typeof assistant.provider },
      { field: 'model', expected: 'string', actual: typeof assistant.model },
      { field: 'maxTokens', expected: 'number', actual: typeof assistant.maxTokens },
      { field: 'temperature', expected: 'number', actual: typeof assistant.temperature },
      { field: 'tools', expected: 'array', actual: Array.isArray(assistant.tools) ? 'array' : typeof assistant.tools }
    ];
    
    typeChecks.forEach(({ field, expected, actual }) => {
      if (assistant[field] !== undefined) {
        const isValid = expected === actual;
        console.log(`   ${isValid ? '✅' : '❌'} ${field}: ${actual} ${isValid ? '' : `(expected ${expected})`}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await closeConnection();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the check
checkMineAssistant();
