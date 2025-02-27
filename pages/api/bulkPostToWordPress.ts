import { NextApiRequest, NextApiResponse } from 'next';
import { RowDataPacket } from 'mysql2';
import mysql from 'mysql2/promise';
import axios from 'axios';
import { getSlugFromUrl, findPostIdBySlug } from '../../utils/urlUtils';
import { getOrCreateCategory } from '../../utils/categoryUtils';

// Add timeout to axios requests
axios.defaults.timeout = 30000; // 30 seconds

interface Article {
  title: string;
  content: string;
}

interface BulkPostToWordPressRequest {
  articles: Article[];
  userToken: string;
  clientName: string;
  category: string;
}

// MySQL connection configuration
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { articles, userToken, clientName, category } = req.body as BulkPostToWordPressRequest;

  // Validate input
  if (!articles || !Array.isArray(articles) || articles.length === 0) {
    return res.status(400).json({ error: 'No articles provided' });
  }

  if (articles.length > 20) {
    return res.status(400).json({ error: 'Maximum 20 articles allowed per request' });
  }

  try {
    // Create a MySQL connection
    const connection = await mysql.createConnection(dbConfig);
    
    // Get all eligible active PBN sites
    const [queryResult] = await connection.execute(
      `SELECT * FROM pbn_sites 
      WHERE active = 1;`
    );

    const pbnSites: RowDataPacket[] = queryResult as RowDataPacket[];
    if (!pbnSites || pbnSites.length === 0) {
      await connection.end();
      return res.status(404).json({ error: 'No active blogs found in the database' });
    }

    // Process each article
    const successfulSubmissions = [];
    const failedSubmissions = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      
      // For each article, select a random PBN site
      const [randomSiteResult] = await connection.execute(
        `SELECT * FROM pbn_sites 
        LEFT JOIN (
            SELECT DISTINCT pbn_site_id
            FROM pbn_site_submissions
            WHERE client_name = ?
            AND created >= DATE_SUB(NOW(), INTERVAL 3 MONTH)
        ) AS recent_submissions
        ON pbn_sites.id = recent_submissions.pbn_site_id
        WHERE pbn_sites.active = 1
        AND recent_submissions.pbn_site_id IS NULL
        ORDER BY RAND() LIMIT 1;`,
        [clientName]
      );
      
      const randomSites: RowDataPacket[] = randomSiteResult as RowDataPacket[];
      
      // If no site is available that hasn't been used in the last 3 months, get any random active site
      let site;
      if (!randomSites || randomSites.length === 0) {
        const randomIndex = Math.floor(Math.random() * pbnSites.length);
        site = pbnSites[randomIndex];
      } else {
        site = randomSites[0];
      }

      try {
        if (!site || !site.domain || !site.login || !site.password) {
          console.error('Invalid site data:', site);
          failedSubmissions.push({
            title: article.title,
            error: 'Invalid PBN site data'
          });
          continue;
        }

        // Check if the content has already been submitted
        const [queryResultExistingArticle] = await connection.execute(
          'SELECT * FROM pbn_site_submissions WHERE content = ? LIMIT 1',
          [article.content]
        );

        const exists: RowDataPacket[] = queryResultExistingArticle as RowDataPacket[];
        if (exists && exists.length > 0) {
          failedSubmissions.push({
            title: article.title,
            error: 'Content already uploaded to PBN',
            existingUrl: exists[0].submission_response
          });
          continue;
        }

        const auth = {
          username: site.login,
          password: site.password,
        };
        
        // Ensure the category exists (and get its ID)
        let categoryId;
        try {
          categoryId = await getOrCreateCategory(site.domain, category, auth);
        } catch (categoryError) {
          console.error(`Error getting/creating category for "${article.title}":`, categoryError);
          failedSubmissions.push({
            title: article.title,
            error: 'Failed to create category'
          });
          continue;
        }

        // Post to WordPress
        try {
          const response = await axios.post(
            `${site.domain}/wp-json/wp/v2/posts`,
            {
              title: article.title,
              content: article.content,
              status: 'publish',
              categories: categoryId ? [categoryId] : [],
            },
            { 
              auth,
              timeout: 30000 // 30 seconds timeout
            }
          );
          
          if (!response.data || !response.data.link) {
            throw new Error('Invalid response from WordPress API');
          }
          
          // Record the submission in the database
          await connection.execute(
            'INSERT INTO pbn_site_submissions (pbn_site_id, title, content, categories, user_token, submission_response, client_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [site.id, article.title, article.content, category, userToken, response.data.link, clientName]
          );

          successfulSubmissions.push({
            title: article.title,
            link: response.data.link,
            siteId: site.id,
            siteDomain: site.domain
          });
        } catch (postError: any) {
          console.error(`Error posting article "${article.title}" to WordPress:`, postError.message);
          failedSubmissions.push({
            title: article.title,
            error: `Failed to post to WordPress: ${postError.message}`
          });
        }
      } catch (error: any) {
        console.error(`Error processing article "${article.title}":`, error.message);
        failedSubmissions.push({
          title: article.title,
          error: `Error: ${error.message}`
        });
      }
    }

    await connection.end();

    // Return the results
    return res.status(200).json({
      successCount: successfulSubmissions.length,
      failedCount: failedSubmissions.length,
      successful: successfulSubmissions,
      failed: failedSubmissions,
      links: successfulSubmissions.map(sub => sub.link)
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return res.status(500).json({ error: 'Failed to process bulk upload' });
  }
}