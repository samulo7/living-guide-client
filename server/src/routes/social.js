const express = require('express')
const { pool } = require('../config/db')
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router()

function normalizeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function toBeijingDateTimeString(date) {
  const beijingOffsetMs = 8 * 60 * 60 * 1000
  const beijingDate = new Date(date.getTime() + beijingOffsetMs)
  const y = String(beijingDate.getUTCFullYear())
  const m = String(beijingDate.getUTCMonth() + 1).padStart(2, '0')
  const d = String(beijingDate.getUTCDate()).padStart(2, '0')
  const hh = String(beijingDate.getUTCHours()).padStart(2, '0')
  const mm = String(beijingDate.getUTCMinutes()).padStart(2, '0')
  const ss = String(beijingDate.getUTCSeconds()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
}

function normalizeDateTime(value) {
  if (value == null) {
    return ''
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return ''
    }
    return toBeijingDateTimeString(value)
  }

  const text = String(value).trim()
  if (text == '') {
    return ''
  }

  const localDatetimePattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
  if (localDatetimePattern.test(text)) {
    return text
  }

  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) {
    return text
  }

  return toBeijingDateTimeString(parsed)
}

function isPersistedImageRef(value) {
  const text = String(value || '').trim().toLowerCase()
  if (text == '') {
    return false
  }
  if (
    text.startsWith('blob:') ||
    text.startsWith('file:') ||
    text.startsWith('wxfile:') ||
    text.startsWith('data:')
  ) {
    return false
  }
  return text.startsWith('http://') || text.startsWith('https://') || text.startsWith('/')
}

function parseTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags
      .map((item) => normalizeText(item, 30))
      .filter((item) => item != '')
      .slice(0, 8)
  }
  return String(rawTags || '')
    .split(/[,\uff0c\u3001|]/)
    .map((item) => normalizeText(item, 30))
    .filter((item) => item != '')
    .slice(0, 8)
}

function parseImages(rawImages) {
  let list = []
  if (Array.isArray(rawImages)) {
    list = rawImages
  } else if (typeof rawImages == 'string') {
    const text = rawImages.trim()
    if (text != '') {
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) {
          list = parsed
        } else {
          list = text.split(/[,\uff0c|]/)
        }
      } catch (error) {
        list = text.split(/[,\uff0c|]/)
      }
    }
  }

  return list
    .map((item) => normalizeText(item, 500))
    .filter((item) => item != '')
    .filter((item) => isPersistedImageRef(item))
    .slice(0, 3)
}

function parseImagesFromRow(rawImages) {
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
        .filter((item) => isPersistedImageRef(item))
        .slice(0, 3)
    }
  } catch (error) {
    // ignore JSON parse error and fallback to delimiter split
  }

  return text
    .split(/[,\uff0c|]/)
    .map((item) => normalizeText(item, 500))
    .filter((item) => item != '')
    .filter((item) => isPersistedImageRef(item))
    .slice(0, 3)
}

function mapSocialRow(row) {
  const tagsText = normalizeText(row?.tags, 255)
  return {
    id: Number(row?.id || 0),
    user_id: Number(row?.user_id || 0),
    username: normalizeText(row?.username, 100) || `user_${Number(row?.user_id || 0)}`,
    avatar: normalizeText(row?.avatar, 500),
    tagline: normalizeText(row?.tagline, 255),
    city_name: normalizeText(row?.city_name, 120),
    location_name: normalizeText(row?.location_name, 200),
    title: normalizeText(row?.title, 160),
    content: String(row?.content || '').trim(),
    tags: tagsText == '' ? [] : tagsText.split(',').map((item) => item.trim()).filter((item) => item != ''),
    images: parseImagesFromRow(row?.images),
    contact: normalizeText(row?.contact, 120),
    created_at: normalizeDateTime(row?.created_at),
    updated_at: normalizeDateTime(row?.updated_at)
  }
}

const SOCIAL_BASE_SELECT = `
  SELECT
    c.id,
    c.user_id,
    c.nickname,
    c.avatar AS companion_avatar,
    c.city_name,
    c.location_name,
    c.title,
    c.content,
    c.tags,
    c.images,
    c.contact,
    c.created_at,
    c.updated_at,
    CASE
      WHEN u.id IS NULL THEN COALESCE(NULLIF(c.nickname, ''), CONCAT('user_', c.user_id))
      ELSE COALESCE(NULLIF(u.username, ''), CONCAT('user_', c.user_id))
    END AS username,
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
`

