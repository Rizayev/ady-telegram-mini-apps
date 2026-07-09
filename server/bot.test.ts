import type { Bot } from 'grammy'
import { describe, expect, it, vi } from 'vitest'
import { configureTelegramBot, createTelegramBot } from './bot.js'
import type { AppConfig } from './config.js'

const botConfig: AppConfig = {
  NODE_ENV: 'production',
  PORT: 3000,
  TZ: 'Asia/Baku',
  PUBLIC_BASE_URL: 'https://ady.elsevar.dev',
  TELEGRAM_BOT_TOKEN: '123456:test-token',
  TELEGRAM_WEBHOOK_SECRET: 'webhook_secret_path_123456789012',
  TELEGRAM_WEBHOOK_SECRET_TOKEN: 'webhook_header_token_123456789012',
  CORS_ORIGIN: 'https://ady.elsevar.dev',
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX: 120,
  LOG_LEVEL: 'error',
}

describe('telegram bot', () => {
  it('does not create a bot without a token', () => {
    expect(createTelegramBot({ ...botConfig, TELEGRAM_BOT_TOKEN: undefined })).toBeNull()
  })

  it('configures commands, menu button, and authenticated webhook', async () => {
    const api = {
      setMyCommands: vi.fn().mockResolvedValue(true),
      setChatMenuButton: vi.fn().mockResolvedValue(true),
      setWebhook: vi.fn().mockResolvedValue(true),
    }
    const bot = { api } as unknown as Bot

    await configureTelegramBot(bot, botConfig)

    expect(api.setMyCommands).toHaveBeenCalledWith([
      { command: 'start', description: 'Mini App aç' },
      { command: 'schedule', description: 'Qatar cədvəlinə bax' },
      { command: 'help', description: 'Kömək' },
    ])
    expect(api.setChatMenuButton).toHaveBeenCalledWith({
      menu_button: {
        type: 'web_app',
        text: 'ADY Cədvəl',
        web_app: {
          url: 'https://ady.elsevar.dev',
        },
      },
    })
    expect(api.setWebhook).toHaveBeenCalledWith('https://ady.elsevar.dev/api/telegram/webhook/webhook_secret_path_123456789012', {
      allowed_updates: ['message'],
      secret_token: 'webhook_header_token_123456789012',
    })
  })
})
