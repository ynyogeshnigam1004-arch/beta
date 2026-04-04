/**
 * Phone Numbers Management Routes
 * Handles multi-tenant phone number setup and management
 */

const express = require('express');
const router = express.Router();
const MultiTenantTwilioService = require('../services/multiTenantTwilioService');
const { authenticate } = require('../middleware/auth');

/**
 * Test Twilio credentials
 * POST /api/phone-numbers/test-credentials
 */
router.post('/test-credentials', authenticate, async (req, res) => {
  try {
    const { accountSid, authToken } = req.body;
    
    if (!accountSid || !authToken) {
      return res.status(400).json({
        success: false,
        error: 'Account SID and Auth Token are required'
      });
    }
    
    const result = await MultiTenantTwilioService.testCredentials(accountSid, authToken);
    res.json(result);
  } catch (error) {
    console.error('❌ Error testing credentials:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get phone numbers from Twilio account
 * POST /api/phone-numbers/fetch-numbers
 */
router.post('/fetch-numbers', authenticate, async (req, res) => {
  try {
    const { accountSid, authToken } = req.body;
    
    if (!accountSid || !authToken) {
      return res.status(400).json({
        success: false,
        error: 'Account SID and Auth Token are required'
      });
    }
    
    const result = await MultiTenantTwilioService.getPhoneNumbers(accountSid, authToken);
    
    if (result.success) {
      res.json({
        success: true,
        phoneNumbers: result.numbers // Map to phoneNumbers for frontend consistency
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    console.error('❌ Error fetching phone numbers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Save Twilio credentials (with full auto-configuration)
 * POST /api/phone-numbers/save-credentials
 */
router.post('/save-credentials', authenticate, async (req, res) => {
  try {
    const { accountSid, authToken } = req.body;
    const userId = req.user.id;
    
    if (!accountSid || !authToken) {
      return res.status(400).json({
        success: false,
        error: 'Account SID and Auth Token are required'
      });
    }
    
    // Test credentials first
    const testResult = await MultiTenantTwilioService.testCredentials(accountSid, authToken);
    
    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        error: `Invalid credentials: ${testResult.error}`
      });
    }
    
    // Create Twilio client for API Key creation
    const Twilio = require('twilio');
    const client = new Twilio(accountSid, authToken);
    const User = require('../models/UserEnhanced');
    
    // Find user using single User model
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log('🔑 Creating API Key for browser calls...');
    
    // Create API Key for Twilio Device (browser calls)
    const apiKey = await client.newKeys.create({
      friendlyName: `Voice AI Browser Calls - ${user.email}`
    });
    
    console.log(`✅ API Key created: ${apiKey.sid}`);
    
    // Create TwiML app for browser calls
    const app = await client.applications.create({
      friendlyName: `Voice AI Browser - ${user.email}`,
      voiceUrl: `${process.env.BASE_URL}/api/twilio/voice`,
      voiceMethod: 'POST',
      statusCallback: `${process.env.BASE_URL}/api/twilio/call-status`,
      statusCallbackMethod: 'POST'
    });
    
    console.log(`✅ TwiML App created: ${app.sid}`);
    
    // Save complete credentials to user (including API Key & Secret for browser calls)
    await User.findByIdAndUpdate(userId, {
      twilioCredentials: {
        accountSid,
        authToken,
        apiKey: apiKey.sid,
        apiSecret: apiKey.secret,
        twimlAppSid: app.sid,
        status: 'active',
        configuredAt: new Date(),
        lastTestedAt: new Date(),
        errorMessage: null
      }
    });
    
    res.json({
      success: true,
      message: 'Twilio credentials saved and configured successfully! Browser calls are now enabled.',
      accountName: testResult.accountName,
      details: {
        apiKeyCreated: true,
        twimlAppCreated: true,
        browserCallsEnabled: true,
        apiKeySid: apiKey.sid,
        twimlAppSid: app.sid
      }
    });
  } catch (error) {
    console.error('❌ Error saving credentials:', error);
    
    // Save error to database
    const User = require('../models/UserEnhanced');
    
    const user = await User.findById(req.user.id);
    
    if (user) {
      await User.findByIdAndUpdate(req.user.id, {
        'twilioCredentials.status': 'error',
        'twilioCredentials.errorMessage': error.message,
        'twilioCredentials.lastTestedAt': new Date()
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update Twilio credentials (creates API keys for human transfer)
 * POST /api/phone-numbers/update-credentials
 */
router.post('/update-credentials', authenticate, async (req, res) => {
  try {
    const { accountSid, authToken } = req.body;
    const userId = req.user.id;
    
    if (!accountSid || !authToken) {
      return res.status(400).json({
        success: false,
        error: 'Account SID and Auth Token are required'
      });
    }
    
    // Use the twilioCredentialService to auto-configure with API keys
    const TwilioCredentialService = require('../services/twilioCredentialService');
    
    // Get user's first phone number for auto-configuration
    const User = require('../models/UserEnhanced');
    
    const user = await User.findById(userId);
    
    if (!user || !user.phoneNumbers || user.phoneNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No phone numbers found. Please add a phone number first.'
      });
    }
    
    const phoneNumber = user.phoneNumbers[0].phoneNumber;
    
    // Auto-configure account with API key creation
    const result = await TwilioCredentialService.autoConfigureAccount(
      userId,
      accountSid,
      authToken,
      phoneNumber
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Credentials updated successfully! API keys created for human transfer.',
        details: result.details
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error updating credentials:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Add phone number
 * POST /api/phone-numbers/add
 */
router.post('/add', authenticate, async (req, res) => {
  try {
    const { phoneNumber, label, assignedAssistantId } = req.body;
    const userId = req.user.id;
    
    if (!phoneNumber || !label || !assignedAssistantId) {
      return res.status(400).json({
        success: false,
        error: 'Phone number, label, and assigned assistant are required'
      });
    }
    
    const result = await MultiTenantTwilioService.addPhoneNumber(
      userId,
      phoneNumber,
      label,
      assignedAssistantId
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error adding phone number:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update assistant assignment
 * PUT /api/phone-numbers/:phoneId/assistant
 */
router.put('/:phoneId/assistant', authenticate, async (req, res) => {
  try {
    const { phoneId } = req.params;
    const { assignedAssistantId } = req.body;
    const userId = req.user.id;
    
    if (!assignedAssistantId) {
      return res.status(400).json({
        success: false,
        error: 'Assigned assistant ID is required'
      });
    }
    
    const result = await MultiTenantTwilioService.updateAssistantAssignment(
      userId,
      phoneId,
      assignedAssistantId
    );
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error updating assistant assignment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Remove phone number
 * DELETE /api/phone-numbers/:phoneId
 */
router.delete('/:phoneId', authenticate, async (req, res) => {
  try {
    const { phoneId } = req.params;
    const userId = req.user.id;
    
    const result = await MultiTenantTwilioService.removePhoneNumber(userId, phoneId);
    res.json(result);
  } catch (error) {
    console.error('❌ Error removing phone number:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Clear all phone numbers (for re-configuration)
 * DELETE /api/phone-numbers/clear-all
 */
router.delete('/clear-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const User = require('../models/UserEnhanced');
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Clear all phone numbers from user
    await User.findByIdAndUpdate(userId, {
      $set: { phoneNumbers: [] }
    });
    
    console.log(`✅ Cleared all phone numbers for user: ${user.email}`);
    
    res.json({
      success: true,
      message: 'All phone numbers cleared successfully. You can now re-add them with proper configuration.'
    });
  } catch (error) {
    console.error('❌ Error clearing phone numbers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's phone numbers
 * GET /api/phone-numbers
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const User = require('../models/UserEnhanced');
    const Assistant = require('../models/Assistant');
    
    // Find user using single User model - user is already available from middleware
    const user = req.user; // Use the user object from middleware directly
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    console.log('📞 Found user for phone numbers:', user.email, 'Model: User');
    
    // Manually fetch assistant data for each phone number
    const phoneNumbersWithAssistants = await Promise.all(
      (user.phoneNumbers || []).map(async (phone) => {
        let assignedAssistant = null;
        if (phone.assignedAssistantId) {
          try {
            // Use the string ID directly - no ObjectId conversion needed
            assignedAssistant = await Assistant.getAssistantById(phone.assignedAssistantId);
          } catch (error) {
            console.error('Error fetching assistant:', error);
          }
        }
        
        return {
          id: phone._id || phone.id,
          phoneNumber: phone.phoneNumber,
          label: phone.label,
          assignedAssistantId: phone.assignedAssistantId,
          assignedAssistant: assignedAssistant ? {
            id: assignedAssistant.id,
            name: assignedAssistant.name
          } : null,
          status: phone.status,
          configuredAt: phone.configuredAt,
          webhookUrl: `${process.env.BASE_URL || 'https://yourapp.com'}/api/twilio/incoming-call?phoneId=${phone._id || phone.id}`
        };
      })
    );
    
    res.json({
      success: true,
      twilioCredentials: {
        configured: user.twilioCredentials?.status === 'active',
        status: user.twilioCredentials?.status || 'pending',
        configuredAt: user.twilioCredentials?.configuredAt,
        errorMessage: user.twilioCredentials?.errorMessage
      },
      phoneNumbers: phoneNumbersWithAssistants
    });
  } catch (error) {
    console.error('❌ Error fetching phone numbers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;