const { pool } = require('./db')

async function getTableColumns(tableName) {
  try {
    const [rows] = await pool.query(`SHOW COLUMNS FROM ${tableName}`)
    return new Set(rows.map((row) => row.Field))
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return null
    }
    throw error
  }
}

async function ensureColumn(tableName, columnName, alterSql) {
  const columns = await getTableColumns(tableName)
  if (columns == null || columns.has(columnName)) {
    return columns
  }
  await pool.query(alterSql)
  return getTableColumns(tableName)
}

async function repairUsersTable() {
  let columns = await getTableColumns('users')
  if (columns == null) {
    return
  }

  columns = await ensureColumn('users', 'username', 'ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER password')
  columns = await ensureColumn('users', 'tagline', "ALTER TABLE users ADD COLUMN tagline VARCHAR(255) NULL AFTER avatar")
  columns = await ensureColumn(
    'users',
    'balance',
    'ALTER TABLE users ADD COLUMN balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER tagline'
  )

  if (columns != null && columns.has('nickname')) {
    await pool.query(`
      UPDATE users
      SET username = COALESCE(NULLIF(username, ''), NULLIF(nickname, ''), CONCAT('user_', id))
      WHERE username IS NULL OR username = ''
    `)
  } else {
    await pool.query(`
      UPDATE users
      SET username = COALESCE(NULLIF(username, ''), CONCAT('user_', id))
      WHERE username IS NULL OR username = ''
    `)
  }

  await pool.query(`
    UPDATE users
    SET tagline = COALESCE(NULLIF(tagline, ''), 'New nomad life starts today')
    WHERE tagline IS NULL OR tagline = ''
  `)

  await pool.query('ALTER TABLE users MODIFY COLUMN username VARCHAR(100) NOT NULL')
  await pool.query('ALTER TABLE users MODIFY COLUMN tagline VARCHAR(255) NOT NULL')
}

async function repairCitiesTable() {
  const columns = await getTableColumns('cities')
  if (columns == null) {
    return
  }

  await ensureColumn('cities', 'lng', 'ALTER TABLE cities ADD COLUMN lng DECIMAL(10, 6) NOT NULL DEFAULT 0 AFTER lat')
  await ensureColumn(
    'cities',
    'updated_at',
    'ALTER TABLE cities ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
  )
}

async function ensureJobsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INT NOT NULL AUTO_INCREMENT,
      city_id INT NULL,
      title VARCHAR(120) NOT NULL,
      salary VARCHAR(64) NOT NULL,
      company VARCHAR(120) NOT NULL DEFAULT '',
      is_remote TINYINT(1) NOT NULL DEFAULT 0,
      tags VARCHAR(255) NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_jobs_city_id (city_id),
      KEY idx_jobs_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

async function seedJobs() {
  await pool.query(`
    INSERT INTO jobs (city_id, title, salary, company, is_remote, tags, description, created_at)
    SELECT
      (SELECT id FROM cities ORDER BY id ASC LIMIT 1),
      '网吧夜班网管',
      '¥180/天',
      '鹤岗兴安电竞馆',
      0,
      '包吃住、夜班补贴、可留宿',
      '负责夜间值班与基础设备维护，工作节奏平稳，适合短住期间补贴生活费。',
      DATE_SUB(NOW(), INTERVAL 2 DAY)
    WHERE NOT EXISTS (
      SELECT 1 FROM jobs WHERE title = '网吧夜班网管' AND company = '鹤岗兴安电竞馆'
    )
  `)

  await pool.query(`
    INSERT INTO jobs (city_id, title, salary, company, is_remote, tags, description, created_at)
    SELECT
      NULL,
      '短视频切片',
      '¥5000-8000/月',
      '云剪辑工作室',
      1,
      '可远程、按条计费、弹性排期',
      '负责口播与访谈内容切片，提供素材包和模板，适合自由职业者远程协作。',
      DATE_SUB(NOW(), INTERVAL 1 DAY)
    WHERE NOT EXISTS (
      SELECT 1 FROM jobs WHERE title = '短视频切片' AND company = '云剪辑工作室'
    )
  `)

  await pool.query(`
    INSERT INTO jobs (city_id, title, salary, company, is_remote, tags, description, created_at)
    SELECT
      (SELECT id FROM cities ORDER BY id ASC LIMIT 1),
      '民宿前台义工',
      '¥120/天+食宿',
      '山野慢居民宿',
      0,
      '包三餐、包住宿、可转正',
      '负责接待住客与基础运营支持，工作时段固定，适合希望降低旅居成本的人群。',
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM jobs WHERE title = '民宿前台义工' AND company = '山野慢居民宿'
    )
  `)
}

async function repairJobsTable() {
  await ensureJobsTable()
  const columns = await getTableColumns('jobs')
  if (columns == null) {
    return
  }

  await ensureColumn('jobs', 'city_id', 'ALTER TABLE jobs ADD COLUMN city_id INT NULL AFTER id')
  await ensureColumn('jobs', 'title', "ALTER TABLE jobs ADD COLUMN title VARCHAR(120) NOT NULL DEFAULT '' AFTER city_id")
  await ensureColumn('jobs', 'salary', "ALTER TABLE jobs ADD COLUMN salary VARCHAR(64) NOT NULL DEFAULT '' AFTER title")
  await ensureColumn('jobs', 'company', "ALTER TABLE jobs ADD COLUMN company VARCHAR(120) NOT NULL DEFAULT '' AFTER salary")
  await ensureColumn('jobs', 'is_remote', 'ALTER TABLE jobs ADD COLUMN is_remote TINYINT(1) NOT NULL DEFAULT 0 AFTER company')
  await ensureColumn('jobs', 'tags', "ALTER TABLE jobs ADD COLUMN tags VARCHAR(255) NOT NULL DEFAULT '' AFTER is_remote")
  await ensureColumn('jobs', 'description', "ALTER TABLE jobs ADD COLUMN description TEXT NOT NULL AFTER tags")
  await ensureColumn(
    'jobs',
    'updated_at',
    'ALTER TABLE jobs ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
  )

  await seedJobs()
}

async function repairDbSchema() {
  await repairUsersTable()
  await repairCitiesTable()
  await repairJobsTable()
}

module.exports = {
  repairDbSchema
}
