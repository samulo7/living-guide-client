const express = require('express')
const { pool } = require('../config/db')

const router = express.Router()

router.get('/', async (req, res) => {
  const sql = `
    SELECT
      id,
      nickname,
      avatar,
      city_name,
      title,
      content,
      tags,
      created_at
    FROM companions
    ORDER BY created_at DESC
  `

  try {
    const [rows] = await pool.query(sql)
    res.json({
      ok: true,
      data: rows
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
