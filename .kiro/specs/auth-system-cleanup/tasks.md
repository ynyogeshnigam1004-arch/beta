# Implementation Plan: Authentication System Cleanup

## Overview

This implementation plan consolidates the dual authentication system into a single, enhanced User model with Google OAuth support. The approach upgrades the existing User.js model, removes UserEnhanced.js completely, and updates all authentication middleware and routes to use the single model while preserving all existing functionality.

## Tasks

- [ ] 1. Upgrade User Model with Enhanced Authentication Fields
  - Add Google OAuth fields (googleId, profilePicture) to existing User.js model
  - Add email verification fields (emailVerified, emailVerificationCode, emailVerificationExpires)
  - Add 2FA fields (twoFactorEnabled, twoFactorSecret, twoFactorBackupCodes)
  - Add account security fields (loginAttempts, lockUntil)
  - Add database indexes for performance (email, googleId, emailVerificationCode)
  - Add virtual field for account lock status (isLocked)
  - Update password hashing to use bcrypt with 12 salt rounds
  - _Requirements: 2.1, 4.1, 6.1, 10.1_

- [ ]* 1.1 Write property test for User model schema validation
  - **Property 1: Single Model Usage**
  - **Validates: Requirements 1.1, 1.3, 1.4, 2.3, 8.3, 8.4**

- [ ] 2. Add User Model Methods for Enhanced Authentication
  - Add comparePassword method for secure password verification
  - Add incLoginAttempts method for failed login tracking
  - Add resetLoginAttempts method for successful login reset
  - Add generateBackupCodes method for 2FA backup code generation
  - Add useBackupCode method for backup code validation and marking as used
  - Update pre-save middleware to hash passwords and update timestamps
  - _Requirements: 6.1, 10.1, 4.4, 4.5_

- [ ]* 2.1 Write property test for password security
  - **Property 12: Password Security**
  - **Validates: Requirements 6.1**

- [ ]* 2.2 Write property test for backup code management
  - **Property 10: Backup Code Management**
  - **Validates: Requirements 4.4, 4.5**

- [ ] 3. Update Authentication Middleware to Use Single Model
  - Remove UserEnhanced import from auth.js middleware
  - Update authenticate function to use only User model for lookup
  - Update optionalAuth function to use only User model for lookup
  - Remove dual model fallback logic completely
  - Ensure JWT token verification works with single model
  - _Requirements: 1.1, 1.3, 1.4, 8.3_

- [ ]* 3.1 Write property test for single model authentication
  - **Property 1: Single Model Usage**
  - **Validates: Requirements 1.1, 1.3, 1.4, 2.3, 8.3, 8.4**

- [ ] 4. Consolidate Authentication Routes
  - Merge authEnhanced.js functionality into main auth routes
  - Implement enhanced signup with email verification using User model
  - Implement enhanced login with 2FA support using User model
  - Add email verification and resend verification endpoints
  - Add Google OAuth initiation and callback endpoints
  - Remove authEnhanced.js file completely
  - _Requirements: 2.2, 3.1, 3.2, 3.3, 4.2, 4.3, 7.3, 7.4, 8.1, 8.2_

- [ ]* 4.1 Write property test for Google OAuth user creation
  - **Property 2: Google OAuth User Creation**
  - **Validates: Requirements 2.2, 2.5**

- [ ]* 4.2 Write property test for email verification process
  - **Property 5: Email Verification Process**
  - **Validates: Requirements 3.3**

- [ ]* 4.3 Write property test for 2FA login requirement
  - **Property 9: 2FA Login Requirement**
  - **Validates: Requirements 4.3**

- [ ] 5. Implement Rate Limiting and Account Security
  - Add rate limiting middleware for authentication endpoints (5 attempts per 15 minutes)
  - Add account lockout logic for failed login attempts (lock for 2 hours after 5 failures)
  - Add login attempt tracking and reset functionality
  - Add security event logging for monitoring and auditing
  - Update login responses to include lockout status information
  - _Requirements: 6.3, 6.4, 6.5, 10.2, 10.3, 10.4, 10.5_

- [ ]* 5.1 Write property test for login rate limiting
  - **Property 14: Login Rate Limiting**
  - **Validates: Requirements 6.3**

- [ ]* 5.2 Write property test for account lockout management
  - **Property 15: Account Lockout Management**
  - **Validates: Requirements 6.4, 10.2, 10.3**

- [ ]* 5.3 Write property test for login attempt reset
  - **Property 16: Login Attempt Reset**
  - **Validates: Requirements 6.5, 10.1, 10.4**

