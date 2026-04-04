// Test if .env file is being loaded correctly
require('dotenv').config({ override: true });

console.log('\n🔍 Testing Environment Variable Loading\n');
console.log('═══════════════════════════════════════════════════════');

// Check if dotenv loaded anything
console.log('Current working directory:', process.cwd());
console.log('');

// Check Twilio variables
console.log('Twilio Configuration:');
console.log('  TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Loaded' : '❌ Missing');
console.log('  TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Loaded' : '❌ Missing');
console.log('  TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || '❌ undefined');
console.log('  PERSONAL_PHONE_NUMBER:', process.env.PERSONAL_PHONE_NUMBER || '❌ undefined');
console.log('  BASE_URL:', process.env.BASE_URL || '❌ undefined');
console.log('');

// Check other variables
console.log('Other Configuration:');
console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('  DEEPGRAM_API_KEY:', process.env.DEEPGRAM_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('  CARTESIA_API_KEY:', process.env.CARTESIA_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('');

console.log('═══════════════════════════════════════════════════════');

// Show actual values (first 10 chars only for security)
console.log('\nActual Values (truncated):');
if (process.env.TWILIO_ACCOUNT_SID) {
  console.log('  TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID.substring(0, 10) + '...');
}
if (process.env.TWILIO_PHONE_NUMBER) {
  console.log('  TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER);
}
if (process.env.PERSONAL_PHONE_NUMBER) {
  console.log('  PERSONAL_PHONE_NUMBER:', process.env.PERSONAL_PHONE_NUMBER);
}
console.log('');
