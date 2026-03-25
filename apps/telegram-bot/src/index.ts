import { readFileSync } from "fs";
import { createBot } from "./bot.js";
import { startAlerter } from "./alerter.js";

// Load bot token
const TOKEN_PATH =
  process.env.BOT_TOKEN_FILE || "/root/.openclaw/secrets/rentdanang-telegram-bot-token";
let token = process.env.BOT_TOKEN || "";

if (!token) {
  try {
    token = readFileSync(TOKEN_PATH, "utf-8").trim();
  } catch {
    console.error(
      `[bot] No bot token found. Set BOT_TOKEN env var or create ${TOKEN_PATH}`
    );
    process.exit(1);
  }
}

console.log("[bot] Starting RentDaNang Alerts Bot...");

const bot = createBot(token);

// Start the alert worker
startAlerter(bot);

// Start polling for Telegram updates
bot.start({
  onStart: () => {
    console.log("[bot] Bot is running and polling for updates");
  },
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("[bot] Shutting down...");
  bot.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[bot] Shutting down...");
  bot.stop();
  process.exit(0);
});
