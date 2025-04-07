# Client Portal Implementation Plan

## Overview

This plan outlines the implementation steps for creating a Client Portal feature where clients can review, approve, or reject content uploaded by staff members.

## Database Schema Changes

### 1. ClientContact Table

```sql
CREATE TABLE ClientContact (
  id SERIAL PRIMARY KEY,
  clientId INTEGER REFERENCES Clients(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. ClientApprovalRequest Table

```sql
CREATE TABLE ClientApprovalRequest (
  id SERIAL PRIMARY KEY,
  clientId INTEGER REFERENCES Clients(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  fileUrl VARCHAR(255),
  fileType VARCHAR(50),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  createdById INTEGER REFERENCES Users(id),
  publishedUrl VARCHAR(255),
  isArchived BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. ApprovalRequestContact Table (Junction table)

```sql
CREATE TABLE ApprovalRequestContact (
  id SERIAL PRIMARY KEY,
  approvalRequestId INTEGER REFERENCES ClientApprovalRequest(id),
  clientContactId INTEGER REFERENCES ClientContact(id),
  hasViewed BOOLEAN DEFAULT false,
  hasApproved BOOLEAN DEFAULT false,
  viewedAt TIMESTAMP,
  approvedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. ApprovalRequestVersion Table

```sql
CREATE TABLE ApprovalRequestVersion (
  id SERIAL PRIMARY KEY,
  approvalRequestId INTEGER REFERENCES ClientApprovalRequest(id),
  versionNumber INTEGER NOT NULL,
  fileUrl VARCHAR(255),
  comments TEXT,
  createdById INTEGER REFERENCES Users(id),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. ApprovalRequestComment Table

```sql
CREATE TABLE ApprovalRequestComment (
  id SERIAL PRIMARY KEY,
  approvalRequestId INTEGER REFERENCES ClientApprovalRequest(id),
  versionId INTEGER REFERENCES ApprovalRequestVersion(id),
  comment TEXT NOT NULL,
  createdById INTEGER, -- Can be null for client comments
  clientContactId INTEGER, -- Can be null for staff comments
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6. ClientAuthToken Table

```sql
CREATE TABLE ClientAuthToken (
  id SERIAL PRIMARY KEY,
  clientContactId INTEGER REFERENCES ClientContact(id),
  token VARCHAR(100) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  isUsed BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Client Management

- `GET /api/clients/contacts` - Get all contacts for clients
- `GET /api/clients/:id/contacts` - Get contacts for a specific client
- `POST /api/clients/:id/contacts` - Add a new contact to a client
- `PUT /api/clients/contacts/:id` - Update a client contact
- `DELETE /api/clients/contacts/:id` - Delete a client contact

### Approval Workflow

- `POST /api/approval-requests` - Create a new approval request
- `GET /api/approval-requests` - Get all approval requests (for staff)
- `GET /api/approval-requests/:id` - Get a specific approval request
- `GET /api/clients/:id/approval-requests` - Get approval requests for a client
- `POST /api/approval-requests/:id/versions` - Add a new version to an approval request
- `GET /api/approval-requests/:id/versions` - Get all versions of an approval request
- `POST /api/approval-requests/:id/comments` - Add a comment to an approval request
- `PUT /api/approval-requests/:id/status` - Update the status of an approval request
- `PUT /api/approval-requests/:id/published-url` - Update the published URL of an approval request

### Authentication

- `POST /api/client-auth/request-login` - Request a login token (OTP)
- `POST /api/client-auth/verify` - Verify a login token
- `GET /api/client-auth/me` - Get the current client user info

## Frontend Components/Pages

### Staff Portal

1. **Client Contact Management**

   - ClientContactForm - Add/edit client contacts
   - ClientContactList - Display client contacts for a client

2. **Content Upload & Management**
   - ApprovalRequestForm - Create new approval requests
   - ApprovalRequestList - List all approval requests with filters
   - ApprovalRequestDetail - View details of an approval request
   - VersionUploadForm - Upload a new version of content
   - ApprovalStatusBadge - Display approval status

### Client Portal

1. **Authentication**

   - ClientLoginPage - Request login token
   - ClientLoginVerifyPage - Verify login token

2. **Content Review**
   - ClientPortalLayout - Main layout for client portal
   - PendingApprovalsList - List of pending approvals
   - ApprovedContentList - List of approved content
   - ContentReviewPage - View and review content
   - CommentForm - Add comments to content

## Authentication Flow

1. Client requests access via email
2. System generates a one-time token with expiration (30 minutes)
3. Email sent with a unique link containing the token
4. Client clicks link and is authenticated if token is valid
5. System establishes a session cookie for continued access
6. Session expires after inactivity or logout

## Email Notification System

1. **Templates Needed:**

   - New Approval Request - Sent to client when content is uploaded
   - Approval Status Update - Sent to staff when client approves/rejects
   - New Version Available - Sent to client when staff uploads a new version
   - Login Token - Sent to client for passwordless login

2. **Email Service Integration:**
   - Use SendGrid or similar service for transactional emails
   - Create HTML templates with action buttons
   - Include tracking for email opens and link clicks

## File Storage

1. Use AWS S3 or similar for file storage
2. Implement secure, time-limited access to files
3. Support conversion/preview for different file types (PDF, Word, Google Doc)

## Implementation Steps

### Phase 1: Database Setup and Basic Structure

1. Create database tables
2. Set up API routes for client contacts
3. Create client contact management UI in existing clients section

### Phase 2: Staff Upload Functionality

1. Implement file upload to S3 (or chosen storage)
2. Create approval request form
3. Implement approval request listing and detail views
4. Add version tracking functionality

### Phase 3: Client Authentication

1. Implement passwordless authentication system
2. Create login flow for clients
3. Set up secure session management

### Phase 4: Client Portal UI

1. Create client portal layout
2. Implement pending approvals view
3. Implement approved content view
4. Create content review interface with commenting

### Phase 5: Email Notification System

1. Set up email templates
2. Implement email sending functionality
3. Add email tracking

### Phase 6: Testing and Refinement

1. User acceptance testing
2. Fix bugs and refine UI/UX
3. Performance optimization

## Timeline Estimate

- Phase 1: 1 week
- Phase 2: 2 weeks
- Phase 3: 1 week
- Phase 4: 2 weeks
- Phase 5: 1 week
- Phase 6: 1 week

Total estimated time: 8 weeks
