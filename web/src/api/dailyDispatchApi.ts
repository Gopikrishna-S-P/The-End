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

  removeOne: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/daily-dispatch/${id}`);
  },
};
