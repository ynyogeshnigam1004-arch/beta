/**
 * Check Conference Status - Direct Twilio Client
 * This script creates its own Twilio client instead of using the singleton service
 */

// Load environment variables FIRST
require('dotenv').config({ override: true });

const twilio = require('twilio');

async function checkConferenceStatus() {
  const conferenceName = process.argv[2];
  
  if (!conferenceName) {
    console.error('Usage: node check-conference-direct.js <conference-name>');
    console.error('Example: node check-conference-direct.js human-transfer-conn_1772385646700_33otyl48r');
    process.exit(1);
  }

  // Read environment variables directly
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
  const personalNumber = process.env.PERSONAL_PHONE_NUMBER;

  console.log('\n🔍 Environment Check:');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Account SID:', accountSid ? '✅ Loaded' : '❌ Missing');
  console.log('  Auth Token:', authToken ? '✅ Loaded' : '❌ Missing');
  console.log('  Twilio Number:', twilioNumber || '❌ undefined');
  console.log('  Personal Number:', personalNumber || '❌ undefined');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!accountSid || !authToken) {
    console.error('❌ Twilio credentials not found in environment variables!');
    console.error('Make sure your .env file exists in the backend directory.');
    process.exit(1);
  }

  // Create Twilio client directly
  const client = twilio(accountSid, authToken);

  console.log(`🔍 Checking conference: ${conferenceName}\n`);

  try {
    // List conferences with this name
    const conferences = await client.conferences.list({
      friendlyName: conferenceName,
      status: 'in-progress',
      limit: 1
    });

    if (conferences.length > 0) {
      const conference = conferences[0];
      console.log('✅ Conference found!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('  Conference SID:', conference.sid);
      console.log('  Status:', conference.status);
      console.log('  Date Created:', conference.dateCreated);
      console.log('═══════════════════════════════════════════════════════\n');

      // Get participants
      const participants = await client
        .conferences(conference.sid)
        .participants
        .list();

      console.log(`👥 Participants: ${participants.length}`);
      console.log('═══════════════════════════════════════════════════════');
      
      if (participants.length > 0) {
        participants.forEach((p, i) => {
          console.log(`\n  Participant ${i + 1}:`);
          console.log(`    Call SID: ${p.callSid}`);
          console.log(`    Muted: ${p.muted}`);
          console.log(`    On Hold: ${p.hold}`);
          console.log(`    Start Time: ${p.startConferenceOnEnter}`);
          console.log(`    End on Exit: ${p.endConferenceOnExit}`);
        });
      } else {
        console.log('  No participants currently in conference');
      }
      console.log('═══════════════════════════════════════════════════════\n');

    } else {
      console.log('❌ Conference not found or not active');
      console.log('');
      console.log('Possible reasons:');
      console.log('  1. Conference has not been created yet');
      console.log('  2. Conference has already ended');
      console.log('  3. Conference name is incorrect');
      console.log('');
      
      // Try to list all active conferences
      console.log('Checking for any active conferences...');
      const allConferences = await client.conferences.list({
        status: 'in-progress',
        limit: 10
      });
      
      if (allConferences.length > 0) {
        console.log(`\nFound ${allConferences.length} active conference(s):`);
        allConferences.forEach((c, i) => {
          console.log(`  ${i + 1}. ${c.friendlyName} (${c.sid})`);
        });
      } else {
        console.log('\nNo active conferences found.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking conference:', error.message);
    if (error.code === 20003) {
      console.error('\n⚠️  Authentication failed! Check your Twilio credentials in .env file.');
    }
  }
}

checkConferenceStatus();
