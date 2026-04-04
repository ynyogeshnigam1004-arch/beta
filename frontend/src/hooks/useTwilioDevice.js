import { useState, useEffect, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';
import axios from 'axios';
import config from '../config';

/**
 * Twilio Device Hook for WebRTC Conference Calling
 * Handles device initialization, token management, and conference joining
 */
export function useTwilioDevice() {
  const [device, setDevice] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [error, setError] = useState(null);
  const deviceRef = useRef(null);

  useEffect(() => {
    async function setupDevice() {
      try {
        console.log('📞 [TWILIO] Setting up Twilio Device...');
        
        // Get userId from token for multi-tenant support
        const token = localStorage.getItem('token');
        let userId = null;
        
        if (token) {
          try {
            // Decode JWT to get userId (simple decode, not verification)
            const payload = JSON.parse(atob(token.split('.')[1]));
            userId = payload.userId;
            console.log('📞 [TWILIO] Using userId from token:', userId);
          } catch (err) {
            console.warn('⚠️ [TWILIO] Could not decode token, using anonymous mode');
          }
        }
        
        if (!userId) {
          console.warn('⚠️ [TWILIO] No userId found - Twilio Device will not work without user credentials');
          setError('User authentication required for Twilio Device');
          return;
        }
        
        // Get token from backend with userId for multi-tenant support
        const response = await axios.get('/api/twilio/token', {
          params: { 
            identity: `web-user-${Date.now()}`,
            userId: userId
          }
        });

        console.log('✅ [TWILIO] Token received');

        // Create Twilio Device
        const twilioDevice = new Device(response.data.token, {
          logLevel: 1,
          codecPreferences: ['opus', 'pcmu'],
          enableRingingState: true
        });

        // Device event handlers
        twilioDevice.on('registered', () => {
          console.log('✅ [TWILIO] Device registered');
          setIsReady(true);
        });

        twilioDevice.on('error', (error) => {
          console.error('❌ [TWILIO] Device error:', error);
          setError(error.message);
        });

        twilioDevice.on('incoming', (call) => {
          console.log('📞 [TWILIO] Incoming call');
          setActiveCall(call);
        });

        // Register device
        await twilioDevice.register();
        deviceRef.current = twilioDevice;
        setDevice(twilioDevice);

        console.log('✅ [TWILIO] Device setup complete');

      } catch (err) {
        console.error('❌ [TWILIO] Failed to setup device:', err);
        setError(err.message);
      }
    }

    setupDevice();

    // Cleanup on unmount
    return () => {
      if (deviceRef.current) {
        deviceRef.current.unregister();
        deviceRef.current.destroy();
      }
    };
  }, []);

  /**
   * Join a conference by name
   * @param {string} conferenceName - Name of the conference to join
   * @returns {Promise<Call>} The active call object
   */
  const joinConference = async (conferenceName) => {
    if (!device) {
      throw new Error('Device not ready');
    }

    console.log('📞 [TWILIO] Joining conference:', conferenceName);

    try {
      // Connect to the voice webhook with conference name
      const call = await device.connect({
        params: {
          conferenceName: conferenceName
        }
      });

      // Call event handlers
      call.on('accept', () => {
        console.log('✅ [TWILIO] Call accepted');
      });

      call.on('disconnect', () => {
        console.log('🔌 [TWILIO] Call disconnected');
        setActiveCall(null);
      });

      call.on('cancel', () => {
        console.log('❌ [TWILIO] Call cancelled');
        setActiveCall(null);
      });

      call.on('error', (error) => {
        console.error('❌ [TWILIO] Call error:', error);
        setError(error.message);
      });

      setActiveCall(call);
      console.log('✅ [TWILIO] Conference joined successfully');
      
      return call;
    } catch (err) {
      console.error('❌ [TWILIO] Failed to join conference:', err);
      throw err;
    }
  };

  /**
   * Hang up the active call
   */
  const hangup = () => {
    if (activeCall) {
      console.log('📞 [TWILIO] Hanging up call');
      activeCall.disconnect();
      setActiveCall(null);
    }
  };

  /**
   * Mute/unmute the active call
   * @param {boolean} muted - Whether to mute the call
   */
  const setMuted = (muted) => {
    if (activeCall) {
      activeCall.mute(muted);
      console.log(`🔇 [TWILIO] Call ${muted ? 'muted' : 'unmuted'}`);
    }
  };

  return { 
    device, 
    isReady, 
    activeCall, 
    error,
    joinConference, 
    hangup,
    setMuted
  };
}
