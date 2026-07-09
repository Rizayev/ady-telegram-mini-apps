import { configureTelegramBot, createTelegramBot } from './bot.js'
import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const bot = createTelegramBot(config)
const app = createApp(config, bot)

app.listen(config.PORT, () => {
  console.log(`ady-mini-app listening on ${config.PORT}`)
})

configureTelegramBot(bot, config).catch((error: unknown) => {
  console.error('Failed to configure Telegram bot', error)
})
