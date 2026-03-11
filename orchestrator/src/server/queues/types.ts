/**
 * Job data types for BullMQ queues
 */

/**
 * Scraping job data
 */
export interface ScrapingJobData {
  source: string;
  searchTerms?: string[];
  location?: string;
  maxJobs?: number;
  filters?: Record<string, unknown>;
  pipelineRunId?: string;
}

/**
 * Scoring job data
 */
export interface ScoringJobData {
  jobId: string;
  forceRescore?: boolean;
}

/**
 * Tailoring job data
 */
export interface TailoringJobData {
  jobId: string;
  regenerate?: boolean;
  projectIds?: string[];
}

/**
 * Export job data
 */
export interface ExportJobData {
  jobId: string;
  format: 'pdf' | 'json';
  includeTracerLinks?: boolean;
}

/**
 * Common job result structure
 */
export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
  timestamp: string;
}

/**
 * Scraping job result
 */
export interface ScrapingJobResult extends JobResult {
  data?: {
    jobsDiscovered: number;
    jobsProcessed: number;
    source: string;
  };
}

/**
 * Scoring job result
 */
export interface ScoringJobResult extends JobResult {
  data?: {
    jobId: string;
    suitabilityScore: number;
    suitabilityReason: string;
  };
}

/**
 * Tailoring job result
 */
export interface TailoringJobResult extends JobResult {
  data?: {
    jobId: string;
    pdfPath: string;
    tailoredSummary: string;
  };
}

/**
 * Export job result
 */
export interface ExportJobResult extends JobResult {
  data?: {
    jobId: string;
    filePath: string;
    format: string;
  };
}
