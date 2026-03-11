import { useState, useEffect, useCallback } from 'react';

export interface SearchResult {
  id: string;
  type: 'job' | 'application' | 'agent';
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  categories: {
    jobs: number;
    applications: number;
    agents: number;
  };
}

interface UseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
  const { debounceMs = 300, minQueryLength = 2 } = options;
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState({
    jobs: 0,
    applications: 0,
    agents: 0,
  });

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      setCategories({ jobs: 0, applications: 0, agents: 0 });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: SearchResponse = await response.json();
      setResults(data.results);
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search error');
      setResults([]);
      setCategories({ jobs: 0, applications: 0, agents: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [minQueryLength]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        search(query);
      } else {
        setResults([]);
        setCategories({ jobs: 0, applications: 0, agents: 0 });
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, search]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setCategories({ jobs: 0, applications: 0, agents: 0 });
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    categories,
    clearSearch,
  };
}
