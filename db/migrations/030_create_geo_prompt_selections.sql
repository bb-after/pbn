-- Selected prompts for a client/keyword configuration
CREATE TABLE IF NOT EXISTS geo_prompt_selections (
  selection_id INT AUTO_INCREMENT PRIMARY KEY,
  client_name VARCHAR(255) NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  analysis_type ENUM('brand','individual') NOT NULL,
  created_by VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS geo_prompt_selection_items (
  selection_item_id INT AUTO_INCREMENT PRIMARY KEY,
  selection_id INT NOT NULL,
  prompt_id INT NOT NULL,
  variant_id INT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (selection_id) REFERENCES geo_prompt_selections(selection_id) ON DELETE CASCADE,
  FOREIGN KEY (prompt_id) REFERENCES geo_prompts(prompt_id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES geo_prompt_variants(variant_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


