import { useState, useEffect, useCallback } from 'react';

export type SystemStatus = 'healthy' | 'degraded' | 'down';

export interface HealthCheck {
  status: SystemStatus;
  services: {
    database: 'healthy' | 'degraded' | 'down';
    redis: 'healthy' | 'degraded' | 'down';
    queues: 'healthy' | 'degraded' | 'down';
  };
  uptime: number;
  timestamp: string;
  details?: {
    activeJobs?: number;
    queuedJobs?: number;
    failedJobs?: number;
  };
}

interface UseSystemStatusOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export function useSystemStatus(options: UseSystemStatusOptions = {}) {
  const { pollInterval = 30000, enabled = true } = options; // Poll every 30s by default
  
  const [status, setStatus] = useState<SystemStatus>('healthy');
  const [healthCheck, setHealthCheck] = useState<HealthCheck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      const data: HealthCheck = await response.json();
      setHealthCheck(data);
      setStatus(data.status);
      setError(null);
      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check error');
      setStatus('down');
      setHealthCheck(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchHealth();
    }
  }, [enabled, fetchHealth]);

  // Polling
  useEffect(() => {
    if (!enabled || !pollInterval) return;

    const interval = setInterval(() => {
      fetchHealth();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, pollInterval, fetchHealth]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchHealth();
  }, [fetchHealth]);

  return {
    status,
    healthCheck,
    isLoading,
    error,
    lastChecked,
    refresh,
  };
}
