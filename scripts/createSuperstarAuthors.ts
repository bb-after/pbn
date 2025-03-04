const mysql = require('mysql2/promise');
const axios = require('axios');
const { faker } = require('@faker-js/faker');
const dotenv = require('dotenv');

const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Define types
interface SuperstarSite {
  id: number;
  domain: string;
  login: string;
  password?: string;
  hosting_site: string; // Contains the actual password
}

interface SuperstarAuthor {
  id?: number;
  superstar_site_id: number;
  author_name: string;
  author_email: string;
  author_username: string;
  author_password: string;
  author_avatar: string;
  author_bio: string;
  wp_author_id: number;
  created_at?: string;
  updated_at?: string;
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME || '',
  user: process.env.DB_USER_NAME || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || '',
};

// Log the database configuration (without password)
console.log('Database configuration:', {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  database: process.env.DB_DATABASE,
});

// Create the superstar_authors table if it doesn't exist
async function createSuperstarAuthorsTable(): Promise<void> {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // First, check the data type of the id column in superstar_sites
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM superstar_sites WHERE Field = 'id'
    `);
    
    console.log('superstar_sites id column:', columns);
    
    // Use the same data type for the foreign key
    const idType = columns.length > 0 ? columns[0].Type : 'INT';
    console.log(`Using data type ${idType} for superstar_site_id`);
    
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS superstar_authors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        superstar_site_id ${idType} NOT NULL,
        author_name VARCHAR(255) NOT NULL,
        author_email VARCHAR(255) NOT NULL,
        author_username VARCHAR(255) NOT NULL,
        author_password VARCHAR(255) NOT NULL,
        author_avatar VARCHAR(255),
        author_bio TEXT,
        wp_author_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (superstar_site_id) REFERENCES superstar_sites(id) ON DELETE CASCADE
      )
    `;
    
    await connection.query(createTableQuery);
    console.log('superstar_authors table created or already exists');
  } catch (error) {
    console.error('Error creating superstar_authors table:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Alter the superstar_site_submissions table to add the superstar_author_id and modified_at columns
async function alterSuperstarSiteSubmissionsTable(): Promise<void> {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Check if the superstar_author_id column already exists
    const [authorIdColumns] = await connection.query(`
      SHOW COLUMNS FROM superstar_site_submissions LIKE 'superstar_author_id'
    `);
    
    // Check the data type of the id column in superstar_authors
    const [authorColumns] = await connection.query(`
      SHOW COLUMNS FROM superstar_authors WHERE Field = 'id'
    `);
    
    const idType = authorColumns.length > 0 ? authorColumns[0].Type : 'INT';
    console.log(`Using data type ${idType} for superstar_author_id`);
    
    // If the superstar_author_id column doesn't exist, add it
    if (Array.isArray(authorIdColumns) && authorIdColumns.length === 0) {
      await connection.query(`
        ALTER TABLE superstar_site_submissions
        ADD COLUMN superstar_author_id ${idType},
        ADD FOREIGN KEY (superstar_author_id) REFERENCES superstar_authors(id)
      `);
      console.log('superstar_author_id column added to superstar_site_submissions table');
    } else {
      console.log('superstar_author_id column already exists');
    }
    
    // Check if the modified_at column already exists
    const [modifiedColumns] = await connection.query(`
      SHOW COLUMNS FROM superstar_site_submissions LIKE 'modified_at'
    `);
    
    // If the modified_at column doesn't exist, add it
    if (Array.isArray(modifiedColumns) && modifiedColumns.length === 0) {
      await connection.query(`
        ALTER TABLE superstar_site_submissions
        ADD COLUMN modified_at TIMESTAMP NULL
      `);
      console.log('modified_at column added to superstar_site_submissions table');
    } else {
      console.log('modified_at column already exists');
    }
  } catch (error) {
    console.error('Error altering superstar_site_submissions table:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Get all superstar sites
async function getSuperstarSites(): Promise<SuperstarSite[]> {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [rows] = await connection.query(`
      SELECT id, domain, login, hosting_site
      FROM superstar_sites
      WHERE active = 1
    `);
    
    console.log(`Found ${(rows as any[]).length} active superstar sites`);
    
    return rows as SuperstarSite[];
  } catch (error) {
    console.error('Error fetching superstar sites:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Create a WordPress author
async function createWordPressAuthor(
  site: SuperstarSite,
  authorName: string,
  authorUsername: string,
  authorEmail: string,
  authorPassword: string,
  authorBio: string
): Promise<number> {
  try {
    console.log(`Creating WordPress author ${authorName} on ${site.domain}`);
    
    const response = await axios.post(
      `${site.domain}/wp-json/wp/v2/users`,
      {
        name: authorName,
        username: authorUsername,
        email: authorEmail,
        password: authorPassword,
        description: authorBio,
        roles: ['author']
      },
      {
        auth: {
          username: site.login,
          password: site.hosting_site
        }
      }
    );
    
    console.log(`Successfully created author "${authorName}" with WordPress ID: ${response.data.id}`);
    return response.data.id;
  } catch (error: any) {
    console.error(`Error creating WordPress author on ${site.domain}:`, error?.response?.data || error.message);
    throw error;
  }
}

// Insert an author into the superstar_authors table
async function insertSuperstarAuthor(author: SuperstarAuthor): Promise<number> {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const [result] = await connection.query(
      `
      INSERT INTO superstar_authors (
        superstar_site_id, author_name, author_email, author_username, 
        author_password, author_avatar, author_bio, wp_author_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        author.superstar_site_id,
        author.author_name,
        author.author_email,
        author.author_username,
        author.author_password,
        author.author_avatar,
        author.author_bio,
        author.wp_author_id
      ]
    );
    
    const insertId = (result as any).insertId;
    return insertId;
  } catch (error) {
    console.error('Error inserting superstar author:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Determine likely gender from a name
function determineGender(name: string): 'male' | 'female' {
  // List of common male first names
  const maleNames = [
    'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles',
    'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
    'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan',
    'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon',
    'benjamin', 'samuel', 'gregory', 'alexander', 'frank', 'patrick', 'raymond', 'jack', 'dennis', 'jerry'
  ];
  
  // List of common female first names
  const femaleNames = [
    'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah', 'karen',
    'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna', 'michelle',
    'carol', 'amanda', 'dorothy', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia',
    'kathleen', 'amy', 'angela', 'shirley', 'anna', 'ruth', 'brenda', 'pamela', 'nicole', 'katherine',
    'virginia', 'catherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'emma', 'maria', 'heather'
  ];
  
  // Get the first name in lowercase
  const firstName = name.split(' ')[0].toLowerCase();
  
  // Check if it's in either list
  if (maleNames.includes(firstName)) {
    return 'male';
  } else if (femaleNames.includes(firstName)) {
    return 'female';
  }
  
  // If we can't determine from the lists, use the last character as a heuristic
  // Names ending in 'a', 'e', 'i' are more commonly female
  const lastChar = firstName.slice(-1);
  if (['a', 'e', 'i'].includes(lastChar)) {
    return 'female';
  }
  
  // Default to male
  return 'male';
}

// Generate a gender-appropriate avatar URL
function generateAvatarUrl(name: string): string {
  const gender = determineGender(name);
  // Use different avatar services based on gender
  if (gender === 'male') {
    // Men avatars
    return `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 99)}.jpg`;
  } else {
    // Women avatars
    return `https://randomuser.me/api/portraits/women/${Math.floor(Math.random() * 99)}.jpg`;
  }
}

// Clear existing authors for a site
async function clearExistingAuthors(siteId: number): Promise<void> {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log(`Clearing existing authors for site ID ${siteId}...`);
    
    // First, check if there are any submissions referencing authors for this site
    const [submissions] = await connection.query(
      'SELECT COUNT(*) as count FROM superstar_site_submissions WHERE superstar_site_id = ? AND superstar_author_id IS NOT NULL',
      [siteId]
    );
    
    const submissionCount = (submissions as any[])[0]?.count || 0;
    
    if (submissionCount > 0) {
      console.log(`Found ${submissionCount} submissions with authors for site ${siteId}. Nullifying references first.`);
      
      // Set superstar_author_id to NULL and reset modified_at in superstar_site_submissions
      await connection.query(
        'UPDATE superstar_site_submissions SET superstar_author_id = NULL, modified_at = NULL WHERE superstar_site_id = ?',
        [siteId]
      );
    }
    
    // Now it's safe to delete the authors
    const [result] = await connection.query(
      'DELETE FROM superstar_authors WHERE superstar_site_id = ?',
      [siteId]
    );
    
    console.log(`Deleted ${(result as any).affectedRows} authors for site ID ${siteId}`);
  } catch (error) {
    console.error(`Error clearing existing authors for site ${siteId}:`, error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Get WordPress authors for a site
async function getWordPressAuthors(site: SuperstarSite): Promise<any[]> {
  try {
    console.log(`Getting existing WordPress authors from ${site.domain}...`);
    
    const response = await axios.get(
      `${site.domain}/wp-json/wp/v2/users`,
      {
        auth: {
          username: site.login,
          password: site.hosting_site
        }
      }
    );
    
    return response.data || [];
  } catch (error: any) {
    console.error(`Error getting WordPress authors from ${site.domain}:`, error?.response?.data || error.message);
    return [];
  }
}

// Get existing WordPress posts for a site
async function getWordPressPosts(site: SuperstarSite, page = 1, perPage = 100): Promise<any[]> {
  try {
    console.log(`Getting existing WordPress posts from ${site.domain} (page ${page})...`);
    
    const response = await axios.get(
      `${site.domain}/wp-json/wp/v2/posts`,
      {
        params: { 
          page: page,
          per_page: perPage,
          _fields: 'id,title,author'
        },
        auth: {
          username: site.login,
          password: site.hosting_site
        }
      }
    );
    
    console.log(`Found ${response.data.length} posts on page ${page}`);
    return response.data || [];
  } catch (error: any) {
    // If we get a 400 error, it might be because we went beyond available pages
    if (error.response && error.response.status === 400) {
      console.log(`No more posts available after page ${page-1}`);
      return [];
    }
    
    console.error(`Error getting WordPress posts from ${site.domain}:`, error?.response?.data || error.message);
    return [];
  }
}

// Update a WordPress post's author
async function updateWordPressPostAuthor(site: SuperstarSite, postId: number, authorId: number): Promise<boolean> {
  try {
    console.log(`Updating post ${postId} to use author ${authorId} on ${site.domain}`);
    
    // First, try to get an administrator from the site to handle the post update
    let adminUsername = site.login;
    let adminPassword = site.hosting_site;
    
    try {
      const adminAuthorsResponse = await axios.get(
        `${site.domain}/wp-json/wp/v2/users`,
        { 
          params: { roles: 'administrator' },
          auth: {
            username: site.login,
            password: site.hosting_site
          }
        }
      );
      
      // If we found admin users, use the first one's credentials
      if (Array.isArray(adminAuthorsResponse?.data) && adminAuthorsResponse.data.length > 0) {
        const admin = adminAuthorsResponse.data[0];
        console.log(`Found admin user ${admin.name} - will use for post updates`);
        // Note: We can't actually use the admin's credentials here since we don't know the password
        // We'll continue using the site credentials, which should have admin privileges
      }
    } catch (adminError) {
      console.log(`Could not get admin users list, will use site credentials`);
    }
    
    // Update the post using admin credentials
    await axios.put(
      `${site.domain}/wp-json/wp/v2/posts/${postId}`,
      {
        author: authorId
      },
      {
        auth: {
          username: adminUsername,
          password: adminPassword
        }
      }
    );
    
    return true;
  } catch (error: any) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      console.error(`Permission denied when updating post ${postId}. This WordPress installation may require additional privileges.`);
    } else {
      console.error(`Error updating post ${postId} on ${site.domain}:`, error?.response?.data?.message || error.message);
    }
    return false;
  }
}

// Main function to create authors for each superstar site
async function createAuthorsForSuperstarSites(): Promise<void> {
  try {
    // Create the superstar_authors table if it doesn't exist
    await createSuperstarAuthorsTable();
    
    // Alter the superstar_site_submissions table
    await alterSuperstarSiteSubmissionsTable();
    
    // Get all superstar sites
    const sites = await getSuperstarSites();
    
    // Loop through each site and create random number of authors
    for (const site of sites) {
      try {
        // Check if hosting_site is available
        if (!site.hosting_site) {
          console.warn(`Skipping site ${site.id} (${site.domain}) - no hosting_site value`);
          continue;
        }
        
        console.log(`Processing site ${site.id} - ${site.domain} with login ${site.login}`);
        
        // First, clear existing authors for this site
        await clearExistingAuthors(site.id);
        
        // Check if site already has authors in WordPress
        const existingAuthors = await getWordPressAuthors(site);
        console.log(`Found ${existingAuthors.length} existing WordPress authors for site: ${site.domain}`);
        
        const validAuthors: any[] = [];
        
        if (existingAuthors.length > 0) {
          // Import existing authors
          for (const wpAuthor of existingAuthors) {
            if (wpAuthor.roles && 
               (wpAuthor.roles.includes('administrator') || 
                wpAuthor.roles.includes('editor') || 
                wpAuthor.slug === 'admin' ||
                wpAuthor.name.toLowerCase() === 'admin')) {
              console.log(`Skipping admin/editor user ${wpAuthor.name} (${wpAuthor.slug})`);
              continue; // Skip admin/editor users
            }
            
            try {
              // Insert the existing author into our database
              const authorData: SuperstarAuthor = {
                superstar_site_id: site.id,
                author_name: wpAuthor.name,
                author_email: wpAuthor.email || `${wpAuthor.slug}@example.com`,
                author_username: wpAuthor.slug,
                author_password: faker.internet.password({ length: 12 }), // We don't know the password, but we need to store something
                author_avatar: wpAuthor.avatar_urls ? wpAuthor.avatar_urls['96'] : generateAvatarUrl(wpAuthor.name),
                author_bio: wpAuthor.description || faker.lorem.paragraph(2),
                wp_author_id: wpAuthor.id
              };
              
              const authorId = await insertSuperstarAuthor(authorData);
              console.log(`Imported existing author ${wpAuthor.name} (ID: ${authorId}, WP ID: ${wpAuthor.id}) for site: ${site.domain}`);
              
              validAuthors.push({
                id: wpAuthor.id,
                name: wpAuthor.name,
                db_id: authorId
              });
            } catch (error) {
              console.error(`Failed to import author ${wpAuthor.name} for site ${site.domain}:`, error);
              // Continue with the next author
              continue;
            }
          }
        }
        
        // We need to create authors if we don't have any non-admin ones
        if (validAuthors.length === 0) {
          console.warn(`No non-admin authors found for ${site.domain}`);
          
          // Try to use the admin user to create new authors via WordPress API
          const adminAuthor = existingAuthors.find(a => 
            a.roles && (a.roles.includes('administrator') || a.slug === 'admin')
          );
          
          if (adminAuthor) {
            console.log(`Using admin credentials to create new authors`);
            
            // Try to create 3 new authors using WordPress API
            for (let i = 0; i < 3; i++) {
              const authorName = faker.person.fullName();
              const authorUsername = faker.internet.userName({ firstName: authorName.split(' ')[0] }).toLowerCase();
              const authorEmail = faker.internet.email({ firstName: authorName.split(' ')[0], lastName: authorName.split(' ')[1] }).toLowerCase();
              const authorPassword = faker.internet.password({ length: 12 });
              const authorBio = faker.lorem.paragraph(3);
              const authorAvatar = generateAvatarUrl(authorName);
              
              try {
                console.log(`Attempting to create author ${authorName} for ${site.domain}`);
                
                // Create the author in WordPress
                const response = await axios.post(
                  `${site.domain}/wp-json/wp/v2/users`,
                  {
                    name: authorName,
                    username: authorUsername,
                    email: authorEmail,
                    password: authorPassword,
                    description: authorBio,
                    roles: ['author']
                  },
                  {
                    auth: {
                      username: site.login,
                      password: site.hosting_site
                    }
                  }
                );
                
                const wpAuthorId = response.data.id;
                
                // Insert the author into our database
                const authorData: SuperstarAuthor = {
                  superstar_site_id: site.id,
                  author_name: authorName,
                  author_email: authorEmail,
                  author_username: authorUsername,
                  author_password: authorPassword,
                  author_avatar: authorAvatar,
                  author_bio: authorBio,
                  wp_author_id: wpAuthorId
                };
                
                const authorId = await insertSuperstarAuthor(authorData);
                console.log(`Created new author ${authorName} (ID: ${authorId}, WP ID: ${wpAuthorId}) for site: ${site.domain}`);
                
                validAuthors.push({
                  id: wpAuthorId,
                  name: authorName,
                  db_id: authorId
                });
              } catch (error) {
                console.error(`Failed to create author ${authorName} for site ${site.domain}:`, error);
                continue;
              }
            }
          }
          
          // If we still don't have any authors after trying to create them, use admin as a last resort
          if (validAuthors.length === 0 && adminAuthor) {
            console.log(`Failed to create new authors. Using admin user ${adminAuthor.name} as fallback`);
            
            const authorData: SuperstarAuthor = {
              superstar_site_id: site.id,
              author_name: adminAuthor.name,
              author_email: adminAuthor.email || `${adminAuthor.slug}@example.com`,
              author_username: adminAuthor.slug,
              author_password: faker.internet.password({ length: 12 }),
              author_avatar: adminAuthor.avatar_urls ? adminAuthor.avatar_urls['96'] : generateAvatarUrl(adminAuthor.name),
              author_bio: adminAuthor.description || faker.lorem.paragraph(2),
              wp_author_id: adminAuthor.id
            };
            
            const authorId = await insertSuperstarAuthor(authorData);
            console.log(`Using admin ${adminAuthor.name} (ID: ${authorId}, WP ID: ${adminAuthor.id}) for site: ${site.domain}`);
            
            validAuthors.push({
              id: adminAuthor.id,
              name: adminAuthor.name,
              db_id: authorId
            });
          }
          
          // If we still have no authors, skip this site
          if (validAuthors.length === 0) {
            console.error(`No usable authors found for ${site.domain}, skipping site`);
            continue;
          }
        }
        
        // Update existing posts to use random authors from our set
        if (validAuthors.length > 0) {
          console.log(`Updating existing posts to use random authors from our set of ${validAuthors.length} authors`);
          
          let page = 1;
          let posts = await getWordPressPosts(site, page);
          let updateErrorCount = 0;
          let updateSuccessCount = 0;
          
          while (posts.length > 0) {
            for (const post of posts) {
              // Pick a random author from our valid authors
              const randomAuthor = validAuthors[Math.floor(Math.random() * validAuthors.length)];
              
              // Check if current post author is admin
              const currentAuthorIsAdmin = existingAuthors.find(a => 
                a.id === post.author && 
                (a.roles?.includes('administrator') || a.slug === 'admin' || a.name?.toLowerCase() === 'admin')
              );
              
              // Check if our random author is admin (shouldn't happen, but let's be extra safe)
              const randomAuthorIsAdmin = randomAuthor.name.toLowerCase() === 'admin';
              
              // We always want to replace admin authors
              if (currentAuthorIsAdmin) {
                // If the random author is also admin, skip this iteration and try again
                if (randomAuthorIsAdmin) {
                  console.log(`Post ${post.id} uses admin author but randomly selected replacement is also admin - trying another author`);
                  continue;
                }
                
                console.log(`Post ${post.id} currently uses admin author - replacing with ${randomAuthor.name}`);
              } 
              // If it's not admin but happens to be the same author we randomly selected, skip
              else if (post.author === randomAuthor.id) {
                console.log(`Post ${post.id} already uses non-admin author ${randomAuthor.name}, skipping`);
                continue;
              }
              
              // Update the post's author
              const success = await updateWordPressPostAuthor(site, post.id, randomAuthor.id);
              
              if (success) {
                updateSuccessCount++;
                console.log(`Updated post ${post.id} to use author ${randomAuthor.name}`);
              } else {
                updateErrorCount++;
              }
              
              // If we've had 5 errors in a row without any successes, stop trying to update posts for this site
              if (updateErrorCount >= 5 && updateSuccessCount === 0) {
                console.warn(`
=====================================================
WARNING: Unable to update WordPress post authors for ${site.domain}
This is likely due to WordPress permission settings.

Options to fix this:
1. Use a WordPress administrator account in the superstar_sites table
2. Install a plugin like "Edit Author Slug" to change post authors
3. Disable "Rest API Author Field" security features if they're enabled
=====================================================
`);
                // Break out of the post loop
                break;
              }
            }
            
            // If we've had 5 errors in a row, also break out of the page loop
            if (updateErrorCount >= 5 && updateSuccessCount === 0) {
              break;
            }
            
            // Get the next page of posts
            page++;
            posts = await getWordPressPosts(site, page);
          }
          
          console.log(`Finished processing posts for ${site.domain}. Updated ${updateSuccessCount} posts.`);
        }
      } catch (siteError) {
        console.error(`Error processing site ${site.domain}:`, siteError);
        continue; // Continue with the next site
      }
    }
    
    console.log('Finished creating authors for all superstar sites');
  } catch (error) {
    console.error('Error in main function:', error);
    throw error;
  }
}

// Update existing submissions to assign a random superstar author
async function updateExistingSubmissions(): Promise<void> {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Get all superstar site submissions without an author
    const [submissions] = await connection.query(`
      SELECT 
        sss.id, 
        sss.superstar_site_id,
        sss.submission_response
      FROM 
        superstar_site_submissions sss
      WHERE 
        sss.superstar_author_id IS NULL
        AND sss.submission_response IS NOT NULL
    `);
    
    console.log(`Found ${(submissions as any[]).length} submissions without authors`);
    
    for (const submission of submissions as any[]) {
      // Get all authors for this submission's site
      const [authors] = await connection.query(
        `SELECT id, wp_author_id, author_name FROM superstar_authors WHERE superstar_site_id = ?`,
        [submission.superstar_site_id]
      );
      
      if (Array.isArray(authors) && authors.length > 0) {
        // Select a random author
        const randomAuthor = authors[Math.floor(Math.random() * authors.length)] as any;
        
        // Update the submission with the random author and set modified_at to current timestamp
        await connection.query(
          `UPDATE superstar_site_submissions SET superstar_author_id = ?, modified_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [randomAuthor.id, submission.id]
        );
        
        console.log(`Updated submission ${submission.id} with author ${randomAuthor.author_name} (ID: ${randomAuthor.id})`);
        
        // If the submission has a WordPress link, try to update the WordPress post author too
        if (submission.submission_response && typeof submission.submission_response === 'string' && submission.submission_response.includes('http')) {
          // Extract the site domain and post ID from the submission_response (which is a URL)
          try {
            const url = new URL(submission.submission_response);
            const domain = `${url.protocol}//${url.hostname}`;
            
            // Try to extract post ID from the URL path
            const pathParts = url.pathname.split('/').filter(part => part.length > 0);
            const possiblePostId = pathParts[pathParts.length - 1];
            const postId = parseInt(possiblePostId, 10);
            
            if (!isNaN(postId) && randomAuthor.wp_author_id) {
              console.log(`Attempting to update WordPress post ${postId} on ${domain} to use author ${randomAuthor.wp_author_id}`);
              
              // Get the site info to make the API call
              const [siteRows] = await connection.query(
                `SELECT domain, login, hosting_site FROM superstar_sites WHERE id = ?`,
                [submission.superstar_site_id]
              );
              
              if (Array.isArray(siteRows) && siteRows.length > 0) {
                const site = siteRows[0] as SuperstarSite;
                
                // Update the WordPress post
                try {
                  await axios.put(
                    `${site.domain}/wp-json/wp/v2/posts/${postId}`,
                    {
                      author: randomAuthor.wp_author_id
                    },
                    {
                      auth: {
                        username: site.login,
                        password: site.hosting_site
                      }
                    }
                  );
                  
                  console.log(`Successfully updated WordPress post ${postId} to use author ${randomAuthor.author_name}`);
                } catch (wpError: any) {
                  console.error(`Failed to update WordPress post ${postId}: ${wpError?.response?.data?.message || wpError.message}`);
                }
              }
            }
          } catch (urlError) {
            console.warn(`Could not parse URL from submission response: ${submission.submission_response}`);
          }
        }
      } else {
        console.log(`No authors found for site ${submission.superstar_site_id}, skipping submission ${submission.id}`);
      }
    }
    
    console.log('Finished updating existing submissions');
  } catch (error) {
    console.error('Error updating existing submissions:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Function to modify postSuperstarContentToWordpress.ts to use the author from the database
async function updatePostToWordPressFunction(): Promise<void> {
  console.log('To complete the integration, you need to update the postSuperstarContentToWordpress.ts file to use the author from the database.');
  console.log('This will require modifying the following files:');
  console.log('1. pages/api/postSuperstarContentToWordpress.ts - To fetch and use the author_id from the superstar_site_submissions table');
  console.log('2. utils/postToWordpress.ts - To uncomment the author parameter and use it in the WordPress API call');
}

// Get a summary of modified submissions
async function getModifiedSubmissionsSummary(): Promise<void> {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    // Get count of submissions with modified_at set
    const [modifiedRows] = await connection.query(`
      SELECT 
        COUNT(*) as count,
        DATE(modified_at) as date
      FROM 
        superstar_site_submissions
      WHERE 
        modified_at IS NOT NULL
      GROUP BY 
        DATE(modified_at)
      ORDER BY 
        date DESC
    `);
    
    console.log('\n--- MODIFIED SUBMISSIONS SUMMARY ---');
    
    if (Array.isArray(modifiedRows) && modifiedRows.length > 0) {
      console.log('Submissions modified by date:');
      for (const row of modifiedRows as any[]) {
        console.log(`${row.date}: ${row.count} submissions`);
      }
      
      // Get total count
      const [totalRows] = await connection.query(`
        SELECT COUNT(*) as total FROM superstar_site_submissions WHERE modified_at IS NOT NULL
      `);
      
      const total = (totalRows as any[])[0]?.total || 0;
      
      console.log(`\nTotal submissions modified: ${total}`);
    } else {
      console.log('No submissions have been modified yet.');
    }
    
    console.log('----------------------------------\n');
  } catch (error) {
    console.error('Error getting modified submissions summary:', error);
  } finally {
    await connection.end();
  }
}

// Entry point for the script
async function main(): Promise<void> {
  try {
    console.log('Starting creation of superstar authors...');
    await createAuthorsForSuperstarSites();
    await updateExistingSubmissions();
    await getModifiedSubmissionsSummary();
    await updatePostToWordPressFunction();
    console.log('Completed!');
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main();