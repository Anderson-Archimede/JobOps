CREATE TABLE "interviews" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"scheduled_at" integer NOT NULL,
	"duration_mins" integer,
	"type" text NOT NULL,
	"outcome" text
);
--> statement-breakpoint
CREATE TABLE "job_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"job_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'partial' NOT NULL,
	"tokens_in" integer,
	"tokens_out" integer,
	"version" integer DEFAULT 1 NOT NULL,
	"replaces_message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_chat_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" text NOT NULL,
	"job_id" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"model" text,
	"provider" text,
	"error_code" text,
	"error_message" text,
	"started_at" integer NOT NULL,
	"completed_at" integer,
	"request_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_chat_threads" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'gradcracker' NOT NULL,
	"source_job_id" text,
	"job_url_direct" text,
	"date_posted" text,
	"title" text NOT NULL,
	"employer" text NOT NULL,
	"employer_url" text,
	"job_url" text NOT NULL,
	"application_link" text,
	"disciplines" text,
	"deadline" text,
	"salary" text,
	"location" text,
	"degree_required" text,
	"starting" text,
	"job_description" text,
	"job_type" text,
	"salary_source" text,
	"salary_interval" text,
	"salary_min_amount" real,
	"salary_max_amount" real,
	"salary_currency" text,
	"is_remote" boolean,
	"job_level" text,
	"job_function" text,
	"listing_type" text,
	"emails" text,
	"company_industry" text,
	"company_logo" text,
	"company_url_direct" text,
	"company_addresses" text,
	"company_num_employees" text,
	"company_revenue" text,
	"company_description" text,
	"skills" text,
	"experience_range" text,
	"company_rating" real,
	"company_reviews_count" integer,
	"vacancy_count" integer,
	"work_from_home_type" text,
	"status" text DEFAULT 'discovered' NOT NULL,
	"outcome" text,
	"closed_at" integer,
	"suitability_score" real,
	"suitability_reason" text,
	"tailored_summary" text,
	"tailored_headline" text,
	"tailored_skills" text,
	"selected_project_ids" text,
	"pdf_path" text,
	"tracer_links_enabled" boolean DEFAULT false NOT NULL,
	"sponsor_match_score" real,
	"sponsor_match_names" text,
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_job_url_unique" UNIQUE("job_url")
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"status" text DEFAULT 'running' NOT NULL,
	"jobs_discovered" integer DEFAULT 0 NOT NULL,
	"jobs_processed" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "post_application_integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"account_key" text DEFAULT 'default' NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"credentials" jsonb,
	"last_connected_at" integer,
	"last_synced_at" integer,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_application_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"account_key" text DEFAULT 'default' NOT NULL,
	"integration_id" text,
	"sync_run_id" text,
	"external_message_id" text NOT NULL,
	"external_thread_id" text,
	"from_address" text DEFAULT '' NOT NULL,
	"from_domain" text,
	"sender_name" text,
	"subject" text DEFAULT '' NOT NULL,
	"received_at" integer NOT NULL,
	"snippet" text DEFAULT '' NOT NULL,
	"classification_label" text,
	"classification_confidence" real,
	"classification_payload" jsonb,
	"relevance_llm_score" real,
	"relevance_decision" text DEFAULT 'needs_llm' NOT NULL,
	"match_confidence" integer,
	"message_type" text DEFAULT 'other' NOT NULL,
	"stage_event_payload" jsonb,
	"processing_status" text DEFAULT 'pending_user' NOT NULL,
	"matched_job_id" text,
	"decided_at" integer,
	"decided_by" text,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_application_sync_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"account_key" text DEFAULT 'default' NOT NULL,
	"integration_id" text,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" integer NOT NULL,
	"completed_at" integer,
	"messages_discovered" integer DEFAULT 0 NOT NULL,
	"messages_relevant" integer DEFAULT 0 NOT NULL,
	"messages_classified" integer DEFAULT 0 NOT NULL,
	"messages_matched" integer DEFAULT 0 NOT NULL,
	"messages_approved" integer DEFAULT 0 NOT NULL,
	"messages_denied" integer DEFAULT 0 NOT NULL,
	"messages_errored" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"title" text NOT NULL,
	"group_id" text,
	"from_stage" text,
	"to_stage" text NOT NULL,
	"occurred_at" integer NOT NULL,
	"metadata" jsonb,
	"outcome" text
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"application_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"due_date" integer,
	"is_completed" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "tracer_click_events" (
	"id" text PRIMARY KEY NOT NULL,
	"tracer_link_id" text NOT NULL,
	"clicked_at" integer NOT NULL,
	"request_id" text,
	"is_likely_bot" boolean DEFAULT false NOT NULL,
	"device_type" text DEFAULT 'unknown' NOT NULL,
	"ua_family" text DEFAULT 'unknown' NOT NULL,
	"os_family" text DEFAULT 'unknown' NOT NULL,
	"referrer_host" text,
	"ip_hash" text,
	"unique_fingerprint_hash" text
);
--> statement-breakpoint
CREATE TABLE "tracer_links" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"job_id" text NOT NULL,
	"source_path" text NOT NULL,
	"source_label" text NOT NULL,
	"destination_url" text NOT NULL,
	"destination_url_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracer_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_jobs_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_chat_messages" ADD CONSTRAINT "job_chat_messages_thread_id_job_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."job_chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_chat_messages" ADD CONSTRAINT "job_chat_messages_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_chat_runs" ADD CONSTRAINT "job_chat_runs_thread_id_job_chat_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."job_chat_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_chat_runs" ADD CONSTRAINT "job_chat_runs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_chat_threads" ADD CONSTRAINT "job_chat_threads_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_application_messages" ADD CONSTRAINT "post_application_messages_integration_id_post_application_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."post_application_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_application_messages" ADD CONSTRAINT "post_application_messages_sync_run_id_post_application_sync_runs_id_fk" FOREIGN KEY ("sync_run_id") REFERENCES "public"."post_application_sync_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_application_messages" ADD CONSTRAINT "post_application_messages_matched_job_id_jobs_id_fk" FOREIGN KEY ("matched_job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_application_sync_runs" ADD CONSTRAINT "post_application_sync_runs_integration_id_post_application_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."post_application_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_events" ADD CONSTRAINT "stage_events_application_id_jobs_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_application_id_jobs_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracer_click_events" ADD CONSTRAINT "tracer_click_events_tracer_link_id_tracer_links_id_fk" FOREIGN KEY ("tracer_link_id") REFERENCES "public"."tracer_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracer_links" ADD CONSTRAINT "tracer_links_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_job_chat_messages_thread_created" ON "job_chat_messages" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_job_chat_runs_thread_status" ON "job_chat_runs" USING btree ("thread_id","status");--> statement-breakpoint
