// Test script for quote-requests/create endpoint
// Uses built-in fetch (Node.js 18+)

async function testQuoteRequest() {
  const testPayload = {
    hs_object_id: 20244336989,
    keyword: 'test keyword for error handling',
    keyword_monthly_search_volume: '12,500',
    referral: 'test referral',
    timeline: 'ASAP',
    location: 'Test Location',
    notes_on_quotes: 'Test notes for error handling improvements',
    budget_discussed: '5000-10000',
    quote_request_image_1: '187463683381',
    quote_attachment__2: '190685088546',
    quote_attachment__3: '190684752984',
  };

  try {
    console.log('Testing quote request endpoint with improved error handling...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('http://localhost:3001/api/quote-requests/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        hubspot_quote_request_webhook_secret: 'rG9ypjLBB67H45h',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      console.log('✅ Test passed - endpoint responded successfully');
      console.log('Check your Slack channel for the quote request notification');
      console.log('Monitor the server logs to see the improved error handling in action');
    } else {
      console.log('❌ Test failed - endpoint returned error');
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
testQuoteRequest();
