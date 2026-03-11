/**
 * Database schema using Drizzle ORM with PostgreSQL.
 */

import {
  APPLICATION_OUTCOMES,
  APPLICATION_STAGES,
  APPLICATION_TASK_TYPES,
  INTERVIEW_OUTCOMES,
  INTERVIEW_TYPES,
  JOB_CHAT_MESSAGE_ROLES,
  JOB_CHAT_MESSAGE_STATUSES,
  JOB_CHAT_RUN_STATUSES,
  POST_APPLICATION_INTEGRATION_STATUSES,
  POST_APPLICATION_MESSAGE_TYPES,
  POST_APPLICATION_PROCESSING_STATUSES,
  POST_APPLICATION_PROVIDERS,
  POST_APPLICATION_RELEVANCE_DECISIONS,
  POST_APPLICATION_SYNC_RUN_STATUSES,
} from "@shared/types";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),

  // From crawler
  source: text("source").notNull().default("gradcracker"),
  sourceJobId: text("source_job_id"),
  jobUrlDirect: text("job_url_direct"),
  datePosted: text("date_posted"),
  title: text("title").notNull(),
  employer: text("employer").notNull(),
  employerUrl: text("employer_url"),
  jobUrl: text("job_url").notNull().unique(),
  applicationLink: text("application_link"),
  disciplines: text("disciplines"),
  deadline: text("deadline"),
  salary: text("salary"),
  location: text("location"),
  degreeRequired: text("degree_required"),
  starting: text("starting"),
  jobDescription: text("job_description"),

  // JobSpy fields (nullable for other sources)
  jobType: text("job_type"),
  salarySource: text("salary_source"),
  salaryInterval: text("salary_interval"),
  salaryMinAmount: real("salary_min_amount"),
  salaryMaxAmount: real("salary_max_amount"),
  salaryCurrency: text("salary_currency"),
  isRemote: boolean("is_remote"),
  jobLevel: text("job_level"),
  jobFunction: text("job_function"),
  listingType: text("listing_type"),
  emails: text("emails"),
  companyIndustry: text("company_industry"),
  companyLogo: text("company_logo"),
  companyUrlDirect: text("company_url_direct"),
  companyAddresses: text("company_addresses"),
  companyNumEmployees: text("company_num_employees"),
  companyRevenue: text("company_revenue"),
  companyDescription: text("company_description"),
  skills: text("skills"),
  experienceRange: text("experience_range"),
  companyRating: real("company_rating"),
  companyReviewsCount: integer("company_reviews_count"),
  vacancyCount: integer("vacancy_count"),
  workFromHomeType: text("work_from_home_type"),

  // Orchestrator enrichments
  status: text("status", {
    enum: [
      "discovered",
      "processing",
      "ready",
      "applied",
      "in_progress",
      "skipped",
      "expired",
    ],
  })
    .notNull()
    .default("discovered"),
  outcome: text("outcome", { enum: APPLICATION_OUTCOMES }),
  closedAt: integer("closed_at"),
  suitabilityScore: real("suitability_score"),
  suitabilityReason: text("suitability_reason"),
  tailoredSummary: text("tailored_summary"),
  tailoredHeadline: text("tailored_headline"),
  tailoredSkills: text("tailored_skills"),
  selectedProjectIds: text("selected_project_ids"),
  pdfPath: text("pdf_path"),
  tracerLinksEnabled: boolean("tracer_links_enabled")
    .notNull()
    .default(false),
  sponsorMatchScore: real("sponsor_match_score"),
  sponsorMatchNames: text("sponsor_match_names"),

  // Timestamps
  discoveredAt: timestamp("discovered_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const stageEvents = pgTable("stage_events", {
  id: text("id").primaryKey(),
  applicationId: text("application_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  groupId: text("group_id"),
  fromStage: text("from_stage", { enum: APPLICATION_STAGES }),
  toStage: text("to_stage", { enum: APPLICATION_STAGES }).notNull(),
  occurredAt: integer("occurred_at").notNull(),
  metadata: jsonb("metadata"),
  outcome: text("outcome", { enum: APPLICATION_OUTCOMES }),
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  applicationId: text("application_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  type: text("type", { enum: APPLICATION_TASK_TYPES }).notNull(),
  title: text("title").notNull(),
  dueDate: integer("due_date"),
  isCompleted: boolean("is_completed")
    .notNull()
    .default(false),
  notes: text("notes"),
});

export const interviews = pgTable("interviews", {
  id: text("id").primaryKey(),
  applicationId: text("application_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  scheduledAt: integer("scheduled_at").notNull(),
  durationMins: integer("duration_mins"),
  type: text("type", { enum: INTERVIEW_TYPES }).notNull(),
  outcome: text("outcome", { enum: INTERVIEW_OUTCOMES }),
});

export const pipelineRuns = pgTable("pipeline_runs", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  status: text("status", {
    enum: ["running", "completed", "failed", "cancelled"],
  })
    .notNull()
    .default("running"),
  jobsDiscovered: integer("jobs_discovered").notNull().default(0),
  jobsProcessed: integer("jobs_processed").notNull().default(0),
  errorMessage: text("error_message"),
});

export const jobChatThreads = pgTable(
  "job_chat_threads",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastMessageAt: timestamp("last_message_at"),
  },
  (table) => ({
    jobUpdatedIndex: index("idx_job_chat_threads_job_updated").on(
      table.jobId,
      table.updatedAt,
    ),
  }),
);

