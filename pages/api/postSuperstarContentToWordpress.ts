import type { NextApiRequest, NextApiResponse } from 'next';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { postToWordpress } from '../../utils/postToWordpress';
import { postToSlack } from '../../utils/postToSlack';

const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const SLACK_CHANNEL = 'superstar-alerts';

interface SuperstarSite extends RowDataPacket {
  id: number;
  domain: string;
  hosting_site: string;
  login: string;
  password: string;
  autogenerated_count: number;
  manual_count: number;
  topics: string[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }


  const { siteId, title, content, tags, author } = req.body;

  if (!siteId || !content) {
    return res.status(400).json({ message: 'Missing required fields' });
  }


  const connection = await mysql.createConnection(dbConfig);
  let site: SuperstarSite | null = null;
  const [rows] = await connection.query<SuperstarSite[]>('SELECT * FROM superstar_sites WHERE id = ?', [siteId]);
  site = rows[0];

  if (!site) {
    throw new Error('Site not found');
  }

  console.log("site?", site);

  try {
    const auth = {
      username: encodeURIComponent(site.login),
      password: site.password,
    };

    const response = await postToWordpress({
      title: title,
      content,
      domain: site.domain,
      auth,
    });

    console.log('Response from WordPress:', response);

    if (!response.title || !content || !response.link) {
      throw new Error('Response from WordPress contains undefined values');
    }

    await connection.execute(
      'INSERT INTO superstar_site_submissions (superstar_site_id, title, content, submission_response) VALUES (?, ?, ?, ?)',
      [siteId, response.title, content, response.link]
    );

    await postToSlack(`Successfully posted content to WordPress for site ${site.domain}.`, SLACK_CHANNEL);

    res.status(200).json({ message: 'Content posted successfully' });
  } catch (error: any) {
    const errorMessage = site
      ? `Failed to post content to WordPress for site ${site.domain}: ${error.message} using auth ${site.login}`
      : `Failed to post content to WordPress: ${error.message}`;

    await postToSlack(errorMessage, SLACK_CHANNEL);
    console.error('Error posting content to WordPress:', error);
    res.status(500).json({ message: errorMessage, stack: error.stack });
  } finally {
    await connection.end();
  }
}
