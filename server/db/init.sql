CREATE DATABASE IF NOT EXISTS nomad_guide
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nomad_guide;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,
  avatar VARCHAR(500) NOT NULL,
  tagline VARCHAR(255) NOT NULL,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

ALTER TABLE users
  MODIFY COLUMN avatar VARCHAR(500) NOT NULL;

INSERT INTO users (username, avatar, tagline, balance)
SELECT '流浪诗人', '/static/logo.png', '已在鹤岗旅居 45 天', 2450.00
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE username = '流浪诗人'
);

