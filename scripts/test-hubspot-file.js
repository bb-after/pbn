// Test specific HubSpot file that's causing timeouts
require('dotenv').config();

async function testHubSpotFile(fileId) {
  console.log(`Testing HubSpot file: ${fileId}`);
  const startTime = Date.now();

  try {
    console.log('Making request with 10s timeout...');

    const response = await fetch(`https://api.hubapi.com/files/v3/files/${fileId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout for testing
    });

    const elapsed = Date.now() - startTime;
    console.log(`Response received in ${elapsed}ms`);
    console.log(`Status: ${response.status}`);

    if (!response.ok) {
      console.log(`❌ Error: ${response.status} ${response.statusText}`);
      return false;
    }

    const fileData = await response.json();
    console.log(`✅ File data received:`, {
      id: fileData.id,
      name: fileData.name,
      hasUrl: !!fileData.url,
      size: fileData.size,
      type: fileData.type,
    });

    return true;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`❌ Request failed after ${elapsed}ms:`, error.message);

    if (error.name === 'AbortError') {
      console.log('🚨 Request was aborted due to timeout');
    }

    return false;
  }
}

async function main() {
  console.log('=== HubSpot File Fetch Test ===');

  // Test both problematic file IDs from your logs
  const problematicFileIds = ['192305859123', '192307062824'];

  for (const fileId of problematicFileIds) {
    console.log(`\n=== Testing problematic file: ${fileId} ===`);
    await testHubSpotFile(fileId);

    // Test with different timeout values for this file
    console.log(`\nTesting ${fileId} with different timeout values...`);

    for (const timeout of [5000, 10000, 15000]) {
      console.log(`\nTesting ${fileId} with ${timeout / 1000}s timeout...`);
      const startTime = Date.now();

      try {
        const response = await fetch(`https://api.hubapi.com/files/v3/files/${fileId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(timeout),
        });

        const elapsed = Date.now() - startTime;
        console.log(`✅ Success with ${timeout / 1000}s timeout in ${elapsed}ms`);

        if (response.ok) {
          const data = await response.json();
          console.log(`File exists: ${data.name}, Size: ${data.size}`);
        } else {
          console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
        }
        break;
      } catch (error) {
        const elapsed = Date.now() - startTime;
        console.log(
          `❌ Failed with ${timeout / 1000}s timeout after ${elapsed}ms: ${error.message}`
        );

        if (error.name === 'AbortError') {
          console.log('🚨 Request was aborted due to timeout');
        } else if (error.message.includes('fetch failed')) {
          console.log('🚨 Network/DNS failure - same as production logs');
        }
      }
    }
  }

  // Test HubSpot API health in general
  console.log('\n=== Testing HubSpot API Health ===');
  try {
    const healthCheck = await fetch('https://api.hubapi.com/files/v3/files?limit=1', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    console.log(`HubSpot API Health: ${healthCheck.status} ${healthCheck.statusText}`);
  } catch (error) {
    console.log(`❌ HubSpot API Health Check Failed: ${error.message}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