- [ ] 6. Update Authentication Service for Enhanced Features
  - Update authService.js to work with single User model
  - Ensure Google OAuth client name is set to "vagle"
  - Add proper error handling for OAuth failures with user-friendly messages
  - Ensure JWT tokens are generated with 7-day expiration
  - Add email verification code generation and sending functionality
  - Add 2FA secret generation and QR code creation
  - _Requirements: 6.2, 7.2, 7.5, 3.1, 3.2, 4.2_

- [ ]* 6.1 Write property test for JWT token configuration
  - **Property 13: JWT Token Configuration**
  - **Validates: Requirements 6.2**

- [ ]* 6.2 Write property test for OAuth error handling
  - **Property 18: OAuth Error Handling**
  - **Validates: Requirements 7.5**

- [ ]* 6.3 Write property test for 2FA setup generation
  - **Property 8: 2FA Setup Generation**
  - **Validates: Requirements 4.2**

- [ ] 7. Update All Routes to Use Single User Model
  - Update twilioCredentials.js to remove UserEnhanced imports and dual model logic
  - Update all user lookup operations to use only User model
  - Update all user update operations to use only User model
  - Ensure user data isolation is maintained (users only access their own data)
  - Fix any syntax errors caused by dual model handling
  - _Requirements: 1.1, 5.2, 5.3, 5.4, 5.5, 8.4, 8.5_

- [ ]* 7.1 Write property test for user data isolation
  - **Property 11: User Data Isolation**
  - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [ ] 8. Checkpoint - Test Authentication System Integration
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Add Email Verification Flow
  - Implement unverified email login prevention
  - Add email verification code validation
  - Add verification code rate limiting (2 emails per minute)
  - Ensure Google OAuth users have emailVerified set to true automatically
  - Add resend verification functionality with proper rate limiting
  - _Requirements: 3.4, 3.5, 2.5_

- [ ]* 9.1 Write property test for unverified email login prevention
  - **Property 6: Unverified Email Login Prevention**
  - **Validates: Requirements 3.4**

- [ ]* 9.2 Write property test for verification code rate limiting
  - **Property 7: Verification Code Rate Limiting**
  - **Validates: Requirements 3.5**

- [ ] 10. Add Two-Factor Authentication Support
  - Add 2FA setup endpoint with TOTP secret and QR code generation
  - Add 2FA verification during login process
  - Add backup code generation and management
  - Add 2FA disable functionality
  - Ensure backup codes can only be used once
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 10.1 Write unit tests for 2FA workflow
  - Test 2FA setup, verification, and backup code usage
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 11. Clean Up Legacy Files and References
  - Remove UserEnhanced.js model file completely
  - Remove authEnhanced.js routes file completely
  - Update any remaining imports or references to UserEnhanced
  - Run linting to ensure no syntax errors remain
  - Verify no orphaned code or unused imports exist
  - _Requirements: 8.1, 8.2, 8.5_

- [ ]* 11.1 Write unit tests to verify legacy file removal
  - Test that UserEnhanced model is not accessible
  - Test that all routes use single User model
  - _Requirements: 8.1, 8.2_

- [ ] 12. Verify Existing Functionality Preservation
  - Test that all existing user roles (user, admin) work correctly
  - Test that user preferences (credits, country, currency) are maintained
  - Test that Twilio integration functionality works with single model
  - Test that phone number management features work with single model
  - Test that assistant management features work with single model
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 12.1 Write property test for existing functionality preservation
  - **Property 19: Existing Functionality Preservation**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 13. Add Security Event Logging
  - Add logging for failed login attempts
  - Add logging for account lockouts and unlocks
  - Add logging for 2FA setup and usage
  - Add logging for email verification events
  - Add logging for Google OAuth authentication events
  - Ensure logs include user ID, timestamp, and event details for auditing
  - _Requirements: 10.5_

- [ ]* 13.1 Write property test for security event logging
  - **Property 20: Security Event Logging**
  - **Validates: Requirements 10.5**

- [ ] 14. Final Integration Testing and Validation
  - Run comprehensive integration tests for all authentication flows
  - Test email/password signup and login with verification
  - Test Google OAuth signup and login flows
  - Test 2FA setup and authentication
  - Test account lockout and recovery
  - Test rate limiting enforcement
  - Verify all existing features work with single User model
  - _Requirements: All requirements_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation throughout implementation
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- The implementation maintains backward compatibility while adding new features
- All existing user data and functionality is preserved during the consolidation
- Security is enhanced with proper rate limiting, account lockout, and 2FA support