import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  id: string;
  type: 'new_job' | 'interview' | 'update' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  url?: string;
}

interface NotificationData {
  count: number;
  breakdown: { newJobs: number; interviews: number; updates: number };
  notifications: Notification[];
}

interface UseNotificationsOptions {
  pollInterval?: number;
  enabled?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { pollInterval = 60000, enabled = true } = options;

  const [data, setData] = useState<NotificationData>({
    count: 0,
    breakdown: { newJobs: 0, interviews: 0, updates: 0 },
    notifications: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const [countRes, listRes] = await Promise.allSettled([
        fetch('/api/notifications/count'),
        fetch('/api/notifications'),
      ]);

      let count = 0;
      let breakdown = { newJobs: 0, interviews: 0, updates: 0 };
      let notifications: Notification[] = [];

      if (countRes.status === 'fulfilled' && countRes.value.ok) {
        const countData = await countRes.value.json();
        count = countData.count || 0;
        breakdown = countData.breakdown || breakdown;
      }

      if (listRes.status === 'fulfilled' && listRes.value.ok) {
        const listData = await listRes.value.json();
        notifications = (listData.notifications || []).map((n: any, i: number) => ({
          id: n.id || `notif-${i}`,
          type: n.type || 'system',
          title: n.title || 'Notification',
          message: n.message || '',
          read: n.read ?? false,
          createdAt: n.createdAt || new Date().toISOString(),
          url: n.url,
        }));
      }

      setData({ count, breakdown, notifications });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Notification error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setIsLoading(true);
    fetchNotifications();
  }, [enabled, fetchNotifications]);

  useEffect(() => {
    if (!enabled || !pollInterval) return;
    const interval = setInterval(fetchNotifications, pollInterval);
    return () => clearInterval(interval);
  }, [enabled, pollInterval, fetchNotifications]);

  const markAsRead = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      count: Math.max(0, prev.count - (prev.notifications.find((n) => n.id === id && !n.read) ? 1 : 0)),
    }));
  }, []);

  const markAllAsRead = useCallback(() => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
      count: 0,
    }));
  }, []);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    count: data.count,
    breakdown: data.breakdown,
    notifications: data.notifications,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}
