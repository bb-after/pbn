import axios from 'axios';
import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2';
import { getSlugFromUrl, findPostIdBySlug } from '../../utils/urlUtils';

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { submissionId, submissionUrl, type } = req.body;

  if (!type || (type !== 'pbn' && type !== 'superstar')) {
    return res.status(400).json({ error: 'Invalid type provided' });
  }

  try {
    // Initialize database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST_NAME,
      user: process.env.DB_USER_NAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    // Determine the table and query based on the type
    let tableName, siteTable, siteIdColumn;
    if (type === 'pbn') {
      tableName = 'pbn_site_submissions';
      siteTable = 'pbn_sites';
      siteIdColumn = 'pbn_site_id';
    } else if (type === 'superstar') {
      tableName = 'superstar_site_submissions';
      siteTable = 'superstar_sites';
      siteIdColumn = 'superstar_site_id';
    }

    // Look up the site details
    const [queryResult] = await connection.query(
      `SELECT ${siteTable}.domain, ${siteTable}.login, ${siteTable}.password FROM ${tableName} JOIN ${siteTable} ON ${tableName}.${siteIdColumn} = ${siteTable}.id WHERE ${tableName}.id = ?`,
      [submissionId]
    );

    const rows: RowDataPacket[] = queryResult as RowDataPacket[];
    if (!rows || rows.length === 0) {
      res.status(404).json({ error: 'No active blogs found in the database' });
      return;
    }

    const { domain, login, password } = rows[0];

    const slug = getSlugFromUrl(submissionUrl);
    const postID = await findPostIdBySlug(domain, slug, { username: login, password });

    if (!postID) {
      await connection.end();
      return res.status(404).json({ error: 'Post not found' });
    }

    // Delete the WordPress post
    await axios.delete(`${domain}/wp-json/wp/v2/posts/${postID}?force=true`, {
      auth: { username: login, password },
    });

    // Update the submission record in your database
    await connection.query(`UPDATE ${tableName} SET deleted_at = NOW() WHERE id = ?`, [submissionId]);
    await connection.end();

    return res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return res.status(500).json({ error: 'Failed to delete submission' });
  }
}
