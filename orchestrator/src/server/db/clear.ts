/**
 * Database utility scripts for PostgreSQL.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as sqlTag } from "drizzle-orm";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required. Please set it to your Neon PostgreSQL connection string.",
  );
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

/**
 * Clear all data from the database (keeps the schema intact).
 */
export async function clearDatabase(): Promise<{
  jobsDeleted: number;
  runsDeleted: number;
}> {
  try {
    // Delete in correct order to respect foreign keys
    await db.delete(schema.stageEvents);
    await db.delete(schema.tasks);
    await db.delete(schema.interviews);
    await db.delete(schema.tracerClickEvents);
    await db.delete(schema.tracerLinks);
    await db.delete(schema.jobChatMessages);
    await db.delete(schema.jobChatRuns);
    await db.delete(schema.jobChatThreads);
    await db.delete(schema.postApplicationMessages);
    await db.delete(schema.postApplicationSyncRuns);
    await db.delete(schema.postApplicationIntegrations);

    const jobsResult = await db.delete(schema.jobs);
    const runsResult = await db.delete(schema.pipelineRuns);

    console.log(
      `🗑️ Cleared database: ${jobsResult.rowCount ?? 0} jobs, ${runsResult.rowCount ?? 0} pipeline runs`,
    );
    return {
      jobsDeleted: jobsResult.rowCount ?? 0,
      runsDeleted: runsResult.rowCount ?? 0,
    };
  } catch (error) {
    console.error("❌ Failed to clear database:", error);
    throw error;
  }
}

/**
 * Drop all tables (PostgreSQL version - use with extreme caution).
 */
export async function dropDatabase(): Promise<void> {
  try {
    console.log("⚠️ Dropping all tables...");
    await sql`DROP SCHEMA public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`GRANT ALL ON SCHEMA public TO public`;
    console.log("🗑️ All tables dropped");
  } catch (error) {
    console.error("❌ Failed to drop database:", error);
    throw error;
  }
}

// CLI execution
if (process.argv[1]?.includes("clear.ts")) {
  const arg = process.argv[2];

  if (arg === "--drop") {
    await dropDatabase();
  } else {
    await clearDatabase();
  }
}
