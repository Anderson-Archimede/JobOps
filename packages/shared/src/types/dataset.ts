/**
 * Dataset types for JobOps
 */

export type DatasetType = 'job_postings' | 'cv_versions' | 'applications' | 'custom';

export type DatasetColumnType = 'string' | 'number' | 'boolean' | 'date' | 'json';

export interface DatasetColumn {
  name: string;
  type: DatasetColumnType;
  stats?: {
    min?: number;
    max?: number;
    avg?: number;
    unique?: number;
    nullCount?: number;
    distribution?: { value: string | number; count: number }[];
  };
}

export interface Dataset {
  id: string;
  name: string;
  type: DatasetType;
  description?: string;
  rowCount: number;
  sizeBytes: number;
  filePath?: string;
  mimeType?: string;
  columns?: DatasetColumn[];
  createdAt: string;
  updatedAt: string;
}

export interface DatasetPreview {
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export interface DatasetImportRequest {
  name: string;
  type: DatasetType;
  description?: string;
}

export interface DatasetExportRequest {
  format: 'csv' | 'json' | 'xlsx';
  columns?: string[];
}

export interface DatasetStats {
  totalCount: number;
  byType: Record<DatasetType, number>;
  totalSize: number;
  recentlyUpdated: number; // Count of datasets updated in last 7 days
}
