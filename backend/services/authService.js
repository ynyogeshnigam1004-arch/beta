/**
 * Enhanced Authentication Service
 * Handles 2FA, Google OAuth, and security features
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

class AuthService {
  constructor() {
    // Email transporter for 2FA codes
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  }

  /**
   * Generate 2FA secret for new user
   */
  generate2FASecret(userEmail, serviceName = 'vagle') {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      service: serviceName,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  }

  /**
   * Generate QR code for 2FA setup
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataURL;
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify 2FA token
   */
  verify2FAToken(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds) tolerance
    });
  }

  /**
   * Generate email verification code
   */
  generateEmailVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  }

  /**
   * Send email verification code
   */
  async sendEmailVerificationCode(email, code, type = 'signup') {
    const subject = type === 'signup' ? 'Verify Your Email - vagle' : '2FA Verification Code';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">🎤 vagle</h1>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">
            ${type === 'signup' ? 'Welcome! Verify Your Email' : '2FA Verification Required'}
          </h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            ${type === 'signup' 
              ? 'Thank you for signing up! Please use the verification code below to complete your registration:'
              : 'Please use the verification code below to complete your login:'
            }
          </p>
          
          <div style="background: white; border: 2px dashed #667eea; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
            <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
          </div>
          
          <p style="color: #999; font-size: 14px;">
            This code will expire in 10 minutes. If you didn't request this, please ignore this email.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              © 2024 vagle. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await this.emailTransporter.sendMail({
        from: `"vagle" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: subject,
        html: html
      });
      
      console.log(`✅ Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Generate secure session token
   */
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash password with salt
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  /**
   * Verify password
   */
  verifyPassword(password, salt, hash) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  /**
   * Generate Google OAuth URL
   */
  generateGoogleOAuthURL(state) {
    const baseURL = 'https://accounts.google.com/o/oauth2/v2/auth';
    
    // Clean the redirect URI to remove any newlines or whitespace
    const cleanRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim().replace(/\n/g, '');
    
    // Simplified parameters to avoid URL length issues
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      redirect_uri: cleanRedirectUri,
      response_type: 'code',
      scope: 'email profile',
      state: state || 'default'
    });
    
    const url = `${baseURL}?${params.toString()}`;
    console.log('🔗 Generated OAuth URL:', url);
    console.log('🧹 Cleaned Redirect URI:', cleanRedirectUri);
    return url;
  }

  /**
   * Exchange Google OAuth code for user info
   */
  async exchangeGoogleCode(code) {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        throw new Error('Failed to get access token');
      }

      // Get user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const userData = await userResponse.json();
      
      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        verified_email: userData.verified_email
      };
      
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }
}

module.exports = new AuthService();