CREATE INDEX "idx_job_chat_threads_job_updated" ON "job_chat_threads" USING btree ("job_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_post_app_integrations_provider_account_unique" ON "post_application_integrations" USING btree ("provider","account_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_post_app_messages_provider_account_external_unique" ON "post_application_messages" USING btree ("provider","account_key","external_message_id");--> statement-breakpoint
CREATE INDEX "idx_post_app_messages_provider_account_processing_status" ON "post_application_messages" USING btree ("provider","account_key","processing_status");--> statement-breakpoint
CREATE INDEX "idx_post_app_sync_runs_provider_account_started_at" ON "post_application_sync_runs" USING btree ("provider","account_key","started_at");--> statement-breakpoint
CREATE INDEX "idx_tracer_click_events_tracer_link_id" ON "tracer_click_events" USING btree ("tracer_link_id");--> statement-breakpoint
CREATE INDEX "idx_tracer_click_events_clicked_at" ON "tracer_click_events" USING btree ("clicked_at");--> statement-breakpoint
CREATE INDEX "idx_tracer_click_events_is_likely_bot" ON "tracer_click_events" USING btree ("is_likely_bot");--> statement-breakpoint
CREATE INDEX "idx_tracer_click_events_unique_fingerprint_hash" ON "tracer_click_events" USING btree ("unique_fingerprint_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tracer_links_job_source_destination_unique" ON "tracer_links" USING btree ("job_id","source_path","destination_url_hash");--> statement-breakpoint
CREATE INDEX "idx_tracer_links_job_id" ON "tracer_links" USING btree ("job_id");