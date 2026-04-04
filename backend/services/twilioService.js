const twilio = require('twilio');

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.apiKey = process.env.TWILIO_API_KEY;
    this.apiSecret = process.env.TWILIO_API_SECRET;
    this.twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
    this.twilioNumber = process.env.TWILIO_PHONE_NUMBER;
    this.personalNumber = process.env.PERSONAL_PHONE_NUMBER;
    
    // Initialize Twilio client
    this.client = twilio(this.accountSid, this.authToken);
    
    console.log('✅ Twilio Service initialized');
    console.log(`📞 Twilio Number: ${this.twilioNumber}`);
    console.log(`👤 Personal Number: ${this.personalNumber}`);
  }

  /**
   * Generate access token for browser WebRTC connection
   */
  generateAccessToken(identity) {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create access token
    const token = new AccessToken(
      this.accountSid,
      this.apiKey,
      this.apiSecret,
      { identity: identity, ttl: 3600 } // 1 hour expiry
    );

    // Create voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: this.twimlAppSid,
      incomingAllow: true
    });

    token.addGrant(voiceGrant);

    console.log(`🎫 Generated access token for: ${identity}`);
    
    return {
      identity: identity,
      token: token.toJwt()
    };
  }

  /**
   * Initiate call to human agent and create conference
   * For browser calls, this creates a conference and calls the human agent
   * The browser stays on WebSocket but audio is bridged via media streams
   */
  async initiateHumanTransfer(sessionId, forwardingNumber = null) {
    try {
      const targetNumber = forwardingNumber || this.personalNumber;
      const conferenceName = `human-transfer-${sessionId}`;

      console.log(`📞 Human transfer: ${targetNumber} → ${conferenceName}`);

      // Get user's phone number for multi-tenant support
      const User = require('../models/User');
      const userWithPhone = await User.findOne({ 
        'phoneNumbers.0': { $exists: true } 
      });
      
      const fromNumber = userWithPhone?.phoneNumbers[0]?.phoneNumber || this.twilioNumber;
      
      if (!fromNumber) {
        throw new Error('No phone number available for transfer - please configure a phone number first');
      }

      // Create a conference and call the human agent
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="">${conferenceName}</Conference>
  </Dial>
</Response>`;

      // Call the human agent to join conference
      const call = await this.client.calls.create({
        from: fromNumber,
        to: targetNumber,
        twiml: twiml,
        statusCallback: `${process.env.BASE_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      console.log(`✅ Human agent call initiated: ${call.sid} (${call.status}) from ${fromNumber}`);

      // For browser calls, we need to create a bridge call that the browser can join
      console.log('🌐 Creating browser bridge call for WebSocket connection...');
      
      // Create a second call that will bridge the browser to the conference
      // This call will be answered by our system and bridge WebSocket audio
      const bridgeCall = await this.client.calls.create({
        from: fromNumber,
        to: fromNumber, // Call ourselves
        url: `${process.env.BASE_URL}/api/twilio/browser-bridge?conferenceName=${conferenceName}&sessionId=${sessionId}`,
        method: 'POST',
        statusCallback: `${process.env.BASE_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      console.log(`✅ Browser bridge call created: ${bridgeCall.sid}`);

      return {
        success: true,
        callSid: call.sid,
        bridgeCallSid: bridgeCall.sid,
        conferenceName: conferenceName,
        status: call.status,
        message: `Calling ${targetNumber}...`
      };

    } catch (error) {
      console.error('❌ Human transfer failed:', error);
      throw error;
    }
  }

  /**
   * Transfer phone call to conference (for inbound phone calls)
   * This redirects an active call from WebSocket to a conference
   */
  async transferPhoneToConference(callSid, forwardingNumber = null) {
    try {
      const targetNumber = forwardingNumber || this.personalNumber;
      const conferenceName = `human-transfer-${callSid}`;

      console.log(`\n📞 ========== PHONE TRANSFER ==========`);
      console.log(`   Original Call SID: ${callSid}`);
      console.log(`   Conference Name: ${conferenceName}`);
      console.log(`   Calling Human: ${targetNumber}`);
      console.log(`=====================================\n`);

      // STEP 1: Call the human agent with inline TwiML to join conference
      console.log('📞 [STEP 1] Calling human agent...');
      
      // Get user's phone number for multi-tenant support
      const User = require('../models/User');
      const userWithPhone = await User.findOne({ 
        'phoneNumbers.0': { $exists: true } 
      });
      
      const fromNumber = userWithPhone?.phoneNumbers[0]?.phoneNumber || this.twilioNumber;
      
      if (!fromNumber) {
        throw new Error('No phone number available for transfer - please configure a phone number first');
      }
      
      const humanTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="">${conferenceName}</Conference>
  </Dial>
</Response>`;

      const humanCall = await this.client.calls.create({
        from: fromNumber,
        to: targetNumber,
        twiml: humanTwiml,
        statusCallback: `${process.env.BASE_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      console.log(`✅ Human call initiated: ${humanCall.sid} (${humanCall.status})`);

      // STEP 2: Redirect the original call (currently on WebSocket) to join the same conference
      console.log('🔄 [STEP 2] Redirecting original call to conference...');
      const originalCallTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you now.</Say>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="">${conferenceName}</Conference>
  </Dial>
</Response>`;

      // Update the original call to use new TwiML (this disconnects WebSocket and joins conference)
      await this.client.calls(callSid).update({
        twiml: originalCallTwiml
      });

      console.log(`✅ Original call redirected to conference`);
      console.log(`\n🎉 Both calls will join conference: ${conferenceName}\n`);

      return {
        success: true,
        conferenceName: conferenceName,
        originalCallSid: callSid,
        humanCallSid: humanCall.sid,
        message: `Transfer initiated - both parties joining conference`
      };

    } catch (error) {
      console.error('❌ Phone transfer failed:', error);
      throw error;
    }
  }



  /**
   * Get conference status
   */
  async getConferenceStatus(conferenceName) {
    try {
      const conferences = await this.client.conferences.list({
        friendlyName: conferenceName,
        status: 'in-progress',
        limit: 1
      });

      if (conferences.length > 0) {
        const conference = conferences[0];
        const participants = await this.client
          .conferences(conference.sid)
          .participants
          .list();

        return {
          exists: true,
          sid: conference.sid,
          status: conference.status,
          participantCount: participants.length,
          participants: participants.map(p => ({
            callSid: p.callSid,
            muted: p.muted,
            hold: p.hold
          }))
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('❌ Error getting conference status:', error);
      return { exists: false, error: error.message };
    }
  }

  /**
   * End conference (disconnect all participants)
   */
  async endConference(conferenceName) {
    try {
      const conferences = await this.client.conferences.list({
        friendlyName: conferenceName,
        status: 'in-progress',
        limit: 1
      });

      if (conferences.length > 0) {
        const conference = conferences[0];
        
        // Update conference to completed
        await this.client
          .conferences(conference.sid)
          .update({ status: 'completed' });

        console.log(`✅ Conference ended: ${conferenceName}`);
        return { success: true };
      }

      return { success: false, message: 'Conference not found' };
    } catch (error) {
      console.error('❌ Error ending conference:', error);
      throw error;
    }
  }

  /**
   * Validate Twilio request signature (security)
   */
  validateRequest(authToken, signature, url, params) {
    return twilio.validateRequest(authToken, signature, url, params);
  }
}

// Export singleton instance
module.exports = new TwilioService();
