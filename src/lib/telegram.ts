interface TelegramWebApp {
  readonly initData?: string
  readonly initDataUnsafe?: {
    readonly user?: {
      readonly first_name?: string
      readonly language_code?: string
    }
  }
  readonly colorScheme?: 'light' | 'dark'
  readonly themeParams?: Record<string, string | undefined>
  ready?: () => void
  expand?: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  shareMessage?: (messageId: string) => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return window.Telegram?.WebApp ?? null
}

export function initializeTelegramShell(): { isTelegram: boolean; userFirstName: string | null; colorScheme: 'light' | 'dark' } {
  const webApp = getTelegramWebApp()

  if (!webApp) {
    return { isTelegram: false, userFirstName: null, colorScheme: 'light' }
  }

  webApp.ready?.()
  webApp.expand?.()
  webApp.setHeaderColor?.('#08233f')
  webApp.setBackgroundColor?.('#f4f8fb')

  return {
    isTelegram: Boolean(webApp.initData),
    userFirstName: webApp.initDataUnsafe?.user?.first_name ?? null,
    colorScheme: webApp.colorScheme ?? 'light',
  }
}
