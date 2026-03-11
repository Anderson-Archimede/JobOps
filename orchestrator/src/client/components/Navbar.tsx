import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSearch } from '../hooks/useSearch';
import { useSystemStatus } from '../hooks/useSystemStatus';
import { useNotifications } from '../hooks/useNotifications';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Hooks
  const { query, setQuery, results, isLoading, categories, clearSearch } = useSearch();
  const { status, healthCheck } = useSystemStatus();
  const { count: notificationCount } = useNotifications();
  
  // State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
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

  // Theme toggle
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // TODO: Implement actual theme switching with context
  };

  // Get app version
  const appVersion = '0.1.30'; // Could be imported from package.json

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* LEFT ZONE */}
      <div className="flex items-center gap-3">
        {/* Hamburger button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#E94560]">JobOps</h1>
          <Badge variant="secondary" className="text-xs">
            v{appVersion}
          </Badge>
        </div>
      </div>

      {/* CENTER ZONE - Global Search */}
      <div className="relative flex-1 max-w-xl mx-4 hidden md:block" ref={searchDropdownRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher jobs, applications, agents... (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchOpen(true)}
            className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E94560] text-[10px] font-bold text-white">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notifications {notificationCount > 0 && `(${notificationCount})`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="gap-2 bg-[#E94560] hover:bg-[#E94560]/90">
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Actions rapides</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/orchestrator')}>
              <Play className="mr-2 h-4 w-4" />
              Lancer scraping
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/applications/in-progress')}>
              <Briefcase className="mr-2 h-4 w-4" />
              Nouvelle application
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/cv-manager')}>
              <FileUp className="mr-2 h-4 w-4" />
              Importer CV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* System Status */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="relative flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent">
                <span className={`h-2 w-2 rounded-full ${statusColor} animate-pulse`} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="w-64">
              <div className="space-y-2">
                <div className="font-semibold">System Status: {status.toUpperCase()}</div>
                {healthCheck && (
                  <>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Database:</span>
                        <span className="font-medium">{healthCheck.services.database}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Redis:</span>
                        <span className="font-medium">{healthCheck.services.redis}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Queues:</span>
                        <span className="font-medium">{healthCheck.services.queues}</span>
                      </div>
                    </div>
                    {healthCheck.details && (
                      <div className="space-y-1 border-t pt-2 text-xs">
                        <div className="flex justify-between">
                          <span>Active Jobs:</span>
                          <span className="font-medium">{healthCheck.details.activeJobs || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Queued:</span>
                          <span className="font-medium">{healthCheck.details.queuedJobs || 0}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Theme Toggle - Hidden for now as app is dark-only */}
        {/* <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button> */}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserCircle className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => alert('Keyboard shortcuts')}>
              <Keyboard className="mr-2 h-4 w-4" />
              Raccourcis clavier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => alert('Déconnexion')}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};
