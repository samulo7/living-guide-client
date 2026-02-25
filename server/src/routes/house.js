const express = require('express')
const jwt = require('jsonwebtoken')
const { pool } = require('../config/db')

const router = express.Router()
const SECRET_KEY = process.env.SECRET_KEY || 'dev-secret-key-change-me'

function readOptionalUserId(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || ''
  if (typeof authHeader !== 'string' || authHeader.trim() === '') {
    return 0
  }

  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer' || token == null || token.trim() === '') {
    return 0
  }

  try {
    const payload = jwt.verify(token.trim(), SECRET_KEY)
    const userId = Number(payload?.id || 0)
    if (!Number.isInteger(userId) || userId <= 0) {
      return 0
    }
    return userId
  } catch (error) {
    return 0
  }
}

router.get('/', async (req, res) => {
  const cityIdText = String(req.query.city_id || '').trim()
  let cityId = 0
  if (cityIdText != '') {
    cityId = Number.parseInt(cityIdText, 10)
    if (!Number.isInteger(cityId) || cityId <= 0) {
      res.status(400).json({
        ok: false,
        message: 'Invalid city_id'
      })
      return
    }
  }

  let sql = `
    SELECT h.*, c.name AS city_name
    FROM houses h
    LEFT JOIN cities c ON h.city_id = c.id
    WHERE 1 = 1
  `
  const params = []
  if (cityIdText != '') {
    sql += ' AND h.city_id = ?'
    params.push(cityId)
  }
  sql += ' ORDER BY h.price ASC LIMIT 50'

  try {
    const [rows] = await pool.query(sql, params)

    res.json({
      ok: true,
      data: rows
    })
  } catch (error) {
    console.error('[GET /api/houses] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch houses'
    })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number.parseInt(String(req.params.id || ''), 10)
  const userId = readOptionalUserId(req)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      ok: false,
      message: 'Invalid house id'
    })
    return
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT
          h.*,
          c.name AS city_name,
          EXISTS(
            SELECT 1
            FROM favorites f
            WHERE f.user_id = ? AND f.house_id = h.id
          ) AS is_favorited
        FROM houses h
        LEFT JOIN cities c ON h.city_id = c.id
        WHERE h.id = ?
        LIMIT 1
      `,
      [userId, id]
    )

    if (!rows || rows.length === 0) {
      res.status(404).json({
        ok: false,
        message: 'House not found'
      })
      return
    }

    res.json({
      ok: true,
      data: rows[0]
    })
  } catch (error) {
    console.error('[GET /api/houses/:id] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch house detail'
    })
  }
})

module.exports = router
