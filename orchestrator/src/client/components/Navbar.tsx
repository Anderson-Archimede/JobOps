import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Zap,
  User,
  Settings,
  LogOut,
  Keyboard,
  UserCircle,
  Play,
  FileUp,
  Briefcase,
  Loader2,
  X,
  CheckCheck,
  Sparkles,
  CalendarClock,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { Button } from '@/components/ui/button';
import { useSearch } from '../hooks/useSearch';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  // Hooks
  const { query, setQuery, results, isLoading, categories, clearSearch } = useSearch();
  const { status, healthCheck } = useSystemStatus();
  const { count: notificationCount, notifications, breakdown, markAsRead, markAllAsRead, refresh: refreshNotifs } = useNotifications();
  const { user, isAuthenticated, logout } = useAuth();
  
  // State
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        clearSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, clearSearch]);

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  // Handle search result click
  const handleResultClick = (url: string) => {
    navigate(url);
    setIsSearchOpen(false);
    clearSearch();
  };

  // Group results by category
  const groupedResults = {
    jobs: results.filter((r) => r.type === 'job'),
    applications: results.filter((r) => r.type === 'application'),
    agents: results.filter((r) => r.type === 'agent'),
  };

  // System status color
  const statusColor = {
    healthy: 'bg-green-500',
    degraded: 'bg-orange-500',
    down: 'bg-red-500',
  }[status];

  return (
    <nav className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border/50 bg-background/80 px-5 backdrop-blur-xl">
      {/* LEFT ZONE */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden h-8 w-8"
        >
          <Menu className="h-4.5 w-4.5" />
        </Button>

        <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-[#E94560] to-[#FF6B6B] bg-clip-text text-transparent">
          JobOps
        </h1>
      </div>

      {/* CENTER ZONE - Global Search */}
      <div className="relative flex-1 max-w-lg mx-6 hidden md:block" ref={searchDropdownRef}>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-muted-foreground transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher jobs, applications, agents... (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            className="h-9 w-full rounded-lg border border-border/50 bg-muted/40 pl-9 pr-10 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:bg-muted/60 transition-all"
          />
          {query && (
            <button
              onClick={() => {
                clearSearch();
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {isSearchOpen && query && (
          <div className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Aucun résultat pour "{query}"
              </div>
            ) : (
              <div className="py-2">
                {/* Jobs */}
                {groupedResults.jobs.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                      JOBS ({categories.jobs})
                    </div>
                    {groupedResults.jobs.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result.url)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          {result.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Applications */}
                {groupedResults.applications.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                      APPLICATIONS ({categories.applications})
                    </div>
                    {groupedResults.applications.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result.url)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <FileUp className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          {result.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Agents */}
                {groupedResults.agents.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                      AGENTS ({categories.agents})
                    </div>
                    {groupedResults.agents.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result.url)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          {result.subtitle && (
                            <div className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT ZONE */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Bell className="h-[18px] w-[18px]" />
              {notificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E94560] text-[9px] font-bold text-white ring-2 ring-background">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Notifications</span>
              <div className="flex items-center gap-1">
                {notificationCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2" onClick={markAllAsRead}>
                    <CheckCheck className="h-3.5 w-3.5 mr-1" />
                    Tout lire
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={refreshNotifs}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Summary badges */}
            {notificationCount > 0 && (
              <div className="flex gap-2 px-4 py-2 border-b border-border/50 bg-muted/30">
                {breakdown.newJobs > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <Sparkles className="h-3 w-3" /> {breakdown.newJobs} nouveau{breakdown.newJobs > 1 ? 'x' : ''} job{breakdown.newJobs > 1 ? 's' : ''}
                  </span>
                )}
                {breakdown.interviews > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    <CalendarClock className="h-3 w-3" /> {breakdown.interviews} entretien{breakdown.interviews > 1 ? 's' : ''}
                  </span>
                )}
                {breakdown.updates > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Info className="h-3 w-3" /> {breakdown.updates} mise{breakdown.updates > 1 ? 's' : ''} à jour
                  </span>
                )}
              </div>
            )}

            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Aucune notification</p>
                  <p className="text-xs mt-1">Vous êtes à jour</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.url) navigate(notif.url);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0 ${!notif.read ? 'bg-muted/20' : ''}`}
                  >
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${!notif.read ? 'bg-[#E94560]' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs truncate">{notif.title}</div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{notif.message}</div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {notificationCount > 0 && (
              <div className="border-t border-border px-4 py-2">
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate('/jobs/ready')}>
                  Voir tous les jobs
                </Button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border/40 mx-1.5" />

        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-[#E94560] to-[#D63B54] hover:from-[#D63B54] hover:to-[#C43048] text-white text-xs font-medium px-3 shadow-sm shadow-[#E94560]/20 transition-all"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nouveau</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Actions rapides</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard?action=scraping')} className="text-sm">
              <Play className="mr-2 h-3.5 w-3.5" />
              Lancer scraping
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/applications/in-progress')} className="text-sm">
              <Briefcase className="mr-2 h-3.5 w-3.5" />
              Mes candidatures
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/cv-manager')} className="text-sm">
              <FileUp className="mr-2 h-3.5 w-3.5" />
              Gérer mes CV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-border/40 mx-1.5" />

        {/* System Status */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted/60 transition-colors">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${statusColor} opacity-50`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${statusColor}`} />
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="w-56">
              <div className="space-y-2">
                <div className="text-xs font-semibold">Statut : {status === 'healthy' ? 'Opérationnel' : status === 'degraded' ? 'Dégradé' : 'Hors ligne'}</div>
                {healthCheck && (
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base de données</span>
                      <span className="font-medium">{healthCheck.services.database}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Redis</span>
                      <span className="font-medium">{healthCheck.services.redis}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Files d'attente</span>
                      <span className="font-medium">{healthCheck.services.queues}</span>
                    </div>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-px h-5 bg-border/40 mx-1.5" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-muted/60 transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#E94560]/20 to-[#E94560]/5 border border-[#E94560]/20">
                <User className="h-3.5 w-3.5 text-[#E94560]" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="py-2">
              {isAuthenticated ? (
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm">{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.email || 'Invité')}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">{user?.email}</span>
                </div>
              ) : (
                <span className="text-sm">Mon compte</span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')} className="text-sm">
              <UserCircle className="mr-2 h-3.5 w-3.5" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="text-sm">
              <Settings className="mr-2 h-3.5 w-3.5" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alert('Keyboard shortcuts')} className="text-sm">
              <Keyboard className="mr-2 h-3.5 w-3.5" />
              Raccourcis
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="text-sm text-red-400 focus:text-red-400">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};
