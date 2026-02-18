require('dotenv').config()

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function run() {
  const sqlPath = path.join(__dirname, '..', 'db', 'init.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    multipleStatements: true
  })

  try {
    await conn.query(sql)
    console.log('[db:init] init.sql executed successfully')
  } finally {
    await conn.end()
  }
}

run().catch((error) => {
  console.error('[db:init] failed:', error.message)
  process.exit(1)
})

