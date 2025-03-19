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

// SuperstarSite interface definition:
// - id: number
// - domain: string
// - login: string
// - password: string
// - active: number

// WordPressPost interface definition:
// - id: number
// - title: { rendered: string }
// - date: string
// - link: string
// - slug: string
// - author: number

// SuperstarSubmission interface definition:
// - id: number
// - superstar_site_id: number
// - wordpress_post_id: number
// - title: string
// - url: string

async function getAllActiveSuperstarSites() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.query(`
      SELECT id, domain, login, password, active 
      FROM superstar_sites 
      WHERE active = 1
    `);
    return rows;
  } finally {
    await connection.end();
  }
}

async function getSuperstarSubmissions(siteId) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const [rows] = await connection.query(`
      SELECT id, superstar_site_id, title, submission_response 
      FROM superstar_site_submissions 
      WHERE superstar_site_id = ? AND deleted_at IS NULL
    `, [siteId]);
    return rows;
  } finally {
    await connection.end();
  }
}

async function getAllWordPressPosts(site, perPage = 100) {
  let page = 1;
  let allPosts = [];
  let hasMorePosts = true;
  
  // Add protocol if missing
  const domain = site.domain.startsWith('http') ? site.domain : `https://${site.domain}`;
  
  try {
    while (hasMorePosts) {
      console.log(`Fetching page ${page} of posts from ${domain}...`);
      const response = await axios.get(`${domain}/wp-json/wp/v2/posts`, {
        params: { 
          per_page: perPage,
          page: page,
          _fields: 'id,title,date,link,slug,author'
        },
        auth: {
          username: site.login,
          password: site.password,
        },
        timeout: 20000 // 20 second timeout
      });
      
      const posts = response.data;
      if (posts.length === 0) {
        hasMorePosts = false;
      } else {
        allPosts = [...allPosts, ...posts];
        page++;
        
        // Check if we've reached the last page by examining headers
        const totalPages = parseInt(response.headers['x-wp-totalpages'], 10);
        if (page > totalPages) {
          hasMorePosts = false;
        }
      }
    }
    
    return allPosts;
  } catch (error) {
    console.error(`Error fetching posts from ${domain}:`, error.message);
    return [];
  }
}

async function importManualPost(
  siteId, 
  postId, 
  title, 
  link, 
  date
) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    // Check if a column called 'wordpress_post_id' exists
    const [wpIdColumns] = await connection.query(`
      SHOW COLUMNS FROM superstar_site_submissions LIKE 'wordpress_post_id'
    `);
    
    // Check if the retroactively_imported column exists
    const [retroactiveColumns] = await connection.query(`
      SHOW COLUMNS FROM superstar_site_submissions LIKE 'retroactively_imported'
    `);
    
    // Check for notes column
    const [notesColumns] = await connection.query(`
      SHOW COLUMNS FROM superstar_site_submissions LIKE 'notes'
    `);
    
    // Add any missing columns
    const columnsToAdd = [];
    
    // If the wordpress_post_id column doesn't exist, we'll add it
    if (wpIdColumns.length === 0) {
      columnsToAdd.push(`ADD COLUMN wordpress_post_id INT(11) DEFAULT NULL`);
    }
    
    // If the retroactively_imported column doesn't exist, add it
    if (retroactiveColumns.length === 0) {
      columnsToAdd.push(`ADD COLUMN retroactively_imported TINYINT(1) DEFAULT 0`);
    }
    
    // If the notes column doesn't exist, add it
    if (notesColumns.length === 0) {
      columnsToAdd.push(`ADD COLUMN notes TEXT`);
    }
    
    // Execute ALTER TABLE to add all missing columns in one statement
    if (columnsToAdd.length > 0) {
      console.log(`Adding missing columns to superstar_site_submissions table: ${columnsToAdd.join(', ')}`);
      await connection.query(`
        ALTER TABLE superstar_site_submissions 
        ${columnsToAdd.join(', ')}
      `);
    }
    
    // Determine which query to use based on whether wordpress_post_id column exists
    let query, params;
    if (wpIdColumns.length > 0) {
      // If wordpress_post_id column exists, include it in the insert
      query = `
        INSERT INTO superstar_site_submissions 
        (superstar_site_id, wordpress_post_id, title, submission_response, created_at, updated_at, autogenerated, retroactively_imported, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      params = [
        siteId,
        postId,
        title,
        link,
        new Date(date),
        new Date(),
        0, // Set autogenerated to 0 since this was a manual post
        1, // Mark as retroactively imported
        `Retroactively imported by script on ${new Date().toISOString()}. This post existed on WordPress but was not in our tracking system.`
      ];
    } else {
      // If wordpress_post_id column doesn't exist, exclude it
      query = `
        INSERT INTO superstar_site_submissions 
        (superstar_site_id, title, submission_response, created_at, updated_at, autogenerated, retroactively_imported, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      params = [
        siteId,
        title,
        link,
        new Date(date),
        new Date(),
        0, // Set autogenerated to 0 since this was a manual post
        1, // Mark as retroactively imported
        `Retroactively imported by script on ${new Date().toISOString()}. WordPress Post ID: ${postId}. This post existed on WordPress but was not in our tracking system.`
      ];
    }
    
    // Insert the manual post into our superstar_site_submissions table
    await connection.query(query, params);
    return true;
  } catch (error) {
    console.error(`Failed to import post ${postId} to database:`, error);
    return false;
  } finally {
    await connection.end();
  }
}

