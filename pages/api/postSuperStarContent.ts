import type { NextApiRequest, NextApiResponse } from 'next';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { postToWordpress } from '../../utils/postToWordpress';
import { postToSlack } from '../../utils/postToSlack';
import { generateSuperStarContent } from '../../utils/generateSuperStarContent';
import { getOrCreateCategory } from 'utils/categoryUtils';

// This function can run for a maximum of 5 minutes (max on pro plan)
export const config = {
    maxDuration: 300,
  };
  
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

interface SuperstarSiteTopic extends RowDataPacket {
  topic: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('Fetching active superstar sites...');
    const [sites]: [SuperstarSite[], any] = await connection.query('SELECT * FROM superstar_sites WHERE active = 1 ORDER BY RAND()');
    console.log(`Fetched ${sites.length} active sites.`);

    const tasks = sites.map(async (site) => {
      console.log(`Processing site: ${site.domain}`);

      const auth = { username: site.login, password: site.password };

      // Fetch topics for the current site
      const [topics]: [SuperstarSiteTopic[], any] = await connection.query(
        'SELECT topic FROM superstar_site_topics WHERE superstar_site_id = ?',
        [site.id]
      );

      if (topics.length === 0) {
        console.log(`No topics found for site ID ${site.id}`);
        return;
      }

      // Select a random topic
      const randomTopic = topics[Math.floor(Math.random() * topics.length)].topic;
      console.log(`Selected topic: ${randomTopic}`);

      // Generate content for the random topic
      const { title, body: content } = await generateSuperStarContent(randomTopic, site);
      console.log(`Generated content for topic "${randomTopic}": ${title}`);

      // Ensure the category exists (and get its ID)
      const categoryId = await getOrCreateCategory(site.domain, randomTopic, auth);

      try {
        console.log(`Posting content to WordPress for site ${site.domain}`);
        const response = await postToWordpress({
          title,
          content,
          domain: site.domain,
          auth,
          categoryId: categoryId,
        });
        
        console.log(`Posted content to WordPress: ${response.link}`);

        await connection.execute(
          'INSERT INTO superstar_site_submissions (superstar_site_id, title, content, submission_response) VALUES (?, ?, ?, ?)',
          [site.id, response.title.rendered, content, response.link]
        );

        await postToSlack(`Successfully posted content to WordPress for site ${site.domain} on topic "${randomTopic}".`, SLACK_CHANNEL);
      } catch (error: any) {
        const errorMessage = `Failed to post content to WordPress for site ${site.domain} on topic "${randomTopic}": ${error.message} using auth ${auth.username}`;
        await postToSlack(errorMessage, SLACK_CHANNEL);
        console.error('Error posting content to WordPress:', error);
      }
    });

    await Promise.all(tasks);

    res.status(200).json({ message: 'Content posted successfully' });
  } catch (error: any) {
    console.error('Error fetching sites or posting content:', error);
    res.status(500).json({ message: 'Failed to post content', details: error.message });
  } finally {
    console.log('Closing database connection.');
    await connection.end();
  }
}
