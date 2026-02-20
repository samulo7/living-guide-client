CREATE DATABASE IF NOT EXISTS nomad_guide
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nomad_guide;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  avatar VARCHAR(500) NOT NULL,
  tagline VARCHAR(255) NOT NULL,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_phone (phone)
);

-- Legacy table compatibility for v1/v2 schemas.
ALTER TABLE users
  MODIFY COLUMN avatar VARCHAR(500) NOT NULL;

SET @col_phone_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'phone'
);

SET @col_phone_sql := IF(
  @col_phone_exists = 0,
  'ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL',
  'SELECT 1'
);

PREPARE col_phone_stmt FROM @col_phone_sql;
EXECUTE col_phone_stmt;
DEALLOCATE PREPARE col_phone_stmt;

SET @col_password_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'password'
);

SET @col_password_sql := IF(
  @col_password_exists = 0,
  'ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL',
  'SELECT 1'
);

PREPARE col_password_stmt FROM @col_password_sql;
EXECUTE col_password_stmt;
DEALLOCATE PREPARE col_password_stmt;

SET @col_username_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'username'
);

SET @col_username_sql := IF(
  @col_username_exists = 0,
  'ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL',
  'SELECT 1'
);

PREPARE col_username_stmt FROM @col_username_sql;
EXECUTE col_username_stmt;
DEALLOCATE PREPARE col_username_stmt;

SET @col_tagline_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'tagline'
);

SET @col_tagline_sql := IF(
  @col_tagline_exists = 0,
  'ALTER TABLE users ADD COLUMN tagline VARCHAR(255) NULL',
  'SELECT 1'
);

PREPARE col_tagline_stmt FROM @col_tagline_sql;
EXECUTE col_tagline_stmt;
DEALLOCATE PREPARE col_tagline_stmt;

SET @col_balance_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'balance'
);

SET @col_balance_sql := IF(
  @col_balance_exists = 0,
  'ALTER TABLE users ADD COLUMN balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00',
  'SELECT 1'
);

PREPARE col_balance_stmt FROM @col_balance_sql;
EXECUTE col_balance_stmt;
DEALLOCATE PREPARE col_balance_stmt;

UPDATE users
SET username = COALESCE(NULLIF(username, ''), CONCAT('user_', id))
WHERE username IS NULL OR username = '';

UPDATE users
SET tagline = COALESCE(NULLIF(tagline, ''), 'New nomad life starts today')
WHERE tagline IS NULL OR tagline = '';

UPDATE users
SET phone = CONCAT('seed_', LPAD(id, 6, '0'))
WHERE phone IS NULL OR phone = '';

UPDATE users
SET password = '$2b$10$9sEgusePsrX.RBwstqNy9ObtzaCbyGtAsS1gQrYlPSVsW9sJTbONq'
WHERE password IS NULL OR password = '';

ALTER TABLE users
  MODIFY COLUMN phone VARCHAR(20) NOT NULL;

ALTER TABLE users
  MODIFY COLUMN password VARCHAR(255) NOT NULL;

ALTER TABLE users
  MODIFY COLUMN username VARCHAR(100) NOT NULL;

ALTER TABLE users
  MODIFY COLUMN tagline VARCHAR(255) NOT NULL;

SET @idx_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND index_name = 'uk_users_phone'
);

SET @idx_sql := IF(
  @idx_exists = 0,
  'ALTER TABLE users ADD UNIQUE KEY uk_users_phone (phone)',
  'SELECT 1'
);

PREPARE idx_stmt FROM @idx_sql;
EXECUTE idx_stmt;
DEALLOCATE PREPARE idx_stmt;

-- Seed account:
-- phone: 13800000000
-- password: 123456
INSERT INTO users (phone, password, username, avatar, tagline, balance)
SELECT '13800000000', '$2b$10$9sEgusePsrX.RBwstqNy9ObtzaCbyGtAsS1gQrYlPSVsW9sJTbONq', '流浪诗人', '/static/logo.png', '已在鹤岗旅居 45 天', 2450.00
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE phone = '13800000000'
);

