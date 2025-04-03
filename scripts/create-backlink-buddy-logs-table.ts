import * as mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST_NAME,
  user: process.env.DB_USER_NAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

async function createTable() {
  console.log('Starting creation of backlink_buddy_logs table...');

  let connection: mysql.Connection | null = null;

  try {
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully');

    // Create backlink_buddy_logs table
    console.log('Creating backlink_buddy_logs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS backlink_buddy_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        user_token VARCHAR(255) NOT NULL,
        client_id INT,
        client_name VARCHAR(255),
        action_type ENUM('content_generation', 'publish', 'regenerate') NOT NULL,
        article_count INT DEFAULT 1,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX (user_token),
        INDEX (client_id),
        INDEX (action_type),
        INDEX (created_at),
        FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE SET NULL
      )
    `);
    console.log('backlink_buddy_logs table created successfully');

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

// Execute the function
createTable()
  .then(() => {
    console.log('Process completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Process failed:', error);
    process.exit(1);
  });
