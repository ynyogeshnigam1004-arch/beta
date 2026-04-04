require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function createTimeTool() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('voiceai');
    const toolsCollection = db.collection('tools');
    
    // Your user ID (from the screenshot - you tool)
    const userId = new ObjectId('69a49be0fdd5376624854e06');
    
    const tool = {
      id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'get_current_time',
      description: 'Get the current time',
      url: 'https://worldtimeapi.org/api/timezone/America/New_York',
      method: 'GET',
      headers: {},
      parameters: [],
      userId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    console.log('\n📝 Creating tool:');
    console.log(JSON.stringify(tool, null, 2));
    
    const result = await toolsCollection.insertOne(tool);
    
    console.log('\n✅ Tool created successfully!');
    console.log('Tool ID:', tool.id);
    console.log('MongoDB _id:', result.insertedId);
    
    // Verify it was saved
    const savedTool = await toolsCollection.findOne({ id: tool.id });
    console.log('\n✅ Verified tool in database:');
    console.log('   Name:', savedTool.name);
    console.log('   URL:', savedTool.url);
    console.log('   Method:', savedTool.method);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

createTimeTool();
