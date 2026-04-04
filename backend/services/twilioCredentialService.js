/**
 * Twilio Credential Management Service
 * Handles multi-tenant Twilio account management
 */

const Twilio = require('twilio');
const User = require('../models/User');

class TwilioCredentialService {
  
  /**
   * Test user's Twilio credentials
   */
  static async testCredentials(accountSid, authToken, phoneNumber) {
    try {
      const client = new Twilio(accountSid, authToken);
      
      // Test 1: Validate credentials by fetching account info
      const account = await client.api.accounts(accountSid).fetch();
      
      // Test 2: Check if phone number exists and belongs to this account
      const numbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });
      
      if (numbers.length === 0) {
        throw new Error(`Phone number ${phoneNumber} not found in this Twilio account`);
      }
      
      return {
        success: true,
        message: 'Credentials valid!',
        accountName: account.friendlyName,
        numberSid: numbers[0].sid,
        numberFriendlyName: numbers[0].friendlyName
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
   * Auto-configure user's Twilio account
   */
  static async autoConfigureAccount(userId, accountSid, authToken, phoneNumber) {
    try {
      const client = new Twilio(accountSid, authToken);
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Step 1: Get phone number SID
      const numbers = await client.incomingPhoneNumbers.list({
        phoneNumber: phoneNumber
      });
      
      if (numbers.length === 0) {
        throw new Error('Phone number not found in account');
      }
      
      const numberSid = numbers[0].sid;
      
      // Step 2: Create API Key for Twilio Device (CRITICAL for human transfer)
      console.log('🔑 Creating API Key for Twilio Device...');
      const apiKey = await client.newKeys.create({
        friendlyName: `Voice AI API Key - ${user.email}`
      });
      
      console.log(`✅ API Key created: ${apiKey.sid}`);
      
      // Step 3: Create TwiML app for transfers
      const app = await client.applications.create({
        friendlyName: `Voice AI - ${user.email}`,
        voiceUrl: `${process.env.BASE_URL}/api/twilio/voice`,
        voiceMethod: 'POST',
        statusCallback: `${process.env.BASE_URL}/api/twilio/status?userId=${userId}`,
        statusCallbackMethod: 'POST'
      });
      
      console.log(`✅ TwiML App created: ${app.sid}`);
      
      // Step 4: Configure phone number webhook
      await client.incomingPhoneNumbers(numberSid).update({
        voiceUrl: `${process.env.BASE_URL}/api/twilio/incoming-call?userId=${userId}`,
        voiceMethod: 'POST',
        voiceFallbackUrl: `${process.env.BASE_URL}/api/twilio/fallback?userId=${userId}`,
        voiceFallbackMethod: 'POST'
      });
      
      console.log(`✅ Phone number webhook configured`);
      
      // Step 5: Save credentials to database (including API key for Twilio Device)
      await User.findByIdAndUpdate(userId, {
        twilioCredentials: {
          accountSid,
          authToken,
          phoneNumber,
          apiKey: apiKey.sid,
          apiSecret: apiKey.secret,
          twimlAppSid: app.sid,
          status: 'active',
          configuredAt: new Date(),
          lastTestedAt: new Date(),
          errorMessage: null
        }
      });
      
      return {
        success: true,
        message: 'Twilio account configured successfully!',
        details: {
          phoneConfigured: true,
          twimlAppCreated: true,
          apiKeyCreated: true,
          twimlAppSid: app.sid,
          apiKeySid: apiKey.sid,
          webhookUrl: `${process.env.BASE_URL}/api/twilio/incoming-call?userId=${userId}`
        }
      };
      
    } catch (error) {
      // Save error to database
      await User.findByIdAndUpdate(userId, {
        'twilioCredentials.status': 'error',
        'twilioCredentials.errorMessage': error.message,
        'twilioCredentials.lastTestedAt': new Date()
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get Twilio client for a specific user
   */
  static async getTwilioClient(userId) {
    const user = await User.findById(userId);
    
    if (!user || !user.twilioCredentials || !user.twilioCredentials.accountSid) {
      throw new Error('User Twilio credentials not found');
    }
    
    if (user.twilioCredentials.status !== 'active') {
      throw new Error('User Twilio credentials not active');
    }
    
    return new Twilio(
      user.twilioCredentials.accountSid,
      user.twilioCredentials.authToken
    );
  }
  
  /**
   * Find user by phone number (for incoming calls)
   */
  static async findUserByPhoneNumber(phoneNumber) {
    const user = await User.findOne({
      'twilioCredentials.phoneNumber': phoneNumber,
      'twilioCredentials.status': 'active'
    });
    
    return user;
  }
  
  /**
   * Remove Twilio configuration
   */
  static async removeConfiguration(userId) {
    try {
      const user = await User.findById(userId);
      
      if (user && user.twilioCredentials && user.twilioCredentials.accountSid) {
        const client = new Twilio(
          user.twilioCredentials.accountSid,
          user.twilioCredentials.authToken
        );
        
        // Remove API Key if it exists
        if (user.twilioCredentials.apiKey) {
          try {
            await client.keys(user.twilioCredentials.apiKey).remove();
            console.log('✅ API Key removed');
          } catch (error) {
            console.warn('Could not remove API Key:', error.message);
          }
        }
        
        // Remove TwiML app if it exists
        if (user.twilioCredentials.twimlAppSid) {
          try {
            await client.applications(user.twilioCredentials.twimlAppSid).remove();
            console.log('✅ TwiML App removed');
          } catch (error) {
            console.warn('Could not remove TwiML app:', error.message);
          }
        }
        
        // Reset phone number webhook (optional - user might want to keep it)
        // We'll leave this to the user to manage manually
      }
      
      // Clear credentials from database
      await User.findByIdAndUpdate(userId, {
        twilioCredentials: {
          accountSid: null,
          authToken: null,
          phoneNumber: null,
          apiKey: null,
          apiSecret: null,
          twimlAppSid: null,
          status: 'pending',
          configuredAt: null,
          lastTestedAt: null,
          errorMessage: null
        }
      });
      
      return {
        success: true,
        message: 'Twilio configuration removed'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = TwilioCredentialService;