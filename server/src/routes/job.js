const express = require('express')
const { pool } = require('../config/db')

const router = express.Router()

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
      c.name AS city_name
    FROM jobs j
    LEFT JOIN cities c ON j.city_id = c.id
    ORDER BY j.created_at DESC
  `

  try {
    const [rows] = await pool.query(sql)
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

module.exports = router
