import type { NextApiRequest, NextApiResponse } from 'next';
import mysql, { RowDataPacket } from 'mysql2/promise';
import { postToWordpress } from '../../utils/postToWordpress';
import { postToSlack } from '../../utils/postToSlack';
import { getOrCreateCategory } from 'utils/categoryUtils';

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


  const { siteId, title, content, tags, clientName, author, authorId, userToken } = req.body;

  if (!siteId || !content) {
    return res.status(400).json({ 
      message: 'Missing required fields', 
      details: {
        siteId: siteId ? 'provided' : 'missing (required)',
        content: content ? 'provided' : 'missing (required)',
        clientName: clientName ? 'provided' : 'missing (will use default)',
        tags: tags ? 'provided' : 'missing (will use default)'
      }
    });
  }

  // Default clientName if not provided
  const effectiveClientName = clientName || 'default_client';
  
  // Make sure tags exists and is properly formatted - default to 'uncategorized'
  const formattedTags = tags ? (typeof tags === 'string' ? [tags] : tags) : ['uncategorized'];
  console.log(`Using tags: ${formattedTags.join(', ')}`);
  
  // Continue even without tags - we'll use the default category

  const connection = await mysql.createConnection(dbConfig);
  let site: SuperstarSite | null = null;
  const [rows] = await connection.query<SuperstarSite[]>('SELECT * FROM superstar_sites WHERE id = ?', [siteId]);
  site = rows[0];

  if (!site) {
    throw new Error('Site not found');
  }

  // Get a random author for this site if no specific author_id is provided
  let wpAuthorId: number | undefined;
  if (!author) {
    const [authors] = await connection.query(
      'SELECT wp_author_id FROM superstar_authors WHERE superstar_site_id = ? ORDER BY RAND() LIMIT 1',
      [siteId]
    );
    
    if (Array.isArray(authors) && authors.length > 0) {
      wpAuthorId = (authors[0] as any).wp_author_id;
    }
  } else {
    wpAuthorId = parseInt(author, 10);
  }

  console.log("site?", site);
  console.log("Using WordPress author ID:", wpAuthorId);

  try {
    // Try to determine which password field to use
    // Check if we have both password fields available
    console.log(`Site has fields: login: ${!!site.login}, hosting_site: ${!!site.hosting_site}, password: ${!!site.password}`);
    
    // Following the working implementation in postToWordPress.ts
    // Looking at the database schema and implementation, we should use password field directly
    console.log(`Using auth with username: ${site.login} and password from 'password' field`);
    
    // Use the password field directly - similar to how it works in postToWordPress.ts
    const auth = {
      username: site.login,
      password: site.password,  // Use the password field like in the working implementation
    };
    

    // Ensure the category exists (and get its ID)
    // Use the first tag, or fallback to "uncategorized" if no tags
    const categoryName = formattedTags.length > 0 ? formattedTags[0] : 'uncategorized';
    const categoryId = await getOrCreateCategory(site.domain, categoryName, auth);
    
    // Convert wpAuthorId to string for the WordPress API
    const authorIdForWP = wpAuthorId ? String(wpAuthorId) : undefined;
    console.log(`Using author ID for WordPress: ${authorIdForWP || 'None (will use default)'}`);
    
    let response;
    
    // Post to WordPress using the direct approach from postToWordPress.ts
    console.log(`Posting to WordPress directly with username: ${auth.username}`);
    response = await postToWordpress({
      title: title,
      content,
      domain: site.domain,
      auth,
      categoryId: categoryId,
    });


    if (!response.title || !content || !response.link) {
      throw new Error('Response from WordPress contains undefined values');
    }

    console.log('Response from WordPress:', response.guid);

    // Get the superstar_author_id - either directly from authorId parameter or lookup by wp_author_id
    let superstarAuthorId: number | null = null;
    
    // If authorId was passed directly, use it
    if (authorId) {
      superstarAuthorId = parseInt(authorId, 10);
    } 
    // Otherwise if WordPress author ID was used, look up the corresponding superstar_author_id
    else if (wpAuthorId) {
      const [authorRows] = await connection.query(
        'SELECT id FROM superstar_authors WHERE superstar_site_id = ? AND wp_author_id = ?',
        [siteId, wpAuthorId]
      );
      
      if (Array.isArray(authorRows) && authorRows.length > 0) {
        superstarAuthorId = (authorRows[0] as any).id;
      }
    }
    
    // Make sure all parameters are defined or null (not undefined)
    // Check for all potential undefined values and convert them to null or default values
    const authorIdForSql = superstarAuthorId !== null && superstarAuthorId !== undefined ? superstarAuthorId : null;
    const userTokenForSql = userToken || null; // Convert undefined/empty to null
    const titleForSql = response.title?.rendered || title || "No Title";
    const linkForSql = response.link || null;
    
    console.log(`Inserting record with values: siteId=${siteId}, title=${titleForSql}, clientName=${effectiveClientName}, link=${linkForSql}, userToken=${userTokenForSql}, authorId=${authorIdForSql}`);
    
    // Extract WordPress post ID
    const wordpressPostId = response.id;
    
    await connection.execute(
      'INSERT INTO superstar_site_submissions (superstar_site_id, title, content, client_name, submission_response, user_token, autogenerated, superstar_author_id, wordpress_post_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [siteId, titleForSql, content, effectiveClientName, linkForSql, userTokenForSql, 0, authorIdForSql, wordpressPostId]
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
