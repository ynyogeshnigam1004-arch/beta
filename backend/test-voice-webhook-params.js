/**
 * Test Voice Webhook Parameter Detection
 * This will help us see EXACTLY what Twilio sends
 */

const express = require('express');
const app = express();

// Parse both URL-encoded and JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Log ALL incoming requests with FULL details
app.use((req, res, next) => {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📥 INCOMING REQUEST');
  console.log('═══════════════════════════════════════════════════════');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Path:', req.path);
  console.log('Original URL:', req.originalUrl);
  console.log('\n--- QUERY PARAMS ---');
  console.log(JSON.stringify(req.query, null, 2));
  console.log('\n--- BODY PARAMS ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('\n--- HEADERS ---');
  console.log(JSON.stringify(req.headers, null, 2));
  console.log('═══════════════════════════════════════════════════════\n');
  next();
});

// Voice webhook endpoint
app.all('/api/twilio/voice', (req, res) => {
  console.log('🎯 Voice webhook hit!');
  
  // Try to find conference name in ALL possible locations
  let conferenceName = null;
  let foundIn = null;
  
  // Check query params
  if (req.query.conferenceName) {
    conferenceName = req.query.conferenceName;
    foundIn = 'query.conferenceName';
  }
  
  // Check body params
  if (!conferenceName && req.body.conferenceName) {
    conferenceName = req.body.conferenceName;
    foundIn = 'body.conferenceName';
  }
  
  // Check URL path
  if (!conferenceName && req.url.includes('conferenceName=')) {
    const match = req.url.match(/conferenceName=([^&]+)/);
    if (match) {
      conferenceName = match[1];
      foundIn = 'URL string';
    }
  }
  
  // Search through ALL body params
  if (!conferenceName) {
    for (const [key, value] of Object.entries(req.body)) {
      console.log(`Checking body.${key}:`, value);
      if (key.toLowerCase().includes('conference') || 
          (typeof value === 'string' && value.includes('human-transfer'))) {
        conferenceName = value;
        foundIn = `body.${key}`;
        break;
      }
    }
  }
  
  console.log('\n🔍 CONFERENCE NAME SEARCH RESULT:');
  console.log('Found:', conferenceName);
  console.log('Location:', foundIn);
  console.log('');
  
  if (conferenceName) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Conference name is ${conferenceName}</Say>
  <Dial>
    <Conference 
      beep="false" 
      startConferenceOnEnter="true" 
      endConferenceOnExit="true" 
      waitUrl=""
    >${conferenceName}</Conference>
  </Dial>
</Response>`;
    
    res.type('text/xml');
    res.send(twiml);
  } else {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>No conference name found</Say>
  <Hangup/>
</Response>`;
    
    res.type('text/xml');
    res.send(twiml);
  }
});

// Start server
const PORT = 5001;
app.listen(PORT, () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 VOICE WEBHOOK DIAGNOSTIC SERVER');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Listening on: http://localhost:${PORT}`);
  console.log('Endpoint: /api/twilio/voice');
  console.log('');
  console.log('This will show EXACTLY what Twilio sends');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});