router.get('/list', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        ${SOCIAL_BASE_SELECT}
        ORDER BY c.created_at DESC, c.id DESC
      `
    )

    res.json({
      ok: true,
      data: Array.isArray(rows) ? rows.map((row) => mapSocialRow(row)) : []
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
  const id = Number.parseInt(String(req.params?.id || ''), 10)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      ok: false,
      message: 'Invalid post id'
    })
    return
  }

  try {
    const [rows] = await pool.query(
      `
        ${SOCIAL_BASE_SELECT}
        WHERE c.id = ?
        LIMIT 1
      `,
      [id]
    )

    if (!Array.isArray(rows) || rows.length == 0) {
      res.status(404).json({
        ok: false,
        message: 'Post not found'
      })
      return
    }

    res.json({
      ok: true,
      data: mapSocialRow(rows[0])
    })
  } catch (error) {
    console.error('[GET /api/social/detail/:id] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch social detail'
    })
  }
})

router.get('/user/:id', async (req, res) => {
  const id = Number.parseInt(String(req.params?.id || ''), 10)
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({
      ok: false,
      message: 'Invalid user id'
    })
    return
  }

  try {
    const [userRows] = await pool.query(
      `
        SELECT id, username, avatar, tagline
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [id]
    )

    if (!Array.isArray(userRows) || userRows.length == 0) {
      res.status(404).json({
        ok: false,
        message: 'User not found'
      })
      return
    }

    const [postRows] = await pool.query(
      `
        SELECT
          c.id,
          c.title,
          c.location_name,
          c.images,
          c.contact,
          c.created_at,
          CASE
            WHEN u.id IS NULL THEN COALESCE(NULLIF(c.nickname, ''), CONCAT('user_', c.user_id))
            ELSE COALESCE(NULLIF(u.username, ''), CONCAT('user_', c.user_id))
          END AS username,
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
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT 50
      `,
      [id]
    )

    const user = userRows[0] || {}
    const posts = Array.isArray(postRows)
      ? postRows.map((row) => ({
          id: Number(row?.id || 0),
          title: normalizeText(row?.title, 160),
          location_name: normalizeText(row?.location_name, 200),
          images: parseImagesFromRow(row?.images),
          contact: normalizeText(row?.contact, 120),
          username: normalizeText(row?.username, 100),
          avatar: normalizeText(row?.avatar, 500),
          tagline: normalizeText(row?.tagline, 255),
          created_at: normalizeDateTime(row?.created_at)
        }))
      : []

    res.json({
      ok: true,
      data: {
        user: {
          id: Number(user?.id || 0),
          username: normalizeText(user?.username, 100) || `user_${id}`,
          avatar: normalizeText(user?.avatar, 500),
          tagline: normalizeText(user?.tagline, 255)
        },
        posts
      }
    })
  } catch (error) {
    console.error('[GET /api/social/user/:id] failed:', error.message)
    res.status(500).json({
      ok: false,
      message: 'Failed to fetch user profile'
    })
  }
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

  const title = normalizeText(req.body?.title, 160)
  const content = String(req.body?.content || '').trim().slice(0, 2000)
  const tags = parseTags(req.body?.tags)
  const locationName = normalizeText(req.body?.location_name, 200)
  const images = parseImages(req.body?.images)
  const contactInput = normalizeText(req.body?.contact, 120)

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

  if (locationName == '') {
    res.status(400).json({
      success: false,
      message: 'location_name is required'
    })
    return
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT username, nickname, avatar, phone
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId]
    )

    if (!Array.isArray(rows) || rows.length == 0) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      })
      return
    }

    const user = rows[0] || {}
    const nickname = normalizeText(user.nickname || user.username || `user_${userId}`, 80)
    const avatar = normalizeText(user.avatar, 500)
    const contact = contactInput != '' ? contactInput : normalizeText(user.phone, 120)
    const tagsText = tags.join(',')
    const imagesText = JSON.stringify(images)

    const [insertResult] = await pool.query(
      `
        INSERT INTO companions (
          user_id,
          nickname,
          avatar,
          city_name,
          location_name,
          title,
          content,
          tags,
          images,
          contact
        )
        VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?)
      `,
      [userId, nickname, avatar, locationName, title, content, tagsText, imagesText, contact]
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

module.exports = router
