import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

export type FlagSource = 'PLAN' | 'MANUAL';

export interface FeatureFlag {
  id?: string;
  organizationId: string | null;
  flagKey: string;
  enabled: boolean;
  source: FlagSource;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertFlagRequest {
  organizationId: string | null;
  flagKey: string;
  enabled: boolean;
  description?: string;
}

export const featureFlagsApi = {
  /** Platform admin: list flags for a specific org (pass null for global defaults). */
  list: async (organizationId?: string | null): Promise<FeatureFlag[]> => {
    const params: Record<string, string> = {};
    if (organizationId) params.organizationId = organizationId;
    const response = await axiosInstance.get<ApiResponse<FeatureFlag[]>>(
      '/api/v1/admin/feature-flags',
      { params },
    );
    return response.data.data;
  },

  /** Platform admin: upsert a global flag. */
  upsert: async (body: UpsertFlagRequest): Promise<FeatureFlag> => {
    const response = await axiosInstance.put<ApiResponse<FeatureFlag>>(
      '/api/v1/admin/feature-flags',
      body,
    );
    return response.data.data;
  },

  /** Org user: get the current org's resolved feature flags. */
  getForCurrentOrg: async (): Promise<FeatureFlag[]> => {
    const response = await axiosInstance.get<ApiResponse<FeatureFlag[]>>(
      '/api/v1/feature-flags',
    );
    return response.data.data;
  },

  /** Platform admin: set a MANUAL override for an org's flag. */
  setOverride: async (orgId: string, flagKey: string, enabled: boolean): Promise<FeatureFlag> => {
    const response = await axiosInstance.put<ApiResponse<FeatureFlag>>(
      `/api/v1/admin/feature-flags/${orgId}/${flagKey}/override`,
      { enabled },
    );
    return response.data.data;
  },

  /** Platform admin: delete a MANUAL override — reverts to plan default. */
  deleteOverride: async (orgId: string, flagKey: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/admin/feature-flags/${orgId}/${flagKey}/override`);
  },
};
