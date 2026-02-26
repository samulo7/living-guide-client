const express = require('express')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const { pool } = require('../config/db')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()
const MAX_TAGS = 8
const MAX_IMAGES = 3
const MAX_CONTACT_LENGTH = 120
const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024
const SOCIAL_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/social')
const SOCIAL_UPLOAD_PUBLIC_PREFIX = '/uploads/social/'

function ensureUploadDir() {
  fs.mkdirSync(SOCIAL_UPLOAD_DIR, { recursive: true })
}

function normalizeImageExtension(file) {
  const rawExt = String(path.extname(file.originalname || '') || '')
    .trim()
    .toLowerCase()
  const ext = rawExt == '.jpeg' ? '.jpg' : rawExt
  if (ext == '.jpg' || ext == '.png' || ext == '.webp' || ext == '.gif') {
    return ext
  }

  const mime = String(file.mimetype || '').trim().toLowerCase()
  if (mime == 'image/png') {
    return '.png'
  }
  if (mime == 'image/webp') {
    return '.webp'
  }
  if (mime == 'image/gif') {
    return '.gif'
  }
  return '.jpg'
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, callback) => {
      try {
        ensureUploadDir()
        callback(null, SOCIAL_UPLOAD_DIR)
      } catch (error) {
        callback(error)
      }
    },
    filename: (req, file, callback) => {
      const ext = normalizeImageExtension(file)
      const suffix = crypto.randomBytes(6).toString('hex')
      callback(null, `${Date.now()}-${suffix}${ext}`)
    }
  }),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES
  },
  fileFilter: (req, file, callback) => {
    const mime = String(file.mimetype || '').trim().toLowerCase()
    if (!mime.startsWith('image/')) {
      callback(new Error('Only image files are allowed'))
      return
    }
    callback(null, true)
  }
})

function parseTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags
      .map((item) => String(item || '').trim())
      .filter((item) => item != '')
      .slice(0, MAX_TAGS)
  }

  return String(rawTags || '')
    .split(/[,，、|]/)
    .map((item) => item.trim())
    .filter((item) => item != '')
    .slice(0, MAX_TAGS)
}

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

function deriveCityFromAddress(address) {
  const text = String(address || '').trim()
  if (text == '') {
    return ''
  }
  const match = text.match(/([\u4e00-\u9fa5A-Za-z]+?(?:市|州|区|县))/)
  return match != null ? String(match[1] || '').trim() : ''
}

function parseLocation(rawLocation) {
  const source = parseJsonText(rawLocation)
  if (source == null || typeof source != 'object') {
    return null
  }

  const name = String(source.name || source.landmark || '').trim()
  const address = String(source.address || '').trim()
  const city = String(source.city || '').trim() || deriveCityFromAddress(address)
  const latitude = Number(source.latitude ?? source.lat ?? NaN)
  const longitude = Number(source.longitude ?? source.lng ?? NaN)

  if (name == '' && address == '' && city == '' && !Number.isFinite(latitude) && !Number.isFinite(longitude)) {
    return null
  }

  return {
    name,
    address,
    city,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null
  }
}

