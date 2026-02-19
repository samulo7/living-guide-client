require('dotenv').config()

const express = require('express')
const cors = require('cors')
const userRoutes = require('./src/routes/user')
const { pingDb } = require('./src/config/db')

const app = express()
const PORT = Number(process.env.PORT || 3000)

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'server is running'
  })
})

app.use('/api/user', userRoutes)

async function bootstrap() {
  try {
    await pingDb()
    console.log('[db] connected')
  } catch (error) {
    console.error('[db] connection failed:', error.message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`)
  })
}

bootstrap()

