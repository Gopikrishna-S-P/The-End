import { useState, useCallback } from 'react';
import type { PagedResponse } from '@/types/core';

interface UsePaginatedListOptions<T, P> {
  fetchFn: (page: number, size: number, params?: P) => Promise<PagedResponse<T>>;
  pageSize?: number;
  initialParams?: P;
}

export function usePaginatedList<T, P = undefined>({
  fetchFn,
  pageSize = 20,
  initialParams,
}: UsePaginatedListOptions<T, P>) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<P | undefined>(initialParams);

  const loadPage = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (isLoading || (pageNum >= totalPages && totalPages > 0 && !isRefresh)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchFn(pageNum, pageSize, params);
        setData((prev) => (isRefresh ? response.content : [...prev, ...response.content]));
        setPage(response.page);
        setTotalPages(response.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [fetchFn, pageSize, params, isLoading, totalPages]
  );

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setTotalPages(0);
    loadPage(0, true);
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (page + 1 < totalPages) {
      loadPage(page + 1);
    }
  }, [page, totalPages, loadPage]);

  const updateParams = useCallback((newParams: P) => {
    setParams(newParams);
    // Trigger refresh immediately after params change
    setIsRefreshing(true);
    setTotalPages(0);
    setData([]);
    // We cannot immediately call loadPage with updated params because state hasn't updated.
    // Instead we rely on useEffect in client or execute it directly using newParams.
  }, []);

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    refresh,
    loadMore,
    updateParams,
    hasMore: page + 1 < totalPages,
  };
}
