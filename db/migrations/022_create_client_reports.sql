-- Create client_reports table
CREATE TABLE IF NOT EXISTS client_reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_name VARCHAR(255),
  status ENUM('pending', 'shared', 'archived') DEFAULT 'pending',
  created_by_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
  INDEX idx_client_reports_client_id (client_id),
  INDEX idx_client_reports_status (status),
  INDEX idx_client_reports_created_by (created_by_id),
  INDEX idx_client_reports_created_at (created_at)
);

-- Create report_contacts table (similar to approval_request_contacts)
CREATE TABLE IF NOT EXISTS report_contacts (
  report_contact_id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  contact_id BIGINT UNSIGNED NOT NULL,
  shared_at TIMESTAMP NULL,
  viewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES client_reports(report_id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES client_contacts(contact_id) ON DELETE CASCADE,
  UNIQUE KEY unique_report_contact (report_id, contact_id),
  INDEX idx_report_contacts_report_id (report_id),
  INDEX idx_report_contacts_contact_id (contact_id),
  INDEX idx_report_contacts_shared_at (shared_at)
);

-- Create report_comments table for feedback on reports
CREATE TABLE IF NOT EXISTS report_comments (
  comment_id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  contact_id BIGINT UNSIGNED,
  staff_user_id VARCHAR(255),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES client_reports(report_id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES client_contacts(contact_id) ON DELETE CASCADE,
  INDEX idx_report_comments_report_id (report_id),
  INDEX idx_report_comments_contact_id (contact_id),
  INDEX idx_report_comments_staff_user (staff_user_id),
  INDEX idx_report_comments_created_at (created_at)
);