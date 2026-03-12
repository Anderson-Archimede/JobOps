/**
 * When AUTH_ENABLED=false, ensure a guest user exists in the database
 * so that protected routes (e.g. CVs) have a valid userId to attach.
 */

import argon2 from "argon2";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "../db";

const { users } = schema;

const GUEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const GUEST_EMAIL = "guest@jobops.local";

export async function ensureGuestUser(): Promise<void> {
  if (process.env.AUTH_ENABLED !== "false") {
    return;
  }

  const guestId = process.env.GUEST_USER_ID || GUEST_USER_ID;

  try {
    // Ensure required tables exist (fallback in case migrations didn't run)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" text PRIMARY KEY NOT NULL,
        "email" text NOT NULL UNIQUE,
        "password_hash" text NOT NULL,
        "first_name" text,
        "last_name" text,
        "profile_data" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "cvs" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL REFERENCES "users"("id"),
        "name" text NOT NULL,
        "role" text,
        "version" integer NOT NULL DEFAULT 1,
        "is_active" boolean NOT NULL DEFAULT false,
        "is_deleted" boolean NOT NULL DEFAULT false,
        "file_url" text,
        "file_path" text,
        "resume_data" jsonb,
        "metadata" jsonb,
        "usage_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "cv_versions" (
        "id" text PRIMARY KEY NOT NULL,
        "cv_id" text NOT NULL REFERENCES "cvs"("id"),
        "version" integer NOT NULL,
        "changes_summary" text,
        "file_url" text,
        "file_path" text,
        "resume_data" jsonb,
        "metadata" jsonb,
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, guestId))
      .limit(1);

    if (existing.length > 0) {
      return;
    }

    const passwordHash = await argon2.hash(
      `guest-${guestId}-${Date.now()}`,
      { type: argon2.argon2id },
    );

    await db.insert(users).values({
      id: guestId,
      email: GUEST_EMAIL,
      passwordHash,
      firstName: "Guest",
      lastName: "User",
    });

    console.log(`[auth] Guest user ensured: ${guestId} (${GUEST_EMAIL})`);
  } catch (error) {
    console.error("[auth] Failed to ensure guest user:", error);
    throw error;
  }
}
