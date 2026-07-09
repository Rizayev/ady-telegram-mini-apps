import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TZ: z.string().default('Asia/Baku'),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  TELEGRAM_BOT_USERNAME: z.string().min(1).optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(12).optional(),
  TELEGRAM_WEBHOOK_SECRET_TOKEN: z.string().min(12).optional(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  ADMIN_REFRESH_TOKEN: z.string().min(12).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type AppConfig = z.infer<typeof envSchema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = envSchema.parse(env)

  if (config.NODE_ENV === 'production' && config.TELEGRAM_BOT_TOKEN && !config.TELEGRAM_WEBHOOK_SECRET) {
    throw new Error('TELEGRAM_WEBHOOK_SECRET is required when TELEGRAM_BOT_TOKEN is set in production')
  }

  return config
}
