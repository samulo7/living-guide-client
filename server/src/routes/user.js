const express = require('express')
const multer = require('multer')
const { pool } = require('../config/db')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: AVATAR_MAX_BYTES
  }
})

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

function normalizeProfileField(rawValue, maxLength) {
  return String(rawValue || '').trim().slice(0, maxLength)
}

function normalizeFilename(rawName) {
  return String(rawName || 'avatar')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 80)
}

function inferImageExtension(file) {
  const original = normalizeFilename(file?.originalname || '')
  const extFromName = original.includes('.') ? '.' + original.split('.').pop() : ''
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extFromName)) {
    return extFromName
  }

  const mime = String(file?.mimetype || '').toLowerCase()
  if (mime.includes('jpeg') || mime.includes('jpg')) {
    return '.jpg'
  }
  if (mime.includes('png')) {
    return '.png'
  }
  if (mime.includes('webp')) {
    return '.webp'
  }
  if (mime.includes('gif')) {
    return '.gif'
  }
  return '.jpg'
}

function isImageMime(file) {
  const mime = String(file?.mimetype || '').toLowerCase()
  return mime.startsWith('image/')
}

function parseHouseId(rawValue) {
  const houseId = Number.parseInt(String(rawValue || ''), 10)
  if (!Number.isInteger(houseId) || houseId <= 0) {
    return 0
  }
  return houseId
}

async function ensureHouseExists(houseId) {
  const [houseRows] = await pool.query(
    `
      SELECT id
      FROM houses
      WHERE id = ?
      LIMIT 1
    `,
    [houseId]
  )

  return Array.isArray(houseRows) && houseRows.length > 0
}

async function toggleFavoriteForUser(userId, houseId) {
  const [existsRows] = await pool.query(
    `
      SELECT id
      FROM favorites
      WHERE user_id = ? AND house_id = ?
      LIMIT 1
    `,
    [userId, houseId]
  )

  const alreadyFavorited = Array.isArray(existsRows) && existsRows.length > 0
  if (alreadyFavorited) {
    await pool.query(
      `
        DELETE FROM favorites
        WHERE user_id = ? AND house_id = ?
        LIMIT 1
      `,
      [userId, houseId]
    )
    return false
  }

  await pool.query(
    `
      INSERT INTO favorites (user_id, house_id)
      VALUES (?, ?)
    `,
    [userId, houseId]
  )
  return true
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

router.put('/profile', authMiddleware, async (req, res) => {
  const userId = readAuthedUserId(req)
  if (userId <= 0) {
    unauthorized(res)
    return
  }

  const username = normalizeProfileField(req.body?.username, 100)
  const tagline = normalizeProfileField(req.body?.tagline, 255)
  const avatar = normalizeProfileField(req.body?.avatar, 500)

  if (username == '') {
    res.status(400).json({
      ok: false,
      message: 'Username is required'
    })
    return
  }

  try {
    const [updateResult] = await pool.query(
      `
        UPDATE users
        SET username = ?, tagline = ?, avatar = ?
        WHERE id = ?
        LIMIT 1
      `,
      [username, tagline, avatar, userId]
    )

    if (Number(updateResult?.affectedRows || 0) <= 0) {
      res.status(404).json({
        ok: false,
        message: 'User profile not found'
      })
      return
    }

    const [rows] = await pool.query(
      `
        SELECT id, username, nickname, tagline, bio, avatar
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId]
    )

    if (!Array.isArray(rows) || rows.length == 0) {
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
    console.error('[PUT /api/user/profile] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to update user profile'
    })
  }
})

router.post('/avatar/upload', authMiddleware, (req, res) => {
  const userId = readAuthedUserId(req)
  if (userId <= 0) {
    unauthorized(res)
    return
  }

  avatarUpload.single('file')(req, res, async (uploadError) => {
    if (uploadError != null) {
      const message =
        uploadError.code == 'LIMIT_FILE_SIZE'
          ? `Avatar file too large (max ${Math.round(AVATAR_MAX_BYTES / 1024 / 1024)}MB)`
          : 'Invalid avatar upload payload'
      res.status(400).json({
        ok: false,
        message
      })
      return
    }

    const file = req.file
    if (file == null || !file.buffer || file.buffer.length == 0) {
      res.status(400).json({
        ok: false,
        message: 'Avatar file is required'
      })
      return
    }

    if (!isImageMime(file)) {
      res.status(400).json({
        ok: false,
        message: 'Only image files are supported'
      })
      return
    }

    const ossClient = req.app?.locals?.ossClient
    const ossPublicBaseUrl = String(req.app?.locals?.ossPublicBaseUrl || '').trim()
    if (ossClient == null || ossPublicBaseUrl == '') {
      res.status(503).json({
        ok: false,
        message: 'OSS is not configured'
      })
      return
    }

    const ext = inferImageExtension(file)
    const objectKey = `avatars/user_${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`

    try {
      const result = await ossClient.put(objectKey, file.buffer, {
        headers: {
          'Content-Type': String(file.mimetype || 'application/octet-stream')
        }
      })

      const uploadedUrl = String(result?.url || `${ossPublicBaseUrl}/${objectKey}`)

      await pool.query(
        `
          UPDATE users
          SET avatar = ?
          WHERE id = ?
          LIMIT 1
        `,
        [uploadedUrl, userId]
      )

      res.json({
        ok: true,
        data: {
          avatar: uploadedUrl
        }
      })
    } catch (error) {
      console.error('[POST /api/user/avatar/upload] failed:', error.message)
      res.status(500).json({
        ok: false,
        message: 'Failed to upload avatar'
      })
    }
  })
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

router.post('/favorite/toggle', authMiddleware, async (req, res) => {
  const userId = readAuthedUserId(req)
  if (userId <= 0) {
    unauthorized(res)
    return
  }

  const houseId = parseHouseId(req.body?.house_id)
  if (houseId <= 0) {
    res.status(400).json({
      ok: false,
      message: 'Invalid house_id'
    })
    return
  }

  try {
    const houseExists = await ensureHouseExists(houseId)
    if (!houseExists) {
      res.status(404).json({
        ok: false,
        message: 'House not found'
      })
      return
    }

    const isFavorited = await toggleFavoriteForUser(userId, houseId)
    res.json({
      ok: true,
      message: isFavorited ? 'Favorited' : 'Unfavorited',
      data: {
        user_id: userId,
        house_id: houseId,
        isFavorited
      }
    })
  } catch (error) {
    console.error('[POST /api/user/favorite/toggle] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to toggle favorite'
    })
  }
})

module.exports = router
