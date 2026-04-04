/**
 * Test tool execution in a simulated call
 */

const { MongoClient } = require('mongodb');
const fetch = require('node-fetch');

async function testToolInCall() {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('voiceai');
    const assistantsCollection = db.collection('assistants');
    const toolsCollection = db.collection('tools');
    
    // Get the "mine" assistant by ID
    const assistant = await assistantsCollection.findOne({ id: 'asst_1772915631010_pouc1agz9' });
    
    if (!assistant) {
      console.log('❌ Assistant not found');
      return;
    }
    
    console.log('📋 Testing Assistant:', assistant.name);
    console.log('Tools attached:', assistant.tools?.length || 0);
    console.log('');
    
    // Get the tool
    const toolId = 'tool_1773087665099_5d0bk2e5h';
    const tool = await toolsCollection.findOne({ id: toolId });
    
    if (!tool) {
      console.log('❌ Tool not found');
      return;
    }
    
    console.log('🔧 Testing Tool:', tool.name);
    console.log('URL:', tool.url);
    console.log('Method:', tool.method);
    console.log('');
    
    // Execute the tool
    console.log('🚀 Executing tool...\n');
    
    try {
      const response = await fetch(tool.url, {
        method: tool.method || 'GET',
        headers: tool.headers || {}
      });
      
      const data = await response.json();
      
      console.log('✅ Tool executed successfully!');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
      
      // Extract time info
      if (data.datetime) {
        console.log('\n⏰ Current time in New York:', data.datetime);
        console.log('Timezone:', data.timezone);
      }
      
      console.log('\n✅ The tool is working correctly!');
      console.log('Now test it in a real call:');
      console.log('1. Go to Make Call page');
      console.log('2. Select "mine" assistant');
      console.log('3. Start call');
      console.log('4. Say: "What time is it?"');
      console.log('5. The assistant should call the tool and tell you the time!');
      
    } catch (error) {
      console.error('❌ Tool execution failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

testToolInCall();
