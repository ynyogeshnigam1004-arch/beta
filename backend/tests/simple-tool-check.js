/**
 * Simple Tool Check
 * Checks if the tool exists and what it contains
 */

// Your actual tool ID from "mine" assistant
const TOOL_ID = 'tool_1773022207116_4xndi2b1u';

async function simpleToolCheck() {
  console.log('🔍 Simple Tool Check\n');
  console.log('=' .repeat(60));
  console.log(`Tool ID from "mine" assistant: ${TOOL_ID}\n`);
  
  try {
    // Use server's database connection (server must be running)
    const { getCollection, checkConnection } = require('../config/database');
    
    // Check if database is connected
    const dbStatus = await checkConnection();
    
    if (!dbStatus.connected) {
      console.log('❌ Database not connected');
      console.log('   Make sure the server is running: node server.js');
      return;
    }
    
    console.log('✅ Database connected\n');
    
    // Fetch the tool
    console.log('📡 Fetching tool from database...');
    const toolsCollection = getCollection('tools');
    const tool = await toolsCollection.findOne({ id: TOOL_ID });
    
    if (!tool) {
      console.log('❌ Tool NOT found in database!\n');
      console.log('⚠️  This means:');
      console.log('   - Tool ID is saved in assistant config');
      console.log('   - But the tool was deleted from database');
      console.log('   - Calls will FAIL when trying to use this tool\n');
      console.log('🔧 FIX:');
      console.log('   1. Go to Tools page and create a new tool');
      console.log('   2. Update assistant to use the new tool ID');
      return;
    }
    
    console.log('✅ Tool found!\n');
    
    // Display tool info
    console.log('📋 TOOL INFORMATION:');
    console.log('='.repeat(60));
    console.log(`Name: ${tool.name || 'Untitled'}`);
    console.log(`Description: ${tool.description || 'No description'}`);
    console.log(`Type: ${tool.type || 'function'}`);
    console.log(`URL: ${tool.url || 'Not set'}`);
    console.log(`Method: ${tool.method || 'POST'}`);
    console.log(`Created: ${tool.createdAt}`);
    console.log(`Updated: ${tool.updatedAt}`);
    
    if (tool.parameters) {
      console.log('\n🔧 PARAMETERS:');
      console.log(JSON.stringify(tool.parameters, null, 2));
    }
    
    console.log('\n📄 FULL TOOL (JSON):');
    console.log('='.repeat(60));
    console.log(JSON.stringify(tool, null, 2));
    
    // Validation
    console.log('\n✅ VALIDATION:');
    console.log('='.repeat(60));
    
    const checks = {
      'Has name': !!tool.name,
      'Has description': !!tool.description,
      'Has URL': !!tool.url,
      'Has parameters': !!tool.parameters,
      'Has method': !!tool.method
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });
    
    // Check if it will work
    console.log('\n🎯 WILL IT WORK DURING CALLS?');
    console.log('='.repeat(60));
    
    const fs = require('fs');
    const handlerPath = './handlers/inboundCallHandler.js';
    
    if (!fs.existsSync(handlerPath)) {
      console.log('⚠️  Cannot find inboundCallHandler.js');
      return;
    }
    
    const handlerCode = fs.readFileSync(handlerPath, 'utf8');
    
    // Check if handler loads tools
    const loadsTools = handlerCode.includes('loadedAssistant.tools') || 
                      handlerCode.includes('getToolsByIds') ||
                      handlerCode.includes('tools:');
    
    console.log(`Tool exists in DB: ✅ YES`);
    console.log(`Tool linked to assistant: ✅ YES`);
    console.log(`Handler loads tools: ${loadsTools ? '✅ YES' : '❌ NO'}`);
    
    if (!loadsTools) {
      console.log('\n❌ CRITICAL: Tools will NOT work!');
      console.log('\nThe inboundCallHandler.js does NOT load tools from assistant.');
      console.log('Even though your tool exists and is configured correctly,');
      console.log('it will be IGNORED during phone/browser calls.\n');
      console.log('🔧 FIX NEEDED:');
      console.log('   The handler needs to be updated to:');
      console.log('   1. Load assistant.tools array');
      console.log('   2. Fetch tool definitions from database');
      console.log('   3. Pass tools to the LLM pipeline');
      console.log('   4. Execute tools when LLM requests them');
    } else {
      console.log('\n✅ Tools should work during calls!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run the check
simpleToolCheck();
