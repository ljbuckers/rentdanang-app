import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pool from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const migrationFile = join(
    __dirname,
    "..",
    "db",
    "migrations",
    "001_add_telegram_columns.sql"
  );
  const sql = readFileSync(migrationFile, "utf-8");

  console.log("[migrate] Running migration: 001_add_telegram_columns.sql");
  await pool.query(sql);
  console.log("[migrate] Done.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("[migrate] Failed:", err);
  process.exit(1);
});
