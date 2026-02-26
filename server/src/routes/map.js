const http = require('http')
const https = require('https')
const express = require('express')

const router = express.Router()

function cleanEnvValue(value) {
  return String(value || '')
    .replace(/\s+#.*$/, '')
    .trim()
}

function getClientByUrl(url) {
  return url.startsWith('https://') ? https : http
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const client = getClientByUrl(url)
    const req = client.get(url, (res) => {
      let raw = ''

      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => {
        const statusCode = Number(res.statusCode || 0)
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Map provider HTTP ${statusCode}`))
          return
        }
        try {
          resolve(JSON.parse(raw))
        } catch (error) {
          reject(new Error('Map provider returned invalid JSON'))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })
    req.setTimeout(8000, () => {
      req.destroy(new Error('Map provider timeout'))
    })
  })
}

function normalizeNumber(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return null
  }
  return num
}

function normalizeText(value) {
  return String(value == null ? '' : value).trim()
}

function normalizeCity(cityValue, province) {
  if (typeof cityValue == 'string') {
    const city = cityValue.trim()
    return city != '' ? city : province
  }
  if (Array.isArray(cityValue)) {
    const first = String(cityValue[0] || '').trim()
    return first != '' ? first : province
  }
  return province
}

function parseLngLat(locationText) {
  const text = normalizeText(locationText)
  if (text == '') {
    return null
  }
  const parts = text.split(',')
  if (parts.length != 2) {
    return null
  }
  const lng = Number(parts[0])
  const lat = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }
  return { lat, lng }
}

function getAmapConfig() {
  const amapWebKey = cleanEnvValue(process.env.AMAP_WEB_KEY || process.env.AMAP_KEY || process.env.GAODE_KEY)
  if (amapWebKey == '') {
    return { ok: false, message: 'AMAP_WEB_KEY is not configured' }
  }

  const serviceHost = cleanEnvValue(process.env.AMAP_SERVICE_HOST) || 'https://restapi.amap.com'
  return {
    ok: true,
    key: amapWebKey,
    host: serviceHost.replace(/\/$/, '')
  }
}

router.get('/inputtips', async (req, res) => {
  const keyword = normalizeText(req.query?.keyword || req.query?.keywords)
  const city = normalizeText(req.query?.city)
  const pageSizeRaw = Number(req.query?.page_size || req.query?.limit || 10)
  const pageSize = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(Math.trunc(pageSizeRaw), 1), 20) : 10

  if (keyword == '') {
    res.status(400).json({
      ok: false,
      message: 'keyword is required'
    })
    return
  }

  const amapConfig = getAmapConfig()
  if (amapConfig.ok !== true) {
    res.status(503).json({
      ok: false,
      message: amapConfig.message
    })
    return
  }

  const queryParts = [
    `keywords=${encodeURIComponent(keyword)}`,
    `key=${encodeURIComponent(amapConfig.key)}`,
    'datatype=all',
    'citylimit=false'
  ]
  if (city != '') {
    queryParts.push(`city=${encodeURIComponent(city)}`)
  }
  const endpoint = `${amapConfig.host}/v3/assistant/inputtips?${queryParts.join('&')}`

  try {
    const payload = await requestJson(endpoint)
    if (String(payload?.status || '') != '1') {
      res.status(502).json({
        ok: false,
        message: String(payload?.info || 'Gaode inputtips failed')
      })
      return
    }

    const tips = Array.isArray(payload?.tips) ? payload.tips : []
    const list = tips
      .map((item) => {
        const name = normalizeText(item?.name)
        const district = normalizeText(item?.district)
        const address = normalizeText(item?.address)
        const location = parseLngLat(item?.location)
        const adcode = normalizeText(item?.adcode)
        if (name == '' || location == null) {
          return null
        }
        const displayAddress = [district, address].filter((part) => part != '').join(' ')
        return {
          title: name,
          address: displayAddress,
          adcode,
          lat: location.lat,
          lng: location.lng
        }
      })
      .filter((item) => item != null)
      .slice(0, pageSize)

    res.json({
      ok: true,
      data: list
    })
  } catch (error) {
    console.error('[GET /api/map/inputtips] failed:', error.message)
    res.status(502).json({
      ok: false,
      message: 'Gaode API request failed'
    })
  }
})

router.get('/regeo', async (req, res) => {
  const lat = normalizeNumber(req.query?.lat || req.query?.latitude)
  const lng = normalizeNumber(req.query?.lng || req.query?.longitude)

  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({
      ok: false,
      message: 'Invalid lat/lng'
    })
    return
  }

  const amapConfig = getAmapConfig()
  if (amapConfig.ok !== true) {
    res.status(503).json({
      ok: false,
      message: amapConfig.message
    })
    return
  }

  const endpoint = `${amapConfig.host}/v3/geocode/regeo?location=${encodeURIComponent(
    `${lng},${lat}`
  )}&key=${encodeURIComponent(amapConfig.key)}&extensions=all`

  try {
    const payload = await requestJson(endpoint)
    const status = String(payload?.status || '')
    if (status != '1') {
      res.status(502).json({
        ok: false,
        message: String(payload?.info || 'Gaode regeo failed')
      })
      return
    }

    const regeo = payload?.regeocode || {}
    const addressComponent = regeo?.addressComponent || {}
    const province = normalizeText(addressComponent?.province)
    const city = normalizeCity(addressComponent?.city, province)
    const district = normalizeText(addressComponent?.district)
    const township = normalizeText(addressComponent?.township)
    const formattedAddress = normalizeText(regeo?.formatted_address)
    const composedAddress = [province, city, district, township].filter((item) => item != '').join('')
    const finalAddress = formattedAddress != '' ? formattedAddress : composedAddress

    if (finalAddress == '') {
      res.status(422).json({
        ok: false,
        message: 'Gaode returned empty address for this coordinate',
        data: {
          lat,
          lng,
          info: normalizeText(payload?.info),
          infocode: normalizeText(payload?.infocode)
        }
      })
      return
    }

    res.json({
      ok: true,
      data: {
        formatted_address: finalAddress,
        province,
        city,
        district,
        township,
        adcode: normalizeText(addressComponent?.adcode),
        citycode: normalizeText(addressComponent?.citycode)
      }
    })
  } catch (error) {
    console.error('[GET /api/map/regeo] failed:', error.message)
    res.status(502).json({
      ok: false,
      message: 'Gaode API request failed'
    })
  }
})

module.exports = router
