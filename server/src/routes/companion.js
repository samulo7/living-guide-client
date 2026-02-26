const express = require('express')
const { pool } = require('../config/db')

const router = express.Router()

function normalizeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function parseImages(rawImages) {
  if (Array.isArray(rawImages)) {
    return rawImages
      .map((item) => normalizeText(item, 500))
      .filter((item) => item != '')
      .slice(0, 3)
  }

  const text = String(rawImages || '').trim()
  if (text == '') {
    return []
  }

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeText(item, 500))
        .filter((item) => item != '')
        .slice(0, 3)
    }
  } catch (error) {
    // ignore parse error and split by delimiter
  }

  return text
    .split(/[,\uff0c|]/)
    .map((item) => normalizeText(item, 500))
    .filter((item) => item != '')
    .slice(0, 3)
}

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT
          c.id,
          c.user_id,
          c.city_name,
          c.location_name,
          c.title,
          c.content,
          c.tags,
          c.images,
          c.contact,
          c.created_at,
          CASE
            WHEN u.id IS NULL THEN COALESCE(NULLIF(c.nickname, ''), CONCAT('user_', c.user_id))
            ELSE COALESCE(NULLIF(u.username, ''), CONCAT('user_', c.user_id))
          END AS nickname,
          CASE
            WHEN u.id IS NULL THEN COALESCE(NULLIF(c.avatar, ''), '')
            ELSE COALESCE(u.avatar, '')
          END AS avatar,
          CASE
            WHEN u.id IS NULL THEN ''
            ELSE COALESCE(u.tagline, '')
          END AS tagline
        FROM companions c
        LEFT JOIN users u ON u.id = c.user_id
        ORDER BY c.created_at DESC, c.id DESC
      `
    )

    const data = Array.isArray(rows)
      ? rows.map((row) => ({
          id: Number(row.id || 0),
          user_id: Number(row.user_id || 0),
          nickname: normalizeText(row.nickname, 100),
          avatar: normalizeText(row.avatar, 500),
          tagline: normalizeText(row.tagline, 255),
          city_name: normalizeText(row.city_name, 120),
          location_name: normalizeText(row.location_name, 200),
          title: normalizeText(row.title, 160),
          content: String(row.content || '').trim(),
          tags: normalizeText(row.tags, 255),
          images: parseImages(row.images),
          contact: normalizeText(row.contact, 120),
          created_at: row.created_at || ''
        }))
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
