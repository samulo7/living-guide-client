const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

function normalizePhone(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function validatePhone(phone) {
  return /^[0-9]{6,20}$/.test(phone)
}

function issueToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  )
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
    if (existsRows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Phone already registered'
      })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const username = `游民${phone.slice(-4)}${Math.floor(Math.random() * 90 + 10)}`
    const avatar = '/static/logo.png'
    const tagline = '新的旅居生活，今天开始'

    const [insertResult] = await pool.query(
      `
        INSERT INTO users (phone, password, username, avatar, tagline, balance)
        VALUES (?, ?, ?, ?, ?, 0.00)
      `,
      [phone, passwordHash, username, avatar, tagline]
    )

    const token = issueToken({
      id: insertResult.insertId,
      phone
    })

    res.status(201).json({
      success: true,
      token,
      user: {
        id: insertResult.insertId,
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
  const password = String(req.body?.password || '')

  if (!validatePhone(phone) || password == '') {
    res.status(400).json({
      success: false,
      message: 'Phone and password are required'
    })
    return
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT id, phone, password, username, avatar, tagline, balance
        FROM users
        WHERE phone = ?
        LIMIT 1
      `,
      [phone]
    )
    if (rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Phone or password is incorrect'
      })
      return
    }

    const user = rows[0]
    const matched = await bcrypt.compare(password, user.password)
    if (!matched) {
      res.status(401).json({
        success: false,
        message: 'Phone or password is incorrect'
      })
      return
    }

    const token = issueToken({
      id: user.id,
      phone: user.phone
    })

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        avatar: user.avatar,
        tagline: user.tagline,
        balance: user.balance
      }
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
