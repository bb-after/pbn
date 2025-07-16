# Zapier HubSpot File Relay Solution

## Overview

Use Zapier as a reliable middleman to fetch HubSpot files and deliver them to your quote request API.

## Zapier Workflow Setup

### Trigger: Webhook by Zapier

- **Webhook URL**: `https://hooks.zapier.com/hooks/catch/[your-id]/[hook-id]/`
- **Method**: POST
- **Data**: HubSpot deal data + file IDs

### Action 1: HubSpot - Find File

- **App**: HubSpot
- **Action**: Custom API Request
- **Method**: GET
- **URL**: `https://api.hubapi.com/files/v3/files/{{file_id}}`
- **Headers**: Authorization: Bearer {{hubspot_token}}

### Action 2: Storage - Upload File (Optional)

- **App**: Dropbox/Google Drive/AWS S3
- **Action**: Upload file from URL
- **URL**: {{hubspot_file_url}}

### Action 3: Webhook by Zapier - Send to Your API

- **URL**: `https://your-app.vercel.app/api/quote-requests/create-zapier`
- **Method**: POST
- **Data**: Original deal data + reliable file URLs

## Implementation in Your App

### New Endpoint: `/api/quote-requests/create-zapier.ts`

```typescript
// Zapier sends processed data with reliable file URLs
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { dealData, fileUrls } = req.body;

  // Skip HubSpot file fetching - use Zapier's reliable URLs
  const screenshotSection = fileUrls
    .map((url: string, i: number) => `Screenshot #${i + 1}: ${url}`)
    .join('\n');

  // Continue with OpenAI processing...
}
```

## Benefits

- ✅ **99.9% uptime** (Zapier's infrastructure)
- ✅ **Automatic retries** built into Zapier
- ✅ **File caching** options (upload to your storage)
- ✅ **No timeout issues** in your Vercel function
- ✅ **Monitoring & alerts** via Zapier dashboard

## Setup Steps

1. Create Zapier account
2. Build the workflow above
3. Update HubSpot webhook to call Zapier instead
4. Create new endpoint in your app
5. Test with a quote request
