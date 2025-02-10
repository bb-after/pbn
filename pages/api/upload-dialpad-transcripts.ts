// pages/api/dialpad-transcripts.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import {
  createGoogleDoc,
  extractDocIdFromUrl,
  moveFileToFolder,
} from '../../utils/googleDocs';
import { getClientNameFromTranscript } from '../../utils/openai';

const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

import mysql from 'mysql2/promise';
import { insertDialpadTranscript } from './dialpad_transcripts';

const DIALPAD_API_TOKEN = process.env.DIALPAD_API_TOKEN;
const DIALPAD_CALLS_ENDPOINT = process.env.DIALPAD_CALLS_ENDPOINT || 'https://dialpad.com/api/v2/call';
const GOOGLE_DRIVE_PARENT_FOLDER = process.env.GOOGLE_DRIVE_PARENT_FOLDER;

/**
 * Downloads transcript content from the provided URL.
 */
async function downloadDialpadTranscript(callId: Number): Promise<string> {
  try {
    const transcriptEndpoint = `https://dialpad.com/api/v2/transcripts/${callId}`;
    const response = await await axios.get(transcriptEndpoint, {
        headers: {
          Authorization: `Bearer ${DIALPAD_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        // Optionally, include query parameters if required:
        // params: { start_date: '2022-01-01T00:00:00Z', end_date: '2022-01-31T23:59:59Z', limit: 200, offset: 0 },
      });
    // console.log('TRANSCRIPT!!!!', response.data);
    return response.data;

  } catch (error) {
    console.error('Error downloading transcript:', error);
    throw new Error('Failed to download transcript');
  }
}

export function formatTranscript(transcriptData: { call_id: string, lines: { type: string, time: string, name: string, content: string }[] }) : string {
  
    // Start with the call ID for context.
    let transcript = `Call ID: ${transcriptData.call_id}\n\n`;
  
    // Iterate over each line and format it without including the type.
    transcriptData.lines.forEach((line: { type: string, time: string, name: string, content: string }) => {
        if (line.type === 'transcript') {
            transcript += `[${line.time}] ${line.name}: ${line.content}\n`;
        }
    });
  
    return transcript;
  }


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET for scheduled tasks.
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Validate required environment variables
  // Use the endpoint as specified in your configuration.

  if (!DIALPAD_API_TOKEN || !GOOGLE_DRIVE_PARENT_FOLDER) {
    return res.status(500).json({
      message: 'Required environment variables are missing (Dialpad API token or Google Drive folder)',
    });
  }
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000; // 24 hours ago

    // We'll use the cursor pagination provided by the Dialpad API.
    let cursor: string | undefined = undefined;

    do {

      const params: any = {
        limit: 50,
        started_after: twentyFourHoursAgo,
        started_before: now,
      };

      if (cursor) {
        params.cursor = cursor;
      }

    // 1. Fetch calls from Dialpad
    const callsResponse = await axios.get(DIALPAD_CALLS_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${DIALPAD_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      params,
    });

    const calls = callsResponse.data.items;

    const MIN_CALL_THRESHOLD = 180; // in seconds
    console.log(`Found ${calls.length} calls`);
    console.log('!?!?!??!', calls);

    // 2. Process each call for transcript data.
    for (const call of calls) {
      const callId = call.call_id;

      const recordingDetails = call.recording_details;
      if (!recordingDetails || recordingDetails.length === 0) {
        console.log(`Call ${callId} has no recording details. Skipping.`);
        continue;
      }
      
      const durationInMs = parseInt(recordingDetails[0].duration, 10);
      const durationInSec = durationInMs / 1000;
      
      // Skip calls that are too short.
      if (durationInSec < MIN_CALL_THRESHOLD) {
        console.log(`Call ${callId} not long enough (${durationInSec} sec). Skipping.`);
        continue;
      } else {
        console.log(`Call is long enough, callID = ${callId}, length = ${durationInSec} sec.`);
        // console.log(`Call ${callId} `, call);

      }      

      const meetingTopic = call.meeting_topic || 'Dialpad Transcript';
      let transcriptContent: object | undefined;
      let formattedTranscript: string | undefined;

      const [rows] = await connection.query(
        'SELECT * FROM dialpad_transcripts WHERE call_id = ?',
        [callId]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`Call ${callId} has already been processed. Skipping.`);
        continue;
      }

            // Build the transcript endpoint URL per the Dialpad Transcripts GET reference.
        console.log(`Fetching transcript for call ${callId}`);
        const transcriptData = await downloadDialpadTranscript(callId);
        
        if (typeof transcriptData === 'string') {
          console.error(`Expected object but received string for call ${callId}`);
          continue;
        }
        
        if (!transcriptData || typeof transcriptData !== 'object' || !('lines' in transcriptData)) {
          console.error(`Invalid transcript data for call ${callId}`);
          continue;
        }
        
        transcriptContent = transcriptData;
        formattedTranscript = formatTranscript(transcriptContent);

      console.log(`Downloaded transcript for call ${callId}`);
      // console.log('transcriptContent!', formattedTranscript);

      // 4. Determine client name or category from the  transcript content.
      // 4. Determine client name.
      // If call.contact.name is set, use that; otherwise, get it via Anthropic.
      let clientName: string;
      if (call.contact && call.contact.name) {
        clientName = call.contact.name;
        console.log(`Using call.contact.name as client name: ${clientName}`);
      } else {
        clientName = (await getClientNameFromTranscript(formattedTranscript)) || 'Uncategorized';
        console.log(`Extracted client name: ${clientName}`);
      }

      // 5. Determine team employee from call.target.name.
      const teamEmployee = call.target && call.target.name ? call.target.name : null;
      if (teamEmployee) {
        console.log(`Team employee for call ${callId}: ${teamEmployee}`);
      } else {
        console.log(`No team employee info available for call ${callId}`);
      }
      

      // 6. Create a Google Doc with the transcript content.
      const docTitle = `Dialpad Transcript: ${meetingTopic}`;
      const docUrl = await createGoogleDoc(docTitle, formattedTranscript);
      console.log(`Created Google Doc: ${docUrl}`);

      await insertDialpadTranscript(connection, {
        callId: callId,
        docUrl: docUrl, // URL returned from createGoogleDoc
        clientName: clientName, // Client name extracted from transcript
        teamEmployee: teamEmployee, 
      });
      
      // 6. Move the document into the appropriate client folder.
      const docId = extractDocIdFromUrl(docUrl);
      await moveFileToFolder(docId, clientName);
    }

    // Update the cursor for the next page.
    cursor = callsResponse.data.cursor;
    console.log(`Next cursor: ${cursor}`);
  } while (cursor);

    await connection.end();
    res.status(200).json({ message: 'Dialpad transcripts processed and uploaded successfully.' });
  } catch (error: any) {
    if (connection) await connection.end();
    console.error('Error processing transcripts:', error.message);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
