# Clay HubSpot File Solution

## Overview

Clay has HubSpot connectors and can fetch files through their infrastructure.

## Clay Workflow Setup

### 1. Import HubSpot Data

- **Source**: HubSpot Deal Properties
- **Trigger**: Webhook from HubSpot
- **Fields**: Deal ID, file IDs, keywords, etc.

### 2. Fetch HubSpot Files

- **Action**: "HubSpot API" enrichment
- **Endpoint**: `/files/v3/files/{file_id}`
- **Output**: File URLs and metadata

### 3. Export to Webhook

- **Action**: "HTTP API" enrichment
- **Method**: POST
- **URL**: Your quote request endpoint
- **Data**: Enhanced deal data + file URLs

## Benefits

- ✅ **Built-in HubSpot connectors**
- ✅ **Enterprise-grade reliability**
- ✅ **Data enrichment capabilities**
- ✅ **Rate limiting handled automatically**

## Limitations

- 💰 **Cost**: $49-199/month
- 🕐 **Setup complexity**: More involved than Zapier
- 📊 **Better for data enrichment use cases**

## Recommendation

**Use Zapier instead** - it's simpler and more cost-effective for this specific use case.
