/**
 * Assistant Configuration Test
 * Tests what should be saved in the assistant configuration
 */

const AssistantModel = require('../models/Assistant');
const { connectDB, closeConnection } = require('../config/database');

// Mock assistant configuration with all possible fields
const mockAssistantConfig = {
  // Basic Info
  name: 'Test Assistant',
  status: 'active', // 'active' or 'inactive'
  
  // Model Configuration
  provider: 'Groq',
  model: 'llama-3.1-8b-instant',
  maxTokens: 250,
  temperature: 0.5,
  
  // First Message Configuration
  firstMessageMode: 'assistant-speaks-first', // 'assistant-speaks-first', 'assistant-waits', 'custom'
  firstMessage: 'Hello, how can I help you today?',
  
  // System Prompt
  systemPrompt: 'You are a helpful AI assistant. Be concise and friendly.',
  
  // Voice Configuration
  voice: {
    provider: 'ElevenLabs',
    voiceId: 'default',
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0,
    useSpeakerBoost: true
  },
  
  // Transcriber Configuration
  transcriber: {
    provider: 'Deepgram',
    model: 'nova-2',
    language: 'en'
  },
  
  // Tools Configuration
  tools: [], // Array of tool IDs
  
  // Advanced Settings
  advanced: {
    endCallMessage: 'Thank you for calling. Goodbye!',
    endCallPhrases: ['goodbye', 'bye', 'end call'],
    recordingEnabled: true,
    maxDuration: 1800, // 30 minutes in seconds
    silenceTimeout: 30,
    backgroundSound: 'office',
    hipaaEnabled: false
  },
  
  // Analysis Configuration
  analysis: {
    summaryPrompt: 'Summarize the key points of this conversation.',
    structuredDataSchema: {},
    successEvaluationPrompt: 'Was the call successful?'
  },
  
  // Compliance Settings
  compliance: {
    recordingDisclosure: true,
    recordingDisclosureMessage: 'This call may be recorded for quality assurance.',
    privacyPolicyUrl: '',
    termsOfServiceUrl: ''
  },
  
  // Widget Configuration (for web widget)
  widget: {
    enabled: false,
    buttonColor: '#007bff',
    buttonPosition: 'bottom-right',
    welcomeMessage: 'Hi! How can I help you?'
  },
  
  // Phone Configuration
  phone: {
    number: '',
    forwardingNumber: ''
  }
};

/**
 * Test: Validate all required fields are present
 */
async function testRequiredFields() {
  console.log('\n🧪 Test 1: Required Fields Validation');
  
  const requiredFields = [
    'name',
    'provider',
    'model',
    'firstMessageMode',
    'firstMessage',
    'systemPrompt'
  ];
  
  const missingFields = requiredFields.filter(field => !mockAssistantConfig[field]);
  
  if (missingFields.length === 0) {
    console.log('✅ All required fields are present');
    return true;
  } else {
    console.log('❌ Missing required fields:', missingFields);
    return false;
  }
}

/**
 * Test: Create assistant with full configuration
 */
async function testCreateAssistant() {
  console.log('\n🧪 Test 2: Create Assistant with Full Config');
  
  try {
    await connectDB();
    
    const assistant = await AssistantModel.createAssistant({
      ...mockAssistantConfig,
      userId: '507f1f77bcf86cd799439011' // Mock user ID
    });
    
    console.log('✅ Assistant created successfully');
    console.log('📋 Assistant ID:', assistant.id);
    console.log('📋 Created At:', assistant.createdAt);
    
    return assistant;
  } catch (error) {
    console.log('❌ Failed to create assistant:', error.message);
    return null;
  }
}

/**
 * Test: Update assistant configuration
 */