export const jobChatMessages = pgTable(
  "job_chat_messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => jobChatThreads.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    role: text("role", { enum: JOB_CHAT_MESSAGE_ROLES }).notNull(),
    content: text("content").notNull().default(""),
    status: text("status", { enum: JOB_CHAT_MESSAGE_STATUSES })
      .notNull()
      .default("partial"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    version: integer("version").notNull().default(1),
    replacesMessageId: text("replaces_message_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    threadCreatedIndex: index("idx_job_chat_messages_thread_created").on(
      table.threadId,
      table.createdAt,
    ),
  }),
);

export const jobChatRuns = pgTable(
  "job_chat_runs",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => jobChatThreads.id, { onDelete: "cascade" }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    status: text("status", { enum: JOB_CHAT_RUN_STATUSES })
      .notNull()
      .default("running"),
    model: text("model"),
    provider: text("provider"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    startedAt: integer("started_at").notNull(),
    completedAt: integer("completed_at"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    threadStatusIndex: index("idx_job_chat_runs_thread_status").on(
      table.threadId,
      table.status,
    ),
  }),
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const postApplicationIntegrations = pgTable(
  "post_application_integrations",
  {
    id: text("id").primaryKey(),
    provider: text("provider", { enum: POST_APPLICATION_PROVIDERS }).notNull(),
    accountKey: text("account_key").notNull().default("default"),
    displayName: text("display_name"),
    status: text("status", { enum: POST_APPLICATION_INTEGRATION_STATUSES })
      .notNull()
      .default("disconnected"),
    credentials: jsonb("credentials"),
    lastConnectedAt: integer("last_connected_at"),
    lastSyncedAt: integer("last_synced_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    providerAccountUnique: uniqueIndex(
      "idx_post_app_integrations_provider_account_unique",
    ).on(table.provider, table.accountKey),
  }),
);

export const postApplicationSyncRuns = pgTable(
  "post_application_sync_runs",
  {
    id: text("id").primaryKey(),
    provider: text("provider", { enum: POST_APPLICATION_PROVIDERS }).notNull(),
    accountKey: text("account_key").notNull().default("default"),
    integrationId: text("integration_id").references(
      () => postApplicationIntegrations.id,
      { onDelete: "set null" },
    ),
    status: text("status", { enum: POST_APPLICATION_SYNC_RUN_STATUSES })
      .notNull()
      .default("running"),
    startedAt: integer("started_at").notNull(),
    completedAt: integer("completed_at"),
    messagesDiscovered: integer("messages_discovered").notNull().default(0),
    messagesRelevant: integer("messages_relevant").notNull().default(0),
    messagesClassified: integer("messages_classified").notNull().default(0),
    messagesMatched: integer("messages_matched").notNull().default(0),
    messagesApproved: integer("messages_approved").notNull().default(0),
    messagesDenied: integer("messages_denied").notNull().default(0),
    messagesErrored: integer("messages_errored").notNull().default(0),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    providerAccountStartedAtIndex: index(
      "idx_post_app_sync_runs_provider_account_started_at",
    ).on(table.provider, table.accountKey, table.startedAt),
  }),
);

