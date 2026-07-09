import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { createTelegramBot } from './bot.js'
import type { AppConfig } from './config.js'

const testConfig: AppConfig = {
  NODE_ENV: 'test',
  PORT: 3000,
  TZ: 'Asia/Baku',
  PUBLIC_BASE_URL: 'https://ady.elsevar.dev',
  CORS_ORIGIN: 'https://ady.elsevar.dev',
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX: 1_000,
  ADMIN_REFRESH_TOKEN: 'test-refresh-token',
  LOG_LEVEL: 'error',
}

describe('api app', () => {
  const testApp = () => createApp(testConfig, null)

  it('serves health checks', async () => {
    const response = await request(testApp()).get('/healthz')

    expect(response.status).toBe(200)
    expect(response.body.ok).toBe(true)
  })

  it('returns schedule results', async () => {
    const response = await request(testApp())
      .get('/api/schedule')
      .query({ routeId: 'baki_pirshagi_sumqayit', from: 'Bakı', to: 'Sumqayıt', date: '2026-07-09' })

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.data.departures[0]).toMatchObject({
      trainNumber: '6601',
      departAt: '06:37',
    })
  })

  it('allows explicit schedule day type overrides', async () => {
    const response = await request(testApp())
      .get('/api/schedule')
      .query({ routeId: 'baki_pirshagi_sumqayit', from: 'Bakı', to: 'Sumqayıt', date: '2026-07-09', dayType: 'saturday_holiday' })

    expect(response.status).toBe(200)
    expect(response.body.data.dayType).toBe('saturday_holiday')
    expect(response.body.data.departures).toHaveLength(15)
    expect(response.body.data.departures[0]).toMatchObject({
      trainNumber: '6601',
      departAt: '07:05',
    })
  })

  it('returns metadata and station lists', async () => {
    const meta = await request(testApp()).get('/api/meta')
    const stations = await request(testApp()).get('/api/stations').query({ routeId: 'baki_xirdalan_sumqayit' })

    expect(meta.status).toBe(200)
    expect(meta.body.data.routes).toHaveLength(2)
    expect(stations.body.data.stations).toEqual(expect.arrayContaining(['Bakı', 'Xırdalan']))
  })

  it('rejects invalid schedule requests', async () => {
    const response = await request(testApp()).get('/api/schedule').query({ from: 'Bakı', to: 'Bakı' })
    const badDate = await request(testApp()).get('/api/schedule').query({ from: 'Bakı', to: 'Sumqayıt', date: 'oops' })
    const impossibleDate = await request(testApp()).get('/api/schedule').query({ from: 'Bakı', to: 'Sumqayıt', date: '2026-02-31' })
    const badRoute = await request(testApp())
      .get('/api/schedule')
      .query({ routeId: 'bad', from: 'Bakı', to: 'Sumqayıt', date: '2026-07-09' })
    const badDayType = await request(testApp())
      .get('/api/schedule')
      .query({ routeId: 'baki_pirshagi_sumqayit', from: 'Bakı', to: 'Sumqayıt', date: '2026-07-09', dayType: 'bad' })

    expect(response.status).toBe(400)
    expect(response.body.success).toBe(false)
    expect(badDate.status).toBe(400)
    expect(impossibleDate.status).toBe(400)
    expect(badRoute.status).toBe(400)
    expect(badDayType.status).toBe(400)
  })

  it('protects refresh endpoint', async () => {
    const unauthorized = await request(testApp()).post('/api/admin/refresh').send({})
    const authorized = await request(testApp()).post('/api/admin/refresh').set('Authorization', 'Bearer test-refresh-token').send({})

    expect(unauthorized.status).toBe(401)
    expect(authorized.status).toBe(202)
    expect(authorized.body.data.status).toBe('static_schedule_active')
  })

  it('does not enable refresh without an admin token', async () => {
    const appWithoutAdmin = createApp({ ...testConfig, ADMIN_REFRESH_TOKEN: undefined }, null)
    const response = await request(appWithoutAdmin).post('/api/admin/refresh').send({})

    expect(response.status).toBe(401)
  })

  it('rejects spoofed Telegram webhook requests before they reach bot handlers', async () => {
    const webhookConfig: AppConfig = {
      ...testConfig,
      TELEGRAM_BOT_TOKEN: '123456:ABCdefGHIjklMNOpqrSTUvwxYZ',
      TELEGRAM_WEBHOOK_SECRET: 'webhook_secret_path_123456789012',
      TELEGRAM_WEBHOOK_SECRET_TOKEN: 'webhook_header_token_123456789012',
    }
    const webhookApp = createApp(webhookConfig, createTelegramBot(webhookConfig))
    const wrongPath = await request(webhookApp).post('/api/telegram/webhook/wrong-secret').send({})
    const wrongHeader = await request(webhookApp).post('/api/telegram/webhook/webhook_secret_path_123456789012').send({})

    expect(wrongPath.status).toBe(404)
    expect(wrongHeader.status).toBe(401)
  })
})
