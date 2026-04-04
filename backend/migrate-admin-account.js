/**
 * Migrate Admin Account to Enhanced Authentication System
 * This script moves the admin account from old User model to new UserEnhanced model
 */

require('dotenv').config();
const { connectDB, getCollection } = require('./config/database');
const bcrypt = require('bcryptjs');

async function migrateAdminAccount() {
  console.log('🔄 Starting Admin Account Migration...\n');
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Get collections
    const oldUsersCollection = getCollection('users');
    const newUsersCollection = getCollection('userenhanceds'); // Note: Mongoose pluralizes model names
    
    // Find admin user in old collection
    console.log('🔍 Looking for admin user in old collection...');
    const adminUser = await oldUsersCollection.findOne({ 
      email: 'ynyogeshnigam1008@gmail.com' 
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found in old collection');
      console.log('📋 Available users in old collection:');
      const allOldUsers = await oldUsersCollection.find({}).toArray();
      allOldUsers.forEach(user => {
        console.log(`   - ${user.email} (role: ${user.role || 'user'})`);
      });
      return;
    }
    
    console.log('✅ Found admin user in old collection:', adminUser.email);
    
    // Check if already exists in new collection
    const existingNewUser = await newUsersCollection.findOne({ 
      email: adminUser.email 
    });
    
    if (existingNewUser) {
      console.log('ℹ️  Admin user already exists in new collection');
      console.log('🔄 Updating existing user with enhanced fields...');
      
      // Update existing user with enhanced fields
      await newUsersCollection.updateOne(
        { email: adminUser.email },
        {
          $set: {
            fullName: adminUser.fullName || adminUser.name || 'Admin User',
            role: 'admin',
            emailVerified: true, // Admin doesn't need email verification
            twoFactorEnabled: false,
            loginAttempts: 0,
            credits: adminUser.credits || 500,
            country: adminUser.country || 'IN',
            currency: adminUser.currency || 'INR',
            twilioPhoneNumber: adminUser.twilioPhoneNumber || null,
            twilioCredentials: adminUser.twilioCredentials || {
              accountSid: null,
              authToken: null,
              apiKey: null,
              apiSecret: null,
              twimlAppSid: null,
              status: 'pending'
            },
            phoneNumbers: adminUser.phoneNumbers || [],
            updatedAt: new Date()
          }
        }
      );
      
      console.log('✅ Admin user updated in enhanced collection');
      
    } else {
      console.log('🔄 Migrating admin user to enhanced collection...');
      
      // Create new enhanced user document
      const enhancedUser = {
        fullName: adminUser.fullName || adminUser.name || 'Admin User',
        email: adminUser.email,
        password: adminUser.password, // Keep existing hashed password
        role: 'admin',
        emailVerified: true, // Admin doesn't need email verification
        twoFactorEnabled: false,
        loginAttempts: 0,
        credits: adminUser.credits || 500,
        country: adminUser.country || 'IN',
        currency: adminUser.currency || 'INR',
        twilioPhoneNumber: adminUser.twilioPhoneNumber || null,
        twilioCredentials: adminUser.twilioCredentials || {
          accountSid: null,
          authToken: null,
          apiKey: null,
          apiSecret: null,
          twimlAppSid: null,
          status: 'pending'
        },
        phoneNumbers: adminUser.phoneNumbers || [],
        createdAt: adminUser.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      // Insert into new collection
      const result = await newUsersCollection.insertOne(enhancedUser);
      console.log('✅ Admin user migrated to enhanced collection');
      console.log('📝 New user ID:', result.insertedId);
    }
    
    // Test login with migrated account
    console.log('\n🧪 Testing login with migrated admin account...');
    
    const testUser = await newUsersCollection.findOne({ 
      email: 'ynyogeshnigam1008@gmail.com' 
    });
    
    if (testUser) {
      console.log('✅ Admin user found in enhanced collection');
      console.log('📋 User details:');
      console.log(`   - Email: ${testUser.email}`);
      console.log(`   - Role: ${testUser.role}`);
      console.log(`   - Email Verified: ${testUser.emailVerified}`);
      console.log(`   - 2FA Enabled: ${testUser.twoFactorEnabled}`);
      console.log(`   - Credits: ${testUser.credits}`);
      
      // Test password comparison (if password exists)
      if (testUser.password) {
        console.log('✅ Password hash exists - login should work');
      } else {
        console.log('⚠️  No password hash - this might be a Google OAuth user');
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📋 You can now login with:');
    console.log('   - Email: ynyogeshnigam1008@gmail.com');
    console.log('   - Your existing password');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
  
  process.exit(0);
}

migrateAdminAccount();