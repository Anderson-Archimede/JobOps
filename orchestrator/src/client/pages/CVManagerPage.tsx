import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  Star,
  Copy,
  Trash2,
  Download,
  History,
  Filter,
  CheckSquare,
  Square,
  AlertCircle,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { CV, CVVersion, CVStatsResponse } from "@shared/types/cv";

export function CVManagerPage() {
  const [cvs, setCvs] = useState<CV[]>([]);
  const [stats, setStats] = useState<CVStatsResponse | null>(null);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [versions, setVersions] = useState<CVVersion[]>([]);
  const [selectedCVs, setSelectedCVs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "7days" | "30days" | "90days">("all");

  // Fetch CVs
  const fetchCVs = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);
      if (activeFilter === "active") params.append("active", "true");

      const response = await fetch(`/api/cvs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch CVs");

      const data = await response.json();
      setCvs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, activeFilter]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/cvs/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error("Stats error:", err);
    }
  }, []);

  // Fetch versions for a CV
  const fetchVersions = useCallback(async (cvId: string) => {
    try {
      const response = await fetch(`/api/cvs/${cvId}/versions`);
      if (!response.ok) throw new Error("Failed to fetch versions");

      const data = await response.json();
      setVersions(data);
    } catch (err: any) {
      console.error("Versions error:", err);
    }
  }, []);

  useEffect(() => {
    fetchCVs();
    fetchStats();
  }, [fetchCVs, fetchStats]);

  // Handle file upload
  const handleUpload = async (file: File, name: string, role: string) => {
    try {
      setIsUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name);
      if (role) formData.append("role", role);

      const response = await fetch("/api/cvs", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      await fetchCVs();
      await fetchStats();
      setShowUploadModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle set active
  const handleSetActive = async (cvId: string) => {
    try {
      const response = await fetch(`/api/cvs/${cvId}/set-active`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to set active");

      await fetchCVs();
      await fetchStats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle duplicate
  const handleDuplicate = async (cvId: string, newName: string, newRole?: string) => {
    try {
      const response = await fetch(`/api/cvs/${cvId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName, newRole }),
      });

      if (!response.ok) throw new Error("Failed to duplicate");

      await fetchCVs();
      await fetchStats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle delete
  const handleDelete = async (cvId: string) => {
    if (!confirm("Are you sure you want to delete this CV?")) return;

    try {
      const response = await fetch(`/api/cvs/${cvId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      await fetchCVs();
      await fetchStats();
      if (selectedCV?.id === cvId) {
        setSelectedCV(null);
        setShowModal(false);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedCVs.size === 0) return;
    if (!confirm(`Delete ${selectedCVs.size} CV(s)?`)) return;

    try {
      const response = await fetch("/api/cvs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedCVs) }),
      });

      if (!response.ok) throw new Error("Failed to bulk delete");

      await fetchCVs();
      await fetchStats();
      setSelectedCVs(new Set());
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle bulk export
  const handleBulkExport = async () => {
    if (selectedCVs.size === 0) return;

    try {
      const response = await fetch("/api/cvs/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedCVs) }),
      });

      if (!response.ok) throw new Error("Failed to export CVs");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cvs-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle restore version
  const handleRestoreVersion = async (versionId: string) => {
    if (!selectedCV) return;
    
    try {
      const response = await fetch(`/api/cvs/${selectedCV.id}/restore/${versionId}`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to restore version");

      await fetchCVs();
      await fetchStats();
      if (selectedCV) {
        await fetchVersions(selectedCV.id);
        // Refresh selected CV data
        const cvResponse = await fetch(`/api/cvs/${selectedCV.id}`);
        if (cvResponse.ok) {
          const updatedCV = await cvResponse.json();
          setSelectedCV(updatedCV);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Toggle CV selection
  const toggleCVSelection = (cvId: string) => {
    const newSelected = new Set(selectedCVs);
    if (newSelected.has(cvId)) {
      newSelected.delete(cvId);
    } else {
      newSelected.add(cvId);
    }
    setSelectedCVs(newSelected);
  };

  // Select all/none
  const toggleSelectAll = () => {
    if (selectedCVs.size === filteredCVs.length) {
      setSelectedCVs(new Set());
    } else {
      setSelectedCVs(new Set(filteredCVs.map((cv) => cv.id)));
    }
  };

  // Open detail modal
  const openDetailModal = async (cv: CV) => {
    setSelectedCV(cv);
    setShowModal(true);
    await fetchVersions(cv.id);
  };

  // Filter CVs
  const filteredCVs = cvs.filter((cv) => {
    if (activeFilter === "active" && !cv.isActive) return false;
    if (activeFilter === "inactive" && cv.isActive) return false;
    if (roleFilter && cv.role !== roleFilter) return false;
    if (searchQuery && !cv.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Date filter
    if (dateFilter !== "all") {
      const cvDate = new Date(cv.updatedAt);
      const now = new Date();
      const daysAgo = {
        "7days": 7,
        "30days": 30,
        "90days": 90,
      }[dateFilter];
      
      if (daysAgo) {
        const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        if (cvDate < cutoffDate) return false;
      }
    }
    
    return true;
  });

  // Get unique roles for filter
  const uniqueRoles = Array.from(new Set(cvs.map((cv) => cv.role).filter(Boolean)));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">CV Manager</h1>
            <p className="text-gray-400 mt-1">
              Manage your CV library with versioning and role-based organization
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Upload CV
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalCVs}</p>
                  <p className="text-sm text-gray-400">Total CVs</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.activeCV ? 1 : 0}</p>
                  <p className="text-sm text-gray-400">Active CV</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <History className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.byRole.length}</p>
                  <p className="text-sm text-gray-400">Roles</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.recentUploads}</p>
                  <p className="text-sm text-gray-400">Recent (7d)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search CVs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role || ""}>
                {role}
              </option>
            ))}
          </select>

          {/* Active Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>

          {/* Bulk Actions */}
          {selectedCVs.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-gray-400">{selectedCVs.size} selected</span>
              <button
                onClick={handleBulkExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export ZIP
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => setError("")}
                className="text-xs text-red-500 hover:text-red-400 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CV Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-32 bg-gray-800 rounded mb-3" />
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredCVs.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No CVs found</p>
          <p className="text-sm text-gray-500">Upload your first CV to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCVs.map((cv) => (
            <CVCard
              key={cv.id}
              cv={cv}
              isSelected={selectedCVs.has(cv.id)}
              onSelect={() => toggleCVSelection(cv.id)}
              onSetActive={() => handleSetActive(cv.id)}
              onDuplicate={handleDuplicate}
              onDelete={() => handleDelete(cv.id)}
              onView={() => openDetailModal(cv)}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          isUploading={isUploading}
        />
      )}

      {/* Detail Modal */}
      {showModal && selectedCV && (
        <DetailModal
          cv={selectedCV}
          versions={versions}
          onClose={() => {
            setShowModal(false);
            setSelectedCV(null);
            setVersions([]);
          }}
          onDelete={() => handleDelete(selectedCV.id)}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
}

// CV Card Component
interface CVCardProps {
  cv: CV;
  isSelected: boolean;
  onSelect: () => void;
  onSetActive: () => void;
  onDuplicate: (cvId: string, newName: string, newRole?: string) => void;
  onDelete: () => void;
  onView: () => void;
}

function CVCard({ cv, isSelected, onSelect, onSetActive, onDuplicate, onDelete, onView }: CVCardProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleDuplicate = () => {
    const newName = prompt(`Duplicate "${cv.name}" as:`, `${cv.name} (Copy)`);
    if (newName) {
      onDuplicate(cv.id, newName, cv.role || undefined);
    }
  };

  return (
    <div
      className={`bg-gray-900 border ${
        cv.isActive ? "border-green-500" : isSelected ? "border-red-500" : "border-gray-800"
      } rounded-lg p-4 hover:border-gray-700 transition-colors relative group`}
    >
      {/* Selection Checkbox */}
      <button
        onClick={onSelect}
        className="absolute top-3 left-3 z-10 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
      >
        {isSelected ? (
          <CheckSquare className="w-5 h-5 text-red-500" />
        ) : (
          <Square className="w-5 h-5" />
        )}
      </button>

      {/* Active Badge */}
      {cv.isActive && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
          <Star className="w-3 h-3 text-green-500 fill-green-500" />
          <span className="text-xs text-green-500 font-medium">Active</span>
        </div>
      )}

      {/* PDF Preview/Thumbnail */}
      <div
        onClick={onView}
        className="mt-6 h-32 bg-gray-800 rounded flex items-center justify-center mb-3 cursor-pointer hover:bg-gray-750 transition-colors"
      >
        <FileText className="w-12 h-12 text-gray-600" />
      </div>

      {/* CV Info */}
      <div className="mb-3">
        <h3 className="font-semibold text-white truncate mb-1">{cv.name}</h3>
        {cv.role && (
          <p className="text-sm text-gray-400 truncate mb-1">{cv.role}</p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>v{cv.version}</span>
          <span>{formatDate(cv.updatedAt)}</span>
        </div>
        {cv.usageCount > 0 && (
          <p className="text-xs text-blue-400 mt-1">
            Used in {cv.usageCount} application{cv.usageCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!cv.isActive && (
          <button
            onClick={onSetActive}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded text-sm font-medium transition-colors"
            title="Set as active CV"
          >
            <Star className="w-3.5 h-3.5" />
            Set Active
          </button>
        )}
        <button
          onClick={handleDuplicate}
          className="flex items-center justify-center p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center p-1.5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Upload Modal Component
interface UploadModalProps {
  onClose: () => void;
  onUpload: (file: File, name: string, role: string) => Promise<void>;
  isUploading: boolean;
}

function UploadModal({ onClose, onUpload, isUploading }: UploadModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type === "application/json")) {
      setFile(droppedFile);
      if (!name) {
        setName(droppedFile.name.replace(/\.(pdf|json)$/i, ""));
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.replace(/\.(pdf|json)$/i, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name) return;

    await onUpload(file, name, role);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">Upload CV</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isUploading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed ${
              isDragging ? "border-red-500 bg-red-500/5" : "border-gray-700 hover:border-gray-600"
            } rounded-lg p-8 text-center cursor-pointer transition-colors`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            {file ? (
              <div>
                <p className="text-white font-medium mb-1">{file.name}</p>
                <p className="text-sm text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 mb-1">
                  Drop your CV here or click to browse
                </p>
                <p className="text-sm text-gray-500">PDF or JSON (RxResume) • Max 10MB</p>
              </div>
            )}
          </div>

          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              CV Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Software Engineer Resume"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Role Input */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
              Target Role
            </label>
            <input
              id="role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., Full Stack Developer"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || !name || isUploading}
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Detail Modal Component
interface DetailModalProps {
  cv: CV;
  versions: CVVersion[];
  onClose: () => void;
  onDelete: () => void;
  onRestore?: (versionId: string) => void;
}

function DetailModal({ cv, versions, onClose, onDelete, onRestore }: DetailModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "versions">("preview");

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Restore to version ${versionNumber}? This will create a new version.`)) return;
    if (onRestore) {
      await onRestore(versionId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-white">{cv.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
              {cv.role && <span>{cv.role}</span>}
              <span>•</span>
              <span>Version {cv.version}</span>
              {cv.isActive && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-green-500">
                    <Star className="w-3 h-3 fill-green-500" />
                    Active
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 px-6 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("preview")}
            className={`py-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "preview"
                ? "border-red-500 text-red-500"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab("versions")}
            className={`py-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === "versions"
                ? "border-red-500 text-red-500"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Version History ({versions.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "preview" ? (
            <div>
              {cv.fileUrl ? (
                <iframe
                  src={cv.fileUrl}
                  className="w-full h-[600px] bg-white rounded-lg"
                  title="CV Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] bg-gray-800 rounded-lg">
                  <FileText className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-gray-400">No PDF preview available</p>
                  {cv.resumeData && (
                    <p className="text-sm text-gray-500 mt-2">
                      RxResume JSON data available
                    </p>
                  )}
                </div>
              )}

              {/* Metadata */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Created</p>
                  <p className="text-white">{formatDate(cv.createdAt)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                  <p className="text-white">{formatDate(cv.updatedAt)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Usage Count</p>
                  <p className="text-white">{cv.usageCount} applications</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Current Version</p>
                  <p className="text-white">v{cv.version}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No version history available</p>
                </div>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.id}
                    className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white">Version {version.version}</h4>
                          {version.version === cv.version && (
                            <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">
                          {formatDate(version.createdAt)}
                        </p>
                        {version.changesSummary && (
                          <p className="text-sm text-gray-300">{version.changesSummary}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {version.version !== cv.version && onRestore && (
                          <button
                            onClick={() => handleRestore(version.id, version.version)}
                            className="flex items-center gap-1 px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded text-sm transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        )}
                        {version.fileUrl && (
                          <a
                            href={version.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete CV
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
