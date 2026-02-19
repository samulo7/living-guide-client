USE nomad_guide;

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

UPDATE users
SET phone = CONCAT('seed_', LPAD(id, 6, '0'))
WHERE phone IS NULL OR phone = '';

UPDATE users
SET password = '$2b$10$9sEgusePsrX.RBwstqNy9ObtzaCbyGtAsS1gQrYlPSVsW9sJTbONq'
WHERE password IS NULL OR password = '';

ALTER TABLE users
  MODIFY COLUMN phone VARCHAR(20) NOT NULL,
  MODIFY COLUMN password VARCHAR(255) NOT NULL;

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
