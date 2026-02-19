const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me'

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization || ''

  if (typeof authHeader != 'string' || authHeader.trim() == '') {
    res.status(401).json({
      success: false,
      message: 'Missing Authorization header'
    })
    return
  }

  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer' || token == null || token.trim() == '') {
    res.status(401).json({
      success: false,
      message: 'Invalid Authorization header format'
    })
    return
  }

  try {
    const payload = jwt.verify(token.trim(), JWT_SECRET)
    const userId = Number(payload?.id)
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      })
      return
    }

    req.user = {
      id: userId,
      phone: typeof payload?.phone == 'string' ? payload.phone : ''
    }
    next()
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token expired or invalid'
    })
  }
}

module.exports = authMiddleware
