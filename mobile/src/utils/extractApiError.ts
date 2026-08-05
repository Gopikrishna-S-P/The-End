import axios from 'axios';
import type { ApiError } from '@/types/core';

/** True when the request never reached the server (offline, DNS, timeout) — distinct from a server-side 4xx/5xx. */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}

export function extractApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.message) return data.message;
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.';
  }
  return fallback;
}
