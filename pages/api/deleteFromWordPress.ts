// pages/api/delete-submission.js
import axios from 'axios';
import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { submissionId, submissionUrl } = req.body;

  try {
    // Initialize database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST_NAME,
      user: process.env.DB_USER_NAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    // Step 2: Look up the PBN site details
    const [queryResult] = await connection.query(
      'SELECT pbn_sites.domain, pbn_sites.login, pbn_sites.password FROM pbn_site_submissions JOIN pbn_sites ON pbn_site_submissions.pbn_site_id = pbn_sites.id WHERE pbn_site_submissions.id = ?',
      [submissionId]
    );

    const rows: RowDataPacket[] = queryResult as RowDataPacket[];
    if (!rows || rows.length === 0) {
      // Handle the case where no active blogs are found
      res.status(404).json({ error: 'No active blogs found in the database' });
      return;
    }

    if (rows.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Submission not found' });
    }

    const { domain, login, password } = rows[0];

    const getSlugFromUrl = (url: string) => {
        // Remove trailing slash if present
        const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
        
        // Extract the last part of the URL, which should be the slug
        const slug = urlWithoutTrailingSlash.split("/").pop();
        
        // If there are query parameters, remove them
        return slug ? slug.split('?')[0] : null;
    };
    console.log('we have a submissionURL? ', submissionUrl);
      
    const slug = getSlugFromUrl(submissionUrl);
    console.log('we have a slug? ', slug);
      
    // Step 3: Use the slug to find the WordPress post ID
    const postID = await findPostIdBySlug(domain, slug, { username: login, password });
    console.log('we have a postID? ', postID);

    if (!postID) {
      await connection.end();
      return res.status(404).json({ error: 'Post not found' });
    }

    // Step 4: Delete the WordPress post
    await axios.delete(`${domain}/wp-json/wp/v2/posts/${postID}?force=true`, {
      auth: { username: login, password },
    });


    // Optional Step 5: Delete the submission record from your database
    await connection.query('UPDATE pbn_site_submissions SET deleted_at = NOW() WHERE id = ?', [submissionId]);
    await connection.end();

    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return res.status(500).json({ error: 'Failed to delete submission' });
  }
}

async function findPostIdBySlug(domain: string, slug: string | null, auth: { username: any; password: any; }) {
  try {
    const response = await axios.get(`${domain}/wp-json/wp/v2/posts`, {
      params: { slug },
      auth,
    });

    if (response.data.length > 0) {
      return response.data[0].id;
    }

    return null;
  } catch (error) {
    console.error('Error finding post ID by slug:', error);
    throw new Error('Failed to find post ID by slug');
  }
}
