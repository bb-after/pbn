# Google Authentication Integration for Client Portal

## Overview

The client portal now includes Google OAuth authentication to enable clients to comment directly on Google Docs while maintaining proper identity tracking. This implementation addresses the fundamental limitation that iframe-based Google Docs cannot be reliably controlled by external authentication states - instead, users explicitly choose their interaction mode upfront.

## ✅ Implemented Changes

### 1. Client Portal Request Detail Page (`pages/client-portal/requests/[id].tsx`)

#### **New Google Authentication Features:**

- **Explicit Mode Selection**: Users choose "Comment on Document" or "View Only" upfront for pending requests
- **Google OAuth Integration**: Added `@react-oauth/google` for secure authentication
- **Reliable Authentication Flow**: Ensures users are actually authenticated before enabling comment mode
- **Graceful Mode Switching**: Users can change their choice with a "Change Mode" button
- **Authentication State Management**: Tracks Google login status and access tokens

#### **UI Components Added:**

```tsx
// Mode selection interface (shown for pending requests only)
{
  request.status === 'pending' && !userChosenMode && (
    <Box sx={{ mb: 3, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
      <Typography variant="h6">How would you like to review this content?</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Button onClick={() => handleModeSelection('google_comment')}>
            <GoogleIcon /> Comment on Document
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          <Button onClick={() => handleModeSelection('readonly')}>
            <VisibilityIcon /> View Only
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

// Google authentication dialog (triggered when needed)
<Dialog open={showGoogleAuthPrompt}>
  <GoogleLoginButton onSuccess={handleGoogleLoginSuccess} />
</Dialog>;
```

#### **Smart Document URL Generation:**

```tsx
const getEmbeddableGoogleDocUrl = (
  url: string,
  status: string,
  isAuthenticated = false
): string => {
  // Determines the correct Google Doc mode based on:
  // - Authentication status
  // - Request status (pending vs completed)
  // - Returns comment mode only for authenticated pending requests
};
```

### 2. Backend Google Docs API Enhancement (`pages/api/google-docs/create.ts`)

#### **Improved Permissions Setting:**

```javascript
// Enhanced permission handling with fallback
try {
  // Primary: Set commenter permissions for anyone with link
  await drive.permissions.create({
    fileId: documentId,
    requestBody: {
      role: 'commenter',
      type: 'anyone',
    },
    sendNotificationEmail: false,
  });
} catch (error) {
  // Fallback: Set reader permissions if commenter fails
  await drive.permissions.create({
    fileId: documentId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    sendNotificationEmail: false,
  });
}
```

#### **Enhanced Response Data:**

```javascript
return res.status(200).json({
  success: true,
  docId: documentId,
  docUrl: `https://docs.google.com/document/d/${documentId}/edit`,
  permissions: {
    sharingAttempted: true,
    sharingSuccessful: permissionsSet,
    message: permissionsSet
      ? 'Document is publicly accessible for commenting'
      : 'Document created but may require manual sharing',
  },
});
```

## 🔧 Technical Implementation Details

### Authentication Flow

1. **Initial Load**: For pending requests, users see mode selection interface; completed requests show directly
2. **Mode Selection**: User explicitly chooses "Comment on Document" or "View Only"
3. **Google Login Prompt**: If "Comment on Document" is selected and user isn't authenticated, shows login dialog
4. **OAuth Process**: Uses `useGoogleLogin` hook with document/drive scopes
5. **Token Storage**: Stores access token in component state
6. **Document Display**: Shows document with appropriate Google Docs mode based on authentication status
7. **Mode Switching**: Users can change their choice anytime with "Change Mode" button

### Security Considerations

- **Identity Verification**: All comments are tied to authenticated Google accounts
- **Scoped Access**: Requests minimal required scopes (`auth/documents`, `auth/drive`)
- **Read-Only Fallback**: Users without Google accounts can still view and comment via separate UI
- **Token Handling**: Access tokens are stored in component state, not persisted

### Document Access Modes

| User Choice  | Authentication Status | Request Status | Document Mode  | Can Comment In-Doc        |
| ------------ | --------------------- | -------------- | -------------- | ------------------------- |
| View Only    | Any                   | Any            | `view`         | ❌ (Use comments section) |
| Comment Mode | Authenticated         | Pending        | `comment`      | ✅                        |
| Comment Mode | Not Authenticated     | Pending        | Login Required | Must authenticate first   |
| Auto-show    | Any                   | Completed      | `view`         | ❌ (Request completed)    |

## 🎯 User Experience

### For Authenticated Users (Comment Mode):

- Can comment directly on specific sections of the document
- Comments appear inline with proper attribution
- Real-time collaboration with document authors
- Comments are synced across all viewers

### For Non-Authenticated Users (View Only):

- Can view the full document content
- Can provide feedback via the comments section below
- No Google account required
- Feedback is still tracked and attributed to their client contact

### Seamless Integration:

- Toggle between modes without page refresh
- Clear visual indicators of current mode
- Helpful alerts explaining the differences
- Fallback options always available

## 🚀 Environment Setup

### Required Environment Variables:

```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID_CONTENT_APPROVAL=your_google_oauth_client_id
GOOGLE_CLIENT_EMAIL_CONTENT_APPROVAL=service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_CONTENT_APPROVAL=-----BEGIN PRIVATE KEY-----...
```

### Google Cloud Console Setup:

1. Enable Google Docs API and Google Drive API
2. Create OAuth 2.0 Client ID for web application
3. Add authorized origins (your domain)
4. Configure service account for document creation

## 📋 Testing Checklist

- [ ] Document loads in view-only mode by default
- [ ] Toggle switches to comment mode and prompts for Google login
- [ ] Successful Google authentication enables commenting
- [ ] Comments appear with proper user attribution
- [ ] Fallback to regular comments section works
- [ ] Document permissions allow "anyone with link can comment"
- [ ] Mode toggle works for pending requests only
- [ ] Completed requests remain view-only regardless of authentication

## 🔍 Troubleshooting

### Common Issues:

**Google Authentication Fails:**

- Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID_CONTENT_APPROVAL` environment variable
- Verify domain is added to authorized origins in Google Cloud Console

**Document Not Accessible:**

- Check Google Drive API permissions in backend
- Verify service account has proper scopes
- Ensure document sharing is set correctly

**Comments Not Appearing:**

- Verify user is authenticated before commenting
- Check browser console for API errors
- Ensure document is in comment mode, not view mode

## 🎯 Impact

### Business Benefits:

- **Reliable Feedback Process**: Clients explicitly choose how to provide feedback
- **Improved Attribution**: All Google Doc comments tied to authenticated identities
- **Clear User Intent**: Users understand their capabilities before interacting
- **Universal Accessibility**: Works for users with or without Google accounts

### Technical Benefits:

- **Reliable Authentication**: No more iframe authentication ambiguity
- **Explicit User State**: System knows exactly what the user intends to do
- **Robust Error Handling**: Graceful fallbacks for authentication failures
- **Predictable Behavior**: Document behavior matches user expectations
- **Security**: Proper scope limitations and token management
