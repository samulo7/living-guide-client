const express = require('express')
const { pool } = require('../config/db')

const router = express.Router()

function parseTags(rawTags) {
  return String(rawTags || '')
    .split(/[,，、|]/)
    .map((item) => item.trim())
    .filter((item) => item != '')
}

function parseJsonValue(rawValue) {
  if (rawValue == null) {
    return null
  }
  if (typeof rawValue == 'object') {
    return rawValue
  }
  if (typeof rawValue != 'string') {
    return null
  }
  const text = rawValue.trim()
  if (text == '') {
    return null
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    return null
  }
}

function parseImages(rawValue) {
  const source = parseJsonValue(rawValue)
  if (!Array.isArray(source)) {
    return []
  }
  return source
    .map((item) => String(item || '').trim())
    .filter((item) => item != '')
}

function formatBeijingIsoFromUnix(rawUnixSeconds) {
  const unixSeconds = Number(rawUnixSeconds || 0)
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) {
    return ''
  }
  const beijingMs = Math.floor(unixSeconds * 1000) + 8 * 60 * 60 * 1000
  const iso = new Date(beijingMs).toISOString()
  return iso.slice(0, 19) + '+08:00'
}

router.get('/', async (req, res) => {
  const sql = `
    SELECT
      c.id,
      c.user_id,
      c.title,
      c.content,
      c.tags,
      c.contact,
      c.location_json,
      c.images_json,
      UNIX_TIMESTAMP(c.created_at) AS created_at_unix,
      u.username,
      u.avatar
    FROM companions c
    LEFT JOIN users u ON c.user_id = u.id
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT 100
  `

  try {
    const [rows] = await pool.query(sql)
    const data = Array.isArray(rows)
      ? rows.map((item) => {
          const location = parseJsonValue(item.location_json)
          const city = String(location?.city || '').trim()
          const userId = Number(item.user_id || 0)
          return {
            id: Number(item.id || 0),
            user_id: userId,
            nickname: String(item.username || '').trim() || `游民_${userId > 0 ? userId : 'x'}`,
            avatar: String(item.avatar || '').trim(),
            city_name: city,
            title: String(item.title || '').trim(),
            content: String(item.content || '').trim(),
            tags: parseTags(item.tags),
            contact: String(item.contact || '').trim(),
            location,
            images: parseImages(item.images_json),
            created_at: formatBeijingIsoFromUnix(item.created_at_unix)
          }
        })
      : []

    res.json({
      ok: true,
      data
    })
  } catch (error) {
    console.error('[GET /api/companions] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch companions'
    })
  }
})

module.exports = router
