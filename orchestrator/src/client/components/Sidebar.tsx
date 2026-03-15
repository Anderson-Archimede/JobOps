/**
 * Main Sidebar Component
 *
 * Architecture: 4 groups with 15 tabs total
 * - CORE: Dashboard, Job Search, Applications, Inbox Tracker
 * - INTELLIGENCE: Agents, Prompt Studio, AI Insights, Skills DNA
 * - DATA: Datasets, CV Manager, Visa Sponsors, Integrations
 * - OPS: Monitoring, Logs, Tracer Links, Settings
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Briefcase,
  Inbox,
  Bot,
  FileCode,
  Lightbulb,
  Database,
  FileText,
  Plug,
  Activity,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Target,
  Shield,
  Link2,
  TrendingUp,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

const STORAGE_KEY_COLLAPSED = 'jobops.sidebar.collapsed';
const STORAGE_KEY_GROUPS = 'jobops.sidebar.groups';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number | string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'core',
    label: 'CORE',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        path: '/dashboard',
      },
      {
        id: 'job-search',
        label: 'Job Search',
        icon: Search,
        path: '/jobs/ready',
      },
      {
        id: 'applications',
        label: 'Applications',
        icon: Briefcase,
        path: '/applications/in-progress',
      },
      {
        id: 'inbox-tracker',
        label: 'Inbox Tracker',
        icon: Inbox,
        path: '/tracking-inbox',
      },
    ],
  },
  {
    id: 'intelligence',
    label: 'INTELLIGENCE',
    items: [
      {
        id: 'agents',
        label: 'Agents',
        icon: Bot,
        path: '/agents',
        badge: 'NEW',
      },
      {
        id: 'prompt-studio',
        label: 'Prompt Studio',
        icon: FileCode,
        path: '/prompt-studio',
        badge: 'BETA',
      },
      {
        id: 'ai-insights',
        label: 'AI Insights',
        icon: Lightbulb,
        path: '/ai-insights',
      },
      {
        id: 'skills-dna',
        label: 'Skills DNA',
        icon: Target,
        path: '/skills-dna',
      },
      {
        id: 'career-path',
        label: 'Career Path',
        icon: TrendingUp,
        path: '/career-path',
        badge: 'NEW',
      },
      {
        id: 'autopilot',
        label: 'Autopilot',
        icon: Rocket,
        path: '/autopilot',
        badge: 'NEW',
      },
    ],
  },
  {
    id: 'data',
    label: 'DATA',
    items: [
      {
        id: 'datasets',
        label: 'Datasets',
        icon: Database,
        path: '/datasets',
      },
      {
        id: 'cv-manager',
        label: 'CV Manager',
        icon: FileText,
        path: '/cv-manager',
      },
      {
        id: 'visa-sponsors',
        label: 'Visa Sponsors',
        icon: Shield,
        path: '/visa-sponsors',
      },
      {
        id: 'integrations',
        label: 'Integrations',
        icon: Plug,
        path: '/integrations',
      },
    ],
  },
  {
    id: 'ops',
    label: 'OPS',
    items: [
      {
        id: 'monitoring',
        label: 'Monitoring',
        icon: Activity,
        path: '/monitoring',
      },
      {
        id: 'logs',
        label: 'Logs',
        icon: ScrollText,
        path: '/logs',
      },
      {
        id: 'tracer-links',
        label: 'Tracer Links',
        icon: Link2,
        path: '/tracer-links',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        path: '/settings',
      },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  
  // Collapsed state (localStorage)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  // Group expanded states (localStorage)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_GROUPS);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
      // Default: all groups expanded
      return new Set(NAV_GROUPS.map((g) => g.id));
    } catch {
      return new Set(NAV_GROUPS.map((g) => g.id));
    }
  });

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLLAPSED, String(isCollapsed));
    } catch {
      // Ignore storage errors
    }
  }, [isCollapsed]);

  // Persist expanded groups
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_GROUPS,
        JSON.stringify(Array.from(expandedGroups))
      );
    } catch {
      // Ignore storage errors
    }
  }, [expandedGroups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const isActive = (path: string) => {
    if (path === '/jobs/ready') {
      return location.pathname.startsWith('/jobs/');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-background transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        'hidden lg:flex' // Hidden on mobile by default
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        {!isCollapsed && (
          <h1 className="text-lg font-bold text-[#E94560]">JobOps</h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <TooltipProvider delayDuration={0}>
          {NAV_GROUPS.map((group) => {
            const isExpanded = expandedGroups.has(group.id);

            return (
              <div key={group.id} className="mb-4">
                {/* Group Header */}
                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="mb-1 flex w-full items-center justify-between px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>{group.label}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                )}

                {/* Group Items */}
                {(isCollapsed || isExpanded) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      const isMonitoring = item.id === 'monitoring';

                      const baseClasses = cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                        active
                          ? 'bg-[#E94560]/10 text-[#E94560]'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        isCollapsed && 'justify-center'
                      );

                      const innerContent = (
                        <>
                          <Icon className="h-4 w-4 shrink-0" />
                          {!isCollapsed && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge && (
                                <Badge
                                  variant={typeof item.badge === 'number' ? 'default' : 'secondary'}
                                  className={cn(
                                    'h-5 px-1.5 text-[10px] font-semibold',
                                    typeof item.badge === 'string' && 'bg-blue-500/10 text-blue-400'
                                  )}
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </>
                          )}
                        </>
                      );
                      const linkContent = (
                        <Link to={item.path} className={baseClasses}>
                          {innerContent}
                        </Link>
                      );

                      if (isCollapsed) {
                        return (
                          <Tooltip key={item.id}>
                            <TooltipTrigger asChild>
                              {linkContent}
                            </TooltipTrigger>
                            <TooltipContent side="right" className="flex items-center gap-2">
                              {item.label}
                              {item.badge && (
                                <Badge
                                  variant={typeof item.badge === 'number' ? 'default' : 'secondary'}
                                  className="h-5 px-1.5 text-[10px]"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return <div key={item.id}>{linkContent}</div>;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="border-t border-border/50 p-3">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 px-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#E94560]/20 to-[#E94560]/5">
              <Activity className="h-3 w-3 text-[#E94560]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-muted-foreground/80 truncate">Workspace actif</div>
            </div>
            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
          </div>
        )}
      </div>
    </aside>
  );
};