export const postApplicationMessages = pgTable(
  "post_application_messages",
  {
    id: text("id").primaryKey(),
    provider: text("provider", { enum: POST_APPLICATION_PROVIDERS }).notNull(),
    accountKey: text("account_key").notNull().default("default"),
    integrationId: text("integration_id").references(
      () => postApplicationIntegrations.id,
      { onDelete: "set null" },
    ),
    syncRunId: text("sync_run_id").references(
      () => postApplicationSyncRuns.id,
      {
        onDelete: "set null",
      },
    ),
    externalMessageId: text("external_message_id").notNull(),
    externalThreadId: text("external_thread_id"),
    fromAddress: text("from_address").notNull().default(""),
    fromDomain: text("from_domain"),
    senderName: text("sender_name"),
    subject: text("subject").notNull().default(""),
    receivedAt: integer("received_at").notNull(),
    snippet: text("snippet").notNull().default(""),
    classificationLabel: text("classification_label"),
    classificationConfidence: real("classification_confidence"),
    classificationPayload: jsonb("classification_payload"),
    relevanceLlmScore: real("relevance_llm_score"),
    relevanceDecision: text("relevance_decision", {
      enum: POST_APPLICATION_RELEVANCE_DECISIONS,
    })
      .notNull()
      .default("needs_llm"),
    matchConfidence: integer("match_confidence"),
    messageType: text("message_type", {
      enum: POST_APPLICATION_MESSAGE_TYPES,
    })
      .notNull()
      .default("other"),
    stageEventPayload: jsonb("stage_event_payload"),
    processingStatus: text("processing_status", {
      enum: POST_APPLICATION_PROCESSING_STATUSES,
    })
      .notNull()
      .default("pending_user"),
    matchedJobId: text("matched_job_id").references(() => jobs.id, {
      onDelete: "set null",
    }),
    decidedAt: integer("decided_at"),
    decidedBy: text("decided_by"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    providerAccountExternalMessageUnique: uniqueIndex(
      "idx_post_app_messages_provider_account_external_unique",
    ).on(table.provider, table.accountKey, table.externalMessageId),
    providerAccountReviewStatusIndex: index(
      "idx_post_app_messages_provider_account_processing_status",
    ).on(table.provider, table.accountKey, table.processingStatus),
  }),
);

export const tracerLinks = pgTable(
  "tracer_links",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    sourcePath: text("source_path").notNull(),
    sourceLabel: text("source_label").notNull(),
    destinationUrl: text("destination_url").notNull(),
    destinationUrlHash: text("destination_url_hash").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    jobPathDestinationUnique: uniqueIndex(
      "idx_tracer_links_job_source_destination_unique",
    ).on(table.jobId, table.sourcePath, table.destinationUrlHash),
    jobIndex: index("idx_tracer_links_job_id").on(table.jobId),
  }),
);

export const tracerClickEvents = pgTable(
  "tracer_click_events",
  {
    id: text("id").primaryKey(),
    tracerLinkId: text("tracer_link_id")
      .notNull()
      .references(() => tracerLinks.id, { onDelete: "cascade" }),
    clickedAt: integer("clicked_at").notNull(),
    requestId: text("request_id"),
    isLikelyBot: boolean("is_likely_bot")
      .notNull()
      .default(false),
    deviceType: text("device_type").notNull().default("unknown"),
    uaFamily: text("ua_family").notNull().default("unknown"),
    osFamily: text("os_family").notNull().default("unknown"),
    referrerHost: text("referrer_host"),
    ipHash: text("ip_hash"),
    uniqueFingerprintHash: text("unique_fingerprint_hash"),
  },
  (table) => ({
    tracerLinkIndex: index("idx_tracer_click_events_tracer_link_id").on(
      table.tracerLinkId,
    ),
    clickedAtIndex: index("idx_tracer_click_events_clicked_at").on(
      table.clickedAt,
    ),
    botIndex: index("idx_tracer_click_events_is_likely_bot").on(
      table.isLikelyBot,
    ),
    uniqueFingerprintIndex: index(
      "idx_tracer_click_events_unique_fingerprint_hash",
    ).on(table.uniqueFingerprintHash),
  }),
);

