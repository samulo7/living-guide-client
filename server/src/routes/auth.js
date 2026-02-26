const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')

const router = express.Router()
const SECRET_KEY = process.env.SECRET_KEY || 'dev-secret-key-change-me'
const JWT_EXPIRES_IN = '7d'

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function validatePhone(phone) {
  return /^[0-9]{6,20}$/.test(phone)
}

function buildUsername() {
  return `游民_${Math.floor(Math.random() * 900000 + 100000)}`
}

function issueToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone
    },
    SECRET_KEY,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  )
}

function mapAuthUser(row) {
  return {
    id: Number(row?.id || 0),
    phone: String(row?.phone || '').trim(),
    username: String(row?.username || row?.nickname || '').trim() || '数字游民',
    tagline: String(row?.tagline || row?.bio || '').trim() || '今天也在低成本生活',
    avatar: String(row?.avatar || '').trim()
  }
}

async function getUserByPhone(phone) {
  const [rows] = await pool.query(
    `
      SELECT id, phone, username, nickname, avatar, tagline, bio
      FROM users
      WHERE phone = ?
      LIMIT 1
    `,
    [phone]
  )
  if (!Array.isArray(rows) || rows.length == 0) {
    return null
  }
  return rows[0]
}

async function createUserByPhone(phone) {
  const passwordHash = await bcrypt.hash(`sms-login-${phone}-${Date.now()}`, 10)
  const username = buildUsername()
  const avatar = '/static/logo.png'
  const tagline = '今天也在低成本生活'

  const [insertResult] = await pool.query(
    `
      INSERT INTO users (phone, password, nickname, username, avatar, bio, tagline, balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0.00)
    `,
    [phone, passwordHash, username, username, avatar, tagline, tagline]
  )

  const userId = Number(insertResult?.insertId || 0)
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('failed to create user id')
  }

  const [rows] = await pool.query(
    `
      SELECT id, phone, username, nickname, avatar, tagline, bio
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [userId]
  )
  if (!Array.isArray(rows) || rows.length == 0) {
    throw new Error('user row missing after create')
  }
  return rows[0]
}

async function ensureUserByPhone(phone) {
  const existed = await getUserByPhone(phone)
  if (existed != null) {
    return existed
  }

  try {
    return await createUserByPhone(phone)
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      const conflictUser = await getUserByPhone(phone)
      if (conflictUser != null) {
        return conflictUser
      }
    }
    throw error
  }
}

router.post('/register', async (req, res) => {
  const phone = normalizePhone(req.body?.phone)
  const password = String(req.body?.password || '')

  if (!validatePhone(phone)) {
    res.status(400).json({
      success: false,
      message: 'Invalid phone format'
    })
    return
  }

  if (password.length < 6) {
    res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters'
    })
    return
  }

  try {
    const [existsRows] = await pool.query(
      `
        SELECT id
        FROM users
        WHERE phone = ?
        LIMIT 1
      `,
      [phone]
    )
    if (Array.isArray(existsRows) && existsRows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Phone already registered'
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const username = buildUsername()
    const avatar = '/static/logo.png'
    const tagline = '今天也在低成本生活'

    const [insertResult] = await pool.query(
      `
        INSERT INTO users (phone, password, nickname, username, avatar, bio, tagline, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0.00)
      `,
      [phone, passwordHash, username, username, avatar, tagline, tagline]
    )

    const userId = Number(insertResult?.insertId || 0)
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('failed to create user id')
    }

    const token = issueToken({
      id: userId,
      phone
    })

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        phone,
        username,
        avatar,
        tagline
      }
    })
  } catch (error) {
    console.error('[POST /api/auth/register] failed:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to register'
    })
  }
})

router.post('/login', async (req, res) => {
  const phone = normalizePhone(req.body?.phone)
  const code = String(req.body?.code ?? req.body?.verificationCode ?? '').trim()

  if (!validatePhone(phone)) {
    res.status(400).json({
      success: false,
      message: 'Invalid phone format'
    })
    return
  }

  if (code !== '123456') {
    res.status(401).json({
      success: false,
      message: 'Verification code is incorrect'
    })
    return
  }

  try {
    const row = await ensureUserByPhone(phone)
    const user = mapAuthUser(row)
    if (user.id <= 0) {
      throw new Error('invalid user id after login')
    }

    const token = issueToken({
      id: user.id,
      phone: user.phone
    })

    res.json({
      success: true,
      token,
      expiresIn: JWT_EXPIRES_IN,
      user
    })
  } catch (error) {
    console.error('[POST /api/auth/login] failed:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to login'
    })
  }
})

module.exports = router
