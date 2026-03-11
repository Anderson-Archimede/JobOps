/**
 * Database migration script - runs Drizzle migrations for PostgreSQL.
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "❌ DATABASE_URL environment variable is required. Please set it to your Neon PostgreSQL connection string.",
  );
  process.exit(1);
}

console.log("🔧 Running database migrations...");

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

try {
  await migrate(db, { migrationsFolder: "./src/server/db/migrations" });
  console.log("🎉 Database migrations complete!");
  process.exit(0);
} catch (error) {
  console.error("❌ Migration failed:", error);
  process.exit(1);
}
