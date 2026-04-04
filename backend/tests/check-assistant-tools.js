/**
 * Check which tools are attached to assistants
 */

const { MongoClient } = require('mongodb');

async function checkAssistantTools() {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('voiceai');
    const assistantsCollection = db.collection('assistants');
    const toolsCollection = db.collection('tools');
    
    // Get all assistants
    const assistants = await assistantsCollection.find({}).toArray();
    
    console.log(`📋 Found ${assistants.length} assistant(s):\n`);
    
    for (const assistant of assistants) {
      console.log('═══════════════════════════════════════════');
      console.log('Assistant:', assistant.name || 'Unnamed');
      console.log('ID:', assistant.id);
      console.log('First Message:', assistant.firstMessage?.substring(0, 50) + '...');
      
      // Check tools field
      if (assistant.tools && assistant.tools.length > 0) {
        console.log('\n🔧 Tools attached:', assistant.tools.length);
        
        // Get tool details
        for (const toolId of assistant.tools) {
          const tool = await toolsCollection.findOne({ id: toolId });
          if (tool) {
            console.log(`  ✅ ${tool.name} (${toolId})`);
          } else {
            console.log(`  ❌ Tool not found: ${toolId}`);
          }
        }
      } else {
        console.log('\n⚠️  No tools attached to this assistant!');
      }
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════');
    
    // Show available tools
    const allTools = await toolsCollection.find({}).toArray();
    console.log('\n📦 Available tools in database:');
    allTools.forEach(tool => {
      console.log(`  - ${tool.name} (${tool.id})`);
    });
    
    console.log('\n💡 To use tools in calls, you need to:');
    console.log('   1. Go to Assistants page in UI');
    console.log('   2. Edit your assistant');
    console.log('   3. Scroll to "Tools" section');
    console.log('   4. Select "get_current_time" tool');
    console.log('   5. Save the assistant');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkAssistantTools();
