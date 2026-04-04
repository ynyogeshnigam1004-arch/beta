require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const personalNumber = process.env.PERSONAL_PHONE_NUMBER;

console.log('═══════════════════════════════════════════════════════');
console.log('🔍 CHECKING TWILIO ACCOUNT STATUS');
console.log('═══════════════════════════════════════════════════════\n');

const client = twilio(accountSid, authToken);

async function checkAccount() {
  try {
    // Check account details
    console.log('📋 Fetching account details...\n');
    const account = await client.api.v2010.accounts(accountSid).fetch();
    
    console.log(`Account Name: ${account.friendlyName}`);
    console.log(`Account Status: ${account.status}`);
    console.log(`Account Type: ${account.type}`);
    console.log('');

    if (account.type === 'Trial') {
      console.log('⚠️  You are on TRIAL account!');
      console.log('Trial accounts can ONLY call VERIFIED phone numbers.\n');
    }

    // Check verified numbers
    console.log('📞 Checking verified phone numbers...\n');
    const outgoingCallerIds = await client.outgoingCallerIds.list({ limit: 20 });
    
    if (outgoingCallerIds.length === 0) {
      console.log('❌ NO VERIFIED NUMBERS FOUND!');
      console.log('');
      console.log('🔧 FIX:');
      console.log('1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
      console.log(`2. Click "Add a new number"`);
      console.log(`3. Enter your number: ${personalNumber}`);
      console.log('4. Verify it with the code Twilio sends');
      console.log('5. Run this test again\n');
    } else {
      console.log(`✅ Found ${outgoingCallerIds.length} verified number(s):\n`);
      
      let isVerified = false;
      outgoingCallerIds.forEach((callerId, index) => {
        console.log(`${index + 1}. ${callerId.phoneNumber}`);
        if (callerId.phoneNumber === personalNumber) {
          console.log('   ✅ THIS IS YOUR PERSONAL NUMBER - VERIFIED!');
          isVerified = true;
        }
      });
      
      console.log('');
      
      if (!isVerified) {
        console.log(`❌ Your personal number ${personalNumber} is NOT verified!`);
        console.log('');
        console.log('🔧 FIX:');
        console.log('1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
        console.log('2. Click "Add a new number"');
        console.log(`3. Enter: ${personalNumber}`);
        console.log('4. Verify it with the code Twilio sends');
        console.log('5. Run this test again\n');
      } else {
        console.log('✅ Your personal number is verified!');
        console.log('The issue might be something else...\n');
      }
    }

    // Check Twilio phone number
    console.log('📞 Checking Twilio phone number...\n');
    const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
    
    if (incomingNumbers.length === 0) {
      console.log('❌ NO TWILIO PHONE NUMBERS FOUND!');
      console.log('You need to buy a phone number from Twilio.\n');
    } else {
      console.log(`✅ Found ${incomingNumbers.length} Twilio number(s):\n`);
      incomingNumbers.forEach((number, index) => {
        console.log(`${index + 1}. ${number.phoneNumber}`);
        console.log(`   Capabilities: Voice=${number.capabilities.voice}, SMS=${number.capabilities.sms}`);
        if (number.phoneNumber === process.env.TWILIO_PHONE_NUMBER) {
          console.log('   ✅ THIS IS YOUR CONFIGURED TWILIO NUMBER');
        }
      });
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.status === 401) {
      console.log('\n🔧 FIX: Your TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is WRONG!');
      console.log('1. Go to: https://console.twilio.com/');
      console.log('2. Copy Account SID and Auth Token');
      console.log('3. Update backend/.env file');
    }
  }
}

checkAccount();
