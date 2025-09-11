const { processScheduledAnalyses } = require('./scheduledGeoAnalysis');

// Load environment variables
require('dotenv').config();

console.log('🧪 Testing scheduler locally...');

processScheduledAnalyses()
  .then(() => {
    console.log('✅ Scheduler test completed successfully');
    process.exit(0);
  })
  .catch((error: any) => {
    console.error('❌ Scheduler test failed:', error);
    process.exit(1);
  });
