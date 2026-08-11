import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export interface OrganizationSummary {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  orgAdminEmail?: string;
}

export interface UpdateOrganizationRequest {
  name: string;
}

export const organizationsApi = {
  getMyOrganization: async (): Promise<OrganizationSummary> => {
    const r = await axiosInstance.get<ApiResponse<OrganizationSummary>>(
      '/api/v1/organizations/me',
    );
    return r.data.data;
  },

  updateMyOrganization: async (data: UpdateOrganizationRequest): Promise<OrganizationSummary> => {
    const r = await axiosInstance.patch<ApiResponse<OrganizationSummary>>(
      '/api/v1/organizations/me',
      data,
    );
    return r.data.data;
  },
};
