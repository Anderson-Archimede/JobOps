/**
 * Database Backup Service
 *
 * ⚠️ WARNING: This backup service was designed for SQLite and needs to be adapted for PostgreSQL.
 * PostgreSQL backups should use pg_dump or native Neon backup features.
 * This service is currently DISABLED for PostgreSQL.
 *
 * Manages automatic and manual backups of the database.
 */

import fs from "node:fs";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import { getDataDir } from "@server/config/dataDir";
import { createScheduler } from "@server/utils/scheduler";
import type { BackupInfo } from "@shared/types";

console.warn(
  "⚠️ [backup] SQLite backup service is disabled. Please use PostgreSQL-native backup solutions (pg_dump or Neon backups).",
);

// Disabled for PostgreSQL - keeping interfaces for compatibility
export async function createBackup(type: "auto" | "manual"): Promise<string> {
  throw new Error(
    "Backup service is not available for PostgreSQL. Use pg_dump or Neon's backup features.",
  );
}

export async function listBackups(): Promise<BackupInfo[]> {
  return [];
}

export async function deleteBackup(filename: string): Promise<void> {
  throw new Error("Backup service is not available for PostgreSQL.");
}

export async function cleanupOldBackups(): Promise<void> {
  // No-op for PostgreSQL
}

export function setBackupSettings(settings: Partial<any>): void {
  console.warn(
    "⚠️ [backup] Backup settings are not applicable for PostgreSQL.",
  );
}

export function getBackupSettings(): any {
  return {
    enabled: false,
    hour: 2,
    maxCount: 5,
  };
}

export function getNextBackupTime(): string | null {
  return null;
}

export function isBackupSchedulerRunning(): boolean {
  return false;
}

export function startBackupScheduler(): void {
  // No-op for PostgreSQL
}

export function stopBackupScheduler(): void {
  // No-op for PostgreSQL
}

const DB_FILENAME = "jobs.db"; // Legacy - not used with PostgreSQL
const AUTO_BACKUP_PREFIX = "jobs_";
const MANUAL_BACKUP_PREFIX = "jobs_manual_";
const AUTO_BACKUP_PATTERN = /^jobs_\d{4}_\d{2}_\d{2}\.db$/;
const MANUAL_BACKUP_PATTERN =
  /^jobs_manual_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}(?:_\d+)?\.db$/;
