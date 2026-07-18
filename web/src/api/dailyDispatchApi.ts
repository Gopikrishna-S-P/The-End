import axiosInstance from './axiosInstance';
import type { ApiResponse, AllocationResponse } from '../types';

export interface CreateDailyDispatchRequest {
  agentId: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  caseIds: string[];
}

/**
 * Daily dispatch — TL curates a per-FO list of cases per date.
 * Tenant id is derived from the caller's JWT on the server, never sent here.
 */
export const dailyDispatchApi = {
  create: async (data: CreateDailyDispatchRequest): Promise<AllocationResponse[]> => {
    const r = await axiosInstance.post<ApiResponse<AllocationResponse[]>>(
      '/api/v1/daily-dispatch',
      data,
    );
    return r.data.data;
  },

  myList: async (date?: string): Promise<AllocationResponse[]> => {
    const r = await axiosInstance.get<ApiResponse<AllocationResponse[]>>(
      '/api/v1/daily-dispatch/me',
      { params: date ? { date } : undefined },
    );
    return r.data.data;
  },

  agentList: async (agentId: string, date?: string): Promise<AllocationResponse[]> => {
    const r = await axiosInstance.get<ApiResponse<AllocationResponse[]>>(
      `/api/v1/daily-dispatch/agent/${agentId}`,
      { params: date ? { date } : undefined },
    );
    return r.data.data;
  },

  /**
   * Drop a single case off a dispatch list. Server has no DELETE /{id} route —
   * removal is body-addressed via DELETE /case (agentId + date + allocationId).
   */
  removeCase: async (agentId: string, date: string, allocationId: string): Promise<void> => {
    await axiosInstance.delete('/api/v1/daily-dispatch/case', {
      data: { agentId, date, allocationId },
    });
  },

  /** LEADS-only. Count of dispatched entries for the org on a date (defaults to today). */
  orgSummary: async (date?: string): Promise<number> => {
    const r = await axiosInstance.get<ApiResponse<{ dispatched: number }>>(
      '/api/v1/daily-dispatch/org/summary',
      { params: date ? { date } : undefined },
    );
    return r.data.data.dispatched;
  },
};
