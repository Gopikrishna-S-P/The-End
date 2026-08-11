import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export type FlagSource = 'PLAN' | 'MANUAL';

export interface FeatureFlag {
  id?: string;
  organizationId: string | null;
  flagKey: string;
  enabled: boolean;
  source: FlagSource;
  description?: string | null;
  updatedAt?: string;
}

export interface UpsertFlagRequest {
  organizationId: string | null;
  flagKey: string;
  enabled: boolean;
  description?: string;
}

export const featureFlagsApi = {
  list: async (organizationId?: string | null): Promise<FeatureFlag[]> => {
    const params: Record<string, string> = {};
    if (organizationId) params.organizationId = organizationId;
    const r = await axiosInstance.get<ApiResponse<FeatureFlag[]>>(
      '/api/v1/admin/feature-flags',
      { params },
    );
    return r.data.data;
  },

  upsert: async (body: UpsertFlagRequest): Promise<string> => {
    const r = await axiosInstance.put<ApiResponse<string>>(
      '/api/v1/admin/feature-flags',
      body,
    );
    return r.data.data;
  },
};
