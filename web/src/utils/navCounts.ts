import { useEffect, useState } from 'react';
import { apiClient, unwrapApiResponse } from '../client';

type Counts = Record<string, number>;

let counts: Counts = {};
const listeners = new Set<(c: Counts) => void>();

function emit(): void {
  const snapshot = { ...counts };
  listeners.forEach(l => l(snapshot));
}

export const navCounts = {
  get(): Counts {
    return { ...counts };
  },
  set(path: string, n: number): void {
    if (counts[path] === n) return;
    counts = { ...counts, [path]: n };
    emit();
  },
  subscribe(fn: (c: Counts) => void): () => void {
    listeners.add(fn);
    fn({ ...counts });
    return () => { listeners.delete(fn); };
  },
};

/**
 * Best-effort refresh of every wired count. Silent on failure — the server
 * derives the organisation from the JWT, so no parameters are needed.
 */
export async function refreshNavCounts(): Promise<void> {
  try {
    const { data } = await apiClient.get('/api/v1/allocations', {
      params: { status: 'UNASSIGNED', page: 0, size: 1 },
    });
    const resp = unwrapApiResponse<{ totalElements?: number }>(data);
    if (typeof resp.totalElements === 'number') {
      navCounts.set('/app/allocations', resp.totalElements);
    }
  } catch {
    /* Keep the last known value (or no badge) — never surface a wrong count. */
  }
}

export function useNavCounts(): Counts {
  const [value, setValue] = useState<Counts>(() => navCounts.get());
  useEffect(() => navCounts.subscribe(setValue), []);
  return value;
}