async function testUpdateAssistant(assistantId) {
  console.log('\n🧪 Test 3: Update Assistant Configuration');
  
  try {
    const updates = {
      name: 'Updated Test Assistant',
      temperature: 0.7,
      maxTokens: 500,
      tools: ['tool_123', 'tool_456'],
      'advanced.recordingEnabled': false
    };
    
    const updated = await AssistantModel.updateAssistant(assistantId, updates);
    
    console.log('✅ Assistant updated successfully');
    console.log('📋 Updated Name:', updated.name);
    console.log('📋 Updated Temperature:', updated.temperature);
    console.log('📋 Updated At:', updated.updatedAt);
    
    return updated;
  } catch (error) {
    console.log('❌ Failed to update assistant:', error.message);
    return null;
  }
}

/**
 * Test: Retrieve assistant and validate all fields
 */
async function testRetrieveAssistant(assistantId) {
  console.log('\n🧪 Test 4: Retrieve and Validate Assistant');
  
  try {
    const assistant = await AssistantModel.getAssistantById(assistantId);
    
    if (!assistant) {
      console.log('❌ Assistant not found');
      return false;
    }
    
    console.log('✅ Assistant retrieved successfully');
    console.log('\n📋 Full Configuration:');
    console.log(JSON.stringify(assistant, null, 2));
    
    return assistant;
  } catch (error) {
    console.log('❌ Failed to retrieve assistant:', error.message);
    return null;
  }
}

/**
 * Test: Validate field types
 */
function testFieldTypes(assistant) {
  console.log('\n🧪 Test 5: Field Type Validation');
  
  const validations = [
    { field: 'name', type: 'string', value: assistant.name },
    { field: 'status', type: 'string', value: assistant.status },
    { field: 'provider', type: 'string', value: assistant.provider },
    { field: 'model', type: 'string', value: assistant.model },
    { field: 'maxTokens', type: 'number', value: assistant.maxTokens },
    { field: 'temperature', type: 'number', value: assistant.temperature },
    { field: 'firstMessage', type: 'string', value: assistant.firstMessage },
    { field: 'systemPrompt', type: 'string', value: assistant.systemPrompt },
    { field: 'tools', type: 'object', value: assistant.tools, isArray: true },
    { field: 'createdAt', type: 'string', value: assistant.createdAt },
    { field: 'updatedAt', type: 'string', value: assistant.updatedAt }
  ];
  
  let allValid = true;
  
  validations.forEach(({ field, type, value, isArray }) => {
    const actualType = typeof value;
    const isValid = isArray ? Array.isArray(value) : actualType === type;
    
    if (isValid) {
      console.log(`✅ ${field}: ${isArray ? 'array' : type} - Valid`);
    } else {
      console.log(`❌ ${field}: Expected ${isArray ? 'array' : type}, got ${actualType}`);
      allValid = false;
    }
  });
  
  return allValid;
}

/**
 * Test: Clean up - delete test assistant
 */
async function testCleanup(assistantId) {
  console.log('\n🧪 Test 6: Cleanup');
  
  try {
    const deleted = await AssistantModel.deleteAssistant(assistantId);
    
    if (deleted) {
      console.log('✅ Test assistant deleted successfully');
    } else {
      console.log('⚠️ Assistant not found or already deleted');
    }
    
    return deleted;
  } catch (error) {
    console.log('❌ Failed to delete assistant:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Assistant Configuration Tests\n');
  console.log('=' .repeat(60));
  
  try {
    // Test 1: Validate required fields
    await testRequiredFields();
    
    // Test 2: Create assistant
    const assistant = await testCreateAssistant();
    if (!assistant) {
      console.log('\n❌ Tests failed: Could not create assistant');
      return;
    }
    
    // Test 3: Update assistant
    await testUpdateAssistant(assistant.id);
    
    // Test 4: Retrieve assistant
    const retrieved = await testRetrieveAssistant(assistant.id);
    
    // Test 5: Validate field types
    if (retrieved) {
      testFieldTypes(retrieved);
    }
    
    // Test 6: Cleanup
    await testCleanup(assistant.id);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  } finally {
    await closeConnection();
    console.log('\n🔌 Database connection closed');
  }
}

// Export for use in other test files
module.exports = {
  mockAssistantConfig,
  testRequiredFields,
  testCreateAssistant,
  testUpdateAssistant,
  testRetrieveAssistant,
  testFieldTypes,
  testCleanup,
  runAllTests
};

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}
