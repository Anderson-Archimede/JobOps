/**
 * Datasets Management Page
 * Upload, preview, export, and manage data collections
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Eye,
  Filter,
  RefreshCw,
  Database,
  AlertCircle,
  Clock,
} from "lucide-react";
import Papa from "papaparse";
import type {
  Dataset,
  DatasetType,
  DatasetPreview,
  DatasetStats,
} from "@shared/types/dataset";
import { fetchApi, getApiBase } from "@/lib/apiBase";

const DATASET_TYPE_LABELS: Record<DatasetType, string> = {
  job_postings: "Job Postings",
  cv_versions: "CV Versions",
  applications: "Applications",
  custom: "Custom",
};

const DATASET_TYPE_COLORS: Record<DatasetType, string> = {
  job_postings: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  cv_versions: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  applications: "bg-green-500/10 text-green-500 border-green-500/20",
  custom: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString();
}

function isStale(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const days = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return days > 7;
}

export function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<DatasetType | "all">("all");
  const [dragActive, setDragActive] = useState(false);
  const [previewDataset, setPreviewDataset] = useState<Dataset | null>(null);
  const [previewData, setPreviewData] = useState<DatasetPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDatasets = useCallback(async () => {
    try {
      setFetchError(null);
      const res = await fetchApi("datasets");
      const data = await res.json();
      if (data.ok) {
        setDatasets(data.datasets);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erreur chargement des datasets";
      setFetchError(msg);
      console.error("Failed to fetch datasets:", error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchApi("datasets/stats");
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      setFetchError((prev) => prev ?? (error instanceof Error ? error.message : "Erreur chargement des stats"));
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchDatasets(), fetchStats()]).finally(() =>
      setLoading(false)
    );
  }, [fetchDatasets, fetchStats]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploading(true);

    const name = file.name.replace(/\.[^/.]+$/, "");
    const type: DatasetType = "custom";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("type", type);

    try {
      const res = await fetchApi("datasets/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        await Promise.all([fetchDatasets(), fetchStats()]);
      } else {
        alert(`Upload failed: ${data.error?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return;

    try {
      const res = await fetchApi(`datasets/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await Promise.all([fetchDatasets(), fetchStats()]);
      } else {
        alert("Delete failed");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed");
    }
  };

  const handlePreview = async (dataset: Dataset) => {
    setPreviewDataset(dataset);
    setPreviewLoading(true);

    try {
      const res = await fetchApi(`datasets/${dataset.id}/preview`);
      const data = await res.json();

      if (data.ok) {
        setPreviewData(data.preview);
      } else {
        alert("Preview failed");
      }
    } catch (error) {
      console.error("Preview error:", error);
      alert("Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async (dataset: Dataset, format: "csv" | "json" | "xlsx") => {
    try {
      const url = `${getApiBase()}/datasets/${dataset.id}/export?format=${format}`;
      window.open(url, "_blank");
    } catch (error) {
      console.error("Export error:", error);
      alert("Export failed");
    }
  };

  const filteredDatasets = datasets.filter(
    (d) => filterType === "all" || d.type === filterType
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading datasets...</span>
        </div>
      </div>
    );
  }

  const retryFetch = () => {
    setFetchError(null);
    setLoading(true);
    Promise.all([fetchDatasets(), fetchStats()]).finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      {fetchError && (
        <div className="max-w-7xl mx-auto mb-4 flex items-center justify-between gap-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-200">
          <span className="text-sm">{fetchError}</span>
          <button
            type="button"
            onClick={retryFetch}
            className="shrink-0 rounded bg-amber-500/20 px-3 py-1.5 text-sm font-medium hover:bg-amber-500/30"
          >
            Réessayer
          </button>
        </div>
      )}
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Datasets</h1>
            <p className="text-gray-400">
              Manage data collections for jobs, CVs, and applications
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-[#E94560] hover:bg-[#E94560]/80 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload Dataset"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Database className="w-4 h-4" />
                <span>Total Datasets</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalCount}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <FileText className="w-4 h-4" />
                <span>Total Size</span>
              </div>
              <div className="text-2xl font-bold">{formatBytes(stats.totalSize)}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Clock className="w-4 h-4" />
                <span>Recently Updated</span>
              </div>
              <div className="text-2xl font-bold">{stats.recentlyUpdated}</div>
            </div>
            <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <Filter className="w-4 h-4" />
                <span>By Type</span>
              </div>
              <div className="text-sm text-gray-400">
                Jobs: {stats.byType.job_postings} | CVs: {stats.byType.cv_versions}
              </div>
            </div>
          </div>
        )}

        {/* Upload Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-all ${
            dragActive
              ? "border-[#E94560] bg-[#E94560]/5"
              : "border-gray-800 hover:border-gray-700"
          } ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <Upload className={`w-12 h-12 ${dragActive ? "text-[#E94560]" : "text-gray-500"}`} />
            <div>
              <p className="text-lg font-medium mb-1">
                {uploading ? "Uploading..." : "Drop files here or click to upload"}
              </p>
              <p className="text-sm text-gray-400">
                Supports CSV, JSON, XLSX files (max 50MB)
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Filter by type:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 rounded-md text-sm ${
                filterType === "all"
                  ? "bg-[#E94560] text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              All ({datasets.length})
            </button>
            {(Object.keys(DATASET_TYPE_LABELS) as DatasetType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-md text-sm ${
                  filterType === type
                    ? "bg-[#E94560] text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {DATASET_TYPE_LABELS[type]} ({datasets.filter((d) => d.type === type).length})
              </button>
            ))}
          </div>
        </div>

        {/* Datasets Table */}
        {filteredDatasets.length === 0 ? (
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-12 text-center">
            <Database className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No datasets found</p>
            <p className="text-sm text-gray-500">
              Upload your first dataset to get started
            </p>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Name</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Type</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Rows</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Size</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Updated</th>
                  <th className="px-4 py-3 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDatasets.map((dataset) => (
                  <tr
                    key={dataset.id}
                    className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div>
                          <div className="font-medium">{dataset.name}</div>
                          {dataset.description && (
                            <div className="text-xs text-gray-500">{dataset.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs border ${
                          DATASET_TYPE_COLORS[dataset.type as DatasetType]
                        }`}
                      >
                        {DATASET_TYPE_LABELS[dataset.type as DatasetType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {dataset.rowCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {formatBytes(dataset.sizeBytes)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300 text-sm">
                          {formatDate(dataset.updatedAt)}
                        </span>
                        {isStale(dataset.updatedAt) && (
                          <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded text-xs">
                            Stale
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(dataset)}
                          className="p-2 hover:bg-gray-800 rounded-md transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <div className="relative group">
                          <button className="p-2 hover:bg-gray-800 rounded-md transition-colors">
                            <Download className="w-4 h-4 text-gray-400" />
                          </button>
                          <div className="hidden group-hover:block absolute right-0 mt-1 bg-[#1a1a1a] border border-gray-800 rounded-lg shadow-lg z-10 min-w-[120px]">
                            <button
                              onClick={() => handleExport(dataset, "csv")}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors"
                            >
                              Export CSV
                            </button>
                            <button
                              onClick={() => handleExport(dataset, "json")}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors"
                            >
                              Export JSON
                            </button>
                            <button
                              onClick={() => handleExport(dataset, "xlsx")}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors"
                            >
                              Export XLSX
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(dataset.id)}
                          className="p-2 hover:bg-red-500/10 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewDataset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold">{previewDataset.name}</h2>
                <p className="text-sm text-gray-400">
                  Showing first 10 of {previewDataset.rowCount} rows
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewDataset(null);
                  setPreviewData(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="overflow-auto flex-1 p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center h-64">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : previewData ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {previewData.columns.map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-gray-400 font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                        {previewData.columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-gray-300">
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <AlertCircle className="w-6 h-6 mr-2" />
                  <span>No preview available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
