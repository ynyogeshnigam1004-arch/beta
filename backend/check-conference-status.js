// Load environment variables FIRST (before any other requires)
require('dotenv').config({ override: true });

// Now require Twilio service (it will read the env vars)
const twilioService = require('./services/twilioService');

async function checkConferenceStatus() {
  const conferenceName = process.argv[2];
  
  if (!conferenceName) {
    console.error('Usage: node check-conference-status.js <conference-name>');
    process.exit(1);
  }

  console.log(`\n🔍 Checking conference: ${conferenceName}\n`);

  try {
    const status = await twilioService.getConferenceStatus(conferenceName);
    
    console.log('Conference Status:');
    console.log(JSON.stringify(status, null, 2));
    
    if (status.exists) {
      console.log(`\n✅ Conference exists with ${status.participantCount} participants`);
      
      if (status.participants && status.participants.length > 0) {
        console.log('\nParticipants:');
        status.participants.forEach((p, i) => {
          console.log(`  ${i + 1}. Call SID: ${p.callSid}`);
          console.log(`     Muted: ${p.muted}`);
          console.log(`     On Hold: ${p.hold}`);
        });
      }
    } else {
      console.log('❌ Conference does not exist or is not active');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkConferenceStatus();
