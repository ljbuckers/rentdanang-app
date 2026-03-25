# RentDaNang Telegram Alerts Bot

Real-time rental listing alerts for Da Nang, Vietnam.

## Setup

1. Create a Telegram bot via @BotFather
2. Save the token: `echo -n "YOUR_TOKEN" > /root/.openclaw/secrets/rentdanang-telegram-bot-token && chmod 600 /root/.openclaw/secrets/rentdanang-telegram-bot-token`
3. Install dependencies: `npm install`
4. Run migrations: `npm run migrate`
5. Start: `pm2 start ecosystem.config.cjs`

## Commands

- `/start` — Set up alert filters (area, budget, bedrooms, property type)
- `/settings` — Change your filters
- `/status` — View current filters
- `/stop` — Disable alerts

## How It Works

- Users set their preferences via inline keyboard buttons
- Every 5 minutes, the alert worker checks for new listings
- Matching listings are sent as formatted Telegram messages
- All alerts are logged to the `notification_log` table
- Deduplication prevents sending the same listing twice
