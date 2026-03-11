/**
 * Logs Page
 * Terminal-like interface for viewing and filtering application logs
 */

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Download,
  Filter,
  Loader2,
  Play,
  Pause,
  Search,
  XCircle,
  ChevronDown,
} from "lucide-react";
import type { LogEntry, LogLevel, LogsQuery } from "@shared/types/monitoring";

const API_BASE = "/api";

const LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "debug"];

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: "text-red-500",
  warn: "text-orange-500",
  info: "text-blue-500",
  debug: "text-gray-500",
};

const LEVEL_BG: Record<LogLevel, string> = {
  error: "bg-red-500/10 border-red-500/20",
  warn: "bg-orange-500/10 border-orange-500/20",
  info: "bg-blue-500/10 border-blue-500/20",
  debug: "bg-gray-500/10 border-gray-500/20",
};

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [services, setServices] = useState<string[]>([]);
  const [filters, setFilters] = useState<LogsQuery>({
    level: undefined,
    service: undefined,
    search: "",
    limit: 100,
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.level) params.append("level", filters.level);
      if (filters.service) params.append("service", filters.service);
      if (filters.search) params.append("search", filters.search);
      if (filters.limit) params.append("limit", filters.limit.toString());

      const res = await fetch(`${API_BASE}/logs?${params}`);
      const data = await res.json();
      if (data.ok) {
        setLogs(data.data.logs);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/logs/services`);
      const data = await res.json();
      if (data.ok) {
        setServices(data.data.services);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchLogs();
  }, [fetchServices, fetchLogs]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleExport = async (format: "json" | "csv") => {
    const params = new URLSearchParams();
    if (filters.level) params.append("level", filters.level);
    if (filters.service) params.append("service", filters.service);
    if (filters.search) params.append("search", filters.search);
    params.append("format", format);

    window.open(`${API_BASE}/logs/export?${params}`, "_blank");
  };

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading logs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Application Logs</h1>
            <p className="text-gray-400">
              View and filter structured application logs
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                autoScroll
                  ? "bg-[#E94560] text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {autoScroll ? (
                <>
                  <Play className="w-4 h-4" />
                  <span>Auto-scroll</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Paused</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleExport("json")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Level Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Level</label>
              <select
                value={filters.level || ""}
                onChange={(e) =>
                  setFilters({ ...filters, level: (e.target.value as LogLevel) || undefined })
                }
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white"
              >
                <option value="">All levels</option>
                {LOG_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Service</label>
              <select
                value={filters.service || ""}
                onChange={(e) =>
                  setFilters({ ...filters, service: e.target.value || undefined })
                }
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white"
              >
                <option value="">All services</option>
                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={filters.search || ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search in messages..."
                  className="w-full pl-10 pr-10 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg text-white placeholder-gray-500"
                />
                {filters.search && (
                  <button
                    onClick={() => setFilters({ ...filters, search: "" })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Logs Terminal */}
        <div
          ref={containerRef}
          className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 font-mono text-sm max-h-[calc(100vh-400px)] overflow-auto"
        >
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No logs found matching your filters
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => {
                const isExpanded = expandedLogs.has(log.id);
                const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

                return (
                  <div
                    key={log.id}
                    className="group hover:bg-gray-900/30 rounded px-2 py-1 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-gray-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold shrink-0 border ${LEVEL_BG[log.level]}`}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-blue-400 shrink-0">[{log.service}]</span>
                      <span className="flex-1">{log.message}</span>
                      {hasMetadata && (
                        <button
                          onClick={() => toggleExpanded(log.id)}
                          className="text-gray-500 hover:text-gray-300 shrink-0"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>
                    {isExpanded && hasMetadata && (
                      <div className="mt-2 ml-48 p-3 bg-gray-900/50 rounded text-xs">
                        <pre className="text-gray-400 overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 text-sm text-gray-400 text-center">
          Showing {logs.length} log{logs.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
