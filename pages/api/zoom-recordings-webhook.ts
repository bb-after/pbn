// pages/api/zoom-recordings-webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { createGoogleDoc, createOrGetFolder, extractDocIdFromUrl, moveFileToFolder } from '../../utils/googleDocs';
import axios from 'axios';
import { getClientNameFromTranscript } from '../../utils/openai';

async function downloadTranscript(transcriptUrl: string, downloadToken: string): Promise<string> {

  if (process.env.NODE_ENV !== 'production') {
    console.log("Mocking transcript download...");
    return `
    Fake transcript content: 
    [00:00:05] Host: Welcome to the meeting. Today, we’re discussing project updates for Sony Pictures.  
    [00:00:12] Speaker 1: Yes, Sony Picturs has made significant progress on their latest initiatives in AI technology.  
    [00:00:30] Speaker 2: Our collaboration with Sony Pictures is really paying off. We’re expecting a 20% growth in Q2.  
    [00:00:45] Speaker 3: I think the new AI product they’re working on will revolutionize the industry.  
    [00:01:00] Host: Let’s talk about the upcoming product launch. Sony Pictures has a huge event next month.  
    [00:01:15] Speaker 1: We’re expecting around 5,000 attendees at the launch, and we’ll be unveiling several new features.  
    [00:01:30] Speaker 2: Sony Pictures is also planning to expand into the European market by Q3.  
    [00:01:45] Host: That sounds like a major milestone. Let’s dive into the marketing strategy for the product launch.  
    [00:02:00] Speaker 3: Our marketing team has already started working on the promotional materials for the launch event.  
    [00:02:15] Speaker 1: We’re also looking at influencer partnerships to create buzz around the product.  
    [00:02:30] Host: Great! Now, moving on to budget and resource allocation for the next phase.  
    [00:02:45] Speaker 2: We’ll need to allocate more resources for the international market expansion, especially in terms of localization.  
    [00:03:00] Host: We should definitely ensure that we have enough resources for localization. Alright, let’s wrap up with any final questions or comments.  
    [00:03:15] Speaker 1: No further questions, I think we’re all set for the next steps.  
    [00:03:30] Speaker 2: Same here, everything is clear.  
    [00:03:45] Host: Excellent, thank you all for your time today. Let’s make this launch a success!
  `;

  }

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const zoomWebhookSecret = process.env.ZOOM_RECORDING_WEBHOOK_SECRET;
  if (!zoomWebhookSecret) {
    return res.status(500).json({ message: 'Zoom webhook secret not configured' });
  }

    // Get the signature and timestamp from the headers
    const signature = req.headers['x-zm-signature'] as string;
    const timestamp = req.headers['x-zm-request-timestamp'] as string;
  
    const DEFAULT_GOOGLE_DRIVE_FOLDER = process.env.GOOGLE_DRIVE_PARENT_FOLDER;
    // Directly access the parsed body (Next.js automatically parses JSON requests)
    const payload = req.body;
    console.log('Received payload:', payload);
  
    // Build the message to verify the signature
    const message = `v0:${timestamp}:${JSON.stringify(payload)}`;
    const hash = crypto.createHmac('sha256', zoomWebhookSecret).update(message).digest('hex');
    const expectedSignature = `v0=${hash}`;
  
    // Check if the signatures match
    if (process.env.NODE_ENV !== 'production') {
      console.warn("Skipping signature validation for local testing...");
    } else if (signature !== expectedSignature) {
      return res.status(401).json({ message: 'Invalid signature' });
    }
    

  const event = payload; 

  // Handle other event types here
  console.log('Received Zoom event:', event);
  
  if (event.event === 'endpoint.url_validation') {
    const plainToken = event.payload.plainToken;
    const encryptedToken = crypto.createHmac('sha256', zoomWebhookSecret).update(plainToken).digest('hex');
    return res.status(200).json({ plainToken, encryptedToken });
  }


    // Handle transcript events
    if (event.event === 'recording.transcript_completed') {
      const meetingTopic = event.payload.object.topic;
      const transcriptUrl = event.payload.object.share_url;
      const downloadToken = event.download_token;
  
      console.log('ready to download...');
      console.log('meetingTopic = '+meetingTopic);
      console.log('transcriptURL = '+transcriptUrl);
      console.log('downloadToken= '+downloadToken);
        
      // Download transcript content
      const transcriptContent = await downloadTranscript(transcriptUrl, downloadToken);

      console.log('transcriptContent? ', transcriptContent);



      
      
      // Extract client name (fallback to "Uncategorized" if none found)
      const clientName = (await getClientNameFromTranscript(transcriptContent)) || "Uncategorized";


      // Create Google Doc
      const docUrl = await createGoogleDoc(`Zoom Transcript: ${meetingTopic}`, transcriptContent);
      console.log(`Created Google Doc: ${docUrl}`);
      console.log(`Client Name: ${clientName}`);
    
      // Get or create client folder inside the fixed parent folder
      // const clientFolderId = await createOrGetFolder(clientName, DEFAULT_GOOGLE_DRIVE_FOLDER);
      // Move the document to the client folder
      const docId = extractDocIdFromUrl(docUrl);
      await moveFileToFolder(docId, clientName);
      console.log(`Moved document to ${clientName}'s folder`);


    }
  
    res.status(200).json({ message: 'Webhook received' });
  }
  