/**
 * Test tool save endpoint directly
 */

const fetch = require('node-fetch');

async function testToolSave() {
  try {
    console.log('🧪 Testing tool save endpoint...\n');
    
    // First, login to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'ynyogeshsinigam1008@gmail.com',
        password: 'your-password-here' // Replace with actual password
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.error);
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Logged in successfully\n');
    
    // Now create a tool
    console.log('2️⃣ Creating tool...');
    const toolData = {
      name: 'test_tool',
      description: 'Test tool from script',
      url: 'https://api.example.com/test',
      method: 'GET',
      parameters: []
    };
    
    console.log('📦 Sending:', JSON.stringify(toolData, null, 2));
    
    const createResponse = await fetch('http://localhost:3000/api/tools', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(toolData)
    });
    
    const createData = await createResponse.json();
    
    console.log('\n📥 Response:', JSON.stringify(createData, null, 2));
    
    if (createData.success) {
      console.log('\n✅ Tool created successfully!');
      console.log('Tool ID:', createData.tool.id);
    } else {
      console.log('\n❌ Tool creation failed:', createData.error);
    }
    
    // Fetch all tools
    console.log('\n3️⃣ Fetching all tools...');
    const fetchResponse = await fetch('http://localhost:3000/api/tools', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const fetchData = await fetchResponse.json();
    console.log(`📋 Found ${fetchData.tools?.length || 0} tool(s)`);
    
    if (fetchData.tools?.length > 0) {
      fetchData.tools.forEach(tool => {
        console.log(`  - ${tool.name} (${tool.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testToolSave();
