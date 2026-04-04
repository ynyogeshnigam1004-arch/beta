require('dotenv').config();
const { getAllAssistants } = require('./models/Assistant');
const { connectDB } = require('./config/database');

async function checkFullData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    console.log('📋 Fetching all assistants...\n');
    const assistants = await getAllAssistants();
    
    console.log(`Found ${assistants.length} assistants\n`);
    console.log('='.repeat(80));
    
    assistants.forEach((asst, index) => {
      console.log(`\n${index + 1}. ASSISTANT: ${asst.name}`);
      console.log('-'.repeat(80));
      console.log('FULL DATA:');
      console.log(JSON.stringify(asst, null, 2));
      console.log('='.repeat(80));
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkFullData();
