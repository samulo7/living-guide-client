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

router.put('/profile', async (req, res) => {
  const username = typeof req.body?.username == 'string' ? req.body.username.trim() : ''
  const tagline = typeof req.body?.tagline == 'string' ? req.body.tagline.trim() : ''
  const avatar = typeof req.body?.avatar == 'string' ? req.body.avatar.trim() : ''

  if (username == '' || tagline == '' || avatar == '') {
    res.status(400).json({
      success: false,
      message: 'username, tagline and avatar are required'
    })
    return
  }

  try {
    const [result] = await pool.query(
      `
        UPDATE users
        SET username = ?, tagline = ?, avatar = ?
        WHERE id = 1
      `,
      [username, tagline, avatar]
    )

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    res.json({
      success: true,
      message: '更新成功'
    })
  } catch (error) {
    console.error('[PUT /api/user/profile] failed:', error.message)
    res.status(500).json({
      success: false,
      message: '更新失败'
    })
  }
})

module.exports = router