async function findManualPosts(shouldImport = false) {
  try {
    // 1. Get all active superstar sites
    console.log('Fetching all active superstar sites...');
    const sites = await getAllActiveSuperstarSites();
    console.log(`Found ${sites.length} active superstar sites.`);
    
    const results = [];
    let totalImported = 0;
    
    // 2. For each site, get its WordPress posts and compare with our submissions
    for (const site of sites) {
      try {
        console.log(`\nProcessing site: ${site.domain} (ID: ${site.id})`);
        
        // Get all submissions for this site
        const submissions = await getSuperstarSubmissions(site.id);
        console.log(`Found ${submissions.length} submissions in our database for this site.`);
        
        // Get all posts from the WordPress site
        const wpPosts = await getAllWordPressPosts(site);
        console.log(`Found ${wpPosts.length} total posts on the WordPress site.`);
        
        // Create a function to extract post ID from URL
        const getPostIdFromUrl = (url) => {
          if (!url) return null;
          // Try to find post ID at the end of the path
          const matches = url.match(/\/([0-9]+)\/?$/);
          if (matches && matches[1]) {
            return parseInt(matches[1], 10);
          }
          return null;
        };
        
        // Create a map of post IDs from our submissions' response URLs
        const knownPostIds = new Map();
        submissions.forEach(submission => {
          if (!submission.submission_response) return;
          
          const postId = getPostIdFromUrl(submission.submission_response);
          if (postId) {
            knownPostIds.set(postId, submission);
          } else {
            try {
              // For URLs without clear post IDs, store the URL path for comparison
              const urlPath = new URL(submission.submission_response).pathname;
              knownPostIds.set(urlPath, submission);
            } catch (e) {
              // If submission_response is not a valid URL, skip it
              console.log(`Warning: Invalid URL in submission_response: ${submission.submission_response}`);
            }
          }
        });
        
        // Find posts that aren't in our submissions
        const manualPosts = wpPosts.filter(post => {
          // Log for debugging
          console.log(`\nChecking WordPress post: ${post.title.rendered} (ID: ${post.id}, slug: ${post.slug})`);
          
          // First check if we have this post ID
          if (knownPostIds.has(post.id)) {
            console.log(`Match found by ID: ${post.id}`);
            return false;
          }
          
          // Get the post link (URL) and normalize it
          const postUrl = post.link;
          console.log(`Post URL: ${postUrl}`);
          
          // Check if any of our known submission URLs contain this post's URL
          // or if this post's URL contains any of our known submission URLs
          for (const [key, submission] of knownPostIds.entries()) {
            if (typeof key === 'string' && key.includes(post.slug)) {
              console.log(`Match found by slug in pathname: ${key}`);
              return false;
            }
            
            if (submission.submission_response) {
              // Clean up URLs for comparison by removing protocol, www, trailing slashes
              const cleanSubmissionUrl = submission.submission_response
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .replace(/\/$/, '');
                
              const cleanPostUrl = postUrl
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .replace(/\/$/, '');
              
              // Check for URL matching
              if (cleanSubmissionUrl.includes(cleanPostUrl) || 
                  cleanPostUrl.includes(cleanSubmissionUrl) ||
                  cleanSubmissionUrl.includes(post.slug)) {
                console.log(`Match found by URL comparison: ${submission.submission_response}`);
                return false;
              }
              
              // Try with various permutations of the slug
              const variations = [
                `/${post.slug}/`,
                `/${post.slug}`,
                post.slug,
                `${post.slug}/`,
              ];
              
              for (const variation of variations) {
                if (cleanSubmissionUrl.includes(variation)) {
                  console.log(`Match found by slug variation: ${variation}`);
                  return false;
                }
              }
            }
          }
          
          console.log(`No match found - this is a manual post`);
          return true; // No match found, this is a manual post
        });
        console.log(`Found ${manualPosts.length} manual posts.`);
        // return;
        let importedCount = 0;
        
        if (manualPosts.length > 0) {
          // Import posts if requested
          if (shouldImport) {
            console.log(`Importing ${manualPosts.length} manual posts to database...`);
            for (const post of manualPosts) {
              const success = await importManualPost(
                site.id,
                post.id,
                post.title.rendered,
                post.link,
                post.date
              );
              if (success) {
                importedCount++;
              }
            }
            console.log(`Successfully imported ${importedCount} posts.`);
            totalImported += importedCount;
          }
          
          results.push({
            site_id: site.id,
            domain: site.domain,
            manual_posts: manualPosts.map(post => ({
              post_id: post.id,
              title: post.title.rendered,
              date: post.date,
              link: post.link,
              slug: post.slug,
              author: post.author,
              imported: shouldImport ? true : undefined
            }))
          });
        }
      } catch (error) {
        console.error(`Error processing site ${site.domain}:`, error);
      }
    }
    
    // 3. Write results to a JSON file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const action = shouldImport ? 'imported' : 'found';
    const outputPath = `./manual_posts_${action}_${timestamp}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    
    console.log(`\nComplete! Found manual posts on ${results.length} sites.`);
    if (shouldImport) {
      console.log(`Imported a total of ${totalImported} posts to the database.`);
    }
    console.log(`Results written to ${outputPath}`);
    
    // Also print a summary
    console.log('\nSummary:');
    results.forEach(site => {
      console.log(`${site.domain}: ${site.manual_posts.length} manual posts`);
    });
    
  } catch (error) {
    console.error('Script failed:', error);
  }
}

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2);
  const shouldImport = args.includes('--import');
  const siteArg = args.find(arg => arg.startsWith('--site='));
  const targetSite = siteArg ? siteArg.split('=')[1] : null;
  
  console.log('=== Manual Posts Discovery Tool ===');
  if (shouldImport) {
    console.log('Running in IMPORT mode. Found posts will be imported to the database.');
  } else {
    console.log('Running in DISCOVERY mode. Posts will only be listed, not imported.');
    console.log('(Use --import flag to import posts to the database)');
  }
  
  if (targetSite) {
    console.log(`Filtering by site domain: ${targetSite}`);
  }
  
  // Filter sites if needed
  if (targetSite) {
    const allSites = await getAllActiveSuperstarSites();
    const filteredSites = allSites.filter(site => site.domain.includes(targetSite));
    
    if (filteredSites.length === 0) {
      console.error(`No active sites found matching ${targetSite}`);
      process.exit(1);
    }
    
    console.log(`Found ${filteredSites.length} matching sites. Processing these only.`);
    
    // Process only this site
    for (const site of filteredSites) {
      try {
        await processSite(site, shouldImport);
      } catch (error) {
        console.error(`Error processing site ${site.domain}:`, error);
      }
    }
  } else {
    // Process all sites
    await findManualPosts(shouldImport);
  }
}

// Process a single site
async function processSite(site, shouldImport = false) {
  try {
    console.log(`\nProcessing site: ${site.domain} (ID: ${site.id})`);
    
    // Get all submissions for this site
    const submissions = await getSuperstarSubmissions(site.id);
    console.log(`Found ${submissions.length} submissions in our database for this site.`);
    
    // Get all posts from the WordPress site
    const wpPosts = await getAllWordPressPosts(site);
    console.log(`Found ${wpPosts.length} total posts on the WordPress site.`);
    
    // Create a function to extract post ID from URL
    const getPostIdFromUrl = (url) => {
      if (!url) return null;
      // Try to find post ID at the end of the path
      const matches = url.match(/\/([0-9]+)\/?$/);
      if (matches && matches[1]) {
        return parseInt(matches[1], 10);
      }
      return null;
    };
    
    // Create a map of post IDs from our submissions' response URLs
    const knownPostIds = new Map();
    submissions.forEach(submission => {
      if (!submission.submission_response) return;
      
      const postId = getPostIdFromUrl(submission.submission_response);
      if (postId) {
        knownPostIds.set(postId, submission);
      } else {
        try {
          // For URLs without clear post IDs, store the URL path for comparison
          const urlPath = new URL(submission.submission_response).pathname;
          knownPostIds.set(urlPath, submission);
        } catch (e) {
          // If submission_response is not a valid URL, skip it
          console.log(`Warning: Invalid URL in submission_response: ${submission.submission_response}`);
        }
      }
    });
    
    // Find posts that aren't in our submissions
    const manualPosts = wpPosts.filter(post => {
      // Log for debugging
      console.log(`\nChecking WordPress post: ${post.title.rendered} (ID: ${post.id}, slug: ${post.slug})`);
      
      // First check if we have this post ID
      if (knownPostIds.has(post.id)) {
        console.log(`Match found by ID: ${post.id}`);
        return false;
      }
      
      // Get the post link (URL) and normalize it
      const postUrl = post.link;
      console.log(`Post URL: ${postUrl}`);
      
      // Check if any of our known submission URLs contain this post's URL
      // or if this post's URL contains any of our known submission URLs
      for (const [key, submission] of knownPostIds.entries()) {
        if (typeof key === 'string' && key.includes(post.slug)) {
          console.log(`Match found by slug in pathname: ${key}`);
          return false;
        }
        
        if (submission.submission_response) {
          // Clean up URLs for comparison by removing protocol, www, trailing slashes
          const cleanSubmissionUrl = submission.submission_response
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '');
            
          const cleanPostUrl = postUrl
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '');
          
          // Check for URL matching
          if (cleanSubmissionUrl.includes(cleanPostUrl) || 
              cleanPostUrl.includes(cleanSubmissionUrl) ||
              cleanSubmissionUrl.includes(post.slug)) {
            console.log(`Match found by URL comparison: ${submission.submission_response}`);
            return false;
          }
          
          // Try with various permutations of the slug
          const variations = [
            `/${post.slug}/`,
            `/${post.slug}`,
            post.slug,
            `${post.slug}/`,
          ];
          
          for (const variation of variations) {
            if (cleanSubmissionUrl.includes(variation)) {
              console.log(`Match found by slug variation: ${variation}`);
              return false;
            }
          }
        }
      }
      
      console.log(`No match found - this is a manual post`);
      return true; // No match found, this is a manual post
    });
    console.log(`Found ${manualPosts.length} manual posts.`);
    
    let importedCount = 0;
    
    if (manualPosts.length > 0) {
      // Import posts if requested
      if (shouldImport) {
        console.log(`Importing ${manualPosts.length} manual posts to database...`);
        for (const post of manualPosts) {
          const success = await importManualPost(
            site.id,
            post.id,
            post.title.rendered,
            post.link,
            post.date
          );
          if (success) {
            importedCount++;
          }
        }
        console.log(`Successfully imported ${importedCount} posts.`);
      }
      
      // Write single site results to a JSON file
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const action = shouldImport ? 'imported' : 'found';
      const outputPath = `./${site.domain.replace(/[^a-z0-9]/gi, '_')}_${action}_${timestamp}.json`;
      
      const results = {
        site_id: site.id,
        domain: site.domain,
        manual_posts: manualPosts.map(post => ({
          post_id: post.id,
          title: post.title.rendered,
          date: post.date,
          link: post.link,
          slug: post.slug,
          author: post.author,
          imported: shouldImport ? true : undefined
        }))
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`Results written to ${outputPath}`);
    }
    
    return { manualPosts, importedCount };
  } catch (error) {
    console.error(`Error processing site ${site.domain}:`, error);
    throw error;
  }
}

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});