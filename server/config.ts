import { z } from 'zod'

const safeSecret = /^[A-Za-z0-9_-]+$/

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TZ: z.string().default('Asia/Baku'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(32).regex(safeSecret).optional(),
  TELEGRAM_WEBHOOK_SECRET_TOKEN: z.string().min(32).regex(safeSecret).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  ADMIN_REFRESH_TOKEN: z.string().min(12).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type AppConfig = z.infer<typeof envSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = envSchema.parse(env)

  if (config.NODE_ENV === 'production' && config.TELEGRAM_BOT_TOKEN) {
    if (!config.PUBLIC_BASE_URL.startsWith('https://')) {
      throw new Error('PUBLIC_BASE_URL must use HTTPS when TELEGRAM_BOT_TOKEN is set in production')
    }

    if (!config.TELEGRAM_WEBHOOK_SECRET || !config.TELEGRAM_WEBHOOK_SECRET_TOKEN) {
      throw new Error('TELEGRAM_WEBHOOK_SECRET and TELEGRAM_WEBHOOK_SECRET_TOKEN are required when TELEGRAM_BOT_TOKEN is set in production')
    }
  }

  return config
}
