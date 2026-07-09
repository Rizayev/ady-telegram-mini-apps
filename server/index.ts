import { configureTelegramBot, createTelegramBot } from './bot.js'
import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const bot = createTelegramBot(config)
const app = createApp(config, bot)

function stopAfterStartupFailure(error: unknown) {
  console.error('Failed to start ADY mini app', error)
  process.exit(1)
}

const server = app.listen(config.PORT, () => {
  console.log(`ady-mini-app listening on ${config.PORT}`)

  configureTelegramBot(bot, config).catch((error: unknown) => {
    server.close(() => stopAfterStartupFailure(error))
    setTimeout(() => stopAfterStartupFailure(error), 1_000).unref()
  })
})
