-- Create datasets table
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
);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS "datasets_type_idx" ON "datasets" ("type");

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS "datasets_updated_at_idx" ON "datasets" ("updated_at" DESC);
