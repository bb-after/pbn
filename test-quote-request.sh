#!/bin/bash

echo "Testing quote-requests/create endpoint with curl..."

curl -X POST http://localhost:3000/api/quote-requests/create \
  -H "Content-Type: application/json" \
  -H "hubspot_quote_request_webhook_secret: rG9ypjLBB67H45h" \
  -d '{
    "hs_object_id": 12345678,
    "keyword": "SEO services Boston",
    "referral": "Google Search", 
    "timeline": "3-6 months",
    "location": "Boston, MA",
    "notes_on_quotes": "Client is looking for comprehensive SEO package including content creation and link building",
    "budget_discussed": "$5,000 - $10,000 per month",
    "quote_request_image_1": "12345",
    "quote_attachment__2": null,
    "quote_attachment__3": null
  }' \
  -w "\n\nStatus Code: %{http_code}\n" \
  -v 