function normalizeImagePath(value) {
  const text = String(value || '').trim().replace(/\\/g, '/')
  if (text == '') {
    return ''
  }
  if (text.startsWith(SOCIAL_UPLOAD_PUBLIC_PREFIX)) {
    return text
  }
  if (text.startsWith('/uploads/')) {
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
    .slice(0, MAX_IMAGES)
}

function parseCompanionTags(rawTags) {
  return String(rawTags || '')
    .split(/[,，、|]/)
    .map((item) => item.trim())
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

function mapCompanionRow(row) {
  const location = parseLocation(row.location_json)
  const images = parseImages(row.images_json)
  const userId = Number(row.user_id || 0)
  const nickname = String(row.username || '').trim() || `游民_${userId > 0 ? userId : 'x'}`

  return {
    id: Number(row.id || 0),
    user_id: userId,
    nickname,
    avatar: String(row.avatar || '').trim(),
    title: String(row.title || '').trim(),
    content: String(row.content || '').trim(),
    tags: parseCompanionTags(row.tags),
    contact: String(row.contact || '').trim(),
    city_name: String(location?.city || '').trim(),
    location,
    images,
    created_at: formatBeijingIsoFromUnix(row.created_at_unix)
  }
}

router.post('/upload-image', authMiddleware, (req, res) => {
  upload.single('file')(req, res, (error) => {
    if (error != null) {
      const message =
        error instanceof multer.MulterError && error.code == 'LIMIT_FILE_SIZE'
          ? 'Image must be <= 6MB'
          : String(error.message || 'Upload failed')
      res.status(400).json({
        success: false,
        message
      })
      return
    }

    const file = req.file
    if (file == null) {
      res.status(400).json({
        success: false,
        message: 'Image file is required'
      })
      return
    }

    res.status(201).json({
      success: true,
      path: `${SOCIAL_UPLOAD_PUBLIC_PREFIX}${file.filename}`
    })
  })
})

router.post('/publish', authMiddleware, async (req, res) => {
  const userId = Number(req.user?.id || 0)
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized'
    })
    return
  }

  const title = String(req.body?.title || '').trim()
  const content = String(req.body?.content || '').trim()
  const contact = String(req.body?.contact || '').trim()
  const tags = parseTags(req.body?.tags)
  const location = parseLocation(req.body?.location)
  const images = parseImages(req.body?.images)

  if (title.length < 2 || title.length > 160) {
    res.status(400).json({
      success: false,
      message: 'Title length must be 2-160 characters'
    })
    return
  }

  if (content.length < 2 || content.length > 2000) {
    res.status(400).json({
      success: false,
      message: 'Content length must be 2-2000 characters'
    })
    return
  }

  if (tags.length == 0) {
    res.status(400).json({
      success: false,
      message: 'At least one tag is required'
    })
    return
  }

  if (contact.length > MAX_CONTACT_LENGTH) {
    res.status(400).json({
      success: false,
      message: `Contact length must be <= ${MAX_CONTACT_LENGTH}`
    })
    return
  }

  try {
    const [insertResult] = await pool.query(
      `
        INSERT INTO companions (user_id, title, content, tags, location_json, images_json, contact)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        title,
        content,
        tags.join(','),
        location == null ? null : JSON.stringify(location),
        JSON.stringify(images),
        contact
      ]
    )

    res.status(201).json({
      success: true,
      id: Number(insertResult.insertId || 0)
    })
  } catch (error) {
    console.error('[POST /api/social/publish] failed:', error.message)
    res.status(500).json({
      success: false,
      message: 'Failed to publish'
    })
  }
})

router.get('/list', async (req, res) => {
  const limit = Number.parseInt(String(req.query.limit || '50'), 10)
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 50

  try {
    const [rows] = await pool.query(
      `
        SELECT
          c.id,
          c.user_id,
          c.title,
          c.content,
          c.tags,
          c.location_json,
          c.images_json,
          c.contact,
          UNIX_TIMESTAMP(c.created_at) AS created_at_unix,
          u.username,
          u.avatar
        FROM companions c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT ?
      `,
      [safeLimit]
    )

    res.json({
      ok: true,
      data: Array.isArray(rows) ? rows.map((item) => mapCompanionRow(item)) : []
    })
  } catch (error) {
    console.error('[GET /api/social/list] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch social list'
    })
  }
})

router.get('/detail/:id', async (req, res) => {
  const id = Number.parseInt(String(req.params.id || ''), 10)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      ok: false,
      message: 'Invalid social id'
    })
    return
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT
          c.id,
          c.user_id,
          c.title,
          c.content,
          c.tags,
          c.location_json,
          c.images_json,
          c.contact,
          UNIX_TIMESTAMP(c.created_at) AS created_at_unix,
          u.username,
          u.avatar
        FROM companions c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
        LIMIT 1
      `,
      [id]
    )

    if (!Array.isArray(rows) || rows.length == 0) {
      res.status(404).json({
        ok: false,
        message: 'Social post not found'
      })
      return
    }

    res.json({
      ok: true,
      data: mapCompanionRow(rows[0])
    })
  } catch (error) {
    console.error('[GET /api/social/detail/:id] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch social detail'
    })
  }
})

module.exports = router
