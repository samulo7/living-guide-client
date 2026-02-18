const express = require('express')
const { pool } = require('../config/db')

const router = express.Router()

router.get('/profile', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT id, username, avatar, tagline, balance, created_at
        FROM users
        ORDER BY id ASC
        LIMIT 1
      `
    )

    if (!rows || rows.length === 0) {
      res.status(404).json({
        ok: false,
        message: 'No user profile found'
      })
      return
    }

    res.json({
      ok: true,
      data: rows[0]
    })
  } catch (error) {
    console.error('[GET /api/user/profile] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch user profile'
    })
  }
})

module.exports = router

