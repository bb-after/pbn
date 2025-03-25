import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Creating client tables...');
  
  // Database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    // Create clients table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        client_id INT NOT NULL AUTO_INCREMENT,
        client_name VARCHAR(255) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (client_id),
        UNIQUE KEY (client_name)
      )
    `);
    console.log('✅ clients table created');

    // Create clients_industry_mapping table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clients_industry_mapping (
        client_id INT NOT NULL,
        industry_id INT NOT NULL,
        PRIMARY KEY (client_id, industry_id),
        FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
        FOREIGN KEY (industry_id) REFERENCES industries(industry_id) ON DELETE CASCADE
      )
    `);
    console.log('✅ clients_industry_mapping table created');

    // Create clients_region_mapping table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clients_region_mapping (
        client_id INT NOT NULL,
        region_id INT NOT NULL,
        PRIMARY KEY (client_id, region_id),
        FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
        FOREIGN KEY (region_id) REFERENCES geo_regions(region_id) ON DELETE CASCADE
      )
    `);
    console.log('✅ clients_region_mapping table created');

    // Add client_id column to superstar_site_submissions table
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM superstar_site_submissions LIKE 'client_id'
    `);
    
    if (Array.isArray(columns) && columns.length === 0) {
      await connection.execute(`
        ALTER TABLE superstar_site_submissions 
        ADD COLUMN client_id INT NULL AFTER superstar_author_id,
        ADD FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE SET NULL
      `);
      console.log('✅ Added client_id column to superstar_site_submissions table');
    } else {
      console.log('⚠️ client_id column already exists in superstar_site_submissions table');
    }

    // Migrate existing client names data to the new clients table
    // This will only insert clients that don't already exist in the clients table
    await connection.execute(`
      INSERT IGNORE INTO clients (client_name)
      SELECT DISTINCT client_name FROM superstar_site_submissions
      WHERE client_name IS NOT NULL AND client_name != '';
    `);
    console.log('✅ Migrated existing client names to clients table');

    // Update the client_id field in superstar_site_submissions based on client_name
    await connection.execute(`
      UPDATE superstar_site_submissions ss
      JOIN clients c ON ss.client_name = c.client_name
      SET ss.client_id = c.client_id
      WHERE ss.client_name IS NOT NULL AND ss.client_name != '';
    `);
    console.log('✅ Updated client_id references in superstar_site_submissions table');

    console.log('✅ All client tables created successfully!');
  } catch (error) {
    console.error('Error creating client tables:', error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);