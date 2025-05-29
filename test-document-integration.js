const fetch = require('node-fetch');

// Test payload for the example endpoint
const testPayload = {
  prompt: 'Please analyze this document and provide insights about its content and key points',
  // Option 1: Test with Google Doc IDs (if you have any converted from PDFs)
  googleDocIds: ['1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'], // Example Google Doc ID

  // Option 2: Test with public document URLs
  publicDocumentUrls: [
    'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    'https://drive.google.com/file/d/your-pdf-file-id/view',
  ],
};

async function testDocumentIntegration() {
  try {
    console.log('Testing document integration with AI assistant...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    // Test the Google Docs integration
    console.log('\n--- Testing Google Docs Integration ---');
    const docsResponse = await fetch('http://localhost:3000/api/example-with-documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: testPayload.prompt,
        googleDocIds: testPayload.googleDocIds,
      }),
    });

    console.log('Google Docs Response status:', docsResponse.status);
    const docsResponseText = await docsResponse.text();
    console.log('Google Docs Response body:', docsResponseText);

    // Test the public URLs integration
    console.log('\n--- Testing Public URLs Integration ---');
    const urlsResponse = await fetch('http://localhost:3000/api/example-with-documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: testPayload.prompt,
        publicDocumentUrls: testPayload.publicDocumentUrls,
      }),
    });

    console.log('Public URLs Response status:', urlsResponse.status);
    const urlsResponseText = await urlsResponse.text();
    console.log('Public URLs Response body:', urlsResponseText);

    if (docsResponse.ok || urlsResponse.ok) {
      console.log('✅ Document integration tests completed!');
    } else {
      console.log('❌ Some tests failed');
    }
  } catch (error) {
    console.error('❌ Error testing document integration:', error.message);
  }
}

// Check if we're running this script directly
if (require.main === module) {
  testDocumentIntegration();
}

module.exports = { testDocumentIntegration };
