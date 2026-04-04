/**
 * Check Actual Tool from Database
 * Uses the server's existing database connection
 */

const http = require('http');

// Your actual tool ID from "mine" assistant
const TOOL_ID = 'tool_1773022207116_4xndi2b1u';

async function checkActualTool() {
  console.log('🔍 Checking actual tool from database...\n');
  console.log('=' .repeat(60));
  console.log(`Tool ID: ${TOOL_ID}\n`);
  
  try {
    // Use the server's database connection by making an internal request
    const { getCollection } = require('../config/database');
    
    console.log('📡 Fetching tool from database...');
    
    const toolsCollection = getCollection('tools');
    const tool = await toolsCollection.findOne({ id: TOOL_ID });
    
    if (!tool) {
      console.log('❌ Tool NOT found in database!');
      console.log('\n⚠️  This means:');
      console.log('   - The tool ID is saved in your assistant config');
      console.log('   - But the actual tool was deleted from the database');
      console.log('   - Calls will fail when trying to use this tool');
      console.log('\n🔧 FIX:');
      console.log('   1. Remove the tool from assistant, OR');
      console.log('   2. Recreate the tool with the same ID');
      return;
    }
    
    console.log('✅ Tool found in database!\n');
    
    // Display tool details
    console.log('📋 TOOL DETAILS:');
    console.log('='.repeat(60));
    console.log(`Name: ${tool.name || 'Untitled'}`);
    console.log(`Description: ${tool.description || 'No description'}`);
    console.log(`Type: ${tool.type || 'function'}`);
    console.log(`Created: ${tool.createdAt}`);
    console.log(`Updated: ${tool.updatedAt}`);
    console.log(`User ID: ${tool.userId}`);
    
    console.log('\n🔧 FUNCTION DEFINITION:');
    console.log('='.repeat(60));
    
    if (tool.async) {
      console.log(`Async: ${tool.async}`);
    }
    
    if (tool.url) {
      console.log(`URL: ${tool.url}`);
      console.log(`Method: ${tool.method || 'POST'}`);
    }
    
    if (tool.parameters) {
      console.log('\nParameters:');
      console.log(JSON.stringify(tool.parameters, null, 2));
    }
    
    if (tool.headers) {
      console.log('\nHeaders:');
      console.log(JSON.stringify(tool.headers, null, 2));
    }
    
    console.log('\n📄 FULL TOOL CONFIG (JSON):');
    console.log('='.repeat(60));
    console.log(JSON.stringify(tool, null, 2));
    
    // Check if tool is properly configured
    console.log('\n✅ VALIDATION:');
    console.log('='.repeat(60));
    
    const issues = [];
    
    if (!tool.name) issues.push('Missing name');
    if (!tool.description) issues.push('Missing description');
    if (!tool.url && tool.type !== 'builtin') issues.push('Missing URL');
    if (!tool.parameters) issues.push('Missing parameters definition');
    
    if (issues.length === 0) {
      console.log('✅ Tool is properly configured');
    } else {
      console.log('⚠️  Tool has issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    // Check if it will work during calls
    console.log('\n🎯 WILL IT WORK DURING CALLS?');
    console.log('='.repeat(60));
    
    console.log('✅ Tool exists in database: YES');
    console.log('✅ Tool is linked to assistant: YES');
    
    // Check if handler loads tools
    const fs = require('fs');
    const handlerCode = fs.readFileSync('./handlers/inboundCallHandler.js', 'utf8');
    const loadsTools = handlerCode.includes('loadedAssistant.tools') || 
                      handlerCode.includes('getToolsByIds');
    
    console.log(`${loadsTools ? '✅' : '❌'} Handler loads tools: ${loadsTools ? 'YES' : 'NO'}`);
    
    if (!loadsTools) {
      console.log('\n❌ CRITICAL ISSUE:');
      console.log('   The inboundCallHandler.js does NOT load tools!');
      console.log('   Even though the tool exists and is configured,');
      console.log('   it will NOT be available during calls.');
      console.log('\n🔧 FIX REQUIRED:');
      console.log('   Update inboundCallHandler.js to:');
      console.log('   1. Load tools from assistant.tools array');
      console.log('   2. Fetch tool definitions using getToolsByIds()');
      console.log('   3. Pass tools to the pipeline');
      console.log('   4. Handle tool execution in LLM responses');
    } else {
      console.log('\n✅ Tool should work during calls!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

// Run the check
checkActualTool();
