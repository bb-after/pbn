// Simple test for database tracking functionality
const API_BASE = 'http://localhost:3000/api';

// Use the correct webhook secret from .env
const WEBHOOK_SECRET = 'rG9ypjLBB67H45h';

// Test payload for quote request
const testPayload = {
  hs_object_id: Date.now(), // Use timestamp to ensure unique deal ID for testing
  keyword: 'test database tracking',
  keyword_monthly_search_volume: '500',
  referral: 'Direct',
  timeline: 'Testing',
  location: 'Local',
  notes_on_quotes: 'Testing database tracking functionality',
  budget_discussed: '$1,000',
  quote_request_image_1: '187463683381',
  quote_attachment__2: '190685088546',
  quote_attachment__3: '190684752984',
};

async function testDatabaseTracking() {
  console.log('🧪 Testing Database Tracking Functionality\n');
  console.log(`Testing with deal ID: ${testPayload.hs_object_id}`);

  try {
    // Dynamic import for node-fetch
    const { default: fetch } = await import('node-fetch');

    // Step 1: Check initial stats
    console.log('\n1️⃣ Checking initial stats...');
    let statsResponse = await fetch(`${API_BASE}/admin/quote-request-stats?hours=1`);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('Initial stats:', stats.stats);
    }

    // Step 2: Send first request - should work
    console.log('\n2️⃣ Sending first quote request...');
    const response1 = await fetch(`${API_BASE}/quote-requests/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        hubspot_quote_request_webhook_secret: WEBHOOK_SECRET,
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`First request: ${response1.status} ${response1.statusText}`);
    const result1 = await response1.json();
    console.log('Result:', result1);

    if (response1.status === 401) {
      console.log('\n❌ Authentication failed. The webhook secret may not match.');
      console.log(`Using secret: ${WEBHOOK_SECRET}`);
      return;
    }

    // Step 3: Wait a moment and check stats
    console.log('\n⏳ Waiting 3 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n3️⃣ Checking stats after first request...');
    statsResponse = await fetch(`${API_BASE}/admin/quote-request-stats?hours=1`);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('Stats after first request:', stats.stats);
    }

    // Step 4: Send duplicate request immediately - should be blocked
    console.log('\n4️⃣ Sending duplicate request (should be blocked)...');
    const response2 = await fetch(`${API_BASE}/quote-requests/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        hubspot_quote_request_webhook_secret: WEBHOOK_SECRET,
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`Duplicate request: ${response2.status} ${response2.statusText}`);
    const result2 = await response2.json();
    console.log('Result:', result2);

    // Step 5: Check processing history
    console.log('\n5️⃣ Checking processing history...');
    const historyResponse = await fetch(
      `${API_BASE}/admin/quote-request-stats?dealId=${testPayload.hs_object_id}&limit=5`
    );

    if (historyResponse.ok) {
      const history = await historyResponse.json();
      console.log('Processing history:', JSON.stringify(history.history, null, 2));
    }

    // Step 6: Final stats
    console.log('\n6️⃣ Final stats check...');
    statsResponse = await fetch(`${API_BASE}/admin/quote-request-stats?hours=1`);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('Final stats:', stats.stats);
    }

    console.log('\n✅ Database tracking test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testDatabaseTracking();
