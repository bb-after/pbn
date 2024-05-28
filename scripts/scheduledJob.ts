import mysql, { RowDataPacket } from 'mysql2/promise';
import cron from 'node-cron';
import { generateSuperStarContent } from '../utils/generateSuperStarContent';
import { postToSlack } from '../utils/postToSlack';
import { postToWordpress } from '../utils/postToWordpress'; // Assuming this is the function to post to WordPress

const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const SLACK_CHANNEL = 'superstar-alerts';

// Function to get a random topic for a site
async function getRandomTopic(siteId: number): Promise<string | null> {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT topic FROM superstar_site_topics WHERE superstar_site_id = ? ORDER BY RAND() LIMIT 1',
    [siteId]
  );
  await connection.end();
  if (rows.length > 0) {
    return rows[0].topic as string;
  }
  return null;
}

// Function to post content to WordPress and save to DB
async function postContentToWordpress(site: any, content: string) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const { id, domain, login, password } = site;

    const auth = {
      username: login,
      password: password,
    };

    const response = await postToWordpress({
      title: `Generated Article for ${domain}`,
      content,
      auth,
    });

    await connection.execute(
      'INSERT INTO superstar_site_submissions (superstar_site_id, title, content, submission_response) VALUES (?, ?, ?, ?)',
      [id, response.title, content, response.link]
    );
    await postToSlack(`Successfully posted content to WordPress for site ${domain}.`, SLACK_CHANNEL);
  } catch (error) {
    await postToSlack(`Failed to post content to WordPress for site ${site.domain}: ${error.message}`, SLACK_CHANNEL);
    console.error('Error posting content to WordPress:', error);
  } finally {
    await connection.end();
  }
}

// Function to generate and post content for all superstar sites
async function generateAndPostContent() {
  await postToSlack('Starting scheduled job to generate and post content.', SLACK_CHANNEL);
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [sites] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM superstar_sites WHERE active = 1'
    );
    for (const site of sites) {
      const topic = await getRandomTopic(site.id);
      if (topic) {
        const content = await generateSuperStarContent(topic);
        await postContentToWordpress(site, content);
      }
    }
    await postToSlack('Scheduled job completed successfully.', SLACK_CHANNEL);
  } catch (error: any) {
    await postToSlack(`Scheduled job failed: ${error.message}`, SLACK_CHANNEL);
    console.error('Error generating and posting content:', error);
  } finally {
    await connection.end();
  }
}

// Schedule the job to run every day at midnight
cron.schedule('*/10 * * * *', () => {
  console.log('Running scheduled job...');
  generateAndPostContent();
});
