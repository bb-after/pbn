-- Daily runs and results per engine
CREATE TABLE IF NOT EXISTS geo_prompt_runs (
  run_id INT AUTO_INCREMENT PRIMARY KEY,
  selection_item_id INT NOT NULL,
  run_date DATE NOT NULL,
  triggered_by ENUM('cron','manual') NOT NULL DEFAULT 'cron',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_selection_date (selection_item_id, run_date),
  FOREIGN KEY (selection_item_id) REFERENCES geo_prompt_selection_items(selection_item_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS geo_prompt_run_results (
  result_id INT AUTO_INCREMENT PRIMARY KEY,
  run_id INT NOT NULL,
  engine_id INT NOT NULL,
  visibility_rank INT NULL,
  visibility_score DECIMAL(6,2) NULL,
  average_position DECIMAL(6,2) NULL,
  citation_share DECIMAL(6,2) NULL,
  citation_rank INT NULL,
  executions INT NULL,
  mentions INT NULL,
  found_urls JSON NULL,
  raw_summary MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES geo_prompt_runs(run_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


