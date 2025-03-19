import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2';
import mysql from 'mysql2/promise'; // Import the 'promise' version of mysql2
import axios from 'axios';
import { getSlugFromUrl, findPostIdBySlug } from '../../utils/urlUtils';
import { getOrCreateCategory } from '../../utils/categoryUtils'; // Import the reusable function

type PostToWordPressRequest = {
    title: string;
    content: string;
    userToken: string;
    clientName: string;
    category: string; // Array of category names
    tags: number[]; // Array of tag IDs
    submissionId?: number;
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
    const { title, content, userToken, category, tags, clientName, submissionId } = req.body as PostToWordPressRequest;
    try {
      // Create a MySQL connection
      const connection = await mysql.createConnection(dbConfig);
      let pbnSiteId, wordpressPostUrl;

      if (submissionId) {
          // Attempt to fetch the existing submission
          const [submission] = await connection.query(
              'SELECT * FROM pbn_site_submissions join pbn_sites on pbn_sites.id = pbn_site_submissions.pbn_site_id WHERE pbn_site_submissions.id = ?',
              [submissionId]
          );
          const submissionRow: RowDataPacket[] = submission as RowDataPacket[];

          if (submissionRow.length > 0) {
              // Extract necessary info if you need to update the WordPress post
              pbnSiteId = submissionRow[0].pbn_site_id;
              wordpressPostUrl = submissionRow[0].submission_response; // Assuming you store WordPress post ID in your table
              const domain = submissionRow[0].domain;
              const login = submissionRow[0].login;
              const password = submissionRow[0].password;
              const slug = getSlugFromUrl(wordpressPostUrl);
              const wordPressPostId = await findPostIdBySlug(domain, slug, { username: login, password });
 
              // Update the existing submission record
              await connection.query(
                  'UPDATE pbn_site_submissions SET title = ?, content = ?, categories = ?, client_name = ? WHERE id = ?',
                  [title, content, category, userToken, clientName, submissionId]
              );

              const response = await axios.put(
                `${domain}/wp-json/wp/v2/posts/${wordPressPostId}`,
                {
                  title: title,
                  content: content,
                  status: 'publish',
                  // categories: [categoryId],
                },
                {
                  auth: {
                    username: login,
                    password: password,
                  },
                }
              );

              res.status(201).json(response.data);

          } else {
              // Handle the case where submissionId is provided but not found
              res.status(404).json({ error: 'Submission not found for provided id' });
              return;
          }
      } else {
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
          res.status(400).json({ error: 'Content already uploaded to PBN', submission_response: exists[0].submission_response });
          return;
      }

      const auth = {
        username: login,
        password: password,
      };
      
        // Ensure the category exists (and get its ID)
        const categoryId = await getOrCreateCategory(domain, category, auth);

        // Make a POST request to WordPress using the retrieved credentials
        const response = await axios.post(
          `${domain}/wp-json/wp/v2/posts`,
          {
            title: title,
            content: content,
            status: 'publish',
            categories: [categoryId],
          },
          {
            auth: {
              username: login,
              password: password,
            },
          }
        );
    
        // Get WordPress post ID
        const wordpressPostId = response.data.id;
        
        // Insert submission record into the database with WordPress post ID
        const [insertResult] = await connection.execute(
          'INSERT INTO pbn_site_submissions (pbn_site_id, title, content, categories, user_token, submission_response, client_name, wordpress_post_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, title, content, category, userToken, response.data.link, clientName, wordpressPostId]
        );

        res.status(201).json(response.data);
    
        // Close the MySQL connection
        await connection.end();
      }
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
