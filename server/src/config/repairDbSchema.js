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

  columns = await ensureColumn('users', 'username', 'ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL')
  columns = await ensureColumn('users', 'tagline', "ALTER TABLE users ADD COLUMN tagline VARCHAR(255) NULL")
  columns = await ensureColumn(
    'users',
    'balance',
    'ALTER TABLE users ADD COLUMN balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00'
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

  if (columns != null && columns.has('bio')) {
    await pool.query(`
      UPDATE users
      SET tagline = COALESCE(NULLIF(tagline, ''), NULLIF(bio, ''), 'New nomad life starts today')
      WHERE tagline IS NULL OR tagline = ''
    `)
  } else {
    await pool.query(`
      UPDATE users
      SET tagline = COALESCE(NULLIF(tagline, ''), 'New nomad life starts today')
      WHERE tagline IS NULL OR tagline = ''
    `)
  }

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

async function ensureCompanionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companions (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL DEFAULT 0,
      nickname VARCHAR(80) NOT NULL,
      avatar VARCHAR(500) NOT NULL DEFAULT '',
      city_name VARCHAR(120) NOT NULL DEFAULT '',
      title VARCHAR(160) NOT NULL,
      content TEXT NOT NULL,
      tags VARCHAR(255) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_companions_user_id (user_id),
      KEY idx_companions_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

async function seedCompanions() {
  await pool.query(`
    INSERT INTO companions (nickname, avatar, city_name, title, content, tags, created_at)
    SELECT
      '北方热心饭搭子',
      '',
      '鹤岗',
      '今晚找个饭搭子，AA 吃铁锅炖',
      '我在兴安区，饭量正常，不劝酒不尬聊，吃完就散步回家。社恐也欢迎，一起把晚饭这件小事搞定。',
      '饭搭子,社恐友好,AA制',
      DATE_SUB(NOW(), INTERVAL 2 HOUR)
    WHERE NOT EXISTS (
      SELECT 1 FROM companions WHERE nickname = '北方热心饭搭子' AND title = '今晚找个饭搭子，AA 吃铁锅炖'
    )
  `)

  await pool.query(`
    INSERT INTO companions (nickname, avatar, city_name, title, content, tags, created_at)
    SELECT
      '海边晨跑搭子',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
      '大理',
      '早上 6:30 洱海慢跑 5km，有人一起吗',
      '配速 7 分左右，重在打卡和晒太阳。跑后可一起喝豆浆，不商业，不推销，纯健康互相监督。',
      '运动搭子,早起打卡,低强度',
      DATE_SUB(NOW(), INTERVAL 7 HOUR)
    WHERE NOT EXISTS (
      SELECT 1 FROM companions WHERE nickname = '海边晨跑搭子' AND title = '早上 6:30 洱海慢跑 5km，有人一起吗'
    )
  `)

  await pool.query(`
    INSERT INTO companions (nickname, avatar, city_name, title, content, tags, created_at)
    SELECT
      '远程自习合伙人',
      '',
      '线上',
      '下午 2 点线上共学 3 小时，互相监督接单',
      '开腾讯会议静音自习，每 50 分钟休息 10 分钟。适合自由职业和远程工作者，结束后复盘今天推进了什么。',
      '线上搭子,远程办公,效率提升',
      DATE_SUB(NOW(), INTERVAL 1 DAY)
    WHERE NOT EXISTS (
      SELECT 1 FROM companions WHERE nickname = '远程自习合伙人' AND title = '下午 2 点线上共学 3 小时，互相监督接单'
    )
  `)
}

async function repairCompanionsTable() {
  await ensureCompanionsTable()
  const columns = await getTableColumns('companions')
  if (columns == null) {
    return
  }

  await ensureColumn('companions', 'user_id', 'ALTER TABLE companions ADD COLUMN user_id INT NOT NULL DEFAULT 0 AFTER id')
  await ensureColumn('companions', 'nickname', "ALTER TABLE companions ADD COLUMN nickname VARCHAR(80) NOT NULL DEFAULT '' AFTER id")
  await ensureColumn('companions', 'avatar', "ALTER TABLE companions ADD COLUMN avatar VARCHAR(500) NOT NULL DEFAULT '' AFTER nickname")
  await ensureColumn('companions', 'city_name', "ALTER TABLE companions ADD COLUMN city_name VARCHAR(120) NOT NULL DEFAULT '' AFTER avatar")
  await ensureColumn('companions', 'title', "ALTER TABLE companions ADD COLUMN title VARCHAR(160) NOT NULL DEFAULT '' AFTER city_name")
  await ensureColumn('companions', 'content', "ALTER TABLE companions ADD COLUMN content TEXT NOT NULL AFTER title")
  await ensureColumn('companions', 'tags', "ALTER TABLE companions ADD COLUMN tags VARCHAR(255) NOT NULL DEFAULT '' AFTER content")
  await ensureColumn(
    'companions',
    'updated_at',
    'ALTER TABLE companions ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
  )

  await seedCompanions()
}

async function ensureFavoritesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      house_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_favorites_user_id (user_id),
      KEY idx_favorites_house_id (house_id),
      UNIQUE KEY uk_favorites_user_house (user_id, house_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

async function seedFavorites() {
  const [userRows] = await pool.query(`
    SELECT id
    FROM users
    ORDER BY id ASC
    LIMIT 1
  `)
  if (!Array.isArray(userRows) || userRows.length == 0) {
    return
  }
  const userId = Number(userRows[0]?.id || 0)
  if (!Number.isInteger(userId) || userId <= 0) {
    return
  }

  const [houseRows] = await pool.query(`
    SELECT id
    FROM houses
    ORDER BY price ASC, id ASC
    LIMIT 2
  `)

  if (!Array.isArray(houseRows) || houseRows.length == 0) {
    return
  }

  for (let i = 0; i < houseRows.length; i++) {
    const row = houseRows[i] || {}
    const houseId = Number(row.id || 0)
    if (!Number.isInteger(houseId) || houseId <= 0) {
      continue
    }
    await pool.query(
      `
        INSERT INTO favorites (user_id, house_id, created_at)
        SELECT ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY)
        WHERE NOT EXISTS (
          SELECT 1 FROM favorites WHERE user_id = ? AND house_id = ?
        )
      `,
      [userId, houseId, i, userId, houseId]
    )
  }
}

async function repairFavoritesTable() {
  await ensureFavoritesTable()
  const columns = await getTableColumns('favorites')
  if (columns == null) {
    return
  }

  await ensureColumn('favorites', 'user_id', 'ALTER TABLE favorites ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER id')
  await ensureColumn('favorites', 'house_id', 'ALTER TABLE favorites ADD COLUMN house_id INT NOT NULL DEFAULT 0 AFTER user_id')

  const housesColumns = await getTableColumns('houses')
  if (housesColumns != null) {
    await seedFavorites()
  }
}

async function repairDbSchema() {
  await repairUsersTable()
  await repairCitiesTable()
  await repairJobsTable()
  await repairCompanionsTable()
  await repairFavoritesTable()
}

module.exports = {
  repairDbSchema
}
