const mongoose = require('mongoose');
require('dotenv').config();

async function findAssistant() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Use direct MongoDB query since Assistant is not a Mongoose model
    const db = mongoose.connection.db;
    const assistantsCollection = db.collection('assistants');
    
    const assistant = await assistantsCollection.findOne({ 
      userId: '69a49be0fdd5376624854e06',
      name: 'mine'
    });
    
    if (assistant) {
      console.log('Assistant found:');
      console.log('ID:', assistant.id);
      console.log('Name:', assistant.name);
      console.log('_id:', assistant._id);
    } else {
      console.log('Assistant "mine" not found, checking all assistants...');
      
      const allAssistants = await assistantsCollection.find({ 
        userId: '69a49be0fdd5376624854e06'
      }).toArray();
      
      console.log('All assistants for user:');
      allAssistants.forEach(a => {
        console.log(`- ID: ${a.id}, Name: ${a.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

findAssistant();