/**
 * Debug Call UserId Flow
 * Add logging to see what userId is being received in browser calls
 */

const fs = require('fs');
const path = require('path');

// Read the callHandler.js file
const callHandlerPath = path.join(__dirname, 'handlers', 'callHandler.js');
let content = fs.readFileSync(callHandlerPath, 'utf8');

// Add debug logging after userId extraction
const oldCode = `      // Extract userId from config for credits and human transfer
      const userId = data.config.userId || null;
      this.userId = userId; // Store userId for human transfer`;

const newCode = `      // Extract userId from config for credits and human transfer
      const userId = data.config.userId || null;
      this.userId = userId; // Store userId for human transfer
      
      // DEBUG: Log userId details
      console.log('🔍 [USERID DEBUG] Received config userId:', userId);
      console.log('🔍 [USERID DEBUG] UserId type:', typeof userId);
      console.log('🔍 [USERID DEBUG] UserId string:', userId ? userId.toString() : 'null');
      console.log('🔍 [USERID DEBUG] Full config:', JSON.stringify(data.config, null, 2));`;

// Replace the code
if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  fs.writeFileSync(callHandlerPath, content);
  console.log('✅ Added userId debug logging to callHandler.js');
  console.log('📝 Now when you make a browser call, check the backend logs for userId details');
} else {
  console.log('❌ Could not find the exact code to replace');
  console.log('📝 The code might have already been modified or the format changed');
}

console.log('\n🔧 Next steps:');
console.log('1. Make a browser call');
console.log('2. Check backend console for "[USERID DEBUG]" messages');
console.log('3. See if userId is null or has wrong format');
console.log('4. If userId is correct, the issue is elsewhere');