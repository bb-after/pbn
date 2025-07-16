// Test alternative HubSpot API approaches for more reliable file access
require('dotenv').config();

async function testDifferentApiVersions(fileId) {
  console.log(`\n=== Testing Different API Versions for ${fileId} ===`);

  const endpoints = [
    {
      name: 'Files API v3 (current)',
      url: `https://api.hubapi.com/files/v3/files/${fileId}`,
    },
    {
      name: 'Files API v3 with CDN flag',
      url: `https://api.hubapi.com/files/v3/files/${fileId}?includeFileSystemMetadata=true`,
    },
    {
      name: 'FileManager API (older)',
      url: `https://api.hubapi.com/filemanager/api/v2/files/${fileId}`,
    },
    {
      name: 'CRM Files API',
      url: `https://api.hubapi.com/crm/v3/objects/files/${fileId}`,
    },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      const startTime = Date.now();

      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });

      const elapsed = Date.now() - startTime;
      console.log(`  Status: ${response.status} (${elapsed}ms)`);

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Success: ${data.name || data.title || 'File found'}`);
        console.log(
          `  URL structure: ${Object.keys(data)
            .filter(k => k.includes('url') || k.includes('Url'))
            .join(', ')}`
        );

        // Check for different URL fields
        const urlFields = ['url', 'full_url', 'signed_url', 'download_url', 'file_url'];
        for (const field of urlFields) {
          if (data[field]) {
            console.log(`  📎 ${field}: ${data[field].substring(0, 60)}...`);
          }
        }
      } else {
        console.log(`  ❌ Failed: ${response.statusText}`);
      }
    } catch (error) {
      console.log(`  💥 Error: ${error.message}`);
    }
  }
}

async function testDirectCdnUrls(fileId) {
  console.log(`\n=== Testing Direct CDN URLs for ${fileId} ===`);

  // First get the file metadata
  try {
    const response = await fetch(`https://api.hubapi.com/files/v3/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const fileData = await response.json();
      console.log(`File URL: ${fileData.url}`);

      // Test if we can access the URL directly without auth
      try {
        const directResponse = await fetch(fileData.url, {
          method: 'HEAD', // Just check if accessible
          signal: AbortSignal.timeout(5000),
        });

        console.log(`Direct CDN access: ${directResponse.status} ${directResponse.statusText}`);
        if (directResponse.ok) {
          console.log(`✅ Direct CDN URL works - can bypass API entirely!`);
          return fileData.url;
        }
      } catch (directError) {
        console.log(`❌ Direct CDN access failed: ${directError.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Could not test CDN URLs: ${error.message}`);
  }

  return null;
}

async function testWithDifferentRegions(fileId) {
  console.log(`\n=== Testing Different Regional Endpoints for ${fileId} ===`);

  const regions = [
    'https://api.hubapi.com',
    'https://api.hubspot.com', // Alternative domain
    'https://api.hubapi.eu', // EU region (if exists)
  ];

  for (const baseUrl of regions) {
    try {
      console.log(`Testing region: ${baseUrl}`);
      const startTime = Date.now();

      const response = await fetch(`${baseUrl}/files/v3/files/${fileId}`, {
        headers: {
          Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000),
      });

      const elapsed = Date.now() - startTime;
      console.log(`  ${response.ok ? '✅' : '❌'} ${response.status} (${elapsed}ms)`);
    } catch (error) {
      console.log(`  💥 ${error.message}`);
    }
  }
}

async function main() {
  console.log('=== HubSpot Alternative Endpoints Test ===');

  const fileIds = ['192305859123', '192307062824'];

  for (const fileId of fileIds) {
    await testDifferentApiVersions(fileId);
    await testDirectCdnUrls(fileId);
    await testWithDifferentRegions(fileId);

    console.log('\n' + '='.repeat(50));
  }

  console.log('\n📋 Recommendations:');
  console.log('1. If direct CDN URLs work, use those instead of API');
  console.log('2. Try FileManager API v2 as fallback');
  console.log('3. Consider pre-fetching files when deals are created');
  console.log('4. Implement multiple endpoint fallback chain');
}

if (require.main === module) {
  main().catch(console.error);
}
