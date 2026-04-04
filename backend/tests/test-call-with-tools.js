/**
 * Test Call with Tools
 * Verifies if the assistant's tools will work during a call
 */

const http = require('http');

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (e) {
          resolve(responseData);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testCallWithTools() {
  console.log('🧪 Testing Call with Tools Integration\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Get the "mine" assistant
    console.log('\n📋 Step 1: Fetching "mine" assistant...');
    const assistantsResponse = await makeRequest('/api/assistants');
    
    if (!assistantsResponse.success) {
      console.log('❌ Failed to fetch assistants');
      return;
    }
    
    const mineAssistant = assistantsResponse.assistants.find(a => 
      a.name && a.name.trim().toLowerCase() === 'mine'
    );
    
    if (!mineAssistant) {
      console.log('❌ Assistant "mine" not found');
      return;
    }
    
    console.log(`✅ Found assistant: ${mineAssistant.name}`);
    console.log(`   ID: ${mineAssistant.id}`);
    console.log(`   Tools: ${mineAssistant.tools ? mineAssistant.tools.length : 0}`);
    
    if (!mineAssistant.tools || mineAssistant.tools.length === 0) {
      console.log('\n⚠️  WARNING: No tools configured on this assistant!');
      console.log('   The assistant will work but cannot use any tools.');
      return;
    }
    
    // Step 2: Fetch the tool details
    console.log('\n📋 Step 2: Fetching tool details...');
    console.log(`   Tool ID: ${mineAssistant.tools[0]}`);
    
    // We can't fetch without auth, so let's check the database directly
    const { getToolsByIds } = require('../models/Tool');
    const { connectDB } = require('../config/database');
    
    await connectDB();
    
    const tools = await getToolsByIds(mineAssistant.tools);
    
    if (tools.length === 0) {
      console.log('❌ Tool not found in database!');
      console.log('   The tool ID exists in assistant config but the tool was deleted.');
      console.log('\n🔧 FIX: Remove the tool from assistant or recreate the tool.');
      return;
    }
    
    console.log(`✅ Found ${tools.length} tool(s):`);
    tools.forEach((tool, index) => {
      console.log(`\n   Tool ${index + 1}:`);
      console.log(`   - Name: ${tool.name || 'Untitled'}`);
      console.log(`   - Description: ${tool.description || 'No description'}`);
      console.log(`   - Type: ${tool.type || 'function'}`);
      console.log(`   - URL: ${tool.url || 'Not set'}`);
      console.log(`   - Method: ${tool.method || 'POST'}`);
      
      if (tool.parameters) {
        console.log(`   - Parameters: ${JSON.stringify(tool.parameters)}`);
      }
    });
    
    // Step 3: Check if inboundCallHandler loads tools
    console.log('\n📋 Step 3: Checking if call handler loads tools...');
    const fs = require('fs');
    const handlerCode = fs.readFileSync('./handlers/inboundCallHandler.js', 'utf8');
    
    const hasToolLoading = handlerCode.includes('tools') && 
                          (handlerCode.includes('getToolsByIds') || 
                           handlerCode.includes('loadedAssistant.tools'));
    
    if (hasToolLoading) {
      console.log('✅ Call handler appears to load tools');
    } else {
      console.log('❌ CRITICAL: Call handler does NOT load tools!');
      console.log('\n🔧 ISSUE FOUND:');
      console.log('   The inboundCallHandler.js does not load tools from the assistant.');
      console.log('   Even though tools are saved in the assistant config,');
      console.log('   they will NOT be available during calls!');
      console.log('\n🔧 FIX NEEDED:');
      console.log('   1. Update loadAssistant() to fetch tools using getToolsByIds()');
      console.log('   2. Pass tools to the pipeline initialization');
      console.log('   3. Implement tool execution in the LLM response handler');
    }
    
    // Step 4: Check if pipeline supports tools
    console.log('\n📋 Step 4: Checking if pipeline supports tools...');
    const pipelineCode = fs.readFileSync('./pipelines/mainPipeline.js', 'utf8');
    
    const hasToolSupport = pipelineCode.includes('tool') || 
                          pipelineCode.includes('function_call') ||
                          pipelineCode.includes('functionCall');
    
    if (hasToolSupport) {
      console.log('✅ Pipeline appears to support tools');
    } else {
      console.log('❌ WARNING: Pipeline may not support tool execution');
      console.log('   Check mainPipeline.js for tool/function calling support');
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(60));
    
    console.log(`\n✅ Assistant Configuration:`);
    console.log(`   - Assistant exists: YES`);
    console.log(`   - Tools configured: ${mineAssistant.tools.length}`);
    console.log(`   - Tools exist in DB: ${tools.length}`);
    
    console.log(`\n${hasToolLoading ? '✅' : '❌'} Call Handler:`);
    console.log(`   - Loads tools: ${hasToolLoading ? 'YES' : 'NO'}`);
    
    console.log(`\n${hasToolSupport ? '✅' : '⚠️ '} Pipeline:`);
    console.log(`   - Supports tools: ${hasToolSupport ? 'YES' : 'MAYBE'}`);
    
    if (!hasToolLoading) {
      console.log('\n❌ WILL NOT WORK:');
      console.log('   Tools are saved but NOT loaded during calls.');
      console.log('   The assistant will work but tools will be ignored.');
    } else if (tools.length > 0) {
      console.log('\n✅ SHOULD WORK:');
      console.log('   Tools are configured and should be available during calls.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  }
}

// Run the test
testCallWithTools();
