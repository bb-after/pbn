// pages/api/zoom-recordings-webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { createGoogleDoc } from '../../utils/googleDocs';
import axios from 'axios';

async function downloadTranscript(transcriptUrl: string, downloadToken: string): Promise<string> {
  try {
    // If the password is expected as a query parameter in the URL:
    const urlWithPassword = `${transcriptUrl}?access_token=${encodeURIComponent(downloadToken)}`;
    
    // Fetch the transcript content with the password included in the URL
    const response = await axios.get(urlWithPassword, {
      responseType: 'text', // Ensure we get the content as text (VTT format)
    });

    // Return the transcript content as text (VTT format)
    return response.data;
  } catch (error) {
    console.error('Error downloading transcript:', error);
    throw new Error('Failed to download transcript');
  }
}

//eyJzdiI6IjAwMDAwMSIsInptX3NrbSI6InptX28ybSIsInR5cCI6IkpXVCIsImFsZyI6IkVTMjU2In0.eyJhdWQiOiJXZWJSZWNEb3dubG9hZCIsImFjY291bnRJZCI6InFHVXBnb1VtUThLRDh1dnJLUktCUnciLCJpc3MiOiJFdmVudENvbnN1bWVyUmVjRG93bmxvYWQiLCJtaWQiOiIwSCt2OE9KTFRSeVBCby81VG1mTUhRPT0iLCJleHAiOjE3MzgxNzgwNTQsImlhdCI6MTczODA5MTY1NCwidXNlcklkIjoidm13ZThfQWJUbU81TUlyZ1JWU3J2ZyJ9.r6VtbEwWnQOINFINAjh00Z0actW4RL5nsLHN9OoTmPzLQs8i_Zpom_c-8j08O2PgU86c8DPspYonvs2HZywzSg

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const zoomWebhookSecret = process.env.ZOOM_RECORDING_WEBHOOK_SECRET;
  if (!zoomWebhookSecret) {
    return res.status(500).json({ message: 'Zoom webhook secret not configured' });
  }

  const signature = req.headers['x-zm-signature'] as string;
  const timestamp = req.headers['x-zm-request-timestamp'] as string;
  console.log('rawBody?', req);
  const payload = await getRawBody(req);
  console.log('payload?', payload);

  const message = `v0:${timestamp}:${payload}`;
  const hash = crypto.createHmac('sha256', zoomWebhookSecret).update(message).digest('hex');
  const expectedSignature = `v0=${hash}`;

  if (signature !== expectedSignature) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  const event = JSON.parse(payload);

  if (event.event === 'endpoint.url_validation') {
    const plainToken = event.payload.plainToken;
    const encryptedToken = crypto.createHmac('sha256', zoomWebhookSecret).update(plainToken).digest('hex');
    return res.status(200).json({ plainToken, encryptedToken });
  }

  // Handle other event types here
  console.log('Received Zoom event:', event);

    // Handle transcript events
if (event.event === 'recording.transcript_completed') {
    const meetingTopic = event.payload.object.topic;
    const transcriptUrl = event.payload.object.download_url;
    const downloadToken = event.payload.object.download_token;
    console.log('ready to download...');
    console.log('meetingTopic = '+meetingTopic);
    console.log('transcriptURL = '+transcriptUrl);
    console.log('downloadToken= '+downloadToken);
    // Download transcript content (you'll need to implement this)
    const transcriptContent = await downloadTranscript(transcriptUrl, downloadToken);

    console.log('transcriptContent? ', transcriptContent);
    // Create Google Doc
    const docUrl = await createGoogleDoc(`Zoom Transcript: ${meetingTopic}`, transcriptContent);
    
    console.log(`Created Google Doc: ${docUrl}`);
    }

    
  res.status(200).json({ message: 'Webhook received' });
}

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
