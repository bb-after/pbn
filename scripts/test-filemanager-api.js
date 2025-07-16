// Test FileManager API v2 with the problematic file IDs
require('dotenv').config();

async function testFileManagerAPI(fileId) {
  console.log(`\nTesting FileManager API v2 for file: ${fileId}`);
  const startTime = Date.now();

  try {
    const response = await fetch(`https://api.hubapi.com/filemanager/api/v2/files/${fileId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_QUOTE_REQUEST_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    const elapsed = Date.now() - startTime;
    console.log(`Response time: ${elapsed}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success: ${data.name}`);
      console.log(`Available URLs:`);

      const urlFields = ['url', 's3_url', 'friendly_url', 'default_hosting_url'];
      urlFields.forEach(field => {
        if (data[field]) {
          console.log(`  ${field}: ${data[field].substring(0, 80)}...`);
        }
      });

      return data.url || data.default_hosting_url;
    } else {
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      return null;
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`❌ Error after ${elapsed}ms:`, error.message);
    return null;
  }
}

async function main() {
  console.log('=== FileManager API v2 Test ===');

  // Test the problematic file IDs
  const fileIds = ['192305859123', '192307062824'];

  for (const fileId of fileIds) {
    const url = await testFileManagerAPI(fileId);
    if (url) {
      console.log(`✅ File ${fileId} successfully retrieved`);
    } else {
      console.log(`❌ File ${fileId} failed`);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}
