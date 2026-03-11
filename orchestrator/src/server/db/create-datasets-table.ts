/**
 * Manual script to create datasets table
 * Run this if migration didn't work
 */

import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL required");
  process.exit(1);
}

console.log("🔧 Creating datasets table...");

const sql = neon(DATABASE_URL);

try {
  await sql`
    CREATE TABLE IF NOT EXISTS "datasets" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "type" text NOT NULL,
      "description" text,
      "row_count" integer DEFAULT 0 NOT NULL,
      "size_bytes" integer DEFAULT 0 NOT NULL,
      "file_path" text,
      "mime_type" text,
      "data" jsonb,
      "columns" jsonb,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "datasets_type_idx" ON "datasets" ("type")
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "datasets_updated_at_idx" ON "datasets" ("updated_at" DESC)
  `;

  console.log("✅ Datasets table created successfully!");
  process.exit(0);
} catch (error) {
  console.error("❌ Error creating table:", error);
  process.exit(1);
}
