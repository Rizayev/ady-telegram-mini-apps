import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectLanguage } from './i18n.js'

describe('detectLanguage', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
    vi.restoreAllMocks()
  })

  it('honors a supported language in the URL', () => {
    window.history.replaceState(null, '', '/?lang=ru')
    expect(detectLanguage()).toBe('ru')
  })

  it('falls back to the browser locale when no language was requested', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-GB' })
    expect(detectLanguage()).toBe('en')

    Object.defineProperty(navigator, 'language', { configurable: true, value: 'az-AZ' })
    expect(detectLanguage()).toBe('az')
  })
})
