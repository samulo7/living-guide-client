const express = require('express')
const multer = require('multer')
const path = require('path')
const { pool } = require('../config/db')

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype != null && file.mimetype.startsWith('image/')) {
      cb(null, true)
      return
    }
    cb(new Error('Only image files are allowed'))
  }
})

function resolveAvatarUrl(uploadResult, req, objectKey) {
  if (typeof uploadResult?.url == 'string' && uploadResult.url != '') {
    return uploadResult.url.split('?')[0]
  }

  const publicBaseUrl = String(req.app.locals.ossPublicBaseUrl || '').replace(/\/$/, '')
  if (publicBaseUrl != '') {
    return `${publicBaseUrl}/${objectKey}`
  }

  const bucket = String(req.app.locals.ossBucket || '')
  const endpoint = String(req.app.locals.ossEndpoint || '')
  if (bucket != '' && endpoint != '') {
    return `https://${bucket}.${endpoint}/${objectKey}`
  }

  return objectKey
}

router.get('/profile', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT id, username, avatar, tagline, balance, created_at
        FROM users
        ORDER BY id ASC
        LIMIT 1
      `
    )

    if (!rows || rows.length === 0) {
      res.status(404).json({
        ok: false,
        message: 'No user profile found'
      })
      return
    }

    res.json({
      ok: true,
      data: rows[0]
    })
  } catch (error) {
    console.error('[GET /api/user/profile] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch user profile'
    })
  }
})

router.put('/profile', async (req, res) => {
  const username = typeof req.body?.username == 'string' ? req.body.username.trim() : ''
  const tagline = typeof req.body?.tagline == 'string' ? req.body.tagline.trim() : ''
  const avatar = typeof req.body?.avatar == 'string' ? req.body.avatar.trim() : ''

  if (username == '' || tagline == '') {
    res.status(400).json({
      success: false,
      message: 'username and tagline are required'
    })
    return
  }

  try {
    const sql =
      avatar == ''
        ? `
          UPDATE users
          SET username = ?, tagline = ?
          WHERE id = 1
        `
        : `
          UPDATE users
          SET username = ?, tagline = ?, avatar = ?
          WHERE id = 1
        `
    const params = avatar == '' ? [username, tagline] : [username, tagline, avatar]
    const [result] = await pool.query(sql, params)

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    res.json({
      success: true,
      message: '更新成功'
    })
  } catch (error) {
    console.error('[PUT /api/user/profile] failed:', error.message)
    res.status(500).json({
      success: false,
      message: '更新失败'
    })
  }
})

router.post('/avatar', (req, res) => {
  upload.single('avatar')(req, res, async (uploadError) => {
    if (uploadError != null) {
      const message =
        uploadError instanceof multer.MulterError
          ? uploadError.message
          : uploadError.message || 'Failed to parse uploaded file'
      res.status(400).json({
        success: false,
        message
      })
      return
    }

    if (req.file == null) {
      res.status(400).json({
        success: false,
        message: 'avatar file is required'
      })
      return
    }

    const ossClient = req.app.locals.ossClient
    if (ossClient == null) {
      res.status(500).json({
        success: false,
        message: 'OSS is not configured on server'
      })
      return
    }

    const ext = path.extname(req.file.originalname || '').toLowerCase()
    const safeExt = ext != '' && ext.length <= 10 ? ext : '.jpg'
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`
    const objectKey = `avatars/${uniqueFileName}`

    try {
      const uploadResult = await ossClient.put(objectKey, req.file.buffer, {
        headers: {
          'Content-Type': req.file.mimetype || 'application/octet-stream'
        }
      })

      const avatarUrl = resolveAvatarUrl(uploadResult, req, objectKey)
      const [result] = await pool.query(
        `
          UPDATE users
          SET avatar = ?
          WHERE id = 1
        `,
        [avatarUrl]
      )

      if (result.affectedRows === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        })
        return
      }

      res.json({
        success: true,
        avatarUrl
      })
    } catch (error) {
      console.error('[POST /api/user/avatar] failed:', error.message)
      res.status(500).json({
        success: false,
        message: 'Failed to upload avatar'
      })
    }
  })
})

module.exports = router
