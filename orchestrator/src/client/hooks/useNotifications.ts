import { useState, useEffect, useCallback } from 'react';

interface UseNotificationsOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { pollInterval = 60000, enabled = true } = options; // Poll every 60s by default
  
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/count', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification count');
      }

      const data = await response.json();
      setCount(data.count || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notification error');
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchCount();
    }
  }, [enabled, fetchCount]);

  // Polling
  useEffect(() => {
    if (!enabled || !pollInterval) return;

    const interval = setInterval(() => {
      fetchCount();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, pollInterval, fetchCount]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchCount();
  }, [fetchCount]);

  return {
    count,
    isLoading,
    error,
    refresh,
  };
}
