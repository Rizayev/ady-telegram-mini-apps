import compression from 'compression'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import path from 'node:path'
import { webhookCallback } from 'grammy'
import { getDayType, parseISODate, toISODate } from '../src/lib/calendar.js'
import { searchDepartures, uniqueStations } from '../src/lib/schedule.js'
import { routeOptions, sourceMetadata } from '../src/lib/scheduleData.js'
import type { RouteId } from '../src/lib/types.js'
import { createTelegramBot } from './bot.js'
import type { AppConfig } from './config.js'
import type { Bot } from 'grammy'

const routeIds = new Set<RouteId>(routeOptions.map((route) => route.id))

function envelope<T>(data: T) {
  return {
    success: true,
    data,
  }
}

function apiError(message: string, code = 'BAD_REQUEST') {
  return {
    success: false,
    error: {
      code,
      message,
    },
  }
}

export function createApp(config: AppConfig, bot: Bot | null = createTelegramBot(config)): express.Express {
  const app = express()
  const distDir = path.join(process.cwd(), 'dist')

  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(compression())
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          frameAncestors: ["'self'", 'https://web.telegram.org', 'https://*.telegram.org'],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'", 'https://telegram.org'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          upgradeInsecureRequests: config.NODE_ENV === 'production' ? [] : null,
        },
      },
    }),
  )

  app.use(
    '/api',
    rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      limit: config.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  )

  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', config.CORS_ORIGIN)
    res.setHeader('Vary', 'Origin')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Bot-Api-Secret-Token')

    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }

    next()
  })

  app.get('/healthz', (_req, res) => {
    res.json({
      ok: true,
      service: 'ady-mini-app',
      date: toISODate(new Date()),
    })
  })

  app.get('/api/meta', (_req, res) => {
    res.json(
      envelope({
        routes: routeOptions,
        source: sourceMetadata,
      }),
    )
  })

  app.get('/api/stations', (req, res) => {
    const requestedRouteId = typeof req.query.routeId === 'string' ? req.query.routeId : undefined
    const routeId = requestedRouteId && routeIds.has(requestedRouteId as RouteId) ? (requestedRouteId as RouteId) : undefined

    res.json(envelope({ stations: uniqueStations(routeId) }))
  })

  app.get('/api/schedule', (req, res) => {
    const from = typeof req.query.from === 'string' ? req.query.from : ''
    const to = typeof req.query.to === 'string' ? req.query.to : ''
    const dateValue = typeof req.query.date === 'string' ? req.query.date : toISODate(new Date())
    const routeValue = typeof req.query.routeId === 'string' ? req.query.routeId : undefined

    if (!from || !to) {
      res.status(400).json(apiError('from and to are required'))
      return
    }

    if (from === to) {
      res.status(400).json(apiError('from and to must be different'))
      return
    }

    if (routeValue && !routeIds.has(routeValue as RouteId)) {
      res.status(400).json(apiError('Unknown routeId'))
      return
    }

    try {
      const date = parseISODate(dateValue)
      const departures = searchDepartures({
        routeId: routeValue as RouteId | undefined,
        from,
        to,
        date,
      })

      res.json(
        envelope({
          date: dateValue,
          dayType: getDayType(date),
          source: sourceMetadata,
          departures,
        }),
      )
    } catch {
      res.status(400).json(apiError('date must be in YYYY-MM-DD format'))
    }
  })

  app.post('/api/admin/refresh', express.json({ limit: '8kb' }), (req, res) => {
    const token = req.header('authorization')?.replace(/^Bearer\s+/i, '')
    if (!config.ADMIN_REFRESH_TOKEN || token !== config.ADMIN_REFRESH_TOKEN) {
      res.status(401).json(apiError('Unauthorized', 'UNAUTHORIZED'))
      return
    }

    res.status(202).json(
      envelope({
        status: 'static_schedule_active',
        source: sourceMetadata,
        requestedAt: new Date().toISOString(),
      }),
    )
  })

  if (bot && config.TELEGRAM_WEBHOOK_SECRET) {
    app.post(
      '/api/telegram/webhook/:secret',
      express.json({ limit: '1mb' }),
      (req, res, next) => {
        if (req.params.secret !== config.TELEGRAM_WEBHOOK_SECRET) {
          res.sendStatus(404)
          return
        }

        const expectedToken = config.TELEGRAM_WEBHOOK_SECRET_TOKEN
        if (expectedToken && req.header('x-telegram-bot-api-secret-token') !== expectedToken) {
          res.sendStatus(401)
          return
        }

        next()
      },
      webhookCallback(bot, 'express'),
    )
  }

  app.use(express.static(distDir, { index: false, maxAge: '1h' }))

  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })

  return app
}