export type JobRow = typeof jobs.$inferSelect;
export type NewJobRow = typeof jobs.$inferInsert;
export type StageEventRow = typeof stageEvents.$inferSelect;
export type NewStageEventRow = typeof stageEvents.$inferInsert;
export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type InterviewRow = typeof interviews.$inferSelect;
export type NewInterviewRow = typeof interviews.$inferInsert;
export type PipelineRunRow = typeof pipelineRuns.$inferSelect;
export type NewPipelineRunRow = typeof pipelineRuns.$inferInsert;
export type JobChatThreadRow = typeof jobChatThreads.$inferSelect;
export type NewJobChatThreadRow = typeof jobChatThreads.$inferInsert;
export type JobChatMessageRow = typeof jobChatMessages.$inferSelect;
export type NewJobChatMessageRow = typeof jobChatMessages.$inferInsert;
export type JobChatRunRow = typeof jobChatRuns.$inferSelect;
export type NewJobChatRunRow = typeof jobChatRuns.$inferInsert;
export type SettingsRow = typeof settings.$inferSelect;
export type NewSettingsRow = typeof settings.$inferInsert;
export type PostApplicationIntegrationRow =
  typeof postApplicationIntegrations.$inferSelect;
export type NewPostApplicationIntegrationRow =
  typeof postApplicationIntegrations.$inferInsert;
export type PostApplicationSyncRunRow =
  typeof postApplicationSyncRuns.$inferSelect;
export type NewPostApplicationSyncRunRow =
  typeof postApplicationSyncRuns.$inferInsert;
export type PostApplicationMessageRow =
  typeof postApplicationMessages.$inferSelect;
export type NewPostApplicationMessageRow =
  typeof postApplicationMessages.$inferInsert;
export type TracerLinkRow = typeof tracerLinks.$inferSelect;
export type NewTracerLinkRow = typeof tracerLinks.$inferInsert;
export type TracerClickEventRow = typeof tracerClickEvents.$inferSelect;
export type NewTracerClickEventRow = typeof tracerClickEvents.$inferInsert;

// Datasets table
export const datasets = pgTable("datasets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'job_postings' | 'cv_versions' | 'applications' | 'custom'
  description: text("description"),
  rowCount: integer("row_count").notNull().default(0),
  sizeBytes: integer("size_bytes").notNull().default(0),
  filePath: text("file_path"),
  mimeType: text("mime_type"),
  data: jsonb("data"), // Store actual data for small datasets
  columns: jsonb("columns"), // Column definitions: [{ name, type, stats }]
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DatasetRow = typeof datasets.$inferSelect;
export type NewDatasetRow = typeof datasets.$inferInsert;

// Users table for authentication
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileData: jsonb("profile_data"), // Resume profile, preferences, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

// CVs table for CV management
export const cvs = pgTable("cvs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  role: text("role"), // Target role (e.g., "Software Engineer", "Data Scientist")
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(false), // Active CV for scoring
  isDeleted: boolean("is_deleted").notNull().default(false), // Soft delete
  fileUrl: text("file_url"), // URL to PDF file
  filePath: text("file_path"), // Local file path
  resumeData: jsonb("resume_data"), // RxResume JSON data
  metadata: jsonb("metadata"), // Additional metadata (skills, experience, etc.)
  usageCount: integer("usage_count").notNull().default(0), // Used in X applications
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  roleIdx: index("cvs_role_idx").on(table.role),
  userIdIdx: index("cvs_user_id_idx").on(table.userId),
  isActiveIdx: index("cvs_is_active_idx").on(table.isActive),
}));

// CV Versions table for version history
export const cvVersions = pgTable("cv_versions", {
  id: text("id").primaryKey(),
  cvId: text("cv_id").notNull().references(() => cvs.id),
  version: integer("version").notNull(),
  changesSummary: text("changes_summary"), // Summary of changes from previous version
  fileUrl: text("file_url"),
  filePath: text("file_path"),
  resumeData: jsonb("resume_data"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  cvIdIdx: index("cv_versions_cv_id_idx").on(table.cvId),
}));

export type CVRow = typeof cvs.$inferSelect;
export type NewCVRow = typeof cvs.$inferInsert;
export type CVVersionRow = typeof cvVersions.$inferSelect;
export type NewCVVersionRow = typeof cvVersions.$inferInsert;
