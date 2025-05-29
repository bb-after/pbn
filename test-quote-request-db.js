// Use dynamic import for node-fetch
const API_BASE = 'http://localhost:3000/api';

// Use a test secret - in production this would be the actual HubSpot secret
const TEST_WEBHOOK_SECRET = 'test-secret-123';

// Test payload for quote request
const testPayload = {
  hs_object_id: 20244336989,
  keyword: 'front systems',
  keyword_monthly_search_volume: '1000',
  referral: 'Google',
  timeline: 'ASAP',
  location: 'United States',
  notes_on_quotes: 'Test quote request with database tracking',
  budget_discussed: '$5,000',
  quote_request_image_1: '187463683381',
  quote_attachment__2: '190685088546',
  quote_attachment__3: '190684752984',
};

async function testQuoteRequestWithDB() {
  console.log('🧪 Testing Quote Request with Database Tracking\n');
  console.log(
    '⚠️  Note: This test requires the webhook secret to be temporarily set for local testing'
  );
  console.log(`Expected secret: ${TEST_WEBHOOK_SECRET}\n`);

  try {
    // Dynamic import for node-fetch
    const { default: fetch } = await import('node-fetch');

    // Test 1: Send initial quote request
    console.log('1️⃣ Sending initial quote request...');
    const response1 = await fetch(`${API_BASE}/quote-requests/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        hubspot_quote_request_webhook_secret: TEST_WEBHOOK_SECRET,
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`Response 1: ${response1.status} ${response1.statusText}`);
    const result1 = await response1.json();
    console.log('Result 1:', result1);

    if (response1.status === 401) {
      console.log('\n❌ Authentication failed. To test locally, temporarily set:');
      console.log(`   HUBSPOT_QUOTE_REQUEST_WEBHOOK_SECRET=${TEST_WEBHOOK_SECRET}`);
      console.log('   in your .env.local file, then restart the dev server.\n');
      return;
    }

    // Wait a moment for processing
    console.log('\n⏳ Waiting 3 seconds for processing...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Send duplicate request (should be blocked)
    console.log('2️⃣ Sending duplicate quote request (should be blocked)...');
    const response2 = await fetch(`${API_BASE}/quote-requests/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        hubspot_quote_request_webhook_secret: TEST_WEBHOOK_SECRET,
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`Response 2: ${response2.status} ${response2.statusText}`);
    const result2 = await response2.json();
    console.log('Result 2:', result2);

    // Test 3: Check statistics
    console.log('\n3️⃣ Checking quote request statistics...');
    const statsResponse = await fetch(`${API_BASE}/admin/quote-request-stats?hours=1`);

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('Statistics:', JSON.stringify(stats, null, 2));
    } else {
      console.log(`Stats request failed: ${statsResponse.status} ${statsResponse.statusText}`);
    }

    // Test 4: Check processing history for this deal
    console.log('\n4️⃣ Checking processing history for deal...');
    const historyResponse = await fetch(
      `${API_BASE}/admin/quote-request-stats?dealId=${testPayload.hs_object_id}&limit=5`
    );

    if (historyResponse.ok) {
      const history = await historyResponse.json();
      console.log('Processing History:', JSON.stringify(history, null, 2));
    } else {
      console.log(
        `History request failed: ${historyResponse.status} ${historyResponse.statusText}`
      );
    }

    console.log('\n✅ Database tracking test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testQuoteRequestWithDB();
