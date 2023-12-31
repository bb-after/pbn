import { NextApiRequest, NextApiResponse } from 'next';
import { OkPacket, RowDataPacket } from 'mysql2';
import mysql from 'mysql2/promise'; // Import the 'promise' version of mysql2
import axios from 'axios';

type PostToWordPressRequest = {
    title: string;
    content: string;
    userToken: string;
    clientName: string;
    categories: number[]; // Array of category IDs
    tags: number[]; // Array of tag IDs
  };

// Define your MySQL connection options
const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    const { title, content, userToken, categories, tags, clientName } = req.body as PostToWordPressRequest;
    try {
      // Create a MySQL connection
      const connection = await mysql.createConnection(dbConfig);

      // Get a random active PBN site
      const [queryResult] = await connection.execute(
        `SELECT * FROM pbn_sites 
        LEFT JOIN (
            SELECT DISTINCT pbn_site_id
            FROM pbn_site_submissions
            WHERE client_name = '${clientName}'
		    AND (created <= DATE_SUB(NOW(), INTERVAL 3 MONTH) OR created IS NULL)
        ) AS recent_submissions
        ON pbn_sites.id = recent_submissions.pbn_site_id
        WHERE pbn_sites.active = 1
        ORDER BY RAND() LIMIT 1;`
      );

      const rows: RowDataPacket[] = queryResult as RowDataPacket[];
      if (!rows || rows.length === 0) {
        // Handle the case where no active blogs are found
        res.status(404).json({ error: 'No active blogs found in the database' });
        return;
      }
      const { id, domain, password, login } = rows[0];
  
    // Check if the content has already been submitted
    const [queryResultExistingArticle] = await connection.execute(
        'SELECT * FROM pbn_site_submissions WHERE content = ? LIMIT 1',
        [content]
    );

    const exists: RowDataPacket[] = queryResultExistingArticle as RowDataPacket[];
    if (exists && exists.length > 0) {
        // Handle the case where content has already been uploaded
        res.status(400).json({ error: 'Content already uploaded to PBN' });
        return;
    }

      // Make a POST request to WordPress using the retrieved credentials
      const response = await axios.post(
        `${domain}/wp-json/wp/v2/posts`,
        {
          title: title,
          content: content,
          status: 'publish',
        },
        {
          auth: {
            username: login,
            password: password,
          },
        }
      );
  
      // Insert submission record into the database
      const [insertResult] = await connection.execute(
        'INSERT INTO pbn_site_submissions (pbn_site_id, title, content, user_token, submission_response, client_name) VALUES (?, ?, ?, ?, ?, ?)',
        [id, title, content, userToken, response.data.link, clientName]
      );

      res.status(201).json(response.data);
  
      // Close the MySQL connection
      await connection.end();
    } catch (error: any) {
      console.error(error);

      // Handle other errors here and send appropriate responses
      if (error.message === 'No active blogs found in the database') {
        res.status(404).json({ error: 'No active blogs found in the database' });
      } else if (error.message === 'Content already uploaded to PBN') {
        res.status(400).json({ error: 'Content already uploaded to PBN' });
      } else {
        res.status(500).json({ error: 'Failed to post article to WordPress' });
      }
    }
  }
