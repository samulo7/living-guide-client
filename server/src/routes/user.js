const express = require('express')
const { pool } = require('../config/db')

const router = express.Router()
const MVP_USER_ID = 1

function mapProfileRow(row) {
  const nickname = String(row.nickname || row.username || '数字游民').trim()
  const bio = String(row.bio || row.tagline || '今天也在低成本生活').trim()
  const avatar = String(row.avatar || '').trim()

  return {
    id: Number(row.id || MVP_USER_ID),
    nickname: nickname != '' ? nickname : '数字游民',
    bio: bio != '' ? bio : '今天也在低成本生活',
    avatar
  }
}

router.get('/profile', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT *
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [MVP_USER_ID]
    )

    if (!rows || rows.length === 0) {
      res.status(404).json({
        ok: false,
        message: 'User profile not found'
      })
      return
    }

    res.json({
      ok: true,
      data: mapProfileRow(rows[0])
    })
  } catch (error) {
    console.error('[GET /api/user/profile] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch user profile'
    })
  }
})

router.get('/favorites', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT
          h.id,
          h.city_id,
          c.name AS city_name,
          h.title,
          h.cover_image,
          h.price,
          h.district,
          h.tags,
          h.created_at
        FROM favorites f
        INNER JOIN houses h ON f.house_id = h.id
        LEFT JOIN cities c ON h.city_id = c.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC, h.id DESC
      `,
      [MVP_USER_ID]
    )

    res.json({
      ok: true,
      data: rows
    })
  } catch (error) {
    console.error('[GET /api/user/favorites] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch favorite houses'
    })
  }
})

module.exports = router
