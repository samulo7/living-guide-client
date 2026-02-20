require('dotenv').config()

const mysql = require('mysql2/promise')

async function columnSet(conn, table) {
  const [rows] = await conn.query(`SHOW COLUMNS FROM ${table}`)
  return new Set(rows.map((row) => row.Field))
}

async function ensureColumn(conn, table, column, sql) {
  const columns = await columnSet(conn, table)
  if (!columns.has(column)) {
    await conn.query(sql)
  }
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'nomad_guide'
  })

  try {
    await ensureColumn(
      conn,
      'users',
      'username',
      'ALTER TABLE users ADD COLUMN username VARCHAR(100) NULL AFTER password'
    )
    await ensureColumn(
      conn,
      'users',
      'tagline',
      "ALTER TABLE users ADD COLUMN tagline VARCHAR(255) NULL AFTER avatar"
    )
    await ensureColumn(
      conn,
      'users',
      'balance',
      'ALTER TABLE users ADD COLUMN balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER tagline'
    )

    const userColumns = await columnSet(conn, 'users')
    if (userColumns.has('nickname')) {
      await conn.query(`
        UPDATE users
        SET username = COALESCE(NULLIF(username, ''), NULLIF(nickname, ''), CONCAT('user_', id))
        WHERE username IS NULL OR username = ''
      `)
    } else {
      await conn.query(`
        UPDATE users
        SET username = COALESCE(NULLIF(username, ''), CONCAT('user_', id))
        WHERE username IS NULL OR username = ''
      `)
    }

    await conn.query(`
      UPDATE users
      SET tagline = COALESCE(NULLIF(tagline, ''), '新的旅居生活，今天开始')
      WHERE tagline IS NULL OR tagline = ''
    `)

    await conn.query('ALTER TABLE users MODIFY COLUMN username VARCHAR(100) NOT NULL')
    await conn.query('ALTER TABLE users MODIFY COLUMN tagline VARCHAR(255) NOT NULL')

    await ensureColumn(
      conn,
      'cities',
      'lng',
      'ALTER TABLE cities ADD COLUMN lng DECIMAL(10, 6) NOT NULL DEFAULT 0 AFTER lat'
    )
    await ensureColumn(
      conn,
      'cities',
      'updated_at',
      'ALTER TABLE cities ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at'
    )

    const [userRows] = await conn.query('SHOW COLUMNS FROM users')
    const [cityRows] = await conn.query('SHOW COLUMNS FROM cities')
    console.log('[db:repair] users columns:', userRows.map((row) => row.Field).join(','))
    console.log('[db:repair] cities columns:', cityRows.map((row) => row.Field).join(','))
  } finally {
    await conn.end()
  }
}

run().catch((error) => {
  console.error('[db:repair] failed:', error.message)
  process.exit(1)
})
