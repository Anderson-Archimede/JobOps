export interface CV {
  id: string;
  userId: string;
  name: string;
  role: string | null;
  version: number;
  isActive: boolean;
  isDeleted: boolean;
  fileUrl: string | null;
  filePath: string | null;
  resumeData: any | null;
  metadata: any | null;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CVVersion {
  id: string;
  cvId: string;
  version: number;
  changesSummary: string | null;
  fileUrl: string | null;
  filePath: string | null;
  resumeData: any | null;
  metadata: any | null;
  createdAt: Date;
}

export interface CVListItem {
  id: string;
  name: string;
  role: string | null;
  version: number;
  isActive: boolean;
  usageCount: number;
  updatedAt: Date;
  thumbnail?: string;
}

export interface CVWithVersions extends CV {
  versions: CVVersion[];
}

export interface CVUploadRequest {
  name: string;
  role?: string;
  file?: File;
  resumeData?: any;
}

export interface CVDuplicateRequest {
  newName: string;
  newRole?: string;
}

export interface CVSetActiveRequest {
  isActive: boolean;
}

export interface CVBulkDeleteRequest {
  ids: string[];
}

export interface CVStatsResponse {
  totalCVs: number;
  activeCV: CV | null;
  byRole: { role: string; count: number }[];
  recentUploads: number; // Last 7 days
}
