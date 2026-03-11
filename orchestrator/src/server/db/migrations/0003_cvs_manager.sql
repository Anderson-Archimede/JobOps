-- Migration: Create CVs and CV Versions tables
-- Created: 2026-03-11

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

CREATE INDEX IF NOT EXISTS "cvs_role_idx" ON "cvs"("role");
CREATE INDEX IF NOT EXISTS "cvs_user_id_idx" ON "cvs"("user_id");
CREATE INDEX IF NOT EXISTS "cvs_is_active_idx" ON "cvs"("is_active");

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

CREATE INDEX IF NOT EXISTS "cv_versions_cv_id_idx" ON "cv_versions"("cv_id");
