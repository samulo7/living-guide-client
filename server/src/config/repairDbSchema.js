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
      title VARCHAR(160) NOT NULL,
      content TEXT NOT NULL,
      tags VARCHAR(255) NOT NULL DEFAULT '',
      location_json TEXT NULL,
      images_json TEXT NULL,
      contact VARCHAR(120) NOT NULL DEFAULT '',
      status TINYINT NOT NULL DEFAULT 1,
      edited_at DATETIME NULL,
      edit_count INT NOT NULL DEFAULT 0,
      contact_click_count INT NOT NULL DEFAULT 0,
      favorite_count INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_companions_user_id (user_id),
      KEY idx_companions_status (status),
      KEY idx_companions_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

async function seedCompanions() {
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

  const seedRows = [
    {
      title: '今晚找个饭搭子，AA 吃铁锅炖',
      content: '地点在兴安区，轻社交不尬聊。吃完可以散步回家，社恐也欢迎。',
      tags: '饭搭子,社恐友好,AA',
      location_json: '{"name":"兴安区商圈","address":"黑龙江省鹤岗市兴安区","city":"鹤岗市","latitude":47.33542,"longitude":130.29377}',
      images_json: '[]',
      contact: '微信: nomad_hotpot',
      hours_ago: 2
    },
    {
      title: '明早 6:30 海边慢跑 5km',
      content: '配速 6-7 分，重在打卡和晒太阳。跑后可一起吃早饭。',
      tags: '运动,晨跑,低强度',
      location_json: '{"name":"龙湾海岸步道","address":"云南省大理市洱海北岸","city":"大理市","latitude":25.71478,"longitude":100.17798}',
      images_json: '[]',
      contact: '电话: 13900000000',
      hours_ago: 7
    },
    {
      title: '下午线上共学 3 小时',
      content: '腾讯会议静音共学，每 50 分钟休息 10 分钟，结束后互相复盘。',
      tags: '线上搭子,远程办公,效率',
      location_json: '{"name":"线上会议室","address":"线上","city":"线上","latitude":null,"longitude":null}',
      images_json: '[]',
      contact: '微信: deep_work_room',
      hours_ago: 24
    }
  ]

  for (let i = 0; i < seedRows.length; i++) {
    const item = seedRows[i]
    await pool.query(
      `
        INSERT INTO companions (user_id, title, content, tags, location_json, images_json, contact, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR)
        WHERE NOT EXISTS (
          SELECT 1
          FROM companions
          WHERE user_id = ? AND title = ?
        )
      `,
      [
        userId,
        item.title,
        item.content,
        item.tags,
        item.location_json,
        item.images_json,
        item.contact,
        item.hours_ago,
        userId,
        item.title
      ]
    )
  }
}

async function repairCompanionsTable() {
  await ensureCompanionsTable()
  const columns = await getTableColumns('companions')
  if (columns == null) {
    return
  }

  await ensureColumn('companions', 'user_id', 'ALTER TABLE companions ADD COLUMN user_id INT NOT NULL DEFAULT 0 AFTER id')
  await ensureColumn('companions', 'title', "ALTER TABLE companions ADD COLUMN title VARCHAR(160) NOT NULL DEFAULT '' AFTER user_id")
  await ensureColumn('companions', 'content', "ALTER TABLE companions ADD COLUMN content TEXT NOT NULL AFTER title")
  await ensureColumn('companions', 'tags', "ALTER TABLE companions ADD COLUMN tags VARCHAR(255) NOT NULL DEFAULT '' AFTER content")
  await ensureColumn('companions', 'location_json', 'ALTER TABLE companions ADD COLUMN location_json TEXT NULL AFTER tags')
  await ensureColumn('companions', 'images_json', 'ALTER TABLE companions ADD COLUMN images_json TEXT NULL AFTER location_json')
  await ensureColumn('companions', 'contact', "ALTER TABLE companions ADD COLUMN contact VARCHAR(120) NOT NULL DEFAULT '' AFTER images_json")
  await ensureColumn('companions', 'status', 'ALTER TABLE companions ADD COLUMN status TINYINT NOT NULL DEFAULT 1 AFTER contact')
  await ensureColumn('companions', 'edited_at', 'ALTER TABLE companions ADD COLUMN edited_at DATETIME NULL AFTER status')
  await ensureColumn('companions', 'edit_count', 'ALTER TABLE companions ADD COLUMN edit_count INT NOT NULL DEFAULT 0 AFTER edited_at')
  await ensureColumn(
    'companions',
    'contact_click_count',
    'ALTER TABLE companions ADD COLUMN contact_click_count INT NOT NULL DEFAULT 0 AFTER edit_count'
  )
  await ensureColumn(
    'companions',
    'favorite_count',
    'ALTER TABLE companions ADD COLUMN favorite_count INT NOT NULL DEFAULT 0 AFTER contact_click_count'
  )
  await ensureColumn(
    'companions',
    'updated_at',
    'ALTER TABLE companions ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
  )

  await pool.query('UPDATE companions SET status = 1 WHERE status IS NULL')
  await pool.query('UPDATE companions SET edit_count = 0 WHERE edit_count IS NULL')
  await pool.query('UPDATE companions SET contact_click_count = 0 WHERE contact_click_count IS NULL')
  await pool.query('UPDATE companions SET favorite_count = 0 WHERE favorite_count IS NULL')

  if (columns.has('nickname')) {
    await pool.query("ALTER TABLE companions MODIFY COLUMN nickname VARCHAR(80) NOT NULL DEFAULT ''")
  }
  if (columns.has('avatar')) {
    await pool.query("ALTER TABLE companions MODIFY COLUMN avatar VARCHAR(500) NOT NULL DEFAULT ''")
  }
  if (columns.has('city_name')) {
    await pool.query("ALTER TABLE companions MODIFY COLUMN city_name VARCHAR(120) NOT NULL DEFAULT ''")
  }

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
