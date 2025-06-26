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
if (
  !process.env.DB_HOST_NAME ||
  !process.env.DB_USER_NAME ||
  !process.env.DB_PASSWORD ||
  !process.env.DB_DATABASE
) {
  console.error('ERROR: Database environment variables are not set properly.');
  console.error(
    'Make sure you have a .env file with DB_HOST_NAME, DB_USER_NAME, DB_PASSWORD, and DB_DATABASE.'
  );
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
    const [rows] = await connection.query(
      `
      SELECT id, superstar_site_id, title, submission_response, wordpress_post_id 
      FROM superstar_site_submissions 
      WHERE superstar_site_id = ? AND deleted_at IS NULL
    `,
      [siteId]
    );
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

  // Calculate date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const afterDate = sevenDaysAgo.toISOString();

  try {
    while (hasMorePosts) {
      console.log(`Fetching page ${page} of posts from ${domain} (last 7 days)...`);
      const response = await axios.get(`${domain}/wp-json/wp/v2/posts`, {
        params: {
          per_page: perPage,
          page: page,
          _fields: 'id,title,date,link,slug,author,content',
          after: afterDate, // Only get posts from last 7 days
        },
        auth: {
          username: site.login,
          password: site.password,
        },
        timeout: 20000, // 20 second timeout
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

    console.log(`Found ${allPosts.length} posts from the last 7 days on ${domain}`);
    return allPosts;
  } catch (error) {
    console.error(`Error fetching posts from ${domain}:`, error.message);
    return [];
  }
}

// Function to analyze post content and determine if it's manual or automated
function analyzePostContent(postContent) {
  if (!postContent || !postContent.rendered) {
    return { isManual: true, reason: 'No content available for analysis' };
  }

  const content = postContent.rendered;

  // Count hyperlinks (a tags with href)
  const hyperlinkMatches = content.match(/<a[^>]+href[^>]*>/gi);
  const hyperlinkCount = hyperlinkMatches ? hyperlinkMatches.length : 0;

  // Count images (img tags)
  const imageMatches = content.match(/<img[^>]*>/gi);
  const imageCount = imageMatches ? imageMatches.length : 0;

  console.log(`    Content analysis: ${hyperlinkCount} hyperlinks, ${imageCount} images`);

  // Logic for determining manual vs automated
  if (hyperlinkCount >= 1) {
    return {
      isManual: true,
      reason: `Contains ${hyperlinkCount} hyperlink(s) - indicates manual content`,
    };
  }

  if (hyperlinkCount === 0 && imageCount === 1) {
    return {
      isManual: false,
      reason: `No hyperlinks and exactly 1 image - indicates automated content`,
    };
  }

  // Default to manual for other cases (0 hyperlinks, 0 images or multiple images)
  return {
    isManual: true,
    reason: `${hyperlinkCount} hyperlinks, ${imageCount} images - defaulting to manual`,
  };
}

async function importManualPost(
  siteId,
  postId,
  title,
  link,
  date,
  isManual = true,
  analysisReason = ''
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
      console.log(
        `Adding missing columns to superstar_site_submissions table: ${columnsToAdd.join(', ')}`
      );
      await connection.query(`
        ALTER TABLE superstar_site_submissions 
        ${columnsToAdd.join(', ')}
      `);
    }

    // Determine autogenerated value based on analysis
    const autogeneratedValue = isManual ? 0 : 1;
    const contentType = isManual ? 'manual' : 'automated';

    // Insert with wordpress_post_id and proper autogenerated flag
    const query = `
      INSERT INTO superstar_site_submissions 
      (superstar_site_id, wordpress_post_id, title, submission_response, created, modified_at, autogenerated, retroactively_imported, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      siteId,
      postId,
      title,
      link,
      new Date(date),
      new Date(),
      autogeneratedValue,
      1, // Mark as retroactively imported
      `Retroactively imported by script on ${new Date().toISOString()}. Detected as ${contentType} content. Analysis: ${analysisReason}`,
    ];

    console.log(`    Importing as ${contentType} post (autogenerated=${autogeneratedValue})`);

    // Insert the post into our superstar_site_submissions table
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
        const getPostIdFromUrl = url => {
          if (!url) return null;
          // Try to find post ID at the end of the path
          const matches = url.match(/\/([0-9]+)\/?$/);
          if (matches && matches[1]) {
            return parseInt(matches[1], 10);
          }
          return null;
        };

        // Create a Set of known WordPress post IDs from our submissions
        const knownPostIds = new Set();
        submissions.forEach(submission => {
          // If we have a wordpress_post_id in the database, use it
          if (submission.wordpress_post_id) {
            knownPostIds.add(submission.wordpress_post_id);
          }
          // Fallback: If missing wordpress_post_id but we have a submission_response, try to extract it
          else if (submission.submission_response) {
            const extractedPostId = getPostIdFromUrl(submission.submission_response);
            if (extractedPostId) {
              knownPostIds.add(extractedPostId);
            }
          }
        });

        console.log(`Found ${knownPostIds.size} known WordPress post IDs in our submissions`);

        // Find posts that aren't in our submissions
        const untrackedPosts = wpPosts.filter(post => {
          // Log for debugging
          console.log(`\nChecking WordPress post: ${post.title.rendered} (ID: ${post.id})`);

          // Check if this post ID exists in our known post IDs set
          const isTracked = knownPostIds.has(post.id);

          if (isTracked) {
            console.log(`Match found - post ID ${post.id} exists in our submissions`);
            return false; // Post is tracked in our system
          }

          console.log(`No match found - post ID ${post.id} does not exist in our submissions`);
          return true; // This is an untracked post
        });

        // Analyze untracked posts to categorize them
        const categorizedPosts = {
          manual: [],
          automated: [],
        };

        untrackedPosts.forEach(post => {
          const analysis = analyzePostContent(post.content);
          console.log(`    Analysis result: ${analysis.reason}`);

          if (analysis.isManual) {
            categorizedPosts.manual.push(post);
          } else {
            categorizedPosts.automated.push(post);
          }
        });

        console.log(
          `Found ${categorizedPosts.manual.length} manual posts and ${categorizedPosts.automated.length} automated posts that need to be imported.`
        );

        let importedCount = 0;
        const allPostsToImport = [...categorizedPosts.manual, ...categorizedPosts.automated];

        if (allPostsToImport.length > 0) {
          // Import posts if requested
          if (shouldImport) {
            console.log(`Importing ${allPostsToImport.length} posts to database...`);
            for (const post of allPostsToImport) {
              const analysis = analyzePostContent(post.content);
              const success = await importManualPost(
                site.id,
                post.id,
                post.title.rendered,
                post.link,
                post.date,
                analysis.isManual,
                analysis.reason
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
            manual_posts_count: categorizedPosts.manual.length,
            automated_posts_count: categorizedPosts.automated.length,
            total_untracked: allPostsToImport.length,
            posts: allPostsToImport.map(post => {
              const analysis = analyzePostContent(post.content);
              return {
                post_id: post.id,
                title: post.title.rendered,
                date: post.date,
                link: post.link,
                slug: post.slug,
                author: post.author,
                is_manual: analysis.isManual,
                analysis_reason: analysis.reason,
                imported: shouldImport ? true : undefined,
              };
            }),
          });
        }
      } catch (error) {
        console.error(`Error processing site ${site.domain}:`, error);
      }
    }

    // 3. Write results to a JSON file
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const action = shouldImport ? 'imported' : 'found';
    const outputPath = `./untracked_posts_${action}_${timestamp}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

    console.log(`\nComplete! Found untracked posts on ${results.length} sites (last 7 days).`);
    if (shouldImport) {
      console.log(`Imported a total of ${totalImported} posts to the database.`);
    }
    console.log(`Results written to ${outputPath}`);

    // Also print a summary
    console.log('\nSummary:');
    results.forEach(site => {
      console.log(
        `${site.domain}: ${site.manual_posts_count} manual posts, ${site.automated_posts_count} automated posts, ${site.total_untracked} total untracked posts`
      );
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

  console.log('=== Enhanced Untracked Posts Discovery Tool ===');
  console.log(
    'Checks WordPress posts from the last 7 days and categorizes them as manual or automated.'
  );
  console.log('Uses content analysis: hyperlinks = manual, no hyperlinks + 1 image = automated.');

  if (shouldImport) {
    console.log(
      'Running in IMPORT mode. Found posts will be imported to the database with proper categorization.'
    );
  } else {
    console.log('Running in DISCOVERY mode. Posts will only be analyzed and listed, not imported.');
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
    const getPostIdFromUrl = url => {
      if (!url) return null;
      // Try to find post ID at the end of the path
      const matches = url.match(/\/([0-9]+)\/?$/);
      if (matches && matches[1]) {
        return parseInt(matches[1], 10);
      }
      return null;
    };

    // Create a Set of known WordPress post IDs from our submissions
    const knownPostIds = new Set();
    submissions.forEach(submission => {
      // If we have a wordpress_post_id in the database, use it
      if (submission.wordpress_post_id) {
        knownPostIds.add(submission.wordpress_post_id);
      }
      // Fallback: If missing wordpress_post_id but we have a submission_response, try to extract it
      else if (submission.submission_response) {
        const extractedPostId = getPostIdFromUrl(submission.submission_response);
        if (extractedPostId) {
          knownPostIds.add(extractedPostId);
        }
      }
    });

    console.log(`Found ${knownPostIds.size} known WordPress post IDs in our submissions`);

    // Find posts that aren't in our submissions
    const untrackedPosts = wpPosts.filter(post => {
      // Log for debugging
      console.log(`\nChecking WordPress post: ${post.title.rendered} (ID: ${post.id})`);

      // Check if this post ID exists in our known post IDs set
      const isTracked = knownPostIds.has(post.id);

      if (isTracked) {
        console.log(`Match found - post ID ${post.id} exists in our submissions`);
        return false; // Post is tracked in our system
      }

      console.log(`No match found - post ID ${post.id} does not exist in our submissions`);
      return true; // This is an untracked post
    });

    // Analyze untracked posts to categorize them
    const categorizedPosts = {
      manual: [],
      automated: [],
    };

    untrackedPosts.forEach(post => {
      const analysis = analyzePostContent(post.content);
      console.log(`    Analysis result: ${analysis.reason}`);

      if (analysis.isManual) {
        categorizedPosts.manual.push(post);
      } else {
        categorizedPosts.automated.push(post);
      }
    });

    console.log(
      `Found ${categorizedPosts.manual.length} manual posts and ${categorizedPosts.automated.length} automated posts that need to be imported.`
    );

    let importedCount = 0;
    const allPostsToImport = [...categorizedPosts.manual, ...categorizedPosts.automated];

    if (allPostsToImport.length > 0) {
      // Import posts if requested
      if (shouldImport) {
        console.log(`Importing ${allPostsToImport.length} posts to database...`);
        for (const post of allPostsToImport) {
          const analysis = analyzePostContent(post.content);
          const success = await importManualPost(
            site.id,
            post.id,
            post.title.rendered,
            post.link,
            post.date,
            analysis.isManual,
            analysis.reason
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
        manual_posts_count: categorizedPosts.manual.length,
        automated_posts_count: categorizedPosts.automated.length,
        total_untracked: allPostsToImport.length,
        posts: allPostsToImport.map(post => {
          const analysis = analyzePostContent(post.content);
          return {
            post_id: post.id,
            title: post.title.rendered,
            date: post.date,
            link: post.link,
            slug: post.slug,
            author: post.author,
            is_manual: analysis.isManual,
            analysis_reason: analysis.reason,
            imported: shouldImport ? true : undefined,
          };
        }),
      };

      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
      console.log(`Results written to ${outputPath}`);
    }

    return { manualPosts: allPostsToImport, importedCount };
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
