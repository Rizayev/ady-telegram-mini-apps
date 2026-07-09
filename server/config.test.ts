import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'

describe('loadConfig', () => {
  it('loads safe defaults for local development', () => {
    const config = loadConfig({})

    expect(config.NODE_ENV).toBe('development')
    expect(config.PUBLIC_BASE_URL).toBe('http://localhost:3000')
    expect(config.RATE_LIMIT_MAX).toBe(120)
  })

  it('requires HTTPS when a production bot is configured', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        TELEGRAM_BOT_TOKEN: '123456:test-token',
        PUBLIC_BASE_URL: 'http://ady.elsevar.dev',
      }),
    ).toThrow('PUBLIC_BASE_URL must use HTTPS')
  })

  it('requires strong webhook secrets for production bots', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        TELEGRAM_BOT_TOKEN: '123456:test-token',
        PUBLIC_BASE_URL: 'https://ady.elsevar.dev',
      }),
    ).toThrow('TELEGRAM_WEBHOOK_SECRET')

    expect(() =>
      loadConfig({
        NODE_ENV: 'production',
        TELEGRAM_BOT_TOKEN: '123456:test-token',
        PUBLIC_BASE_URL: 'https://ady.elsevar.dev',
        TELEGRAM_WEBHOOK_SECRET: 'too-short',
        TELEGRAM_WEBHOOK_SECRET_TOKEN: 'webhook_header_token_123456789012',
      }),
    ).toThrow()
  })

  it('accepts a complete production bot configuration', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      TELEGRAM_BOT_TOKEN: '123456:test-token',
      PUBLIC_BASE_URL: 'https://ady.elsevar.dev',
      TELEGRAM_WEBHOOK_SECRET: 'webhook_secret_path_123456789012',
      TELEGRAM_WEBHOOK_SECRET_TOKEN: 'webhook_header_token_123456789012',
    })

    expect(config.TELEGRAM_WEBHOOK_SECRET).toBe('webhook_secret_path_123456789012')
    expect(config.TELEGRAM_WEBHOOK_SECRET_TOKEN).toBe('webhook_header_token_123456789012')
  })
})
