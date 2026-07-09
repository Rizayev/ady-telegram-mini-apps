import { Bot, InlineKeyboard } from 'grammy'
import type { AppConfig } from './config.js'

export function createTelegramBot(config: AppConfig): Bot | null {
  if (!config.TELEGRAM_BOT_TOKEN) {
    return null
  }

  const bot = new Bot(config.TELEGRAM_BOT_TOKEN)
  const openKeyboard = new InlineKeyboard().webApp('Cədvəli aç / Открыть расписание', config.PUBLIC_BASE_URL)

  bot.command('start', async (ctx) => {
    await ctx.reply('ADY Bakı-Sumqayıt cədvəli hazırdır.', {
      reply_markup: openKeyboard,
    })
  })

  bot.command('schedule', async (ctx) => {
    await ctx.reply('Cədvəli Telegram Mini App kimi açın.', {
      reply_markup: openKeyboard,
    })
  })

  bot.command('help', async (ctx) => {
    await ctx.reply('Stansiya, tarix və xətti seçin. Eyni link webdə də işləyir.', {
      reply_markup: openKeyboard,
    })
  })

  bot.on('message', async (ctx) => {
    await ctx.reply('Cədvəli açmaq üçün düymədən istifadə edin.', {
      reply_markup: openKeyboard,
    })
  })

  return bot
}

export async function configureTelegramBot(bot: Bot | null, config: AppConfig): Promise<void> {
  if (!bot || !config.TELEGRAM_WEBHOOK_SECRET) {
    return
  }

  const webhookUrl = `${config.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/telegram/webhook/${config.TELEGRAM_WEBHOOK_SECRET}`

  await bot.api.setMyCommands([
    { command: 'start', description: 'Mini App aç' },
    { command: 'schedule', description: 'Qatar cədvəlinə bax' },
    { command: 'help', description: 'Kömək' },
  ])

  await bot.api.setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'ADY Cədvəl',
      web_app: {
        url: config.PUBLIC_BASE_URL,
      },
    },
  })

  await bot.api.setWebhook(webhookUrl, {
    allowed_updates: ['message'],
    secret_token: config.TELEGRAM_WEBHOOK_SECRET_TOKEN,
  })
}
