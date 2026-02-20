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

async function repairDbSchema() {
  await repairUsersTable()
  await repairCitiesTable()
}

module.exports = {
  repairDbSchema
}
