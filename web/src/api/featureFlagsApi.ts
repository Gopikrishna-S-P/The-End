import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

export type FlagSource = 'PLAN' | 'MANUAL';

/** Mirrors server FeatureFlagAdminResponse — returned by GET /api/v1/admin/feature-flags. */
export interface FeatureFlag {
  id?: string;
  organizationId: string | null;
  flagKey: string;
  enabled: boolean;
  source: FlagSource;
  description?: string | null;
  updatedByUserId?: string | null;
  updatedAt?: string;
}

/** Minimal shape returned by GET /api/v1/feature-flags (self-service, resolved-for-caller-org). */
export interface ResolvedFeatureFlag {
  flagKey: string;
  enabled: boolean;
}

export interface UpsertFlagRequest {
  organizationId: string | null;
  flagKey: string;
  enabled: boolean;
  description?: string;
}

export const featureFlagsApi = {
  /** Platform admin (organizationId omitted → global) or org admin (own org only): list flags. */
  list: async (organizationId?: string | null): Promise<FeatureFlag[]> => {
    const params: Record<string, string> = {};
    if (organizationId) params.organizationId = organizationId;
    const response = await axiosInstance.get<ApiResponse<FeatureFlag[]>>(
      '/api/v1/admin/feature-flags',
      { params },
    );
    return response.data.data;
  },

  /** Platform admin (global, organizationId null) or org admin (own org): create/update a flag.
   *  Backend returns a confirmation message, not the flag object — re-fetch via list() to refresh. */
  upsert: async (body: UpsertFlagRequest): Promise<string> => {
    const response = await axiosInstance.put<ApiResponse<string>>(
      '/api/v1/admin/feature-flags',
      body,
    );
    return response.data.data;
  },

  /** Org user: get the current org's resolved feature flags (flagKey + enabled only). */
  getForCurrentOrg: async (): Promise<ResolvedFeatureFlag[]> => {
    const response = await axiosInstance.get<ApiResponse<ResolvedFeatureFlag[]>>(
      '/api/v1/feature-flags',
    );
    return response.data.data;
  },

  /** Platform admin (any org) or org admin (own org): set a MANUAL override for an org's flag. */
  setOverride: async (orgId: string, flagKey: string, enabled: boolean): Promise<string> => {
    const response = await axiosInstance.put<ApiResponse<string>>(
      '/api/v1/admin/feature-flags',
      { organizationId: orgId, flagKey, enabled },
    );
    return response.data.data;
  },

  /** Platform admin (global) or platform/org admin (org): delete a MANUAL flag.
   *  For an org, reverts to the plan default; for global (orgId null), deletes it outright. */
  deleteOverride: async (orgId: string | null, flagKey: string): Promise<string> => {
    const response = await axiosInstance.delete<ApiResponse<string>>(
      `/api/v1/admin/feature-flags/${flagKey}`,
      { params: orgId ? { organizationId: orgId } : {} },
    );
    return response.data.data;
  },
};
