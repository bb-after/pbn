import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import axios from 'axios';
import { getSlugFromUrl, findPostIdBySlug } from 'utils/urlUtils';

// Your database connection options
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  try {
  
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT * FROM superstar_site_submissions join superstar_sites on superstar_site_submissions.superstar_site_id = superstar_sites.id WHERE superstar_site_submissions.id = ?', [id]);
    await connection.end();

    if (rows.length > 0) {
      const submission = rows[0];
      const submission_response = submission.submission_response;
      if (submission_response) {
       
        // Parse the title and grab the 'rendered' key if it is JSON
        let title;
        try {
            const parsedTitle = JSON.parse(submission.title);
            title = parsedTitle.rendered || submission.title;
        } catch {
            title = submission.title; // If not JSON, use the title as is
        }
        const domain = submission.domain;
        const slug = getSlugFromUrl(submission_response);  
        const login = submission.login;
        const password = submission.password;
        const wordpressPostId = await findPostIdBySlug(domain, slug, { username: login, password: password });
        const wordpressResponse = await axios.get(`${domain}/wp-json/wp/v2/posts/${wordpressPostId}`, {
          auth: {
            username: login,
            password: password,
          },
        });
        
        const combinedData = {
          superstar_site_id: submission.superstar_site_id,
          title: title,
          client_name: submission.client_name,
          content: wordpressResponse.data.content.rendered.replace(/(\n|<br\s*\/?>)/g, ' '),
          categories: submission.categories,
        };

        return res.status(200).json(combinedData);
      } else {
        return res.status(404).json({ error: 'WordPress post ID not found for submission id ' + id });
      }

    } else {
      return res.status(404).json({ error: 'Post not found for id' + id });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
}
