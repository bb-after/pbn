import type { Connection } from 'mysql2/promise';

interface ProcessedCallData {
  callId: string;
  docUrl?: string;
  clientName?: string;
  teamEmployee?: string;
}

/**
 * Inserts a processed call into the dialpad_transcripts table.
 * If a record with the same callId already exists, it logs a warning.
 *
 * @param connection - A MySQL connection from mysql2/promise.
 * @param data - An object containing callId, docUrl, and clientName.
 */
export async function insertDialpadTranscript(
  connection: Connection,
  data: ProcessedCallData
): Promise<void> {
  const sql = `
    INSERT INTO dialpad_transcripts (call_id, document_url, client_name, team_employee)
    VALUES (?, ?, ?, ?)
  `;
  try {
    await connection.execute(sql, [
      data.callId,
      data.docUrl || null,
      data.clientName || null,
      data.teamEmployee || null,
    ]);
    console.log(`Inserted processed call ${data.callId} successfully.`);
  } catch (error: any) {
    // Handle duplicate entry (ER_DUP_ENTRY) gracefully.
    if (error.code === 'ER_DUP_ENTRY') {
      console.warn(`Call ${data.callId} has already been processed. - ${error.message}`);
    } else {
      console.error('Error inserting processed call:', error);
      throw error;
    }
  }
}

4773723987296256