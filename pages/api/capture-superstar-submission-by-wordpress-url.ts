// pages/api/capture-superstar-submission-by-wordpress-url.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2';
import mysql from 'mysql2/promise';
import { parse } from 'url';
import axios from 'axios';
import cheerio from 'cheerio'; // Import cheerio to scrape HTML

// Define your MySQL connection options
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { url, clientName, userToken, categories } = req.body;

  if (!url || !clientName || !userToken) {
    return res.status(400).json({ message: 'Missing URL, Client Name, or User Token' });
  }

  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);

    // 1. Extract domain from the URL
    const { hostname } = parse(url);

    if (!hostname) {
      return res.status(400).json({ message: 'Invalid URL provided' });
    }

    // Add 'https://' to the hostname
    const fullDomain = `https://${hostname}`;

    // 2. Lookup the domain in the `superstar_sites` table
    const [submission] = await connection.query(
      'SELECT * FROM superstar_sites WHERE domain = ?',
      [fullDomain]
    );
    const superstarSite: RowDataPacket[] = submission as RowDataPacket[];

    if (!superstarSite.length) {
      return res.status(404).json({ message: 'Superstar site not found' });
    }

    // Get the site details
    const { id: superstarSiteId } = superstarSite[0];

    // 3. Scrape the WordPress post to fetch the article details
    const response = await axios.get(url);
    const html = response.data;

    // Use cheerio to load and parse the HTML
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr('content') || $('title').text();
    const content = $('.entry-content').html(); // Assuming that content is within a class "entry-content"
    
    if (!title || !content) {
    //   return res.status(400).json({ message: 'Unable to scrape post content' });
    }

    // 4. Insert the data into the `superstar_site_submissions` table
    await connection.execute(
      `INSERT INTO superstar_site_submissions 
        (superstar_site_id, title, content, client_name, categories, submission_response, autogenerated) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        superstarSiteId,
        title,
        content,
        clientName,
        categories,
        url, // Store the full URL as submission response
        0, // Manual entry (autogenerated = 0)
      ]
    );

    // Close the connection
    await connection.end();

    // 5. Respond with success
    return res.status(200).json({ message: 'Submission saved successfully' });

  } catch (error: any) {
    console.error('Error capturing submission:', error);

    // Close the connection in case of error
    if (connection) {
      await connection.end();
    }

    return res.status(500).json({ message: 'Server error', error: error.message });
  }
}
