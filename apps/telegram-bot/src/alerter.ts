import { Bot } from "grammy";
import pool, { SavedSearch, NewListing } from "./db.js";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SITE_URL = "https://rentdanang.app";

export function startAlerter(bot: Bot): void {
  console.log("[alerter] Starting alert worker (every 5 min)");
  checkNewListings(bot);
  setInterval(() => checkNewListings(bot), CHECK_INTERVAL_MS);
}

async function checkNewListings(bot: Bot): Promise<void> {
  try {
    // Get all active Telegram alert subscriptions
    const searchResult = await pool.query<SavedSearch>(
      `SELECT id, telegram_chat_id, filters, last_alert_listing_time
       FROM saved_searches
       WHERE alert_enabled = true
         AND telegram_chat_id IS NOT NULL`
    );

    if (searchResult.rows.length === 0) return;

    // Find the earliest last_alert_listing_time across all searches
    const earliestTime = searchResult.rows.reduce((min, s) => {
      const t = new Date(s.last_alert_listing_time).getTime();
      return t < min ? t : min;
    }, Date.now());

    // Get new listings since the earliest check time
    const listingsResult = await pool.query<NewListing>(
      `SELECT id, title_en, title, area_name, district, price_usd, 
              bedrooms, bathrooms, property_type, source_url, first_seen_at
       FROM listings
       WHERE first_seen_at > $1
         AND is_active = true
         AND is_duplicate = false
       ORDER BY first_seen_at ASC
       LIMIT 100`,
      [new Date(earliestTime).toISOString()]
    );

    if (listingsResult.rows.length === 0) return;

    console.log(
      `[alerter] ${listingsResult.rows.length} new listings, ${searchResult.rows.length} active searches`
    );

    // Match listings to searches and send alerts
    for (const search of searchResult.rows) {
      const searchTime = new Date(search.last_alert_listing_time).getTime();
      const matchingListings = listingsResult.rows.filter(
        (listing) =>
          new Date(listing.first_seen_at).getTime() > searchTime &&
          matchesFilters(listing, search.filters)
      );

      if (matchingListings.length === 0) continue;

      let latestTime = search.last_alert_listing_time;

      for (const listing of matchingListings) {
        try {
          await sendAlert(bot, search.telegram_chat_id, listing);

          // Log to notification_log
          await pool.query(
            `INSERT INTO notification_log (id, saved_search_id, listing_id, channel, status, sent_at)
             VALUES (gen_random_uuid(), $1, $2, 'telegram', 'sent', NOW())`,
            [search.id, listing.id]
          );

          // Track latest time
          if (
            new Date(listing.first_seen_at).getTime() >
            new Date(latestTime).getTime()
          ) {
            latestTime = listing.first_seen_at;
          }

          // Rate limit: 1 message per second (Telegram limits)
          await sleep(1000);
        } catch (err: unknown) {
          const errorMessage =
            err instanceof Error ? err.message : String(err);
          console.error(
            `[alerter] Failed to send alert to ${search.telegram_chat_id}:`,
            errorMessage
          );

          // Log failure
          await pool.query(
            `INSERT INTO notification_log (id, saved_search_id, listing_id, channel, status, error_message, sent_at)
             VALUES (gen_random_uuid(), $1, $2, 'telegram', 'failed', $3, NOW())`,
            [search.id, listing.id, errorMessage]
          );

          // If user blocked bot, disable their alerts
          if (
            errorMessage.includes("bot was blocked") ||
            errorMessage.includes("chat not found")
          ) {
            await pool.query(
              "UPDATE saved_searches SET alert_enabled = false WHERE id = $1",
              [search.id]
            );
            console.log(
              `[alerter] Disabled alerts for blocked chat ${search.telegram_chat_id}`
            );
            break;
          }
        }
      }

      // Update last alert time
      await pool.query(
        "UPDATE saved_searches SET last_alert_listing_time = $1 WHERE id = $2",
        [latestTime, search.id]
      );
    }
  } catch (err) {
    console.error("[alerter] Check failed:", err);
  }
}

function matchesFilters(
  listing: NewListing,
  filters: SavedSearch["filters"]
): boolean {
  // Area filter
  if (filters.areas && filters.areas.length > 0) {
    const listingArea = (listing.area_name || listing.district || "").toLowerCase();
    const matches = filters.areas.some(
      (a) => listingArea.includes(a.toLowerCase())
    );
    if (!matches) return false;
  }

  // Price filter
  if (filters.min_price_usd && listing.price_usd) {
    if (listing.price_usd < filters.min_price_usd) return false;
  }
  if (filters.max_price_usd && listing.price_usd) {
    if (listing.price_usd > filters.max_price_usd) return false;
  }

  // Bedrooms filter
  if (filters.bedrooms !== null && filters.bedrooms !== undefined) {
    if (listing.bedrooms === null) return true; // include unknowns
    if (filters.bedrooms === 0 && listing.bedrooms !== 0) return false;
    if (filters.bedrooms > 0 && listing.bedrooms < filters.bedrooms)
      return false;
  }

  // Property type filter
  if (filters.property_type) {
    if (!listing.property_type) return true; // include unknowns
    if (
      listing.property_type.toLowerCase() !==
      filters.property_type.toLowerCase()
    )
      return false;
  }

  return true;
}

async function sendAlert(
  bot: Bot,
  chatId: number,
  listing: NewListing
): Promise<void> {
  const title = listing.title_en || listing.title || "New Listing";
  const area = listing.area_name || listing.district || "Da Nang";
  const price = listing.price_usd
    ? `$${listing.price_usd}/month`
    : "Price on request";
  const beds =
    listing.bedrooms !== null
      ? listing.bedrooms === 0
        ? "Studio"
        : `${listing.bedrooms} bed`
      : "";
  const baths =
    listing.bathrooms !== null ? `, ${listing.bathrooms} bath` : "";
  const listingUrl = `${SITE_URL}/listings/${listing.id}`;

  const message = [
    "🏠 *New Listing Match!*",
    "",
    escapeMarkdown(truncate(title, 100)),
    "",
    `📍 ${escapeMarkdown(area)}, Da Nang`,
    `💰 ${escapeMarkdown(price)}`,
    beds ? `🛏 ${escapeMarkdown(beds)}${escapeMarkdown(baths)}` : "",
    "",
    `[View on RentDaNang](${listingUrl})`,
  ]
    .filter(Boolean)
    .join("\n");

  await bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" });
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.substring(0, max) + "..." : text;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
