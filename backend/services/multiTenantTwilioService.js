/**
 * Multi-Tenant Twilio Service
 * Handles Twilio operations for multiple users with their own credentials
 */

const Twilio = require('twilio');
const User = require('../models/UserEnhanced');
const { ObjectId } = require('mongodb');

class MultiTenantTwilioService {
  
  /**
   * Get Twilio client for specific user
   */
  static async getUserTwilioClient(userId) {
    const user = await User.findById(userId);
    
    if (!user || !user.twilioCredentials || !user.twilioCredentials.accountSid) {
      throw new Error('User Twilio credentials not found');
    }
    
    if (user.twilioCredentials.status !== 'active') {
      throw new Error(`User Twilio credentials not active: ${user.twilioCredentials.status}`);
    }
    
    return new Twilio(
      user.twilioCredentials.accountSid,
      user.twilioCredentials.authToken
    );
  }
  
  /**
   * Test user's Twilio credentials
   */
  static async testCredentials(accountSid, authToken) {
    try {
      const client = new Twilio(accountSid, authToken);
      
      // Test credentials by fetching account info
      const account = await client.api.accounts(accountSid).fetch();
      
      return {
        success: true,
        message: 'Credentials valid!',
        accountName: account.friendlyName
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get all phone numbers for a Twilio account
   */
  static async getPhoneNumbers(accountSid, authToken) {
    try {
      const client = new Twilio(accountSid, authToken);
      const numbers = await client.incomingPhoneNumbers.list();
      
      return {
        success: true,
        numbers: numbers.map(num => ({
          phoneNumber: num.phoneNumber,
          friendlyName: num.friendlyName,
          sid: num.sid,
          capabilities: num.capabilities
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Add and configure a phone number for user
   */
  static async addPhoneNumber(userId, phoneNumber, label, assignedAssistantId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.twilioCredentials || user.twilioCredentials.status !== 'active') {
        throw new Error('User Twilio credentials not configured');
      }
      
      // Check if phone number already exists for this user
      const existingNumber = user.phoneNumbers.find(p => p.phoneNumber === phoneNumber);
      if (existingNumber) {
        throw new Error('Phone number already added');
      }
      
      const client = new Twilio(
        user.twilioCredentials.accountSid,
        user.twilioCredentials.authToken
      );
      
      // Get phone number SID
      const numbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });
      
      if (numbers.length === 0) {
        throw new Error('Phone number not found in Twilio account');
      }
      
      const numberSid = numbers[0].sid;
      const phoneId = new ObjectId();
      
      // Step 1: Create TwiML app for this phone number
      const app = await client.applications.create({
        friendlyName: `Voice AI - ${user.email} - ${label}`,
        voiceUrl: `${process.env.BASE_URL}/api/twilio/voice`,
        voiceMethod: 'POST',
        statusCallback: `${process.env.BASE_URL}/api/twilio/status?phoneId=${phoneId}`,
        statusCallbackMethod: 'POST'
      });
      
      // Step 2: Configure phone number webhook
      await client.incomingPhoneNumbers(numberSid).update({
        voiceUrl: `${process.env.BASE_URL}/api/twilio/incoming-call?phoneId=${phoneId}`,
        voiceMethod: 'POST',
        voiceFallbackUrl: `${process.env.BASE_URL}/api/twilio/fallback?phoneId=${phoneId}`,
        voiceFallbackMethod: 'POST'
      });
      
      // Step 3: Add to user's phone numbers
      const phoneNumberData = {
        _id: phoneId,
        phoneNumber,
        label,
        assignedAssistantId, // Keep as string - matches assistant.id format
        twimlAppSid: app.sid,
        status: 'active',
        configuredAt: new Date()
      };
      
      await User.findByIdAndUpdate(userId, {
        $push: { phoneNumbers: phoneNumberData }
      });
      
      return {
        success: true,
        message: 'Phone number added and configured successfully!',
        phoneNumber: phoneNumberData,
        webhookUrl: `${process.env.BASE_URL}/api/twilio/incoming-call?phoneId=${phoneId}`,
        twimlAppSid: app.sid
      };
      
    } catch (error) {
      console.error('❌ Error adding phone number:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Update assistant assignment for phone number
   */
  static async updateAssistantAssignment(userId, phoneId, newAssistantId) {
    try {
      const result = await User.findOneAndUpdate(
        { 
          _id: userId,
          'phoneNumbers._id': phoneId
        },
        {
          $set: {
            'phoneNumbers.$.assignedAssistantId': newAssistantId, // Keep as string
            'phoneNumbers.$.configuredAt': new Date()
          }
        },
        { new: true }
      );
      
      if (!result) {
        throw new Error('Phone number not found');
      }
      
      return {
        success: true,
        message: 'Assistant assignment updated successfully'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Remove phone number
   */
  static async removePhoneNumber(userId, phoneId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const phoneNumber = user.phoneNumbers.find(p => p._id.toString() === phoneId);
      
      if (!phoneNumber) {
        throw new Error('Phone number not found');
      }
      
      // Remove TwiML app from Twilio (optional cleanup)
      if (phoneNumber.twimlAppSid && user.twilioCredentials?.status === 'active') {
        try {
          const client = new Twilio(
            user.twilioCredentials.accountSid,
            user.twilioCredentials.authToken
          );
          
          await client.applications(phoneNumber.twimlAppSid).remove();
        } catch (error) {
          console.warn('Could not remove TwiML app:', error.message);
        }
      }
      
      // Remove from database
      await User.findByIdAndUpdate(userId, {
        $pull: { phoneNumbers: { _id: phoneId } }
      });
      
      return {
        success: true,
        message: 'Phone number removed successfully'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Find user by phone number ID (for incoming calls)
   */
  static async findUserByPhoneId(phoneId) {
    const user = await User.findOne({
      'phoneNumbers._id': phoneId
    });
    
    if (!user) {
      return null;
    }
    
    const phoneNumber = user.phoneNumbers.find(p => p._id.toString() === phoneId);
    
    return {
      user,
      phoneNumber
    };
  }
  
  /**
   * Initiate human transfer using user's Twilio account
   */
  static async initiateHumanTransfer(userId, sessionId, forwardingNumber = null, assistantId = null) {
    try {
      const client = await this.getUserTwilioClient(userId);
      const user = await User.findById(userId);
      
      console.log(`🔍 [BROWSER TRANSFER DEBUG] assistantId: ${assistantId}`);
      console.log(`🔍 [BROWSER TRANSFER DEBUG] user.phoneNumbers:`, user.phoneNumbers.map(p => ({ phone: p.phoneNumber, assistant: p.assignedAssistantId })));
      
      // Find phone number assigned to the assistant
      let fromNumber;
      if (assistantId) {
        const phoneConfig = user.phoneNumbers.find(p => p.assignedAssistantId === assistantId);
        console.log(`🔍 [BROWSER TRANSFER DEBUG] phoneConfig found:`, phoneConfig);
        fromNumber = phoneConfig?.phoneNumber;
      }
      
      // Fallback to first phone number if assistant not found
      if (!fromNumber) {
        console.log(`⚠️ [BROWSER TRANSFER DEBUG] No phone found for assistant, using fallback`);
        fromNumber = user.phoneNumbers[0]?.phoneNumber;
      }
      
      console.log(`📞 [BROWSER TRANSFER DEBUG] Final fromNumber: ${fromNumber}`);
      
      if (!fromNumber) {
        throw new Error('No phone number configured for user');
      }
      
      const conferenceName = `human-transfer-${sessionId}`;
      
      console.log(`📞 Multi-tenant human transfer: ${forwardingNumber} → ${conferenceName}`);
      console.log(`📞 Using WORKING SYSTEM approach - Direct Twilio Device connection`);
      
      // WORKING SYSTEM APPROACH: Call human agent with inline TwiML to join conference immediately
      const humanTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="">${conferenceName}</Conference>
  </Dial>
</Response>`;
      
      const humanCall = await client.calls.create({
        from: fromNumber,
        to: forwardingNumber,
        twiml: humanTwiml,
        statusCallback: `${process.env.BASE_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });
      
      console.log(`✅ Human agent call initiated: ${humanCall.sid} (${humanCall.status})`);
      console.log(`✅ Using working system approach - Browser will join via Twilio Device WebRTC`);
      
      return {
        success: true,
        callSid: humanCall.sid,
        conferenceName: conferenceName,
        status: humanCall.status,
        message: `Calling ${forwardingNumber}...`
      };
      
    } catch (error) {
      console.error('❌ Multi-tenant human transfer failed:', error);
      throw error;
    }
  }
  
  /**
   * Transfer phone call to conference using user's Twilio account
   */
  static async transferPhoneToConference(userId, callSid, forwardingNumber, assistantId = null) {
    try {
      const client = await this.getUserTwilioClient(userId);
      const user = await User.findById(userId);
      
      // Find phone number assigned to the assistant
      let fromNumber;
      if (assistantId) {
        const phoneConfig = user.phoneNumbers.find(p => p.assignedAssistantId === assistantId);
        fromNumber = phoneConfig?.phoneNumber;
      }
      
      // Fallback to first phone number if assistant not found
      if (!fromNumber) {
        fromNumber = user.phoneNumbers[0]?.phoneNumber;
      }
      
      const conferenceName = `human-transfer-${callSid}`;
      
      console.log(`\n📞 ========== MULTI-TENANT PHONE TRANSFER ==========`);
      console.log(`   User: ${user.email}`);
      console.log(`   Original Call SID: ${callSid}`);
      console.log(`   Conference Name: ${conferenceName}`);
      console.log(`   Calling Human: ${forwardingNumber}`);
      console.log(`   From Number: ${fromNumber}`);
      console.log(`================================================\n`);
      
      // Step 1: Call human using user's Twilio account
      const humanTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="">${conferenceName}</Conference>
  </Dial>
</Response>`;
      
      const humanCall = await client.calls.create({
        from: fromNumber,
        to: forwardingNumber,
        twiml: humanTwiml,
        statusCallback: `${process.env.BASE_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });
      
      // Step 2: Redirect original call to conference
      const originalCallTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you now.</Say>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="">${conferenceName}</Conference>
  </Dial>
</Response>`;
      
      await client.calls(callSid).update({
        twiml: originalCallTwiml
      });
      
      return {
        success: true,
        conferenceName: conferenceName,
        originalCallSid: callSid,
        humanCallSid: humanCall.sid,
        message: `Transfer initiated - both parties joining conference`
      };
      
    } catch (error) {
      console.error('❌ Multi-tenant phone transfer failed:', error);
      throw error;
    }
  }

  /**
   * Generate access token for browser WebRTC using user's Twilio credentials
   */
  static async generateAccessToken(userId, identity) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.twilioCredentials || !user.twilioCredentials.accountSid) {
        throw new Error('User Twilio credentials not found');
      }
      
      if (user.twilioCredentials.status !== 'active') {
        throw new Error(`User Twilio credentials not active: ${user.twilioCredentials.status}`);
      }
      
      // Check if API Key and Secret are configured
      if (!user.twilioCredentials.apiKey || !user.twilioCredentials.apiSecret) {
        throw new Error('Twilio API Key and Secret required for browser calls. Please configure in Phone Numbers section.');
      }
      
      // Check if TwiML App SID is configured
      if (!user.twilioCredentials.twimlAppSid) {
        throw new Error('TwiML App SID required for browser calls. Please configure in Phone Numbers section.');
      }
      
      const AccessToken = require('twilio').jwt.AccessToken;
      const VoiceGrant = AccessToken.VoiceGrant;

      // Create access token using user's credentials
      const token = new AccessToken(
        user.twilioCredentials.accountSid,
        user.twilioCredentials.apiKey,
        user.twilioCredentials.apiSecret,
        { identity: identity, ttl: 3600 } // 1 hour expiry
      );

      // Create voice grant
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: user.twilioCredentials.twimlAppSid,
        incomingAllow: true
      });

      token.addGrant(voiceGrant);

      console.log(`🎫 Generated access token for user ${user.email}, identity: ${identity}`);
      
      return {
        identity: identity,
        token: token.toJwt()
      };
      
    } catch (error) {
      console.error('❌ Error generating access token:', error);
      throw error;
    }
  }
}

module.exports = MultiTenantTwilioService;