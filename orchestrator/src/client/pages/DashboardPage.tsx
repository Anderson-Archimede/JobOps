/**
 * Dashboard Page with KPIs, Charts and Activity Feed
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  CheckCircle,
  Briefcase,
  FileText,
  Mail,
  Activity,
  Send,
  Users,
  Database,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// Types
interface KPIs {
  totalApps: number;
  monthOverMonthChange: number;
  avgScore: number;
  responseRate: number;
  pendingJobs: number;
}

interface DailyData {
  date: string;
  count: number;
}

interface StatusDistribution {
  status: string;
  count: number;
}

interface TopCompany {
  employer: string;
  avgScore: number;
  count: number;
}

interface ActivityItem {
  type: 'job_matched' | 'cv_tailored' | 'application_sent' | 'status_changed' | 'email_received';
  entity: string;
  entityId: string;
  timestamp: string;
  link: string;
  metadata?: Record<string, unknown>;
}

interface DatasetsSummary {
  totalCount: number;
  totalRows: number;
  byType: Record<string, number>;
  recent: Array<{
    id: string;
    name: string;
    type: string;
    rowCount: number;
    updatedAt: string;
  }>;
}

// Counter animation hook
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return count;
}

// Skeleton components
const SkeletonCard = () => (
  <div className="animate-pulse rounded-lg border border-border bg-card p-6">
    <div className="h-4 w-24 bg-muted rounded mb-4" />
    <div className="h-8 w-16 bg-muted rounded mb-2" />
    <div className="h-3 w-32 bg-muted rounded" />
  </div>
);

const SkeletonChart = () => (
  <div className="animate-pulse rounded-lg border border-border bg-card p-6">
    <div className="h-6 w-48 bg-muted rounded mb-6" />
    <div className="h-64 bg-muted rounded" />
  </div>
);

export const DashboardPage: React.FC = () => {
  // State
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [datasetsSummary, setDatasetsSummary] = useState<DatasetsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        const responses = await Promise.allSettled([
          fetch('/api/analytics/kpis'),
          fetch('/api/analytics/daily'),
          fetch('/api/analytics/status-distribution'),
          fetch('/api/analytics/top-companies'),
          fetch('/api/analytics/activity'),
          fetch('/api/analytics/datasets-summary'),
        ]);

        // Check each response status before parsing
        const jsonPromises = responses.map((result, index) => {
          if (result.status === 'fulfilled') {
            const response = result.value;
            if (!response.ok) {
              console.warn(`API call ${index} failed: ${response.status}`);
              return Promise.resolve(null);
            }
            return response.json();
          }
          return Promise.resolve(null);
        });

        const [kpisRes, dailyRes, statusRes, companiesRes, activityRes, datasetsRes] = 
          await Promise.all(jsonPromises);

        // Update state with null-safe checks
        if (kpisRes?.ok && kpisRes?.data) setKpis(kpisRes.data);
        if (dailyRes?.ok && dailyRes?.data) setDailyData(dailyRes.data);
        if (statusRes?.ok && statusRes?.data) setStatusDistribution(statusRes.data);
        if (companiesRes?.ok && companiesRes?.data) setTopCompanies(companiesRes.data);
        if (activityRes?.ok && activityRes?.data) setActivities(activityRes.data);
        if (datasetsRes?.ok && datasetsRes?.data) setDatasetsSummary(datasetsRes.data);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
        setError(errorMessage);
        console.error('Dashboard error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Counter animations
  const animatedTotalApps = useCountUp(kpis?.totalApps || 0);
  const animatedAvgScore = useCountUp(kpis?.avgScore || 0);
  const animatedResponseRate = useCountUp(kpis?.responseRate || 0);
  const animatedPendingJobs = useCountUp(kpis?.pendingJobs || 0);

  // Chart colors
  const STATUS_COLORS: Record<string, string> = {
    applied: '#3b82f6', // Bright Blue
    interview: '#10b981', // Vibrant Green
    rejected: '#ef4444', // Professional Red
    offer: '#f59e0b', // Gold/Amber
    ready: '#6366f1', // Indigo for prospective
  };

  const DATASET_COLORS: Record<string, string> = {
    job_postings: 'text-blue-400',
    cv_versions: 'text-purple-400',
    applications: 'text-green-400',
    custom: 'text-orange-400',
  };

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = now.getTime() - then.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Activity icon
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'job_matched':
        return <Target className="h-5 w-5 text-blue-500" />;
      case 'cv_tailored':
        return <FileText className="h-5 w-5 text-green-500" />;
      case 'application_sent':
        return <Send className="h-5 w-5 text-blue-600" />;
      case 'status_changed':
        return <Activity className="h-5 w-5 text-orange-500" />;
      case 'email_received':
        return <Mail className="h-5 w-5 text-purple-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/50 bg-background/60 px-6 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
        <div className="flex h-16 items-center px-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Failed to load dashboard</p>
                <p className="text-xs text-red-300/80 mt-1">{error}</p>
                <button 
                  onClick={() => { setError(''); window.location.reload(); }}
                  className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-6 space-y-6">
        {/* SECTION 1 - KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Applications */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div className="rounded-xl border border-white/10 bg-card/85 backdrop-blur-md p-6 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <p className="text-sm font-semibold text-muted-foreground group-hover:text-blue-400 transition-colors">Total Applications</p>
                <div className="p-2.5 bg-blue-500/15 rounded-xl group-hover:bg-blue-500/25 transition-colors">
                  <Briefcase className="h-5 w-5 text-blue-400" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold tracking-tight">{animatedTotalApps}</div>
                <div className="flex items-center text-sm">
                  {kpis && kpis.monthOverMonthChange >= 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-green-500 font-medium">
                        +{kpis.monthOverMonthChange}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                      <span className="text-red-500 font-medium">
                        {kpis?.monthOverMonthChange}%
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground ml-2">vs last month</span>
                </div>
              </div>
            </div>
          )}

          {/* Average Score */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div className="rounded-xl border border-white/10 bg-card/85 backdrop-blur-md p-6 shadow-xl hover:shadow-green-500/10 transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-3xl -mr-10 -mt-10 group-hover:bg-green-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <p className="text-sm font-semibold text-muted-foreground group-hover:text-green-400 transition-colors">Average Score</p>
                <div className="p-2.5 bg-green-500/15 rounded-xl group-hover:bg-green-500/25 transition-colors">
                  <Target className="h-5 w-5 text-green-400" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold tracking-tight">{animatedAvgScore}</div>
                  <span className="text-muted-foreground ml-1">/100</span>
                </div>
                {/* Circular gauge */}
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded-full bg-muted/30">
                    <div
                      style={{ width: `${kpis?.avgScore || 0}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Response Rate */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div className="rounded-xl border border-white/10 bg-card/85 backdrop-blur-md p-6 shadow-xl hover:shadow-amber-500/10 transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-10 -mt-10 group-hover:bg-amber-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <p className="text-sm font-semibold text-muted-foreground group-hover:text-amber-400 transition-colors">Response Rate</p>
                <div className="p-2.5 bg-amber-500/15 rounded-xl group-hover:bg-amber-500/25 transition-colors">
                  <CheckCircle className="h-5 w-5 text-amber-400" />
                </div>
              </div>
              <div className="space-y-2 relative z-10">
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold tracking-tight">{animatedResponseRate}</div>
                  <span className="text-muted-foreground ml-1">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Interviews + Offers</p>
              </div>
            </div>
          )}

          {/* Pending Jobs */}
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <div className="rounded-xl border border-white/10 bg-card/85 backdrop-blur-md p-6 shadow-xl hover:shadow-purple-500/10 transition-all duration-300 group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl -mr-10 -mt-10 group-hover:bg-purple-500/10 transition-colors" />
              <div className="flex items-center justify-between mb-4 relative z-10">
                <p className="text-sm font-semibold text-muted-foreground group-hover:text-purple-400 transition-colors">Pending Jobs</p>
                <div className="p-2.5 bg-purple-500/15 rounded-xl group-hover:bg-purple-500/25 transition-colors">
                  <Clock className="h-5 w-5 text-purple-400" />
                </div>
              </div>
              <div className="space-y-2 relative z-10">
                <div className="text-3xl font-bold tracking-tight">{animatedPendingJobs}</div>
                <p className="text-xs text-muted-foreground">Ready to apply</p>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2 - Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Applications per Day */}
          {isLoading ? (
            <SkeletonChart />
          ) : (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-6">Applications (Last 30 Days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--foreground))"
                    fontSize={12}
                    fontWeight={600}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis stroke="hsl(var(--foreground))" fontSize={12} fontWeight={600} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(8px)',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E94560" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#E94560" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#E94560"
                    strokeWidth={4}
                    dot={{ fill: '#E94560', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    fill="url(#colorCount)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Status Distribution */}
          {isLoading ? (
            <SkeletonChart />
          ) : (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="text-lg font-semibold mb-6">Status Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                 <PieChart>
                  <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.status] || '#CBD5E1'} 
                      strokeWidth={2}
                      stroke="rgba(0,0,0,0.2)"
                    />
                  ))}
                </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(8px)',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span className="text-foreground font-semibold capitalize">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Companies */}
        {isLoading ? (
          <SkeletonChart />
        ) : (
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-6">Top 10 Companies by Score</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topCompanies} layout="vertical" margin={{ left: 30, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} fontWeight={600} />
                <YAxis
                  dataKey="employer"
                  type="category"
                  stroke="hsl(var(--foreground))"
                  fontSize={12}
                  fontWeight={600}
                  width={180}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(8px)',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  </linearGradient>
                </defs>
                <Bar 
                  dataKey="avgScore" 
                  fill="url(#barGradient)" 
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* SECTION 3 - Datasets & Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Datasets Widget */}
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-md p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Datasets Overview</h3>
              <Database className="h-5 w-5 text-blue-400" />
            </div>
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-24 bg-muted/50 rounded-lg" />
                <div className="h-32 bg-muted/50 rounded-lg" />
              </div>
            ) : !datasetsSummary || datasetsSummary.totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted/50 rounded-xl">
                <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No datasets available</p>
                <Link to="/datasets" className="mt-4 text-sm font-medium text-blue-500 hover:text-blue-400">
                  Manage Datasets →
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Collections</p>
                    <p className="text-2xl font-bold">{datasetsSummary.totalCount}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Records</p>
                    <p className="text-2xl font-bold">{datasetsSummary.totalRows.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recently Updated</h4>
                  {(datasetsSummary?.recent || []).map((dataset) => (
                    <div key={dataset.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <FileText className={`h-4 w-4 ${DATASET_COLORS[dataset.type] || 'text-gray-400'}`} />
                        <div>
                          <p className="text-sm font-medium truncate max-w-[150px]">{dataset.name}</p>
                          <p className="text-[10px] text-muted-foreground">{dataset.rowCount} rows</p>
                        </div>
                      </div>
                      <Link to="/datasets" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Database className="h-4 w-4 text-muted-foreground hover:text-blue-500" />
                      </Link>
                    </div>
                  ))}
                </div>
                
                <Link to="/datasets" className="block w-full py-2 px-4 text-center text-sm font-medium bg-secondary hover:bg-secondary/80 rounded-lg transition-colors border border-border/50">
                  View All Datasets
                </Link>
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-md p-6 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Recent Activity</h3>
              <Activity className="h-5 w-5 text-green-400" />
            </div>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted/50" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted/50 rounded" />
                      <div className="h-3 w-1/4 bg-muted/50 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted/50 rounded-xl">
                <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {activities.map((activity, index) => (
                  <Link
                    key={index}
                    to={activity.link}
                    className="flex items-start gap-4 p-3 rounded-xl hover:bg-muted/30 transition-all border border-transparent hover:border-border/50 group"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border border-border group-hover:border-primary/50 transition-colors">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{activity.entity}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                    {!!activity.metadata?.score && (
                      <div className="flex items-center gap-1 text-sm font-medium px-2 py-1 bg-primary/10 rounded-lg">
                        <span className="text-primary">{String(activity.metadata.score)}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
