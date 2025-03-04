import mysql from 'mysql2/promise';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { generateAvatarUrl } from '../../../utils/avatarUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const dbConfig = {
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  };

  const connection = await mysql.createConnection(dbConfig);

  try {
    const { siteId, name, email, username, password, bio } = req.body;

    // Validate required fields
    if (!siteId || !name || !email || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get site information for WP API access
    const [sites] = await connection.query(
      'SELECT domain, login, hosting_site FROM superstar_sites WHERE id = ?',
      [siteId]
    );

    if (!Array.isArray(sites) || sites.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const site = sites[0] as any;

    // Generate gender-appropriate avatar based on name
    const avatarUrl = generateAvatarUrl(name);

    // Try to create the author in WordPress
    try {
      const wpResponse = await axios.post(
        `${site.domain}/wp-json/wp/v2/users`,
        {
          name,
          username,
          email,
          password,
          description: bio || '',
          roles: ['author']
        },
        {
          auth: {
            username: site.login,
            password: site.hosting_site
          }
        }
      );

      const wpAuthorId = wpResponse.data.id;

      // Insert the author into our database
      const [result] = await connection.query(
        `
        INSERT INTO superstar_authors (
          superstar_site_id, 
          author_name, 
          author_email, 
          author_username, 
          author_password, 
          author_avatar, 
          author_bio, 
          wp_author_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          siteId,
          name,
          email,
          username,
          password,
          avatarUrl,
          bio || '',
          wpAuthorId
        ]
      );

      const authorId = (result as any).insertId;

      await connection.end();
      return res.status(201).json({ 
        success: true, 
        authorId, 
        wpAuthorId,
        message: 'Author created successfully' 
      });
    } catch (wpError: any) {
      console.error('WordPress author creation error:', wpError?.response?.data || wpError);
      
      // If we failed to create in WordPress, create just in our database
      const [result] = await connection.query(
        `
        INSERT INTO superstar_authors (
          superstar_site_id, 
          author_name, 
          author_email, 
          author_username, 
          author_password, 
          author_avatar, 
          author_bio
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          siteId,
          name,
          email,
          username,
          password,
          avatarUrl,
          bio || ''
        ]
      );

      const authorId = (result as any).insertId;

      await connection.end();
      return res.status(201).json({ 
        success: true, 
        authorId,
        warning: 'Author created in database only. WordPress creation failed.',
        wpError: wpError?.response?.data?.message || wpError.message
      });
    }
  } catch (error: any) {
    console.error('Error creating author:', error);
    res.status(500).json({ error: 'Failed to create author', details: error.message });

    if (connection && connection.end) {
      await connection.end();
    }
  }
}