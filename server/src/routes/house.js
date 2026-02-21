const express = require('express')
const { pool } = require('../config/db')

const router = express.Router()

router.get('/:id', async (req, res) => {
  const id = Number.parseInt(String(req.params.id || ''), 10)
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
        SELECT *
        FROM houses
        WHERE id = ?
        LIMIT 1
      `,
      [id]
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
