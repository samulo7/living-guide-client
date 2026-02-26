const express = require('express')
const { pool } = require('../config/db')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

function parseTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags
      .map((item) => String(item || '').trim())
      .filter((item) => item != '')
      .slice(0, 8)
  }

  return String(rawTags || '')
    .split(/[,\uff0c\u3001|]/)
    .map((item) => item.trim())
    .filter((item) => item != '')
    .slice(0, 8)
}

router.post('/publish', authMiddleware, async (req, res) => {
  const userId = Number(req.user?.id || 0)
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
    return
  }

  const title = String(req.body?.title || '').trim()
  const content = String(req.body?.content || '').trim()
  const tags = parseTags(req.body?.tags)

  if (title.length < 2 || title.length > 160) {
    res.status(400).json({
      success: false,
      message: 'Title length must be 2-160 characters'
    })
    return
  }

  if (content.length < 2 || content.length > 2000) {
    res.status(400).json({
      success: false,
      message: 'Content length must be 2-2000 characters'
    })
    return
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT username, nickname, avatar
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId]
    )

    if (!Array.isArray(rows) || rows.length == 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    const user = rows[0] || {}
    const nickname = String(user.nickname || user.username || `游民_${userId}`).trim()
    const avatar = String(user.avatar || '').trim()
    const tagsText = tags.join(',')

    const [insertResult] = await pool.query(
      `
        INSERT INTO companions (user_id, nickname, avatar, city_name, title, content, tags)
        VALUES (?, ?, ?, '', ?, ?, ?)
      `,
      [userId, nickname != '' ? nickname : `游民_${userId}`, avatar, title, content, tagsText]
    )

    res.status(201).json({
      success: true,
      id: Number(insertResult.insertId || 0)
    })
  } catch (error) {
    console.error('[POST /api/social/publish] failed:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to publish'
    })
  }
})

module.exports = router
