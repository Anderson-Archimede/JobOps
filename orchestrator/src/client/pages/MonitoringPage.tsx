/**
 * Monitoring Page
 * Real-time system metrics, queue health, agent errors, and incidents
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  Server,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { MonitoringMetrics, QueueMetrics, AgentMetrics, Incident } from "@shared/types/monitoring";
import { subscribeToEventSource } from "../lib/sse";

const API_BASE = "/api";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const mins = Math.floor((seconds % (60 * 60)) / 60);
  return `${days}d ${hours}h ${mins}m`;
}

export function MonitoringPage() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/monitoring/metrics`);
      const data = await res.json();
      if (data.ok) {
        setMetrics(data.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const unsubscribe = subscribeToEventSource<{ type: string; data: MonitoringMetrics }>(
      `${API_BASE}/monitoring/stream`,
      {
        onMessage: (payload) => {
          if (payload.type === "metrics") {
            setMetrics(payload.data);
            setLastUpdate(new Date());
            setLoading(false);
          }
        },
        onError: () => {
          console.error("Failed to connect to monitoring stream");
        }
      }
    );

    return () => unsubscribe();
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh && !metrics) {
      fetchMetrics();
    }
  }, [autoRefresh, metrics, fetchMetrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading metrics...</span>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <p className="text-gray-400">Failed to load metrics</p>
        </div>
      </div>
    );
  }

  const hasIncidents = metrics.incidents.length > 0;
  const criticalIncidents = metrics.incidents.filter((i) => i.severity === "critical");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">System Monitoring</h1>
            <p className="text-gray-400">
              Real-time system health and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Last update: {lastUpdate?.toLocaleTimeString()}
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                autoRefresh
                  ? "bg-[#E94560] text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {autoRefresh ? (
                <>
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>LIVE</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Paused</span>
                </>
              )}
            </button>
            <button
              onClick={fetchMetrics}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Incidents Alert */}
        {hasIncidents && (
          <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-orange-500">
                {criticalIncidents.length > 0 ? "Critical Issues Detected" : "Warnings Detected"}
              </h3>
            </div>
            <div className="space-y-2">
              {metrics.incidents.slice(0, 5).map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {incident.severity === "critical" ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    )}
                    <div>
                      <div className="font-medium">{incident.message}</div>
                      <div className="text-sm text-gray-400">{incident.source}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(incident.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          {/* Queue Health */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-semibold">Queue Health</h2>
            </div>
            <div className="space-y-4">
              {metrics.queues.map((queue) => {
                const total = queue.waiting + queue.active + queue.completed + queue.failed;
                const failureRate = total > 0 ? (queue.failed / total) * 100 : 0;
                const isHealthy = failureRate < 5 && !queue.paused;

                return (
                  <div key={queue.name} className="p-4 bg-[#0a0a0a] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium capitalize">{queue.name}</span>
                        {isHealthy ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                      {queue.paused && (
                        <span className="text-xs px-2 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded">
                          PAUSED
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      <div>
                        <div className="text-gray-400">Waiting</div>
                        <div className="font-semibold text-yellow-500">{queue.waiting}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Active</div>
                        <div className="font-semibold text-blue-500">{queue.active}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Done</div>
                        <div className="font-semibold text-green-500">{queue.completed}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Failed</div>
                        <div className="font-semibold text-red-500">{queue.failed}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Error %</div>
                        <div className={`font-semibold ${failureRate > 10 ? 'text-red-500' : 'text-gray-300'}`}>
                          {failureRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LLM Performance */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-semibold">LLM Performance</h2>
            </div>
            {metrics.llm.map((llm) => (
              <div key={llm.provider} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0a0a0a] rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Avg Latency</div>
                    <div className="text-2xl font-bold">{llm.avgLatencyMs}ms</div>
                  </div>
                  <div className="p-4 bg-[#0a0a0a] rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Total Calls</div>
                    <div className="text-2xl font-bold">{llm.totalCalls}</div>
                  </div>
                  <div className="p-4 bg-[#0a0a0a] rounded-lg">
                    <div className="text-gray-400 text-sm mb-1">Error Rate</div>
                    <div className={`text-2xl font-bold ${llm.errorRate > 5 ? 'text-red-500' : 'text-green-500'}`}>
                      {llm.errorRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={llm.last7Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avgLatency"
                        stroke="#A855F7"
                        strokeWidth={2}
                        name="Latency (ms)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Agent Errors */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-orange-500" />
              <h2 className="text-xl font-semibold">Agent Errors (24h)</h2>
            </div>
            <div className="space-y-3">
              {metrics.agents.map((agent) => (
                <div key={agent.agentId} className="p-4 bg-[#0a0a0a] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{agent.agentName}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${agent.errorRate > 10 ? 'text-red-500' : 'text-green-500'}`}>
                        {agent.errorRate.toFixed(1)}%
                      </span>
                      {agent.errorRate > 10 ? (
                        <TrendingUp className="w-4 h-4 text-red-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {agent.failedRuns} / {agent.totalRuns} runs failed
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Resources */}
          <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-semibold">System Resources</h2>
            </div>
            <div className="space-y-4">
              {/* CPU */}
              <div className="p-4 bg-[#0a0a0a] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">CPU Usage</span>
                  </div>
                  <span className="text-2xl font-bold">{metrics.system.cpu.usage}%</span>
                </div>
                <div className="text-sm text-gray-400">{metrics.system.cpu.cores} cores</div>
              </div>

              {/* Memory */}
              <div className="p-4 bg-[#0a0a0a] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Memory</span>
                  </div>
                  <span className="text-2xl font-bold">{metrics.system.memory.percentage}%</span>
                </div>
                <div className="text-sm text-gray-400">
                  {formatBytes(metrics.system.memory.used)} / {formatBytes(metrics.system.memory.total)}
                </div>
              </div>

              {/* Uptime */}
              <div className="p-4 bg-[#0a0a0a] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Uptime</span>
                  </div>
                  <span className="text-xl font-bold">{formatUptime(metrics.system.uptime)}</span>
                </div>
                <div className="text-sm text-gray-400">Node {metrics.system.nodeVersion}</div>
              </div>

              {/* Database */}
              <div className="p-4 bg-[#0a0a0a] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">Database</span>
                  </div>
                  {metrics.database.connected ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500" />
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {metrics.database.activeConnections} active / {metrics.database.totalConnections} total
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
