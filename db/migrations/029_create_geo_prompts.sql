-- GEO Prompts and Variants
CREATE TABLE IF NOT EXISTS geo_prompts (
  prompt_id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  analysis_type ENUM('brand','individual') NOT NULL,
  base_text TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES geo_topics(topic_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS geo_prompt_variants (
  variant_id INT AUTO_INCREMENT PRIMARY KEY,
  prompt_id INT NOT NULL,
  variant_text TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (prompt_id) REFERENCES geo_prompts(prompt_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


