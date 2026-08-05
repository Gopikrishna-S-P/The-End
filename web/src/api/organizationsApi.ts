import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';
import type { OrganizationSummary } from './platformApi';

export interface UpdateOrganizationRequest {
  name: string;
}

/**
 * Caller's own tenant. The server derives organizationId from the JWT, so
 * none of these calls take an org id in the URL.
 */
export const organizationsApi = {
  getMyOrganization: async (): Promise<OrganizationSummary> => {
    const r = await axiosInstance.get<ApiResponse<OrganizationSummary>>(
      '/api/v1/organizations/me',
    );
    return r.data.data;
  },

  updateMyOrganization: async (
    data: UpdateOrganizationRequest,
  ): Promise<OrganizationSummary> => {
    const r = await axiosInstance.patch<ApiResponse<OrganizationSummary>>(
      '/api/v1/organizations/me',
      data,
    );
    return r.data.data;
  },
};
