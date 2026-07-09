# ADY Telegram Mini App

Telegram Mini App and web app for the Baku-Sumgayit commuter train schedule.

Features:

- Fast route search for the Pirshagi and Xirdalan commuter lines.
- Ready-made and custom favorite directions stored locally in the browser.
- Telegram bot commands, chat menu button, and authenticated webhook support.

## Local

```bash
npm install
npm test
npm run build
PORT=3000 PUBLIC_BASE_URL=http://localhost:3000 npm start
```

## Coolify

Use the Dockerfile deployment type and set these runtime environment variables in Coolify:

- `PUBLIC_BASE_URL=https://ady.elsevar.dev`
- `CORS_ORIGIN=https://ady.elsevar.dev`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- `ADMIN_REFRESH_TOKEN`
- `TZ=Asia/Baku`
- `PORT=3000`

Health check path: `/healthz`.

The bot configures commands, the chat menu button, and the webhook on server boot when the Telegram env variables are present.

Schedule source metadata points to the official ADY schedule page: `https://ticket.ady.az/az/yeni-hereket-cedveli`.
