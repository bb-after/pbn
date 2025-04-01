import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise'; // Import mysql
import { callOpenAI } from 'utils/openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Database configuration - ensure these ENV variables are set
  const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  let connection: mysql.Connection | null = null;

  try {
    const { url, keywords, client } = req.body; // Assuming 'client' is the client_name

    if (!url || !keywords || !keywords.length || !client) {
      return res.status(400).json({
        error: 'Missing required parameters: url, keywords, and client name are required',
      });
    }

    // --- Fetch Client Industry ---
    let industryOrTopic = 'General Business'; // Default value
    try {
      connection = await mysql.createConnection(dbConfig);
      const [clientRows] = await connection.execute<mysql.RowDataPacket[]>(
        `SELECT c.client_id, i.industry_name 
         FROM clients c
         LEFT JOIN clients_industry_mapping cim ON c.client_id = cim.client_id
         LEFT JOIN industries i ON cim.industry_id = i.industry_id
         WHERE c.client_name = ?
         ORDER BY i.industry_name ASC  -- Prioritize if multiple industries exist
         LIMIT 1`,
        [client]
      );

      if (clientRows.length > 0 && clientRows[0].industry_name) {
        industryOrTopic = clientRows[0].industry_name;
      }
    } catch (dbError) {
      console.error('Database error fetching client industry:', dbError);
      // Proceed with the default industry if DB fails
    } finally {
      if (connection) {
        await connection.end();
        connection = null; // Reset connection variable after closing
      }
    }
    // --- End Fetch Client Industry ---

    // --- Construct the Detailed Prompt ---
    const keywordsString = keywords.join(', ');
    const detailedPrompt = `
You are an expert content writer tasked with creating a short, engaging blog post (approx. 300-500 words) for a Private Blog Network (PBN), suitable for a general audience.

**Input Data:**
*   Target URL to Link To: ${url}
*   Keywords for Target URL Anchor Text: ${keywordsString} (Use ONE of these)
*   Client Associated with Target URL: ${client}
*   Relevant Industry/Topic: ${industryOrTopic}

**Instructions:**

1.  **Determine Article Focus:** Based on the **Relevant Industry/Topic** (${industryOrTopic}), choose a specific, engaging subject for the article that is *tangentially related*. **Crucially, DO NOT write the article directly about the Keywords (${keywordsString})**. The article should provide value to someone interested in the ${industryOrTopic}.
2.  **Primary Link Integration:** Seamlessly weave a hyperlink to the **Target URL** (${url}) into the article's content. The anchor text for this link MUST be exactly **ONE** of the provided **Keywords** (${keywordsString}). Choose the keyword that fits most naturally.
3.  **Organic Link Integration:** Include 1 or 2 additional hyperlinks to *different*, *external*, *authoritative* websites relevant to the article's specific subject.
    *   These links must appear naturally within the text.
    *   Use descriptive, natural phrases as anchor text (e.g., "according to recent studies", "learn more about this technique"). **DO NOT use the Target Keywords (${keywordsString}) as anchor text for these organic links.**
    *   Ensure these links point to reputable sources (e.g., well-known industry sites, news articles, research papers, educational resources). Avoid linking to direct competitors unless contextually necessary.
4.  **Link Count:** The final article must contain exactly 2 or 3 hyperlinks in total (1 primary link + 1 or 2 organic links).
5.  **Tone and Quality:** Write in a clear, informative, and engaging tone. Ensure high-quality writing with correct grammar and spelling. Avoid overly promotional language.
6.  **Output Format:** Respond **ONLY** with a valid JSON object containing the following two keys and nothing else. Do not include any introductory text, explanations, markdown formatting, or anything before or after the JSON object itself:
    *   "title": (string) A compelling and relevant title for the article (max 70 characters).
    *   "content": (string) The full article content formatted as clean HTML (including paragraphs <p> with standard spacing, links <a>, lists <ul>/<ol> if needed).

**Example Scenario:**
*   If the Target URL is about 'dog grooming services' and the keyword is 'best dog clippers', and the industry is 'Pet Care', the article should NOT be about 'best dog clippers'. It could be about 'Common Mistakes Pet Owners Make When Grooming at Home' or 'Choosing the Right Brush for Your Dog's Coat Type', and *within* that article, naturally link 'best dog clippers' to the target URL, and add 1-2 other links to authoritative pet care sites (e.g., ASPCA, Humane Society) using natural anchor text.
`;
    // --- End Construct Prompt ---

    // --- Make Single AI Call ---
    const aiResponseString = await callOpenAI({
      wordCount: 400, // Target word count for the article body
      keywords: [], // Let the prompt handle keywords now
      keywordsToExclude: [],
      sourceUrl: '',
      sourceContent: '',
      useSourceContent: false,
      engine: 'claude-3-7-sonnet-20250219', // Or your preferred engine
      language: 'English',
      backlinks: [], // Let the prompt handle links now
      tone: [], // Tone defined in the prompt
      otherInstructions: detailedPrompt,
      temperature: 0.7, // Adjust temperature as needed for creativity/consistency,
      customPrompt: detailedPrompt, // Add this property to override the default prompt
    });

    if (!aiResponseString) {
      throw new Error('Failed to generate article preview from AI');
    }

    // --- Parse AI Response ---
    let title = 'Generated Article Preview';
    let content = '<p>Error: Could not parse AI response.</p>';
    try {
      // First, clean any control characters that might be in the response
      const cleanedResponse = aiResponseString.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

      // Try parsing as direct JSON first
      try {
        const directJson = JSON.parse(cleanedResponse);
        if (typeof directJson.title === 'string' && typeof directJson.content === 'string') {
          title = directJson.title.trim();
          content = directJson.content.trim();
          console.log('Successfully parsed direct JSON response');
          // We got valid JSON, skip the regex matching
        } else {
          throw new Error(
            'Direct JSON parse succeeded but did not contain valid title and content'
          );
        }
      } catch (directJsonError: any) {
        console.log('Direct JSON parse failed, trying regex extraction:', directJsonError.message);

        // If direct parsing fails, try to extract JSON from markdown code blocks or just find JSON-like structure
        const jsonMatch = cleanedResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```|({[\s\S]*})/);
        if (!jsonMatch || (!jsonMatch[1] && !jsonMatch[2])) {
          throw new Error('No valid JSON object found in AI response.');
        }

        const jsonString = jsonMatch[1] || jsonMatch[2]; // Get content inside ```json ... ``` or the assumed JSON object

        // Clean the extracted JSON string
        const cleanedJsonString = jsonString
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\\'/g, "'") // Handle escaped single quotes
          .replace(/\t/g, ' '); // Replace tabs with spaces

        const parsedResponse = JSON.parse(cleanedJsonString);

        if (
          typeof parsedResponse.title === 'string' &&
          typeof parsedResponse.content === 'string'
        ) {
          title = parsedResponse.title.trim();
          content = parsedResponse.content.trim();
        } else {
          throw new Error('Parsed JSON does not contain valid title and content strings.');
        }
      }
    } catch (parseError: any) {
      console.error('Error parsing AI JSON response:', parseError);
      console.error('Raw AI response string:', aiResponseString);
      // Keep default error content
      content = `<p>Error processing AI response. Please try again.</p><p>Details: ${parseError.message}</p>`;
    }
    // --- End Parse AI Response ---

    // Return the preview data
    return res.status(200).json({
      title: title,
      content: content,
    });
  } catch (error: any) {
    console.error('Error generating article preview:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate article preview',
    });
  }
}
