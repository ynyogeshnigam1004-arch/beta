require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkAssistant() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('test');
    const assistants = await db.collection('assistants').find({}).toArray();
    
    console.log('\n📋 All Assistants:');
    assistants.forEach(asst => {
      console.log('\n---');
      console.log('Name:', asst.name);
      console.log('Voice ID:', asst.voiceId);
      console.log('Voice Model:', asst.voiceModel);
      console.log('TTS Provider:', asst.ttsProvider);
      console.log('Full config:', JSON.stringify(asst, null, 2));
    });
    
  } finally {
    await client.close();
  }
}

checkAssistant().catch(console.error);
