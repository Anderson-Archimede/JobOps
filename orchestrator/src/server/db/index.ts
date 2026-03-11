/**
 * Database connection and initialization for PostgreSQL.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Database connection - requires DATABASE_URL environment variable
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required. Please set it to your Neon PostgreSQL connection string.",
  );
}

const sql = neon(DATABASE_URL);

export const db = drizzle(sql, { schema });

export { schema };

export function closeDb() {
  // Neon HTTP client doesn't require explicit closing
  console.log("Database connection closed");
}
