// Load environment variables from .env file
require('dotenv').config();

const mysql = require('mysql2/promise');
const axios = require('axios');
const fs = require('fs');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// Output database connection info (without password)
console.log('Database connection info:');
console.log(`Host: ${process.env.DB_HOST_NAME || 'not set'}`);
console.log(`User: ${process.env.DB_USER_NAME || 'not set'}`);
console.log(`Database: ${process.env.DB_DATABASE || 'not set'}`);

// Check if required environment variables are set
if (!process.env.DB_HOST_NAME || !process.env.DB_USER_NAME || !process.env.DB_PASSWORD || !process.env.DB_DATABASE) {
  console.error('ERROR: Database environment variables are not set properly.');
  console.error('Make sure you have a .env file with DB_HOST_NAME, DB_USER_NAME, DB_PASSWORD, and DB_DATABASE.');
  process.exit(1);
}

/**
 * Extract post ID from a WordPress URL
 */
function extractPostIdFromUrl(url) {
  if (!url) return null;
  
  // Try to find post ID at the end of the path with trailing slash
  let matches = url.match(/\/([0-9]+)\/$/);
  if (matches && matches[1]) {
    return parseInt(matches[1], 10);
  }
  
  // Try to find post ID at the end of the path without trailing slash
  matches = url.match(/\/([0-9]+)$/);
  if (matches && matches[1]) {
    return parseInt(matches[1], 10);
  }
  
  // Try to extract from query parameter (e.g., ?p=123)
  try {
    const urlObj = new URL(url);
    const p = urlObj.searchParams.get('p');
    if (p && !isNaN(parseInt(p, 10))) {
      return parseInt(p, 10);
    }
  } catch (e) {
    // URL parsing failed, continue with other methods
  }
  
  return null;
}

/**
 * Get post ID from WordPress API by slug
 */
async function getPostIdBySlug(domain, slug, auth) {
  try {
    const response = await axios.get(`${domain}/wp-json/wp/v2/posts`, {
      params: { slug },
      auth,
      timeout: 10000
    });
    
    if (response.data && response.data.length > 0) {
      return response.data[0].id;
    }
    return null;
  } catch (error) {
    console.error(`Error getting post by slug from ${domain}:`, error.message);
    return null;
  }
}

/**
 * Extract slug from a WordPress URL
 */
function extractSlugFromUrl(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    
    // Remove trailing slash
    const pathNoTrail = path.endsWith('/') ? path.slice(0, -1) : path;
    
    // Get the last part of the path
    const parts = pathNoTrail.split('/').filter(p => p);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  } catch (e) {
    console.error(`Error parsing URL ${url}:`, e.message);
    return null;
  }
}

/**
 * Check if column exists in a table
 */
async function columnExists(connection, tableName, columnName) {
  const [columns] = await connection.query(`
    SHOW COLUMNS FROM ${tableName} LIKE ?
  `, [columnName]);
  
  return columns.length > 0;
}

/**
 * Add wordpress_post_id column if it doesn't exist
 */
async function ensureWordPressPostIdColumn(connection) {
  const columnName = 'wordpress_post_id';
  const exists = await columnExists(connection, 'superstar_site_submissions', columnName);
  
  if (!exists) {
    console.log(`Adding ${columnName} column to superstar_site_submissions table...`);
    await connection.query(`
      ALTER TABLE superstar_site_submissions 
      ADD COLUMN ${columnName} INT(11) DEFAULT NULL
    `);
    console.log(`Column ${columnName} added successfully.`);
    return true;
  }
  
  console.log(`Column ${columnName} already exists.`);
  return false;
}

/**
 * Get all superstar site submissions that don't have a WordPress post ID
 */
