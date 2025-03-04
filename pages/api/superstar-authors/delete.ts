import mysql from 'mysql2/promise';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid author ID' });
  }

  const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  const connection = await mysql.createConnection(dbConfig);

  try {
    // Check if author exists and get site info
    const [authors] = await connection.query(
      `
      SELECT sa.*, ss.domain, ss.login, ss.hosting_site 
      FROM superstar_authors sa
      JOIN superstar_sites ss ON sa.superstar_site_id = ss.id 
      WHERE sa.id = ?
      `,
      [id]
    );

    if (!Array.isArray(authors) || authors.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'Author not found' });
    }

    const author = authors[0] as any;

    // Check if author has posts
    const [submissions] = await connection.query(
      'SELECT COUNT(*) as count FROM superstar_site_submissions WHERE superstar_author_id = ?',
      [id]
    );

    const submissionCount = (submissions as any[])[0]?.count || 0;

    if (submissionCount > 0) {
      await connection.end();
      return res.status(400).json({ 
        error: 'Cannot delete author with posts', 
        count: submissionCount 
      });
    }

    // Try to delete from WordPress if we have a WordPress author ID
    if (author.wp_author_id) {
      try {
        await axios.delete(
          `${author.domain}/wp-json/wp/v2/users/${author.wp_author_id}?force=true`,
          {
            auth: {
              username: author.login,
              password: author.hosting_site
            }
          }
        );
      } catch (wpError: any) {
        console.error('Failed to delete WordPress author:', wpError?.response?.data || wpError);
        // Continue with database deletion even if WordPress deletion fails
      }
    }

    // Delete from our database
    await connection.query('DELETE FROM superstar_authors WHERE id = ?', [id]);

    await connection.end();
    return res.status(200).json({ success: true, message: 'Author deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting author:', error);
    
    res.status(500).json({ error: 'Failed to delete author', details: error.message });

    if (connection && connection.end) {
      await connection.end();
    }
  }
}