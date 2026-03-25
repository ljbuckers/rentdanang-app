import { Bot, InlineKeyboard, Context } from "grammy";
import pool from "./db.js";

// Session state for setup flow (in-memory, lightweight)
const setupState = new Map<
  number,
  {
    step: "area" | "budget" | "bedrooms" | "property_type";
    areas?: string[];
    min_price_usd?: number;
    max_price_usd?: number;
    bedrooms?: number | null;
  }
>();

export function createBot(token: string): Bot {
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Welcome to RentDaNang Alerts! 🏠\n\n" +
        "Get notified the moment a new rental listing matches your preferences.\n\n" +
        "Let's set up your filters. What area are you looking in?",
      { reply_markup: areaKeyboard() }
    );
    setupState.set(ctx.chat.id, { step: "area" });
  });

  bot.command("settings", async (ctx) => {
    await ctx.reply("Let's update your filters. What area?", {
      reply_markup: areaKeyboard(),
    });
    setupState.set(ctx.chat.id, { step: "area" });
  });

  bot.command("stop", async (ctx) => {
    await pool.query(
      "UPDATE saved_searches SET alert_enabled = false WHERE telegram_chat_id = $1",
      [ctx.chat.id]
    );
    setupState.delete(ctx.chat.id);
    await ctx.reply(
      "Alerts disabled. Use /start to re-enable anytime."
    );
  });

  bot.command("status", async (ctx) => {
    const result = await pool.query(
      "SELECT filters, alert_enabled FROM saved_searches WHERE telegram_chat_id = $1 AND alert_enabled = true ORDER BY created_at DESC LIMIT 1",
      [ctx.chat.id]
    );
    if (result.rows.length === 0) {
      await ctx.reply("No active alerts. Use /start to set up.");
      return;
    }
    const { filters, alert_enabled } = result.rows[0];
    const f = filters;
    const lines = [
      "📋 Your current filters:",
      "",
      `📍 Areas: ${f.areas?.join(", ") || "All"}`,
      `💰 Budget: ${formatBudget(f.min_price_usd, f.max_price_usd)}`,
      `🛏 Bedrooms: ${f.bedrooms === null ? "Any" : f.bedrooms === 0 ? "Studio" : `${f.bedrooms}+`}`,
      `🏠 Type: ${f.property_type || "Any"}`,
      "",
      `Status: ${alert_enabled ? "✅ Active" : "⏸ Paused"}`,
    ];
    await ctx.reply(lines.join("\n"));
  });

  // Handle callback queries from inline keyboards
  bot.on("callback_query:data", async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const data = ctx.callbackQuery.data;
    const state = setupState.get(chatId);

    if (!state) {
      await ctx.answerCallbackQuery("Session expired. Use /start to begin.");
      return;
    }

    await ctx.answerCallbackQuery();

    if (state.step === "area") {
      if (data.startsWith("area:")) {
        const area = data.replace("area:", "");
        state.areas = area === "all" ? [] : [area];
        state.step = "budget";
        await ctx.editMessageText("What's your monthly budget in USD?", {
          reply_markup: budgetKeyboard(),
        });
      }
    } else if (state.step === "budget") {
      if (data.startsWith("budget:")) {
        const budget = data.replace("budget:", "");
        const [min, max] = parseBudget(budget);
        state.min_price_usd = min;
        state.max_price_usd = max;
        state.step = "bedrooms";
        await ctx.editMessageText("How many bedrooms?", {
          reply_markup: bedroomKeyboard(),
        });
      }
    } else if (state.step === "bedrooms") {
      if (data.startsWith("bed:")) {
        const bed = data.replace("bed:", "");
        state.bedrooms = bed === "any" ? null : parseInt(bed);
        state.step = "property_type";
        await ctx.editMessageText("What type of property?", {
          reply_markup: propertyTypeKeyboard(),
        });
      }
    } else if (state.step === "property_type") {
      if (data.startsWith("type:")) {
        const ptype = data.replace("type:", "");
        const propertyType = ptype === "any" ? null : ptype;

        // Save to database
        const filters = {
          areas: state.areas,
          min_price_usd: state.min_price_usd,
          max_price_usd: state.max_price_usd,
          bedrooms: state.bedrooms,
          property_type: propertyType,
        };

        await saveSearch(chatId, filters);
        setupState.delete(chatId);

        const summary = [
          "✅ You're all set!\n",
          "Your filters:",
          `📍 ${state.areas?.length ? state.areas.join(", ") : "All areas"}`,
          `💰 ${formatBudget(state.min_price_usd, state.max_price_usd)}`,
          `🛏 ${state.bedrooms === null ? "Any" : state.bedrooms === 0 ? "Studio" : `${state.bedrooms}+ bedrooms`}`,
          `🏠 ${propertyType || "Any type"}`,
          "",
          "You'll get a message the moment a matching listing goes live.",
          "",
          "Commands:",
          "/settings — change filters",
          "/status — view current filters",
          "/stop — pause alerts",
        ];
        await ctx.editMessageText(summary.join("\n"));
      }
    }
  });

  return bot;
}

// Keyboards
function areaKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("My Khe Beach", "area:My Khe")
    .text("An Thuong", "area:An Thuong")
    .row()
    .text("Han River", "area:Han River")
    .text("Son Tra", "area:Son Tra")
    .row()
    .text("Ngu Hanh Son", "area:Ngu Hanh Son")
    .text("Hai Chau", "area:Hai Chau")
    .row()
    .text("🌍 All Areas", "area:all");
}

function budgetKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Under $300", "budget:0-300")
    .text("$300–500", "budget:300-500")
    .row()
    .text("$500–800", "budget:500-800")
    .text("$800–1200", "budget:800-1200")
    .row()
    .text("$1200+", "budget:1200-99999")
    .text("Any budget", "budget:any");
}

function bedroomKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Studio", "bed:0")
    .text("1 BR", "bed:1")
    .row()
    .text("2 BR", "bed:2")
    .text("3+ BR", "bed:3")
    .row()
    .text("Any", "bed:any");
}

function propertyTypeKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Apartment", "type:apartment")
    .text("House", "type:house")
    .row()
    .text("Villa", "type:villa")
    .text("Any type", "type:any");
}

// Helpers
function parseBudget(b: string): [number | undefined, number | undefined] {
  if (b === "any") return [undefined, undefined];
  const [min, max] = b.split("-").map(Number);
  return [min || undefined, max === 99999 ? undefined : max || undefined];
}

function formatBudget(
  min: number | undefined,
  max: number | undefined
): string {
  if (!min && !max) return "Any";
  if (!min) return `Under $${max}`;
  if (!max) return `$${min}+`;
  return `$${min}–$${max}`;
}

async function saveSearch(
  chatId: number,
  filters: Record<string, unknown>
): Promise<void> {
  // Upsert: update if exists, insert if not
  const existing = await pool.query(
    "SELECT id FROM saved_searches WHERE telegram_chat_id = $1 ORDER BY created_at DESC LIMIT 1",
    [chatId]
  );

  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE saved_searches SET filters = $1, alert_enabled = true, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(filters), existing.rows[0].id]
    );
  } else {
    await pool.query(
      `INSERT INTO saved_searches (id, user_id, name, filters, alert_enabled, alert_frequency, telegram_chat_id, last_alert_listing_time, created_at, updated_at)
       VALUES (gen_random_uuid(), NULL, 'Telegram Alert', $1, true, 'instant', $2, NOW(), NOW(), NOW())`,
      [JSON.stringify(filters), chatId]
    );
  }
}