async function getSubmissionsWithoutPostId(connection) {
  const [rows] = await connection.query(`
    SELECT 
      sss.id AS submission_id,
      sss.superstar_site_id,
      sss.submission_response,
      sss.title,
      ss.domain,
      ss.login,
      ss.password
    FROM 
      superstar_site_submissions sss
    JOIN 
      superstar_sites ss ON sss.superstar_site_id = ss.id
    WHERE 
      sss.submission_response IS NOT NULL
      AND sss.submission_response != ''
      AND (sss.wordpress_post_id IS NULL OR sss.wordpress_post_id = 0)
      AND ss.active = 1
    ORDER BY 
      sss.id DESC
  `);
  
  return rows;
}

/**
 * Update a submission with its WordPress post ID
 */
async function updateSubmissionPostId(connection, submissionId, postId) {
  await connection.query(`
    UPDATE superstar_site_submissions 
    SET wordpress_post_id = ?, 
        modified_at = NOW() 
    WHERE id = ?
  `, [postId, submissionId]);
  
  return true;
}

/**
 * Main function to populate WordPress post IDs
 */
async function populateWordPressPostIds() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Ensure the wordpress_post_id column exists
    await ensureWordPressPostIdColumn(connection);
    
    // Get all submissions without WordPress post IDs
    const submissions = await getSubmissionsWithoutPostId(connection);
    console.log(`Found ${submissions.length} submissions without WordPress post IDs.`);
    
    if (submissions.length === 0) {
      console.log('No submissions to update.');
      return;
    }
    
    // Results tracking
    const results = {
      total: submissions.length,
      updated: 0,
      failed: 0,
      byMethod: {
        fromUrl: 0,
        fromApi: 0
      }
    };
    
    // Process each submission
    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      console.log(`\nProcessing submission ${i+1}/${submissions.length}: ID ${submission.submission_id}, Title: ${submission.title}`);
      console.log(`URL: ${submission.submission_response}`);
      
      let postId = null;
      
      // Method 1: Try to extract post ID directly from URL
      postId = extractPostIdFromUrl(submission.submission_response);
      if (postId) {
        console.log(`Found post ID ${postId} from URL.`);
        results.byMethod.fromUrl++;
      } else {
        // Method 2: Try to get post ID from WordPress API by slug
        const slug = extractSlugFromUrl(submission.submission_response);
        if (slug) {
          console.log(`Extracted slug "${slug}" from URL. Querying WordPress API...`);
          const domain = submission.domain.startsWith('http') ? submission.domain : `https://${submission.domain}`;
          const auth = { username: submission.login, password: submission.password };
          
          try {
            postId = await getPostIdBySlug(domain, slug, auth);
            if (postId) {
              console.log(`Found post ID ${postId} from WordPress API.`);
              results.byMethod.fromApi++;
            } else {
              console.log(`Could not find post ID for slug "${slug}".`);
            }
          } catch (error) {
            console.error(`Error querying WordPress API: ${error.message}`);
          }
        } else {
          console.log(`Could not extract slug from URL.`);
        }
      }
      
      // Update the submission with the post ID if found
      if (postId) {
        await updateSubmissionPostId(connection, submission.submission_id, postId);
        console.log(`Updated submission ID ${submission.submission_id} with WordPress post ID ${postId}.`);
        results.updated++;
      } else {
        console.log(`Could not find WordPress post ID for submission ID ${submission.submission_id}.`);
        results.failed++;
      }
    }
    
    // Write results to a file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const outputPath = `./wordpress_post_id_update_${timestamp}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    // Log summary
    console.log('\n=== Summary ===');
    console.log(`Total submissions processed: ${results.total}`);
    console.log(`Successfully updated: ${results.updated}`);
    console.log(`Failed to update: ${results.failed}`);
    console.log(`Found by URL extraction: ${results.byMethod.fromUrl}`);
    console.log(`Found by WordPress API: ${results.byMethod.fromApi}`);
    console.log(`Results written to ${outputPath}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2);
  const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const dryRun = args.includes('--dry-run');
  
  console.log('=== WordPress Post ID Population Tool ===');
  if (dryRun) {
    console.log('Running in DRY RUN mode. No changes will be made to the database.');
  }
  
  if (limit) {
    console.log(`Processing limited to ${limit} submissions.`);
  }
  
  await populateWordPressPostIds();
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});