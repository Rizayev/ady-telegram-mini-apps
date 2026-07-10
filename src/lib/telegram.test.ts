import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTelegramWebApp, hapticImpact, initializeTelegramShell, telegramThemeVariables } from './telegram.js'

describe('telegramThemeVariables', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete window.Telegram
  })

  it('maps Telegram light theme values to safe CSS variables', () => {
    expect(
      telegramThemeVariables({
        bg_color: '#ffffff',
        secondary_bg_color: '#f4f4f5',
        text_color: '#101828',
        hint_color: '#667085',
        link_color: '#168acd',
        button_color: '#168acd',
        button_text_color: '#ffffff',
        section_separator_color: '#d0d8df',
      }),
    ).toMatchObject({
      '--tg-app-bg': '#ffffff',
      '--tg-surface': '#f4f4f5',
      '--tg-text': '#101828',
      '--tg-muted': '#667085',
      '--tg-accent': '#168acd',
      '--tg-accent-text': '#ffffff',
      '--tg-separator': '#d0d8df',
    })
  })

  it('rejects unsafe color input and retains the fallback palette', () => {
    expect(
      telegramThemeVariables({
        bg_color: 'red; background: url(https://example.test)',
        button_color: 'not-a-color',
      }),
    ).toMatchObject({
      '--tg-app-bg': '#f4f6fb',
      '--tg-accent': '#2481cc',
    })
  })

  it('initializes supported Telegram clients with their theme and haptics', () => {
    const ready = vi.fn()
    const expand = vi.fn()
    const setHeaderColor = vi.fn()
    const setBackgroundColor = vi.fn()
    const impactOccurred = vi.fn()
    window.Telegram = {
      WebApp: {
        initData: 'verified-data',
        colorScheme: 'dark',
        version: '6.1',
        themeParams: { bg_color: '#0f172a', button_color: '#0ea5e9' },
        ready,
        expand,
        setHeaderColor,
        setBackgroundColor,
        HapticFeedback: { impactOccurred },
      },
    }

    const shell = initializeTelegramShell()
    hapticImpact('medium')

    expect(getTelegramWebApp()).toBe(window.Telegram.WebApp)
    expect(shell).toMatchObject({ isTelegram: true, colorScheme: 'dark' })
    expect(shell.themeVariables).toMatchObject({ '--tg-app-bg': '#0f172a', '--tg-accent': '#0ea5e9' })
    expect(ready).toHaveBeenCalledOnce()
    expect(expand).toHaveBeenCalledOnce()
    expect(setHeaderColor).toHaveBeenCalledWith('#0f172a')
    expect(setBackgroundColor).toHaveBeenCalledWith('#0f172a')
    expect(impactOccurred).toHaveBeenCalledWith('medium')
  })

  it('does not call unsupported color methods on old Telegram clients', () => {
    const setHeaderColor = vi.fn()
    const setBackgroundColor = vi.fn()
    window.Telegram = { WebApp: { version: '6.0', setHeaderColor, setBackgroundColor } }

    expect(initializeTelegramShell()).toMatchObject({ isTelegram: false, colorScheme: 'light' })
    expect(setHeaderColor).not.toHaveBeenCalled()
    expect(setBackgroundColor).not.toHaveBeenCalled()
  })

  it('uses the local fallback when Telegram is unavailable', () => {
    expect(initializeTelegramShell()).toMatchObject({ isTelegram: false, colorScheme: 'light' })
    expect(getTelegramWebApp()).toBeNull()
  })
})
