import type { CSSProperties } from 'react'

type TelegramThemeParams = Readonly<Record<string, string | undefined>>
type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'

interface TelegramWebApp {
  readonly initData?: string
  readonly initDataUnsafe?: {
    readonly user?: {
      readonly first_name?: string
      readonly language_code?: string
    }
  }
  readonly colorScheme?: 'light' | 'dark'
  readonly version?: string
  readonly themeParams?: TelegramThemeParams
  readonly HapticFeedback?: {
    impactOccurred?: (style: HapticImpactStyle) => void
  }
  ready?: () => void
  expand?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
}

export interface TelegramShell {
  readonly isTelegram: boolean
  readonly colorScheme: 'light' | 'dark'
  readonly themeVariables: CSSProperties
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

const fallbackTheme = {
  '--tg-app-bg': '#f4f6fb',
  '--tg-surface': '#ffffff',
  '--tg-surface-elevated': '#f8fafc',
  '--tg-text': '#162033',
  '--tg-muted': '#758195',
  '--tg-accent': '#2481cc',
  '--tg-accent-text': '#ffffff',
  '--tg-separator': '#dce3ec',
} as const

type TelegramThemeVariables = Readonly<Record<keyof typeof fallbackTheme, string>>

const hexColorPattern = /^#[0-9a-f]{3,4}$|^#[0-9a-f]{6}$|^#[0-9a-f]{8}$/i

function safeColor(value: string | undefined, fallback: string): string {
  return value && hexColorPattern.test(value) ? value : fallback
}

function supportsVersion(version: string | undefined, requiredMajor: number, requiredMinor: number): boolean {
  const [major, minor] = (version ?? '').split('.').map(Number)
  return Number.isInteger(major) && Number.isInteger(minor) && (major > requiredMajor || (major === requiredMajor && minor >= requiredMinor))
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

export function telegramThemeVariables(themeParams: TelegramThemeParams = {}): TelegramThemeVariables {
  return {
    '--tg-app-bg': safeColor(themeParams.bg_color, fallbackTheme['--tg-app-bg']),
    '--tg-surface': safeColor(themeParams.section_bg_color ?? themeParams.secondary_bg_color, fallbackTheme['--tg-surface']),
    '--tg-surface-elevated': safeColor(themeParams.secondary_bg_color, fallbackTheme['--tg-surface-elevated']),
    '--tg-text': safeColor(themeParams.text_color, fallbackTheme['--tg-text']),
    '--tg-muted': safeColor(themeParams.hint_color, fallbackTheme['--tg-muted']),
    '--tg-accent': safeColor(themeParams.button_color ?? themeParams.link_color, fallbackTheme['--tg-accent']),
    '--tg-accent-text': safeColor(themeParams.button_text_color, fallbackTheme['--tg-accent-text']),
    '--tg-separator': safeColor(themeParams.section_separator_color, fallbackTheme['--tg-separator']),
  }
}

export function initializeTelegramShell(): TelegramShell {
  const webApp = getTelegramWebApp()

  if (!webApp) {
    return { isTelegram: false, colorScheme: 'light', themeVariables: telegramThemeVariables() as unknown as CSSProperties }
  }

  const themeVariables = telegramThemeVariables(webApp.themeParams)
  const appBackground = String(themeVariables['--tg-app-bg'])

  webApp.ready?.()
  webApp.expand?.()
  if (supportsVersion(webApp.version, 6, 1)) {
    webApp.setHeaderColor?.(appBackground)
    webApp.setBackgroundColor?.(appBackground)
  }

  return {
    isTelegram: Boolean(webApp.initData),
    colorScheme: webApp.colorScheme ?? 'light',
    themeVariables: themeVariables as unknown as CSSProperties,
  }
}

export function hapticImpact(style: HapticImpactStyle = 'light'): void {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred?.(style)
}
