const express = require('express')
const { pool } = require('../config/db')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

const STATUS_ACTIVE = 'active'
const STATUS_FILLED = 'filled'
const ERROR_CODE_NOT_OWNER = 'NOT_OWNER'

function parseJsonText(rawValue) {
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

function splitTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags
      .map((item) => String(item || '').trim())
      .filter((item) => item != '')
      .slice(0, 10)
  }

  return String(rawTags || '')
    .split(/[\u3001\uff0c,|/]+/)
    .map((item) => item.trim())
    .filter((item) => item != '')
    .slice(0, 10)
}

function normalizeStatus(rawStatus) {
  const text = String(rawStatus || '').trim().toLowerCase()
  if (text == STATUS_FILLED) {
    return STATUS_FILLED
  }
  return STATUS_ACTIVE
}

function normalizeImagePath(value) {
  const text = String(value || '').trim().replace(/\\/g, '/')
  if (text == '') {
    return ''
  }
  if (text.startsWith('/uploads/') || text.startsWith('/static/')) {
    return text
  }
  if (text.startsWith('http://') || text.startsWith('https://')) {
    return text
  }
  return ''
}

function parseImages(rawImages) {
  const source = parseJsonText(rawImages)
  if (!Array.isArray(source)) {
    return []
  }
  return source
    .map((item) => normalizeImagePath(item))
    .filter((item) => item != '')
    .slice(0, 9)
}

function parseLocation(rawLocation, fallbackCity) {
  const source = parseJsonText(rawLocation)
  if (source == null || typeof source != 'object') {
    return null
  }

  const city = String(source.city || fallbackCity || '').trim()
  const street = String(source.street || source.businessArea || source.business_area || '').trim()
  const businessArea = String(source.businessArea || source.business_area || '').trim()
  const name = String(source.name || source.landmark || businessArea || street).trim()
  const address = String(source.address || '').trim()
  const latitude = Number(source.latitude ?? source.lat ?? NaN)
  const longitude = Number(source.longitude ?? source.lng ?? NaN)

  if (name == '' && address == '' && city == '' && street == '' && businessArea == '' && !Number.isFinite(latitude) && !Number.isFinite(longitude)) {
    return null
  }

  return {
    name,
    address,
    city,
    street,
    business_area: businessArea,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null
  }
}

function mapJobDetailRow(row) {
  const cityName = String(row.city_name || '').trim()

  return {
    id: String(row.id || ''),
    city_id: String(row.city_id || ''),
    city_name: cityName,
    title: String(row.title || '').trim(),
    salary: String(row.salary || '').trim(),
    company: String(row.company || '').trim(),
    is_remote: Number(row.is_remote || 0) == 1 ? 1 : 0,
    tags: splitTags(row.tags),
    description: String(row.description || '').trim(),
    contact: String(row.contact || '').trim() || '私信联系',
    status: normalizeStatus(row.status),
    boss_id: Number(row.boss_id || 0),
    images: parseImages(row.images_json),
    location: parseLocation(row.location_json, cityName),
    created_at: String(row.created_at || '').trim()
  }
}

router.get('/', async (req, res) => {
  const sql = `
    SELECT
      j.id,
      j.city_id,
      j.title,
      j.salary,
      j.company,
      j.is_remote,
      j.tags,
      j.description,
      j.created_at,
      COALESCE(NULLIF(j.status, ''), ?) AS status,
      c.name AS city_name
    FROM jobs j
    LEFT JOIN cities c ON j.city_id = c.id
    WHERE COALESCE(NULLIF(j.status, ''), ?) = ?
    ORDER BY j.created_at DESC
  `

  try {
    const [rows] = await pool.query(sql, [STATUS_ACTIVE, STATUS_ACTIVE, STATUS_ACTIVE])
    res.json({
      ok: true,
      data: rows
    })
  } catch (error) {
    console.error('[GET /api/jobs] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch jobs'
    })
  }
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      ok: false,
      message: 'Invalid job id'
    })
    return
  }

  const sql = `
    SELECT
      j.id,
      j.city_id,
      j.title,
      j.salary,
      j.company,
      j.is_remote,
      j.tags,
      j.description,
      j.contact,
      COALESCE(NULLIF(j.status, ''), ?) AS status,
      j.boss_id,
      j.location_json,
      j.images_json,
      j.created_at,
      c.name AS city_name
    FROM jobs j
    LEFT JOIN cities c ON j.city_id = c.id
    WHERE j.id = ?
    LIMIT 1
  `

  try {
    const [rows] = await pool.query(sql, [STATUS_ACTIVE, id])
    if (!Array.isArray(rows) || rows.length == 0) {
      res.status(404).json({
        ok: false,
        message: 'Job not found'
      })
      return
    }

    res.json({
      ok: true,
      data: mapJobDetailRow(rows[0])
    })
  } catch (error) {
    console.error('[GET /api/jobs/:id] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch job detail'
    })
  }
})

router.post('/:id/takedown', authMiddleware, async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      ok: false,
      message: 'Invalid job id'
    })
    return
  }

  const userId = Number(req.user?.id || 0)
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({
      ok: false,
      message: 'Unauthorized'
    })
    return
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT id, boss_id, COALESCE(NULLIF(status, ''), ?) AS status
        FROM jobs
        WHERE id = ?
        LIMIT 1
      `,
      [STATUS_ACTIVE, id]
    )

    if (!Array.isArray(rows) || rows.length == 0) {
      res.status(404).json({
        ok: false,
        message: 'Job not found'
      })
      return
    }

    const row = rows[0] || {}
    const bossId = Number(row.boss_id || 0)
    if (bossId <= 0 || bossId != userId) {
      res.status(403).json({
        ok: false,
        code: ERROR_CODE_NOT_OWNER,
        message: 'Only owner can manage this job'
      })
      return
    }

    const status = normalizeStatus(row.status)
    if (status == STATUS_FILLED) {
      res.json({
        ok: true,
        data: {
          id,
          status: STATUS_FILLED
        }
      })
      return
    }

    const [result] = await pool.query(
      `
        UPDATE jobs
        SET status = ?, updated_at = NOW()
        WHERE id = ? AND boss_id = ?
      `,
      [STATUS_FILLED, id, userId]
    )

    if (Number(result?.affectedRows || 0) <= 0) {
      res.status(409).json({
        ok: false,
        message: 'Failed to update job status'
      })
      return
    }

    res.json({
      ok: true,
      data: {
        id,
        status: STATUS_FILLED
      }
    })
  } catch (error) {
    console.error('[POST /api/jobs/:id/takedown] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to take down job'
    })
  }
})

module.exports = router
