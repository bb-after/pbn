// Monitor quote request API performance and timeouts
require('dotenv').config();

const TIMEOUT_THRESHOLD = 250000; // 250 seconds (warning before 300s limit)

async function checkRecentQuoteRequests() {
  console.log('=== Quote Request Timeout Monitor ===');
  console.log('Checking recent Vercel function logs for timeout patterns...');

  // This would integrate with Vercel API or log aggregation service
  // For now, provides guidance on what to monitor

  console.log('\n📊 Metrics to Monitor:');
  console.log('1. Function duration > 250s (warning)');
  console.log('2. Function duration > 280s (critical)');
  console.log('3. Functions that fail with timeout errors');
  console.log('4. OpenAI polling that exceeds 10 minutes');
  console.log('5. HubSpot file fetching taking > 30s per file');

  console.log('\n🔍 Where to Check:');
  console.log('- Vercel Dashboard → Functions → Runtime Logs');
  console.log('- Search for: "TIMEOUT DETECTED" in logs');
  console.log('- Search for: "timed out after" in logs');
  console.log('- Check #quote-requests-v2 Slack channel for alerts');

  console.log('\n⚡ Performance Targets:');
  console.log('- HubSpot file fetching: < 5s total');
  console.log('- OpenAI message send: < 1s');
  console.log('- OpenAI assistant run: < 120s typically');
  console.log('- Total handler time: < 180s ideally');

  console.log('\n🚨 Escalation Thresholds:');
  console.log('- > 3 timeouts per day: Investigate OpenAI assistant performance');
  console.log('- > 250s average duration: Consider optimizations');
  console.log('- > 5 HubSpot file fetch failures: Check HubSpot API health');
}

if (require.main === module) {
  checkRecentQuoteRequests().catch(console.error);
}

module.exports = { checkRecentQuoteRequests };
