import { useState, useEffect, useCallback, useRef } from 'react';
import { allocationsApi, assignmentsApi, collectionsApi, ptpsApi, reportsApi, usersApi } from '../api';

interface UseFetchState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export const useFetch = <T,>(
  fetchFn: () => Promise<T>,
  dependencies: unknown[] = []
): UseFetchState<T> & { refetch: () => Promise<void> } => {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    error: null,
    isLoading: true,
  });
  // Incremented on every fetch. Response only applied if id still matches.
  const fetchId = useRef(0);

  const refetch = useCallback(async () => {
    const myId = ++fetchId.current;
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await fetchFn();
      if (fetchId.current !== myId) return;
      setState({ data, error: null, isLoading: false });
    } catch (error) {
      if (fetchId.current !== myId) return;
      setState({
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
        isLoading: false,
      });
    }
  }, [fetchFn]);

  useEffect(() => {
    refetch();
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, refetch };
};

export const useAllocations = (orgId: string) => {
  return useFetch(() => allocationsApi.listAllocations({ organizationId: orgId }), [orgId]);
};

export const useAssignments = (orgId: string) => {
  return useFetch(() => assignmentsApi.listAssignments({ orgId }), [orgId]);
};

export const useCollections = (orgId: string) => {
  return useFetch(() => collectionsApi.listCollections({ orgId }), [orgId]);
};

export const usePtps = () => {
  return useFetch(() => ptpsApi.listPtps({}), []);
};

export const useReports = (orgId: string) => {
  return useFetch(() => reportsApi.listReportJobs({ orgId }), [orgId]);
};

export const useUsers = () => {
  return useFetch(() => usersApi.listUsers(), []);
};
