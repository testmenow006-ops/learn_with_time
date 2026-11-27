-- Visitor IP and location analytics
-- Run once after migrations/001_initial.sql

ALTER TABLE analytics
  ADD COLUMN ip_address VARCHAR(45) NULL AFTER path,
  ADD INDEX analytics_ip_idx (user_id, ip_address, created_at);

CREATE TABLE IF NOT EXISTS visitor_analytics (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT '',
  region VARCHAR(100) NOT NULL DEFAULT '',
  city VARCHAR(100) NOT NULL DEFAULT '',
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  accuracy DECIMAL(10,2) NULL,
  visit_count INT UNSIGNED NOT NULL DEFAULT 1,
  first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY visitor_user_ip_unique (user_id, ip_address),
  INDEX visitor_last_seen_idx (user_id, last_seen),
  CONSTRAINT visitor_analytics_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
