const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

async function createTables() {
  console.log('Creating client portal tables...');

  // Database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST_NAME,
    user: process.env.DB_USER_NAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    multipleStatements: true,
  });

  try {
    console.log('Creating client_contacts table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS client_contacts (
        contact_id INT NOT NULL AUTO_INCREMENT,
        client_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (contact_id),
        FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
      )
    `);

    console.log('Creating client_approval_requests table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS client_approval_requests (
        request_id INT NOT NULL AUTO_INCREMENT,
        client_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_url VARCHAR(255),
        file_type VARCHAR(50),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_by_id VARCHAR(255),
        published_url VARCHAR(255),
        is_archived TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (request_id),
        FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
      )
    `);

    console.log('Creating approval_request_contacts table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS approval_request_contacts (
        id INT NOT NULL AUTO_INCREMENT,
        request_id INT NOT NULL,
        contact_id INT NOT NULL,
        has_viewed TINYINT(1) DEFAULT 0,
        has_approved TINYINT(1) DEFAULT 0,
        viewed_at TIMESTAMP NULL,
        approved_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (request_id) REFERENCES client_approval_requests(request_id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES client_contacts(contact_id) ON DELETE CASCADE
      )
    `);

    console.log('Creating approval_request_versions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS approval_request_versions (
        version_id INT NOT NULL AUTO_INCREMENT,
        request_id INT NOT NULL,
        version_number INT NOT NULL,
        file_url VARCHAR(255),
        comments TEXT,
        created_by_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (version_id),
        FOREIGN KEY (request_id) REFERENCES client_approval_requests(request_id) ON DELETE CASCADE
      )
    `);

    console.log('Creating approval_request_comments table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS approval_request_comments (
        comment_id INT NOT NULL AUTO_INCREMENT,
        request_id INT NOT NULL,
        version_id INT,
        comment TEXT NOT NULL,
        created_by_id VARCHAR(255),
        contact_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (comment_id),
        FOREIGN KEY (request_id) REFERENCES client_approval_requests(request_id) ON DELETE CASCADE,
        FOREIGN KEY (version_id) REFERENCES approval_request_versions(version_id) ON DELETE SET NULL,
        FOREIGN KEY (contact_id) REFERENCES client_contacts(contact_id) ON DELETE SET NULL
      )
    `);

    console.log('Creating client_auth_tokens table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS client_auth_tokens (
        token_id INT NOT NULL AUTO_INCREMENT,
        contact_id INT NOT NULL,
        token VARCHAR(100) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_used TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (token_id),
        UNIQUE KEY (token),
        FOREIGN KEY (contact_id) REFERENCES client_contacts(contact_id) ON DELETE CASCADE
      )
    `);

    // Add indexes for performance
    console.log('Creating indexes...');

    // Create each index, ignoring errors if it already exists
    try {
      await connection.execute(
        `CREATE INDEX idx_client_contacts_client_id ON client_contacts(client_id)`
      );
      console.log('✅ Created idx_client_contacts_client_id');
    } catch (error) {
      if ((error as any).code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_client_contacts_client_id already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_client_approval_requests_client_id ON client_approval_requests(client_id)`
      );
      console.log('✅ Created idx_client_approval_requests_client_id');
    } catch (error) {
      if ((error as any).code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_client_approval_requests_client_id already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_approval_request_contacts_request_id ON approval_request_contacts(request_id)`
      );
      console.log('✅ Created idx_approval_request_contacts_request_id');
    } catch (error) {
      if ((error as any).code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_approval_request_contacts_request_id already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_approval_request_contacts_contact_id ON approval_request_contacts(contact_id)`
      );
      console.log('✅ Created idx_approval_request_contacts_contact_id');
    } catch (error) {
      if ((error as any).code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_approval_request_contacts_contact_id already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_approval_request_versions_request_id ON approval_request_versions(request_id)`
      );
      console.log('✅ Created idx_approval_request_versions_request_id');
    } catch (error) {
      if ((error as any).code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_approval_request_versions_request_id already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_approval_request_comments_request_id ON approval_request_comments(request_id)`
      );
      console.log('✅ Created idx_approval_request_comments_request_id');
    } catch (error) {
      if ((error as any).code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_approval_request_comments_request_id already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_approval_request_comments_version_id ON approval_request_comments(version_id)`
      );
      console.log('✅ Created idx_approval_request_comments_version_id');
    } catch (error) {
      if ((error as any).code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_approval_request_comments_version_id already exists');
      } else {
        throw error;
      }
    }

    try {
      await connection.execute(
        `CREATE INDEX idx_client_auth_tokens_contact_id ON client_auth_tokens(contact_id)`
      );
      console.log('✅ Created idx_client_auth_tokens_contact_id');
    } catch (error) {
      if ((error as any).code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Index idx_client_auth_tokens_contact_id already exists');
      } else {
        throw error;
      }
    }

    console.log('All tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createTables()
  .then(() => {
    console.log('Database setup complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });
