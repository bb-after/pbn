import AWS from 'aws-sdk';
import { getBaseUrl } from './config';

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

// Create SES service object
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

interface EmailOptions {
  to: string | string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  fromEmail?: string;
  replyTo?: string | string[];
}

/**
 * Send an email using Amazon SES
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, htmlBody, textBody, fromEmail, replyTo } = options;

  // Convert to array if a single email is provided
  const toAddresses = Array.isArray(to) ? to : [to];

  // Prepare the email parameters
  const params: AWS.SES.SendEmailRequest = {
    Source: fromEmail || process.env.SES_FROM_EMAIL || 'noreply@example.com',
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: 'UTF-8',
        },
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8',
        },
      },
    },
  };

  // Add ReplyToAddresses if provided
  if (replyTo) {
    params.ReplyToAddresses = Array.isArray(replyTo) ? replyTo : [replyTo];
  }

  try {
    await ses.sendEmail(params).promise();
    console.log(`Email sent to ${toAddresses.join(', ')}`);
  } catch (error) {
    console.error('Error sending email with AWS SES:', error);
    throw error;
  }
}

/**
 * Send a client portal login email
 */
export async function sendLoginEmail(contact: any, token: string, request?: any): Promise<void> {
  const loginUrl = `${getBaseUrl()}/client-portal/verify?token=${token}${request ? `&requestId=${request.request_id}` : ''}`;

  // HTML email content with optional request information
  let htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Content Approval Portal</h2>
      <p>Hello ${contact.name},</p>
  `;

  // Add request-specific information if available
  if (request) {
    htmlBody += `
      <p>New content has been submitted for your approval for <strong>${contact.client_name}</strong>.</p>
      <div style="background-color: #f5f5f5; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${request.title}</h3>
        ${request.description ? `<p>${request.description}</p>` : ''}
      </div>
      <p>Please review this content and provide your approval or feedback.</p>
    `;
  } else {
    htmlBody += `
      <p>You have requested access to the Content Approval Portal for <strong>${contact.client_name}</strong>.</p>
    `;
  }

  // Continue with the login button and remainder of email
  htmlBody += `
      <p style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          ${request ? 'Login & Review Content' : 'Login to Portal'}
        </a>
      </p>
      <p>This login link will expire in 7 days.</p>
      <p>If you did not expect this email, please contact your account manager.</p>
      <p>Thank you,<br>Content Approval Team</p>
    </div>
  `;

  // Plain text version for email clients that don't support HTML
  let textBody = `
    Content Approval Portal
    
    Hello ${contact.name},
  `;

  // Add request-specific information in text version if available
  if (request) {
    textBody += `
    
    New content has been submitted for your approval for ${contact.client_name}.
    
    Title: ${request.title}
    ${request.description ? `Description: ${request.description}\n` : ''}
    
    Please review this content and provide your approval or feedback.
    `;
  } else {
    textBody += `
    
    You have requested access to the Content Approval Portal for ${contact.client_name}.
    `;
  }

  // Continue with login link and remainder of text email
  textBody += `
    
    Click the link below to login. This link will expire in 7 days.
    
    ${loginUrl}
    
    If you did not expect this email, please contact your account manager.
    
    Thank you,
    Content Approval Team
  `;

  await sendEmail({
    to: contact.email,
    subject: request
      ? `[Action Required] New Content for Approval - ${request.title}`
      : `${contact.client_name} - Login Link for Content Approval Portal`,
    htmlBody,
    textBody,
  });
}

/**
 * Send a new approval request notification email to client
 * @deprecated Use sendLoginEmail with a request parameter instead for proper authentication
 */
export async function sendNewApprovalRequestEmail(contact: any, request: any): Promise<void> {
  // Create approval URL
  const approvalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/client-portal/requests/${request.request_id}`;

  // HTML email content
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Content for Approval</h2>
      <p>Hello ${contact.name},</p>
      <p>New content has been submitted for your approval for <strong>${contact.client_name}</strong>.</p>
      <div style="background-color: #f5f5f5; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${request.title}</h3>
        ${request.description ? `<p>${request.description}</p>` : ''}
      </div>
      <p>Please review this content and provide your approval or feedback.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${approvalUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Review Content
        </a>
      </p>
      <p>Thank you,<br>Content Approval Team</p>
    </div>
  `;

  // Plain text version for email clients that don't support HTML
  const textBody = `
    New Content for Approval
    
    Hello ${contact.name},
    
    New content has been submitted for your approval for ${contact.client_name}.
    
    Title: ${request.title}
    ${request.description ? `Description: ${request.description}\n` : ''}
    
    Please review this content and provide your approval or feedback.
    
    Review Content: ${approvalUrl}
    
    Thank you,
    Content Approval Team
  `;

  await sendEmail({
    to: contact.email,
    subject: `[Action Required] New Content for Approval - ${request.title}`,
    htmlBody,
    textBody,
  });
}

/**
 * Send notification to staff when a client approves or rejects content
 */
export async function sendClientDecisionEmail(
  staffEmail: string,
  clientName: string,
  contactName: string,
  request: any,
  decision: 'approved' | 'rejected',
  comments?: string
): Promise<void> {
  // Create request URL for staff
  const requestUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/client-approval/requests/${request.request_id}`;

  const decisionText = decision === 'approved' ? 'approved' : 'rejected';
  const decisionColor = decision === 'approved' ? '#4CAF50' : '#F44336';

  // HTML email content
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Content ${decision === 'approved' ? 'Approved' : 'Rejected'} by Client</h2>
      <p>${contactName} from ${clientName} has ${decisionText} the following content:</p>
      <div style="background-color: #f5f5f5; border-left: 4px solid ${decisionColor}; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${request.title}</h3>
        ${request.description ? `<p>${request.description}</p>` : ''}
        <p><strong>Status:</strong> <span style="color: ${decisionColor};">${decisionText.toUpperCase()}</span></p>
      </div>
      ${
        comments
          ? `
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Client Comments:</h4>
          <p>${comments}</p>
        </div>
      `
          : ''
      }
      <p style="text-align: center; margin: 30px 0;">
        <a href="${requestUrl}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          View Request Details
        </a>
      </p>
    </div>
  `;

  // Plain text version for email clients that don't support HTML
  const textBody = `
    Content ${decision === 'approved' ? 'Approved' : 'Rejected'} by Client
    
    ${contactName} from ${clientName} has ${decisionText} the following content:
    
    Title: ${request.title}
    ${request.description ? `Description: ${request.description}\n` : ''}
    Status: ${decisionText.toUpperCase()}
    
    ${comments ? `Client Comments: ${comments}\n` : ''}
    
    View Request Details: ${requestUrl}
  `;

  await sendEmail({
    to: staffEmail,
    subject: `Client ${decision === 'approved' ? 'Approved' : 'Rejected'} Content - ${request.title}`,
    htmlBody,
    textBody,
  });
}

/**
 * Send notification to client when a new version is uploaded
 */
export async function sendNewVersionEmail(contact: any, request: any, version: any): Promise<void> {
  // Create approval URL
  const approvalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/client-portal/requests/${request.request_id}`;

  // HTML email content
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Version Available for Review</h2>
      <p>Hello ${contact.name},</p>
      <p>A new version of content has been uploaded for <strong>${contact.client_name}</strong> and requires your review.</p>
      <div style="background-color: #f5f5f5; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${request.title}</h3>
        <p><strong>Version:</strong> ${version.version_number}</p>
        ${version.comments ? `<p><strong>Comments:</strong> ${version.comments}</p>` : ''}
      </div>
      <p>Please review this new version and provide your approval or feedback.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${approvalUrl}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          Review New Version
        </a>
      </p>
      <p>Thank you,<br>Content Approval Team</p>
    </div>
  `;

  // Plain text version for email clients that don't support HTML
  const textBody = `
    New Version Available for Review
    
    Hello ${contact.name},
    
    A new version of content has been uploaded for ${contact.client_name} and requires your review.
    
    Title: ${request.title}
    Version: ${version.version_number}
    ${version.comments ? `Comments: ${version.comments}\n` : ''}
    
    Please review this new version and provide your approval or feedback.
    
    Review New Version: ${approvalUrl}
    
    Thank you,
    Content Approval Team
  `;

  await sendEmail({
    to: contact.email,
    subject: `[Action Required] New Version for Review - ${request.title}`,
    htmlBody,
    textBody,
  });
}

/**
 * Send notification to client when a staff member adds a comment
 */
export async function sendNewStaffCommentEmail(
  contactEmail: string,
  staffName: string,
  requestTitle: string,
  requestId: number,
  commentText: string
): Promise<void> {
  // Create link to the client portal request page
  const portalLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/client-portal/requests/${requestId}`;

  // HTML email content
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Comment on Content Request</h2>
      <p>Hello,</p>
      <p>A new comment has been added by <strong>${staffName || 'Staff'}</strong> regarding the content request: <strong>${requestTitle}</strong>.</p>
      <div style="background-color: #f5f5f5; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Comment:</h4>
          <p><em>${commentText}</em></p>
      </div>
      <p>You can view the request and the full comment thread here:</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="${portalLink}" style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
          View Request
        </a>
      </p>
      <p>Thank you,<br>Content Approval Team</p>
    </div>
  `;

  // Plain text version
  const textBody = `
    New Comment on Content Request
    
    Hello,
    
    A new comment has been added by ${staffName || 'Staff'} regarding the content request: ${requestTitle}.
    
    Comment: ${commentText}
    
    You can view the request and the full comment thread here:
    ${portalLink}
    
    Thank you,
    Content Approval Team
  `;

  await sendEmail({
    to: contactEmail,
    subject: `New Comment on "${requestTitle}"`,
    htmlBody,
    textBody,
  });
}
