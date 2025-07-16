# Lead Enricher Setup Guide

## Overview

The Lead Enricher allows users to upload CSV files with Company, Keyword, and URL data. The system validates the data, tracks submissions in the database, and automatically adds the data to a Google Sheets document for processing.

## Database Migration

Run the following migration to create the required database table:

```sql
-- Run this in your MySQL database
SOURCE db/migrations/020_create_user_partial_list_submissions.sql;
```

## Google Sheets API Setup

### 1. Enable Google Sheets API

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Enable the Google Sheets API
4. Create credentials (Service Account)

### 2. Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Google Sheets API Configuration
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=your-private-key-id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=your-service-account@project-id.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40project-id.iam.gserviceaccount.com
```

### 3. Share the Google Sheet

Share your Google Sheet (`1O15b50dX2qF9vSRdhLj1tOMXnRdLuNfYWnJtVUhrqK8`) with the service account email address with "Editor" permissions.

## CSV Format

The CSV file must contain exactly these columns:

- **Company**: Company name
- **Keyword**: Associated keyword
- **URL**: Company website URL

Example CSV:

```csv
Company,Keyword,URL
ACME Corp,industrial solutions,https://acme.com
Tech Innovations,software development,https://techinnovations.com
```

## Features

- ✅ CSV file upload and validation
- ✅ Real-time error detection for missing fields
- ✅ Data preview with validation status
- ✅ Database tracking of submissions
- ✅ Automatic Google Sheets integration
- ✅ User authentication required
- ✅ Success confirmation with reset option

## API Endpoints

- `POST /api/lead-enricher/submit` - Submit validated CSV data

## Access

The Lead Enricher is available at `/lead-enricher` and requires user authentication.

## Notes

- Empty fields in any row will cause validation errors
- The system shows exactly which rows and fields are missing
- Data is appended to the Google Sheet with timestamps
- All submissions are tracked by user and timestamp in the database
