import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

async function createTables() {
  console.log('Starting database migration for Content Compass...');
  
  let connection: mysql.Connection | undefined;
  
  try {
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');

    // Create industries table
    console.log('Creating industries table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS industries (
        industry_id INT AUTO_INCREMENT PRIMARY KEY,
        industry_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY (industry_name)
      )
    `);
    console.log('Industries table created successfully');

    // Create article_topics table
    console.log('Creating article_topics table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS article_topics (
        topic_id INT AUTO_INCREMENT PRIMARY KEY,
        topic_title VARCHAR(255) NOT NULL,
        industry_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (industry_id) REFERENCES industries(industry_id),
        UNIQUE KEY (topic_title, industry_id)
      )
    `);
    console.log('Article topics table created successfully');

    // Create blogs table
    console.log('Creating blogs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        blog_id INT AUTO_INCREMENT PRIMARY KEY,
        blog_name VARCHAR(255) NOT NULL,
        blog_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY (blog_url)
      )
    `);
    console.log('Blogs table created successfully');

    // Create blog_topic_mapping table
    console.log('Creating blog_topic_mapping table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blog_topic_mapping (
        id INT AUTO_INCREMENT PRIMARY KEY,
        blog_id INT NOT NULL,
        topic_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (blog_id) REFERENCES blogs(blog_id),
        FOREIGN KEY (topic_id) REFERENCES article_topics(topic_id),
        UNIQUE KEY (blog_id, topic_id)
      )
    `);
    console.log('Blog topic mapping table created successfully');

    // Add some sample data if tables are empty
    await insertSampleData(connection);

    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during database migration:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

async function insertSampleData(connection: mysql.Connection) {
  // Check if industries table is empty
  const [industryRows] = await connection.query('SELECT COUNT(*) as count FROM industries');
  const industryCount = (industryRows as any)[0].count;
  
  if (industryCount === 0) {
    console.log('Inserting sample industries...');
    await connection.query(`
      INSERT INTO industries (industry_name) VALUES 
      ('Technology'),
      ('Business'),
      ('Health'),
      ('Lifestyle'),
      ('Travel')
    `);
    
    // Get inserted industries
    const [industries] = await connection.query('SELECT * FROM industries');
    
    // Insert sample topics
    console.log('Inserting sample topics...');
    for (const industry of industries as any[]) {
      if (industry.industry_name === 'Technology') {
        await connection.query(`
          INSERT INTO article_topics (topic_title, industry_id) VALUES 
          ('Artificial Intelligence', ?),
          ('Web Development', ?),
          ('Cybersecurity', ?)
        `, [industry.industry_id, industry.industry_id, industry.industry_id]);
      } else if (industry.industry_name === 'Business') {
        await connection.query(`
          INSERT INTO article_topics (topic_title, industry_id) VALUES 
          ('Marketing', ?),
          ('Entrepreneurship', ?),
          ('Finance', ?)
        `, [industry.industry_id, industry.industry_id, industry.industry_id]);
      } else if (industry.industry_name === 'Health') {
        await connection.query(`
          INSERT INTO article_topics (topic_title, industry_id) VALUES 
          ('Nutrition', ?),
          ('Fitness', ?),
          ('Mental Health', ?)
        `, [industry.industry_id, industry.industry_id, industry.industry_id]);
      }
    }
    
    // Get inserted topics
    const [topics] = await connection.query('SELECT * FROM article_topics');
    
    // Insert sample blogs
    console.log('Inserting sample blogs...');
    await connection.query(`
      INSERT INTO blogs (blog_name, blog_url) VALUES 
      ('TechCrunch', 'https://techcrunch.com'),
      ('Wired', 'https://wired.com'),
      ('Business Insider', 'https://businessinsider.com'),
      ('Forbes', 'https://forbes.com'),
      ('Health.com', 'https://health.com'),
      ('MindBodyGreen', 'https://mindbodygreen.com')
    `);
    
    // Get inserted blogs
    const [blogs] = await connection.query('SELECT * FROM blogs');
    
    // Map blogs to topics
    console.log('Creating blog-topic mappings...');
    for (const topic of topics as any[]) {
      for (const blog of blogs as any[]) {
        // Create some relevant mappings
        if (
          (topic.topic_title === 'Artificial Intelligence' && ['TechCrunch', 'Wired'].includes(blog.blog_name)) ||
          (topic.topic_title === 'Web Development' && ['TechCrunch'].includes(blog.blog_name)) ||
          (topic.topic_title === 'Cybersecurity' && ['Wired', 'Forbes'].includes(blog.blog_name)) ||
          (topic.topic_title === 'Marketing' && ['Business Insider', 'Forbes'].includes(blog.blog_name)) ||
          (topic.topic_title === 'Entrepreneurship' && ['Forbes', 'Business Insider'].includes(blog.blog_name)) ||
          (topic.topic_title === 'Finance' && ['Forbes', 'Business Insider'].includes(blog.blog_name)) ||
          (topic.topic_title === 'Nutrition' && ['Health.com', 'MindBodyGreen'].includes(blog.blog_name)) ||
          (topic.topic_title === 'Fitness' && ['Health.com', 'MindBodyGreen'].includes(blog.blog_name)) ||
          (topic.topic_title === 'Mental Health' && ['Health.com', 'MindBodyGreen'].includes(blog.blog_name))
        ) {
          try {
            await connection.query(`
              INSERT INTO blog_topic_mapping (blog_id, topic_id) VALUES (?, ?)
            `, [blog.blog_id, topic.topic_id]);
          } catch (err) {
            // Ignore duplicate entry errors
            if (!(err as any).message.includes('Duplicate entry')) {
              throw err;
            }
          }
        }
      }
    }
    
    console.log('Sample data inserted successfully');
  } else {
    console.log('Tables already contain data, skipping sample data insertion');
  }
}

// Run the migration
createTables()
  .then(() => {
    console.log('Migration script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });