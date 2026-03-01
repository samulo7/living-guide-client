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
const MAX_DAILY_POSTS = 3
const MAX_ACTIVE_POSTS = 3
const FULL_EDIT_WINDOW_MINUTES = 10
const DEFAULT_CONTACT = '\u79c1\u4fe1\u8054\u7cfb'
const STATUS_DELETED = 0
const STATUS_ACTIVE = 1
const STATUS_COMPLETED = 2
const EDIT_MODE_NONE = 'none'
const EDIT_MODE_FULL = 'full'
const EDIT_MODE_PARTIAL = 'partial'
const ERROR_CODE_DAILY_LIMIT = 'DAILY_LIMIT'
const ERROR_CODE_ACTIVE_LIMIT = 'ACTIVE_LIMIT'
const ERROR_CODE_NOT_OWNER = 'NOT_OWNER'
const ERROR_CODE_POST_COMPLETED_LOCKED = 'POST_COMPLETED_LOCKED'
const ERROR_CODE_EDIT_WINDOW_EXPIRED = 'EDIT_WINDOW_EXPIRED'
const ERROR_CODE_CORE_FIELDS_LOCKED = 'CORE_FIELDS_LOCKED'
const ERROR_CODE_STATUS_NOT_COMPLETED = 'STATUS_NOT_COMPLETED'
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
    .split(/[\u3001\uff0c,]/)
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
  const match = text.match(/([\u4e00-\u9fa5A-Za-z]+?(?:\u5e02|\u5dde|\u533a|\u53bf))/)
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
    .split(/[\u3001\uff0c,]/)
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
  const nickname = String(row.username || '').trim() || ('\u7528\u6237_' + (userId > 0 ? String(userId) : 'x'))

  return {
    id: Number(row.id || 0),
    user_id: userId,
    nickname,
    avatar: String(row.avatar || '').trim(),
    title: String(row.title || '').trim(),
    content: String(row.content || '').trim(),
    tags: parseCompanionTags(row.tags),
    contact: String(row.contact || '').trim() || DEFAULT_CONTACT,
    status: Number(row.status ?? STATUS_ACTIVE),
    city_name: String(location?.city || '').trim(),
    location,
    images,
    created_at: formatBeijingIsoFromUnix(row.created_at_unix)
  }
}

function getBeijingDayRangeUnix() {
  const dayText = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())

  const startMs = Date.parse(`${dayText}T00:00:00+08:00`)
  const startUnix = Number.isFinite(startMs) ? Math.floor(startMs / 1000) : Math.floor(Date.now() / 1000)
  return {
    startUnix,
    endUnix: startUnix + 24 * 60 * 60
  }
}

function readCountValue(value) {
  const count = Number(value || 0)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

async function readPublishGuardStats(userId) {
  const { startUnix, endUnix } = getBeijingDayRangeUnix()
  const [rows] = await pool.query(
    `
      SELECT
        SUM(CASE WHEN c.status = ? THEN 1 ELSE 0 END) AS active_count,
        SUM(
          CASE
            WHEN c.status <> ? AND UNIX_TIMESTAMP(c.created_at) >= ? AND UNIX_TIMESTAMP(c.created_at) < ? THEN 1
            ELSE 0
          END
        ) AS today_count
      FROM companions c
      WHERE c.user_id = ? AND c.status <> ?
    `,
    [STATUS_ACTIVE, STATUS_DELETED, startUnix, endUnix, userId, STATUS_DELETED]
  )

  if (!Array.isArray(rows) || rows.length == 0) {
    return {
      activeCount: 0,
      todayCount: 0
    }
  }

  const row = rows[0] || {}
  return {
    activeCount: readCountValue(row.active_count),
    todayCount: readCountValue(row.today_count)
  }
}

async function detectPublishLimit(userId) {
  const stats = await readPublishGuardStats(userId)
  if (stats.todayCount >= MAX_DAILY_POSTS) {
    return {
      code: ERROR_CODE_DAILY_LIMIT,
      message: '\u4eca\u65e5\u53d1\u5e16\u6b21\u6570\u5df2\u8fbe\u4e0a\u9650\uff0c\u8bf7\u660e\u5929\u518d\u6765'
    }
  }
  if (stats.activeCount >= MAX_ACTIVE_POSTS) {
    return {
      code: ERROR_CODE_ACTIVE_LIMIT,
      message: '\u5f53\u524d\u6b63\u5728\u62db\u52df\u7684\u52a8\u6001\u5df2\u8fbe\u4e0a\u9650\uff0c\u8bf7\u5148\u53bb\u7ba1\u7406\u9875\u7ed3\u675f\u65e7\u52a8\u6001'
    }
  }
  return null
}

function toSafeDate(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value
  }
  const date = new Date(String(value || '').trim())
  if (!Number.isFinite(date.getTime())) {
    return null
  }
  return date
}

function readEditPermission(row) {
  const status = Number(row?.status ?? STATUS_ACTIVE)
  const createdAt = toSafeDate(row?.created_at)
  const contactClickCount = Number(row?.contact_click_count || 0)
  const favoriteCount = Number(row?.favorite_count || 0)
  const hasInteraction = contactClickCount > 0 || favoriteCount > 0
  const now = Date.now()

  if (status == STATUS_COMPLETED) {
    return {
      canEdit: false,
      mode: EDIT_MODE_NONE,
      reasonCode: ERROR_CODE_POST_COMPLETED_LOCKED,
      reason: '\u8be5\u52a8\u6001\u5df2\u5b8c\u6210',
      lockedFields: ['title', 'tags', 'location', 'content', 'images', 'contact'],
      fullEditDeadline: ''
    }
  }

  const deadlineMs = createdAt != null ? createdAt.getTime() + FULL_EDIT_WINDOW_MINUTES * 60 * 1000 : 0
  const fullEditDeadline = deadlineMs > 0 ? new Date(deadlineMs).toISOString() : ''
  const withinWindow = deadlineMs > 0 && now <= deadlineMs

  if (hasInteraction) {
    return {
      canEdit: true,
      mode: EDIT_MODE_PARTIAL,
      reasonCode: ERROR_CODE_CORE_FIELDS_LOCKED,
      reason: '\u5df2\u4ea7\u751f\u4ea4\u4e92\uff0c\u6838\u5fc3\u5b57\u6bb5\u5df2\u9501\u5b9a',
      lockedFields: ['title', 'tags', 'location'],
      fullEditDeadline
    }
  }

  if (withinWindow) {
    return {
      canEdit: true,
      mode: EDIT_MODE_FULL,
      reasonCode: '',
      reason: '',
      lockedFields: [],
      fullEditDeadline
    }
  }

  return {
    canEdit: true,
    mode: EDIT_MODE_PARTIAL,
    reasonCode: ERROR_CODE_EDIT_WINDOW_EXPIRED,
    reason: '\u5df2\u8d85\u8fc7\u5b8c\u6574\u7f16\u8f91\u65f6\u95f4',
    lockedFields: ['title', 'tags', 'location'],
    fullEditDeadline
  }
}

async function findCompanionForOwner(userId, postId) {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        user_id,
        title,
        content,
        tags,
        location_json,
        images_json,
        contact,
        status,
        created_at,
        contact_click_count,
        favorite_count
      FROM companions
      WHERE id = ? AND user_id = ? AND status <> ?
      LIMIT 1
    `,
    [postId, userId, STATUS_DELETED]
  )

  if (!Array.isArray(rows) || rows.length == 0) {
    return null
  }
  return rows[0]
}

function hasOwn(body, key) {
  if (body == null || typeof body != 'object') {
    return false
  }
  return Object.prototype.hasOwnProperty.call(body, key)
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
  const contactInput = String(req.body?.contact || '').trim()
  const contact = contactInput != '' ? contactInput : DEFAULT_CONTACT
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
    const limitState = await detectPublishLimit(userId)
    if (limitState != null) {
      res.json({
        success: false,
        code: limitState.code,
        message: limitState.message
      })
      return
    }

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

router.get('/:id/edit-permission', authMiddleware, async (req, res) => {
  const userId = Number(req.user?.id || 0)
  const id = Number.parseInt(String(req.params.id || ''), 10)
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({ ok: false, code: ERROR_CODE_NOT_OWNER, message: 'Unauthorized' })
    return
  }
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ ok: false, message: 'Invalid social id' })
    return
  }

  try {
    const row = await findCompanionForOwner(userId, id)
    if (row == null) {
      res.status(404).json({ ok: false, message: 'Social post not found' })
      return
    }

    const permission = readEditPermission(row)
    res.json({
      ok: true,
      data: {
        can_edit: permission.canEdit,
        mode: permission.mode,
        locked_fields: permission.lockedFields,
        reason_code: permission.reasonCode,
        reason: permission.reason,
        full_edit_deadline: permission.fullEditDeadline,
        status: Number(row.status ?? STATUS_ACTIVE),
        is_owner: true
      }
    })
  } catch (error) {
    console.error('[GET /api/social/:id/edit-permission] failed:', error.message)
    res.status(500).json({ ok: false, message: 'Failed to get edit permission' })
  }
})

router.post('/:id/edit', authMiddleware, async (req, res) => {
  const userId = Number(req.user?.id || 0)
  const id = Number.parseInt(String(req.params.id || ''), 10)
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({ ok: false, code: ERROR_CODE_NOT_OWNER, message: 'Unauthorized' })
    return
  }
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ ok: false, message: 'Invalid social id' })
    return
  }

  const body = req.body || {}
  const hasTitle = hasOwn(body, 'title')
  const hasContent = hasOwn(body, 'content')
  const hasTags = hasOwn(body, 'tags')
  const hasLocation = hasOwn(body, 'location')
  const hasImages = hasOwn(body, 'images')
  const hasContact = hasOwn(body, 'contact')

  if (!hasTitle && !hasContent && !hasTags && !hasLocation && !hasImages && !hasContact) {
    res.status(400).json({ ok: false, message: 'No editable fields provided' })
    return
  }

  try {
    const row = await findCompanionForOwner(userId, id)
    if (row == null) {
      res.status(404).json({ ok: false, message: 'Social post not found' })
      return
    }

    const permission = readEditPermission(row)
    if (!permission.canEdit || permission.mode == EDIT_MODE_NONE) {
      res.status(403).json({
        ok: false,
        code: permission.reasonCode || ERROR_CODE_POST_COMPLETED_LOCKED,
        message: permission.reason || '\u8be5\u52a8\u6001\u4e0d\u53ef\u7f16\u8f91'
      })
      return
    }

    if (permission.mode == EDIT_MODE_PARTIAL && (hasTitle || hasTags || hasLocation)) {
      res.status(403).json({
        ok: false,
        code: ERROR_CODE_CORE_FIELDS_LOCKED,
        message: '\u6807\u9898/\u6807\u7b7e/\u4f4d\u7f6e\u5df2\u9501\u5b9a',
        locked_fields: permission.lockedFields
      })
      return
    }

    const sets = []
    const values = []

    if (hasTitle) {
      const title = String(body.title || '').trim()
      if (title.length < 2 || title.length > 160) {
        res.status(400).json({ ok: false, message: 'Title length must be 2-160 characters' })
        return
      }
      sets.push('title = ?')
      values.push(title)
    }

    if (hasContent) {
      const content = String(body.content || '').trim()
      if (content.length < 2 || content.length > 2000) {
        res.status(400).json({ ok: false, message: 'Content length must be 2-2000 characters' })
        return
      }
      sets.push('content = ?')
      values.push(content)
    }

    if (hasTags) {
      const tags = parseTags(body.tags)
      if (tags.length == 0) {
        res.status(400).json({ ok: false, message: 'At least one tag is required' })
        return
      }
      sets.push('tags = ?')
      values.push(tags.join(','))
    }

    if (hasLocation) {
      const location = parseLocation(body.location)
      if (location == null) {
        res.status(400).json({ ok: false, message: 'Location is required' })
        return
      }
      sets.push('location_json = ?')
      values.push(JSON.stringify(location))
    }

    if (hasImages) {
      const images = parseImages(body.images)
      sets.push('images_json = ?')
      values.push(JSON.stringify(images))
    }

    if (hasContact) {
      const contactInput = String(body.contact || '').trim()
      const contact = contactInput != '' ? contactInput : DEFAULT_CONTACT
      if (contact.length > MAX_CONTACT_LENGTH) {
        res.status(400).json({ ok: false, message: `Contact length must be <= ${MAX_CONTACT_LENGTH}` })
        return
      }
      sets.push('contact = ?')
      values.push(contact)
    }

    sets.push('edited_at = NOW()')
    sets.push('edit_count = COALESCE(edit_count, 0) + 1')
    values.push(id, userId)

    await pool.query(`UPDATE companions SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`, values)

    res.json({
      ok: true,
      message: 'Edited',
      data: {
        id,
        mode: permission.mode,
        locked_fields: permission.lockedFields
      }
    })
  } catch (error) {
    console.error('[POST /api/social/:id/edit] failed:', error.message)
    res.status(500).json({ ok: false, message: 'Failed to edit post' })
  }
})

router.post('/:id/republish', authMiddleware, async (req, res) => {
  const userId = Number(req.user?.id || 0)
  const id = Number.parseInt(String(req.params.id || ''), 10)
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({ ok: false, code: ERROR_CODE_NOT_OWNER, message: 'Unauthorized' })
    return
  }
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ ok: false, message: 'Invalid social id' })
    return
  }

  try {
    const row = await findCompanionForOwner(userId, id)
    if (row == null) {
      res.status(404).json({ ok: false, message: 'Social post not found' })
      return
    }
    if (Number(row.status ?? STATUS_ACTIVE) != STATUS_COMPLETED) {
      res.status(400).json({
        ok: false,
        code: ERROR_CODE_STATUS_NOT_COMPLETED,
        message: '\u4ec5\u5df2\u5b8c\u6210\u7684\u52a8\u6001\u53ef\u91cd\u65b0\u53d1\u5e03'
      })
      return
    }

    const [result] = await pool.query(
      `
        INSERT INTO companions (user_id, title, content, tags, location_json, images_json, contact, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [userId, row.title, row.content, row.tags, row.location_json, row.images_json, row.contact, STATUS_ACTIVE]
    )

    res.status(201).json({
      ok: true,
      id: Number(result.insertId || 0),
      message: 'Republished'
    })
  } catch (error) {
    console.error('[POST /api/social/:id/republish] failed:', error.message)
    res.status(500).json({ ok: false, message: 'Failed to republish post' })
  }
})

