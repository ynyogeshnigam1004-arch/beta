// Test if .env file is loading correctly
require('dotenv').config({ path: './backend/.env' });

console.log('=== ENVIRONMENT VARIABLE TEST ===\n');

console.log('Cartesia API Key from .env:');
console.log('  Full key:', process.env.CARTESIA_API_KEY);
console.log('  Last 10 chars:', process.env.CARTESIA_API_KEY ? process.env.CARTESIA_API_KEY.slice(-10) : 'NOT FOUND');
console.log('  Expected ending: ...vKeHvT');
console.log('  Match:', process.env.CARTESIA_API_KEY?.endsWith('vKeHvT') ? '✅ CORRECT' : '❌ WRONG KEY');

console.log('\nGroq API Key:');
console.log('  Configured:', process.env.GROQ_API_KEY ? '✅ Yes' : '❌ No');

console.log('\nElevenLabs API Key:');
console.log('  Configured:', process.env.ELEVENLABS_API_KEY ? '✅ Yes' : '❌ No');

console.log('\nMongoDB URI:');
console.log('  Configured:', process.env.MONGODB_URI ? '✅ Yes' : '❌ No');

console.log('\n=== END TEST ===');
