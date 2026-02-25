const express = require('express')
const { pool } = require('../config/db')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

function readAuthedUserId(req) {
  const userId = Number(req.user?.id || 0)
  if (!Number.isInteger(userId) || userId <= 0) {
    return 0
  }
  return userId
}

function unauthorized(res) {
  res.status(401).json({
    ok: false,
    message: 'Unauthorized'
  })
}

function mapProfileRow(row) {
  return {
    id: Number(row?.id || 0),
    username: String(row?.username || row?.nickname || '').trim() || 'Nomad',
    tagline: String(row?.tagline || row?.bio || '').trim(),
    avatar: String(row?.avatar || '').trim()
  }
}

router.get('/profile', authMiddleware, async (req, res) => {
  const userId = readAuthedUserId(req)
  if (userId <= 0) {
    unauthorized(res)
    return
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT id, username, nickname, tagline, bio, avatar
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId]
    )

    if (!Array.isArray(rows) || rows.length === 0) {
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

router.get('/favorites', authMiddleware, async (req, res) => {
  const userId = readAuthedUserId(req)
  if (userId <= 0) {
    unauthorized(res)
    return
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT
          houses.id,
          houses.city_id,
          cities.name AS city_name,
          houses.title,
          houses.cover_image,
          houses.price,
          houses.district,
          houses.tags,
          favorites.created_at
        FROM favorites
        INNER JOIN houses ON favorites.house_id = houses.id
        LEFT JOIN cities ON houses.city_id = cities.id
        WHERE favorites.user_id = ?
        ORDER BY favorites.created_at DESC, houses.id DESC
      `,
      [userId]
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

router.post('/favorite', authMiddleware, async (req, res) => {
  const userId = readAuthedUserId(req)
  if (userId <= 0) {
    unauthorized(res)
    return
  }

  const houseId = Number.parseInt(String(req.body?.house_id || ''), 10)
  if (!Number.isInteger(houseId) || houseId <= 0) {
    res.status(400).json({
      ok: false,
      message: 'Invalid house_id'
    })
    return
  }

  try {
    const [houseRows] = await pool.query(
      `
        SELECT id
        FROM houses
        WHERE id = ?
        LIMIT 1
      `,
      [houseId]
    )

    if (!Array.isArray(houseRows) || houseRows.length === 0) {
      res.status(404).json({
        ok: false,
        message: 'House not found'
      })
      return
    }

    await pool.query(
      `
        INSERT INTO favorites (user_id, house_id)
        VALUES (?, ?)
      `,
      [userId, houseId]
    )

    res.status(201).json({
      ok: true,
      message: 'Favorite saved',
      data: {
        user_id: userId,
        house_id: houseId
      }
    })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      res.json({
        ok: true,
        message: 'Already favorited',
        data: {
          user_id: userId,
          house_id: houseId
        }
      })
      return
    }

    console.error('[POST /api/user/favorite] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to save favorite'
    })
  }
})

module.exports = router