router.get('/my', authMiddleware, async (req, res) => {
  const userId = Number(req.user?.id || 0)
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({
      ok: false,
      message: 'Unauthorized'
    })
    return
  }

  const limit = Number.parseInt(String(req.query.limit || '100'), 10)
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 100

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
          c.status,
          UNIX_TIMESTAMP(c.created_at) AS created_at_unix,
          u.username,
          u.avatar
        FROM companions c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.user_id = ? AND c.status <> ?
        ORDER BY
          CASE
            WHEN c.status = ? THEN 0
            WHEN c.status = ? THEN 1
            ELSE 2
          END ASC,
          c.created_at DESC,
          c.id DESC
        LIMIT ?
      `,
      [userId, STATUS_DELETED, STATUS_ACTIVE, STATUS_COMPLETED, safeLimit]
    )

    res.json({
      ok: true,
      data: Array.isArray(rows) ? rows.map((item) => mapCompanionRow(item)) : []
    })
  } catch (error) {
    console.error('[GET /api/social/my] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch my social posts'
    })
  }
})

router.post('/:id/delete', authMiddleware, async (req, res) => {
  const userId = Number(req.user?.id || 0)
  const id = Number.parseInt(String(req.params.id || ''), 10)
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({
      ok: false,
      message: 'Unauthorized'
    })
    return
  }
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
        SELECT id, status
        FROM companions
        WHERE id = ? AND user_id = ?
        LIMIT 1
      `,
      [id, userId]
    )

    if (!Array.isArray(rows) || rows.length == 0 || Number(rows[0].status ?? STATUS_ACTIVE) == STATUS_DELETED) {
      res.status(404).json({
        ok: false,
        message: 'Social post not found'
      })
      return
    }

    await pool.query('UPDATE companions SET status = ? WHERE id = ? AND user_id = ?', [STATUS_DELETED, id, userId])
    res.json({
      ok: true
    })
  } catch (error) {
    console.error('[POST /api/social/:id/delete] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to delete social post'
    })
  }
})

router.post('/:id/complete', authMiddleware, async (req, res) => {
  const userId = Number(req.user?.id || 0)
  const id = Number.parseInt(String(req.params.id || ''), 10)
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(401).json({
      ok: false,
      message: 'Unauthorized'
    })
    return
  }
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
        SELECT id, status
        FROM companions
        WHERE id = ? AND user_id = ?
        LIMIT 1
      `,
      [id, userId]
    )

    if (!Array.isArray(rows) || rows.length == 0 || Number(rows[0].status ?? STATUS_ACTIVE) == STATUS_DELETED) {
      res.status(404).json({
        ok: false,
        message: 'Social post not found'
      })
      return
    }

    await pool.query('UPDATE companions SET status = ? WHERE id = ? AND user_id = ?', [STATUS_COMPLETED, id, userId])
    res.json({
      ok: true
    })
  } catch (error) {
    console.error('[POST /api/social/:id/complete] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to complete social post'
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
          c.status,
          UNIX_TIMESTAMP(c.created_at) AS created_at_unix,
          u.username,
          u.avatar
        FROM companions c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.status = ?
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT ?
      `,
      [STATUS_ACTIVE, safeLimit]
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
          c.status,
          UNIX_TIMESTAMP(c.created_at) AS created_at_unix,
          u.username,
          u.avatar
        FROM companions c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ? AND c.status <> ?
        LIMIT 1
      `,
      [id, STATUS_DELETED]
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
