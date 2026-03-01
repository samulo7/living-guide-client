const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const express = require('express')
const cors = require('cors')
const OSS = require('ali-oss')
const authRoutes = require('./src/routes/auth')
const userRoutes = require('./src/routes/user')
const cityRoutes = require('./src/routes/city')
const houseRoutes = require('./src/routes/house')
const jobRoutes = require('./src/routes/job')
const companionRoutes = require('./src/routes/companion')
const socialRoutes = require('./src/routes/social')
const { pingDb } = require('./src/config/db')
const { repairDbSchema } = require('./src/config/repairDbSchema')

function cleanEnvValue(value) {
  return String(value || '')
    .replace(/\s+#.*$/, '')
    .trim()
}

function normalizeOssRegion(value) {
  const cleaned = cleanEnvValue(value)
    .replace(/^https?:\/\//, '')
    .replace(/\.aliyuncs\.com$/, '')
  return cleaned
}

const app = express()
const PORT = Number(process.env.PORT || 3000)
const OSS_REGION = normalizeOssRegion(process.env.OSS_REGION)
const OSS_ACCESS_KEY_ID = cleanEnvValue(process.env.OSS_ACCESS_KEY_ID)
const OSS_ACCESS_KEY_SECRET = cleanEnvValue(process.env.OSS_ACCESS_KEY_SECRET)
const OSS_BUCKET = cleanEnvValue(process.env.OSS_BUCKET)
const OSS_ENDPOINT = cleanEnvValue(process.env.OSS_ENDPOINT)
const OSS_PUBLIC_BASE_URL = cleanEnvValue(process.env.OSS_PUBLIC_BASE_URL)

const ossConfigured =
  OSS_REGION != '' &&
  OSS_ACCESS_KEY_ID != '' &&
  OSS_ACCESS_KEY_SECRET != '' &&
  OSS_BUCKET != ''

const ossEndpointValue =
  OSS_ENDPOINT != ''
    ? OSS_ENDPOINT.replace(/^https?:\/\//, '')
    : `${OSS_REGION}.aliyuncs.com`
const ossPublicBaseUrlValue =
  OSS_PUBLIC_BASE_URL != ''
    ? OSS_PUBLIC_BASE_URL.replace(/\/$/, '')
    : `https://${OSS_BUCKET}.${ossEndpointValue}`

let ossInitErrorMessage = ''

if (ossConfigured) {
  const ossClientConfig = {
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET
  }
  if (OSS_ENDPOINT != '') {
    ossClientConfig.endpoint = OSS_ENDPOINT
    ossClientConfig.secure = true
  }
  try {
    app.locals.ossClient = new OSS(ossClientConfig)
    app.locals.ossBucket = OSS_BUCKET
    app.locals.ossEndpoint = ossEndpointValue
    app.locals.ossPublicBaseUrl = ossPublicBaseUrlValue
  } catch (error) {
    ossInitErrorMessage = error.message || 'OSS init failed'
    app.locals.ossClient = null
    app.locals.ossBucket = ''
    app.locals.ossEndpoint = ''
    app.locals.ossPublicBaseUrl = ''
  }
} else {
  app.locals.ossClient = null
  app.locals.ossBucket = ''
  app.locals.ossEndpoint = ''
  app.locals.ossPublicBaseUrl = ''
}

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return originalJson(body)
  }
  next()
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'server is running'
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/cities', cityRoutes)
app.use('/api/houses', houseRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/companions', companionRoutes)
app.use('/api/social/publish', (req, res, next) => {
  if (req.method == 'POST' && req.body != null && typeof req.body == 'object') {
    const contact = String(req.body.contact || '').trim()
    req.body.contact = contact != '' ? contact : '私信联系'
  }
  next()
})
app.use('/api/social', socialRoutes)

async function bootstrap() {
  try {
    await pingDb()
    console.log('[db] connected')
    await repairDbSchema()
    console.log('[db] schema checked')
  } catch (error) {
    console.error('[db] bootstrap failed:', error.message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`)
    if (app.locals.ossClient != null) {
      console.log(`[oss] enabled (${OSS_BUCKET})`)
    } else {
      const suffix = ossInitErrorMessage != '' ? ` (${ossInitErrorMessage})` : ''
      console.log(`[oss] disabled (missing/invalid OSS env config)${suffix}`)
    }
  })
}

bootstrap()

