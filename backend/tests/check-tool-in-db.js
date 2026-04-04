const { MongoClient } = require('mongodb');

async function checkTool() {
  require('dotenv').config();
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('voiceai'); // Changed from 'voice-ai' to 'voiceai'
    const toolsCollection = db.collection('tools');
    
    // Find ALL tools
    const allTools = await toolsCollection.find({}).toArray();
    
    console.log(`\n📋 Found ${allTools.length} tool(s) in database:`);
    console.log('═══════════════════════════════════════════');
    
    allTools.forEach((tool, index) => {
      console.log(`\n${index + 1}. Tool:`);
      console.log('   ID:', tool.id);
      console.log('   Name:', tool.name);
      console.log('   URL:', tool.url);
      console.log('   Method:', tool.method);
    });
    
    console.log('═══════════════════════════════════════════');
    
    // Find the get_current_time tool
    const tool = await toolsCollection.findOne({ name: 'get_current_time' });
    
    if (!tool) {
      console.log('❌ Tool not found in database!');
      return;
    }
    
    console.log('\n📋 Tool in Database:');
    console.log('═══════════════════════════════════════════');
    console.log('ID:', tool.id);
    console.log('Name:', tool.name);
    console.log('Description:', tool.description);
    console.log('URL:', tool.url);
    console.log('Method:', tool.method);
    console.log('Headers:', JSON.stringify(tool.headers, null, 2));
    console.log('Parameters:', JSON.stringify(tool.parameters, null, 2));
    console.log('═══════════════════════════════════════════');
    
    if (!tool.url || tool.url === 'undefined') {
      console.log('\n❌ PROBLEM: URL is missing or undefined!');
      console.log('The tool needs a valid URL to work.');
    } else {
      console.log('\n✅ URL is configured correctly!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkTool();
