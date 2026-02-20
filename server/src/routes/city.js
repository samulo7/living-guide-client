const express = require('express')
const { pool } = require('../config/db')

const router = express.Router()

function parseTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags.map((item) => String(item).trim()).filter((item) => item != '')
  }

  const text = String(rawTags || '').trim()
  if (text == '') {
    return []
  }

  try {
    if (text.startsWith('[')) {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter((item) => item != '')
      }
    }
  } catch (error) {
    // fall back to comma split
  }

  return text
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item != '')
}

function toBool(value) {
  return Number(value) === 1
}

function mapCityRow(row) {
  const city = String(row.name || '')
  const district = String(row.location || '')
  const medical = String(row.medical || '')
  const transport = String(row.transport || '')

  return {
    id: String(row.id),
    city,
    district,
    title: `${city} · ${district}`,
    medical,
    transport,
    cover_image: String(row.cover_image || ''),
    is_verified: toBool(row.is_verified),
    has_hospital_class_a: toBool(row.has_hospital_class_a),
    price_rent: Number(row.rent_price || 0),
    price_buy: String(row.buy_price_desc || ''),
    tags: parseTags(row.tags),
    detail: {
      guru_comment: String(row.editor_comment || ''),
      climate_info: '',
      cons: '',
      medical_desc: medical,
      transport_desc: transport
    },
    radar_data: {
      cost: 0,
      medical: 0,
      transport: 0,
      climate: 0,
      fun: 0
    },
    location: {
      lat: Number(row.lat || 0),
      lng: Number(row.lng || 0)
    }
  }
}

router.get('/', async (req, res) => {
  const maxRent = Number.parseInt(String(req.query.maxRent || ''), 10)
  const tag = String(req.query.tag || '').trim()
  const verified = String(req.query.verified || '').trim()

  let sql = `
    SELECT
      id,
      name,
      location,
      tags,
      rent_price,
      buy_price_desc,
      cover_image,
      editor_comment,
      is_verified,
      has_hospital_class_a,
      medical,
      transport,
      lat,
      lng
    FROM cities
    WHERE 1 = 1
  `
  const params = []

  if (!Number.isNaN(maxRent)) {
    sql += ' AND rent_price <= ?'
    params.push(maxRent)
  }

  if (tag != '') {
    sql += ' AND tags LIKE ?'
    params.push(`%${tag}%`)
  }

  if (verified == '1' || verified.toLowerCase() == 'true') {
    sql += ' AND is_verified = 1'
  }

  sql += ' ORDER BY rent_price ASC, id ASC'

  try {
    const [rows] = await pool.query(sql, params)
    const items = rows.map(mapCityRow)
    res.json({
      ok: true,
      total: items.length,
      items
    })
  } catch (error) {
    console.error('[GET /api/cities] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch cities'
    })
  }
})

module.exports = router
