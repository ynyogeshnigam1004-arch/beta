# Requirements Document

## Introduction

This document specifies the requirements for cleaning up and upgrading the authentication system by removing the problematic dual User model architecture and consolidating all authentication functionality into a single, enhanced User model with Google OAuth capabilities.

## Glossary

- **User_Model**: The original User.js model that contains all user data and functionality
- **UserEnhanced_Model**: The separate UserEnhanced.js model created for Google OAuth that duplicates functionality
- **Authentication_System**: The complete user authentication and authorization system
- **Google_OAuth**: Google's OAuth 2.0 authentication service integration
- **Dual_System**: The current problematic architecture with two separate User models
- **Single_System**: The target architecture with one unified User model
- **Email_Verification**: Process of verifying user email addresses through verification codes
- **Two_Factor_Authentication**: Optional security feature using TOTP codes
- **JWT_Token**: JSON Web Token used for user session management
- **Twilio_Credentials**: User-specific Twilio account credentials for phone services
- **Phone_Numbers**: User-managed phone numbers linked to assistants
- **Assistant_Data**: User-specific AI assistant configurations and data

## Requirements

### Requirement 1: Remove Dual Authentication System

**User Story:** As a system administrator, I want to eliminate the dual User model architecture, so that the system has a clean, single authentication model without confusion or data splitting.

#### Acceptance Criteria

1. THE Authentication_System SHALL use only the User_Model for all user operations
2. WHEN the system starts, THE Authentication_System SHALL NOT reference UserEnhanced_Model
3. THE Authentication_System SHALL remove all dual model handling from middleware and routes
4. WHEN a user authenticates, THE Authentication_System SHALL use only User_Model for lookup and validation
5. THE Authentication_System SHALL maintain all existing user data without loss during the consolidation

### Requirement 2: Upgrade User Model with Google OAuth

**User Story:** As a user, I want to sign up and log in using Google OAuth, so that I can access the system without creating a separate password.

#### Acceptance Criteria

1. THE User_Model SHALL include Google OAuth fields (googleId, profilePicture)
2. WHEN a user signs up with Google, THE Authentication_System SHALL create a User_Model record with Google credentials
3. WHEN a user logs in with Google, THE Authentication_System SHALL authenticate using the User_Model
4. THE User_Model SHALL support both password-based and Google OAuth authentication methods
5. WHEN a Google user is created, THE Authentication_System SHALL set emailVerified to true automatically

### Requirement 3: Implement Email Verification System

**User Story:** As a user who signs up manually, I want to verify my email address, so that my account is secure and I can receive important notifications.

#### Acceptance Criteria

1. WHEN a user signs up manually, THE Authentication_System SHALL generate a 6-digit verification code
2. THE Authentication_System SHALL send the verification code to the user's email address
3. WHEN a user provides a valid verification code, THE Authentication_System SHALL mark their email as verified
4. WHEN a user attempts to login with unverified email, THE Authentication_System SHALL prevent login and request verification
5. THE Authentication_System SHALL allow resending verification codes with rate limiting

### Requirement 4: Add Two-Factor Authentication Support

**User Story:** As a security-conscious user, I want to enable two-factor authentication, so that my account has additional protection against unauthorized access.

#### Acceptance Criteria

1. THE User_Model SHALL include 2FA fields (twoFactorEnabled, twoFactorSecret, twoFactorBackupCodes)
2. WHEN a user enables 2FA, THE Authentication_System SHALL generate a TOTP secret and QR code
3. WHEN a 2FA-enabled user logs in, THE Authentication_System SHALL require a valid TOTP code
4. THE Authentication_System SHALL support backup codes for 2FA recovery
5. WHEN a backup code is used, THE Authentication_System SHALL mark it as used and prevent reuse

### Requirement 5: Maintain User Data Isolation

**User Story:** As a user, I want my assistants, phone numbers, and other data to remain private and isolated, so that other users cannot access my information.

#### Acceptance Criteria

1. WHEN the system consolidates models, THE Authentication_System SHALL preserve all existing user data associations
2. THE Authentication_System SHALL maintain user-specific Twilio_Credentials without cross-user access
3. THE Authentication_System SHALL maintain user-specific Phone_Numbers without cross-user access
4. THE Authentication_System SHALL maintain user-specific Assistant_Data without cross-user access
5. WHEN a user accesses their data, THE Authentication_System SHALL return only data belonging to that user

### Requirement 6: Implement Secure Authentication Flow

**User Story:** As a user, I want secure login and signup processes, so that my account and data are protected from unauthorized access.

#### Acceptance Criteria

1. THE Authentication_System SHALL hash passwords using bcrypt with salt rounds of 12
2. THE Authentication_System SHALL generate JWT tokens with 7-day expiration
3. THE Authentication_System SHALL implement rate limiting for login attempts (5 attempts per 15 minutes)
4. WHEN login attempts exceed the limit, THE Authentication_System SHALL temporarily lock the account
5. THE Authentication_System SHALL reset login attempts after successful authentication

### Requirement 7: Configure Google OAuth Integration

**User Story:** As a system administrator, I want Google OAuth properly configured with the "vagle" client name, so that users see the correct application name during authentication.

#### Acceptance Criteria

1. THE Authentication_System SHALL use Google OAuth client credentials from environment variables
2. THE Authentication_System SHALL set the OAuth client name to "vagle"
3. WHEN users authenticate with Google, THE Authentication_System SHALL redirect to the configured callback URL
4. THE Authentication_System SHALL exchange OAuth codes for user profile information
5. THE Authentication_System SHALL handle OAuth errors gracefully with user-friendly messages

### Requirement 8: Clean Up Legacy Files and Routes

**User Story:** As a developer, I want all legacy dual-system files removed, so that the codebase is clean and maintainable.

#### Acceptance Criteria

1. THE Authentication_System SHALL remove the UserEnhanced_Model file completely
2. THE Authentication_System SHALL integrate authEnhanced routes into the main authentication routes
3. THE Authentication_System SHALL update all middleware to use only User_Model
4. THE Authentication_System SHALL update all service files to use only User_Model
5. THE Authentication_System SHALL fix all syntax errors caused by dual model handling

### Requirement 9: Preserve Existing Functionality

**User Story:** As an existing user, I want all my current features to work exactly as before, so that the system upgrade doesn't disrupt my workflow.

#### Acceptance Criteria

1. THE Authentication_System SHALL maintain all existing user roles (user, admin)
2. THE Authentication_System SHALL maintain all existing user preferences (credits, country, currency)
3. THE Authentication_System SHALL maintain all existing Twilio integration functionality
4. THE Authentication_System SHALL maintain all existing phone number management features
5. THE Authentication_System SHALL maintain all existing assistant management features

### Requirement 10: Implement Account Security Features

**User Story:** As a user, I want my account protected against brute force attacks and unauthorized access, so that my data remains secure.

#### Acceptance Criteria

1. THE Authentication_System SHALL track failed login attempts per user account
2. WHEN failed attempts reach 5, THE Authentication_System SHALL lock the account for 2 hours
3. THE Authentication_System SHALL provide account lockout status in login responses
4. THE Authentication_System SHALL reset login attempts after successful authentication
5. THE Authentication_System SHALL log security events for monitoring and auditing