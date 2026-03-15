/**
 * Application Autopilot types for semi-automated job applications.
 */

export type AutopilotStatus =
  | "queued"
  | "preparing"
  | "pending_review"
  | "approved"
  | "submitting"
  | "submitted"
  | "failed"
  | "rejected";

export type FormComplexity = "simple" | "medium" | "complex";

export interface AutopilotJob {
  id: string;
  jobId: string;
  jobTitle: string;
  employer: string;
  jobUrl: string;
  applicationLink?: string;
  psoScore: number;
  selectedCVId?: string;
  selectedCVName?: string;
  coverLetter?: string;
  status: AutopilotStatus;
  formComplexity?: FormComplexity;
  estimatedTime?: string;
  errorMessage?: string;
  preparedAt?: string;
  approvedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutopilotQueueItem {
  jobId: string;
  jobTitle: string;
  employer: string;
  jobUrl: string;
  applicationLink?: string;
  psoScore: number;
  location?: string;
  salary?: string;
  deadline?: string;
  canAutopilot: boolean;
  reason?: string;
}

export interface AutopilotPrepareResult {
  autopilotJob: AutopilotJob;
  cvPreview: {
    id: string;
    name: string;
    role?: string;
    tailoredSummary?: string;
  };
  coverLetterPreview: string;
  formAnalysis: {
    complexity: FormComplexity;
    estimatedTime: string;
    fields: Array<{
      name: string;
      type: "text" | "email" | "file" | "textarea" | "select" | "radio" | "checkbox";
      required: boolean;
    }>;
    warnings?: string[];
  };
}

export interface AutopilotSubmitResult {
  success: boolean;
  submittedAt: string;
  confirmationMessage?: string;
  errorMessage?: string;
}

export interface AutopilotHistoryItem {
  id: string;
  jobId: string;
  jobTitle: string;
  employer: string;
  status: AutopilotStatus;
  psoScore: number;
  selectedCVName?: string;
  formComplexity?: FormComplexity;
  preparedAt?: string;
  submittedAt?: string;
  errorMessage?: string;
}

export interface AutopilotStats {
  totalQueued: number;
  totalPendingReview: number;
  totalSubmitted: number;
  totalFailed: number;
  avgPsoScore: number;
  successRate: number;
}
