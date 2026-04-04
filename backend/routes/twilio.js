const express = require('express');
const router = express.Router();
const twilioService = require('../services/twilioService');

/**
 * Incoming call webhook - handles calls from phone to Twilio number
 * POST /api/twilio/incoming-call?phoneId=123
 * This is called when someone dials a user's Twilio phone number
 */
router.post('/incoming-call', async (req, res) => {
  try {
    // DEBUG: Log EVERYTHING Twilio sends
    console.log('\n📞 ========== INCOMING CALL DEBUG ==========');
    console.log('🔍 req.body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 req.query:', JSON.stringify(req.query, null, 2));
    console.log('🔍 req.params:', JSON.stringify(req.params, null, 2));
    console.log('🔍 req.headers:', JSON.stringify(req.headers, null, 2));
    console.log('==========================================\n');
    
    const { From, To, CallSid } = req.body;
    const { phoneId, userId } = req.query; // Get phoneId or userId from webhook URL
    
    console.log('\n📞 ========== INCOMING CALL ==========');
    console.log(`  From: ${From}`);
    console.log(`  To: ${To}`);
    console.log(`  CallSid: ${CallSid}`);
    console.log(`  PhoneId: ${phoneId || 'NOT PROVIDED'}`);
    console.log(`  UserId: ${userId || 'NOT PROVIDED'}`);
    console.log('=====================================\n');
    
    // NEW: Multi-tenant logic - Find the user who owns this Twilio number
    const User = require('../models/UserEnhanced');
    const user = await User.findOne({
      'phoneNumbers': {
        $elemMatch: { phoneNumber: To }
      }
    });
    
    if (!user) {
      console.error(`❌ No user found for Twilio number: ${To}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, this number is not configured. Please contact support.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    console.log(`✅ Found user: ${user.email} for number: ${To}`);
    
    // Get the phone number configuration to find assigned assistant
    const phoneConfig = user.phoneNumbers.find(p => p.phoneNumber === To);
    const assignedAssistantId = phoneConfig?.assignedAssistantId;
    
    if (!assignedAssistantId) {
      console.error(`❌ No assistant assigned to phone number: ${To}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, no assistant is assigned to this number.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    // Get the assigned assistant from MongoDB (try both string and ObjectId userId)
    const { getCollection } = require('../config/database');
    const assistantsCollection = getCollection('assistants');
    let assistant = await assistantsCollection.findOne({ 
      id: assignedAssistantId,
      userId: user._id.toString()
    });
    
    // If not found with string userId, try ObjectId userId
    if (!assistant) {
      assistant = await assistantsCollection.findOne({ 
        id: assignedAssistantId,
        userId: user._id
      });
    }
    
    if (!assistant) {
      console.error(`❌ Assistant not found: ${assignedAssistantId} for user: ${user.email}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, the assigned assistant is not available.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    console.log(`✅ Using assistant: ${assistant.name} for inbound call`);
    
    // Get the host (use BASE_URL from env if available, otherwise use request host)
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');

    // Start Media Stream for AI conversation with user and assistant info
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}/media-stream">
      <Parameter name="callSid" value="${CallSid}" />
      <Parameter name="from" value="${From}" />
      <Parameter name="to" value="${To}" />
      <Parameter name="userId" value="${user._id}" />
      <Parameter name="assistantId" value="${assistant.id}" />
    </Stream>
  </Connect>
</Response>`;

    console.log(`✅ Sending TwiML - WebSocket URL: ${wsUrl}/media-stream`);
    console.log(`✅ Parameters: userId=${user._id}, assistantId=${assistant.id}`);
    res.type('text/xml');
    res.send(twiml);
    
  } catch (error) {
    console.error('❌ Error in incoming-call webhook:', error);
    // Send error TwiML
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Sorry, we are experiencing technical difficulties. Please try again later.</Say>
  <Hangup/>
</Response>`;
    res.type('text/xml');
    res.status(500).send(errorTwiml);
  }
});

/**
 * Generate access token for browser WebRTC
 * GET /api/twilio/token?identity=user-123&userId=xxx
 */
router.get('/token', async (req, res) => {
  try {
    const identity = req.query.identity || `web-user-${Date.now()}`;
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required for token generation'
      });
    }
    
    // Use MultiTenantTwilioService to generate token with user's credentials
    const MultiTenantTwilioService = require('../services/multiTenantTwilioService');
    const tokenData = await MultiTenantTwilioService.generateAccessToken(userId, identity);
    
    res.json({
      success: true,
      ...tokenData
    });
  } catch (error) {
    console.error('❌ Error generating token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Voice webhook - handles both inbound calls and conference calls
 * - Regular calls: Start AI assistant conversation
 * - Conference calls: Join conference (human transfer)
 */
router.all('/voice', async (req, res) => {
  try {
    // Get conference name from query or body params
    const conferenceName = req.query.conferenceName || 
                          req.body.conferenceName || 
                          req.body.ConferenceName ||
                          req.query.ConferenceName;
    
    const callSid = req.body.CallSid;
    const from = req.body.From;
    const to = req.body.To;
    
    console.log(`📞 Voice webhook - From: ${from}, To: ${to}, Conference: ${conferenceName || 'NONE'}`);
    
    // CASE 1: Conference call (human transfer)
    if (conferenceName) {
      console.log(`📞 Conference call: ${conferenceName}`);
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="">${conferenceName}</Conference>
  </Dial>
</Response>`;
      
      console.log(`✅ Joining conference: ${conferenceName}`);
      res.type('text/xml');
      return res.send(twiml);
    }
    
    // CASE 2: Regular inbound call - Start AI assistant
    console.log(`📞 Inbound call from ${from} to ${to} - Starting AI assistant`);
    
    // Find the user who owns this Twilio number
    const User = require('../models/UserEnhanced');
    const user = await User.findOne({
      'phoneNumbers': {
        $elemMatch: { phoneNumber: to }
      }
    });
    
    if (!user) {
      console.error(`❌ No user found for Twilio number: ${to}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, this number is not configured. Please contact support.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    console.log(`✅ Found user: ${user.email} for number: ${to}`);
    
    // Get the phone number configuration to find assigned assistant
    const phoneConfig = user.phoneNumbers.find(p => p.phoneNumber === to);
    const assignedAssistantId = phoneConfig?.assignedAssistantId;
    
    if (!assignedAssistantId) {
      console.error(`❌ No assistant assigned to phone number: ${to}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, no assistant is assigned to this number.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    // Get the assigned assistant from MongoDB (try both string and ObjectId userId)
    const { getCollection } = require('../config/database');
    const assistantsCollection = getCollection('assistants');
    let assistant = await assistantsCollection.findOne({ 
      id: assignedAssistantId,
      userId: user._id.toString()
    });
    
    // If not found with string userId, try ObjectId userId
    if (!assistant) {
      assistant = await assistantsCollection.findOne({ 
        id: assignedAssistantId,
        userId: user._id
      });
    }
    
    if (!assistant) {
      console.error(`❌ Assistant not found: ${assignedAssistantId} for user: ${user.email}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, the assigned assistant is not available.</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }
    
    console.log(`✅ Using assistant: ${assistant.name} for inbound call`);
    
    // Start Media Stream for AI conversation
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${req.get('host')}/api/twilio/media-stream">
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="from" value="${from}" />
      <Parameter name="to" value="${to}" />
      <Parameter name="userId" value="${user._id}" />
      <Parameter name="assistantId" value="${assistant.id}" />
    </Stream>
  </Connect>
</Response>`;
    
    console.log(`✅ Starting media stream for AI conversation`);
    res.type('text/xml');
    res.send(twiml);
    
  } catch (error) {
    console.error('❌ Voice webhook error:', error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Sorry, there was an error processing your call.</Say>
  <Hangup/>
</Response>`;
    res.type('text/xml');
    res.send(errorTwiml);
  }
});

/**
 * Dial human webhook - called after conference is established
 * GET /api/twilio/dial-human?number=xxx&conference=yyy
 */
router.all('/dial-human', async (req, res) => {
  try {
    const { number, conference } = req.query;
    
    console.log(`📞 Dialing human agent: ${number} for conference: ${conference}`);
    
    if (!number || !conference) {
      console.error('❌ Missing number or conference parameter');
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Error: Missing parameters</Say>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(errorTwiml);
    }

    // Generate TwiML to call the human agent and add them to the conference
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false" waitUrl="">${decodeURIComponent(conference)}</Conference>
  </Dial>
</Response>`;
    
    console.log(`✅ Human agent will join conference: ${decodeURIComponent(conference)}`);
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('❌ Dial human webhook error:', error);
    res.status(500).send('Error processing dial human webhook');
  }
});

/**
 * Call status webhook
 * POST /api/twilio/call-status
 */
router.post('/call-status', (req, res) => {
  const { CallSid, CallStatus, To, From } = req.body;
  console.log('📞 Call Status Update:');
  console.log(`  SID: ${CallSid}`);
  console.log(`  Status: ${CallStatus}`);
  console.log(`  From: ${From} → To: ${To}`);
  res.sendStatus(200);
});

/**
 * Conference status webhook
 * POST /api/twilio/conference-status
 */
router.post('/conference-status', (req, res) => {
  const { ConferenceSid, FriendlyName, StatusCallbackEvent, ParticipantLabel } = req.body;
  console.log('🎪 Conference Event:');
  console.log(`  Conference: ${FriendlyName}`);
  console.log(`  Event: ${StatusCallbackEvent}`);
  console.log(`  Participant: ${ParticipantLabel || 'N/A'}`);
  res.sendStatus(200);
});

/**
 * Initiate human transfer
 * POST /api/twilio/transfer
 */
router.post('/transfer', async (req, res) => {
  try {
    const { sessionId, forwardingNumber } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID required'
      });
    }
    
    const result = await twilioService.initiateHumanTransfer(
      sessionId,
      forwardingNumber
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error initiating transfer:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Transfer phone call to conference (for inbound phone calls)
 * POST /api/twilio/transfer-phone
 */
router.post('/transfer-phone', async (req, res) => {
  try {
    const { callSid, forwardingNumber, userId, assistantId } = req.body;
    
    if (!callSid) {
      return res.status(400).json({
        success: false,
        error: 'Call SID required'
      });
    }
    
    // Use multi-tenant service if userId provided, otherwise use legacy service
    if (userId) {
      // Multi-tenant: Use user's Twilio account
      const MultiTenantTwilioService = require('../services/multiTenantTwilioService');
      result = await MultiTenantTwilioService.transferPhoneToConference(
        userId,
        callSid,
        forwardingNumber,
        assistantId
      );
    } else {
      // Legacy: Use global Twilio service
      result = await twilioService.transferPhoneToConference(
        callSid,
        forwardingNumber
      );
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error transferring phone call:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get conference status
 * GET /api/twilio/conference/:name
 */
router.get('/conference/:name', async (req, res) => {
  try {
    const conferenceName = req.params.name;
    const status = await twilioService.getConferenceStatus(conferenceName);
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('❌ Error getting conference status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * End conference
 * POST /api/twilio/conference/:name/end
 */
router.post('/conference/:name/end', async (req, res) => {
  try {
    const conferenceName = req.params.name;
    const result = await twilioService.endConference(conferenceName);
    res.json(result);
  } catch (error) {
    console.error('❌ Error ending conference:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;