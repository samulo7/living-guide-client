require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const { pipeline } = require('stream')
const { promisify } = require('util')
const zlib = require('zlib')

const pipe = promisify(pipeline)

function pad(value) {
  return String(value).padStart(2, '0')
}

function nowStamp() {
  const d = new Date()
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(
    d.getSeconds()
  )}`
}

function toBool(value, fallback = false) {
  const text = String(value ?? '').trim().toLowerCase()
  if (text === '') {
    return fallback
  }
  return text === '1' || text === 'true' || text === 'yes' || text === 'on'
}

function toInt(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) ? n : fallback
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true })
}

async function cleanupOldBackups(dirPath, retentionDays) {
  if (retentionDays <= 0) {
    return
  }

  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  const expireAt = Date.now() - retentionDays * 24 * 60 * 60 * 1000

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }
    if (!entry.name.endsWith('.sql') && !entry.name.endsWith('.sql.gz')) {
      continue
    }
    const fullPath = path.join(dirPath, entry.name)
    const stat = await fs.promises.stat(fullPath)
    if (stat.mtimeMs < expireAt) {
      await fs.promises.unlink(fullPath)
    }
  }
}

async function run() {
  const dbHost = process.env.DB_HOST || '127.0.0.1'
  const dbPort = Number(process.env.DB_PORT || 3306)
  const dbUser = process.env.DB_USER || 'root'
  const dbPassword = process.env.DB_PASSWORD || ''
  const dbName = process.env.DB_NAME || 'nomad_guide'

  const backupDir = path.resolve(__dirname, '..', process.env.BACKUP_DIR || 'backups')
  const retentionDays = toInt(process.env.BACKUP_RETENTION_DAYS, 7)
  const useGzip = toBool(process.env.BACKUP_GZIP, false)
  const mysqldumpCmd = String(process.env.MYSQLDUMP_PATH || '').trim() || 'mysqldump'
  const stamp = nowStamp()
  const fileName = `${dbName}-${stamp}.sql${useGzip ? '.gz' : ''}`
  const outPath = path.join(backupDir, fileName)

  await ensureDir(backupDir)

  const args = [
    `--host=${dbHost}`,
    `--port=${dbPort}`,
    `--user=${dbUser}`,
    '--single-transaction',
    '--quick',
    '--skip-lock-tables',
    '--routines',
    '--triggers',
    '--databases',
    dbName
  ]

  const child = spawn(mysqldumpCmd, args, {
    env: {
      ...process.env,
      MYSQL_PWD: dbPassword
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  let stderr = ''
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk)
  })

  const output = fs.createWriteStream(outPath)
  const writeTask = useGzip ? pipe(child.stdout, zlib.createGzip(), output) : pipe(child.stdout, output)

  const exitCode = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
  })

  await writeTask

  if (exitCode !== 0) {
    throw new Error(`mysqldump exited with code ${exitCode}${stderr.trim() !== '' ? `: ${stderr.trim()}` : ''}`)
  }

  const stat = await fs.promises.stat(outPath)
  const sizeKb = Math.max(1, Math.round(stat.size / 1024))
  console.log(`[db:backup] created ${outPath} (${sizeKb} KB)`)

  await cleanupOldBackups(backupDir, retentionDays)
  console.log(`[db:backup] cleanup completed (retention ${retentionDays} days)`)
}

run().catch((error) => {
  console.error('[db:backup] failed:', error.message)
  if (String(error.message || '').toLowerCase().includes('enoent')) {
    console.error('[db:backup] hint: install MySQL client and ensure `mysqldump` is in PATH')
    console.error('[db:backup] hint: or set MYSQLDUMP_PATH to full executable path')
  }
  process.exit(1)
})