CREATE TABLE IF NOT EXISTS cities (
  id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(120) NOT NULL DEFAULT '',
  tags TEXT NOT NULL,
  rent_price INT NOT NULL DEFAULT 0,
  buy_price_desc VARCHAR(120) NOT NULL DEFAULT '',
  cover_image VARCHAR(500) NOT NULL DEFAULT '',
  editor_comment VARCHAR(255) NOT NULL DEFAULT '',
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  has_hospital_class_a TINYINT(1) NOT NULL DEFAULT 0,
  medical VARCHAR(120) NOT NULL DEFAULT '',
  transport VARCHAR(120) NOT NULL DEFAULT '',
  lat DECIMAL(10, 6) NOT NULL DEFAULT 0,
  lng DECIMAL(10, 6) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_city_name_location (name, location)
);

SET @col_lng_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'cities'
    AND column_name = 'lng'
);

SET @col_lng_sql := IF(
  @col_lng_exists = 0,
  'ALTER TABLE cities ADD COLUMN lng DECIMAL(10, 6) NOT NULL DEFAULT 0 AFTER lat',
  'SELECT 1'
);

PREPARE col_lng_stmt FROM @col_lng_sql;
EXECUTE col_lng_stmt;
DEALLOCATE PREPARE col_lng_stmt;

SET @col_updated_at_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'cities'
    AND column_name = 'updated_at'
);

SET @col_updated_at_sql := IF(
  @col_updated_at_exists = 0,
  'ALTER TABLE cities ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  'SELECT 1'
);

PREPARE col_updated_at_stmt FROM @col_updated_at_sql;
EXECUTE col_updated_at_stmt;
DEALLOCATE PREPARE col_updated_at_stmt;

INSERT INTO cities (
  name,
  location,
  tags,
  rent_price,
  buy_price_desc,
  cover_image,
  editor_comment,
  is_verified,
  has_hospital_class_a,
  medical,
  transport,
  lat,
  lng
)
SELECT
  '鹤岗市',
  '兴安区、东山区',
  '["空城(人少)","雪景","短暂居住的年轻人"]',
  100,
  '约2W/套',
  '/static/covers/hegang.png',
  '网上的话题比较高，人气较足',
  1,
  1,
  '三甲医院',
  '高铁/动车',
  47.338571,
  130.317151
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE name = '鹤岗市' AND location = '兴安区、东山区'
);

INSERT INTO cities (
  name,
  location,
  tags,
  rent_price,
  buy_price_desc,
  cover_image,
  editor_comment,
  is_verified,
  has_hospital_class_a,
  medical,
  transport,
  lat,
  lng
)
SELECT
  '双鸭山',
  '尖山区、集贤县',
  '["空城(人少)","雪景","短暂居住的年轻人"]',
  450,
  '约2.5W/套',
  '/static/covers/shuangyashan.png',
  '相对来说交通枢纽，去俄罗斯的跳板之一',
  0,
  1,
  '三甲医院',
  '高铁/动车',
  46.728448,
  131.141452
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE name = '双鸭山' AND location = '尖山区、集贤县'
);

INSERT INTO cities (
  name,
  location,
  tags,
  rent_price,
  buy_price_desc,
  cover_image,
  editor_comment,
  is_verified,
  has_hospital_class_a,
  medical,
  transport,
  lat,
  lng
)
SELECT
  '伊春市',
  '铁力区',
  '["空城(人少)","雪景","短暂居住的年轻人"]',
  500,
  '约9W/套',
  '/static/covers/yichun.png',
  '有机场，说来就来是说走就走',
  1,
  0,
  '没有',
  '飞机,高铁在建',
  46.986604,
  128.032554
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE name = '伊春市' AND location = '铁力区'
);

INSERT INTO cities (
  name,
  location,
  tags,
  rent_price,
  buy_price_desc,
  cover_image,
  editor_comment,
  is_verified,
  has_hospital_class_a,
  medical,
  transport,
  lat,
  lng
)
SELECT
  '大庆市',
  '红岗区',
  '["旅游度假区","雪景","短暂居住的年轻人"]',
  300,
  '约2W/套',
  '/static/covers/daqing.png',
  '博物馆多，有人文历史',
  0,
  1,
  '三甲医院',
  '高铁/动车,飞机',
  46.398567,
  124.891041
WHERE NOT EXISTS (
  SELECT 1 FROM cities WHERE name = '大庆市' AND location = '红岗区'
);
