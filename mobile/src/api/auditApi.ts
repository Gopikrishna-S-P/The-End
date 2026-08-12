import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface AuditLogResponse {
  id: string;
  organizationId: string;
  action: string;
  details?: string;
  userId: string;
  userEmail: string;
  performedByName?: string;
  allocationId?: string;
  reason?: string;
  createdAt: string;
}

export interface UserActionAuditResponse {
  id: string;
  userEmail: string;
  action: string;
  details?: string;
  createdAt: string;
}

export const auditApi = {
  /** ORG_ADMIN/MANAGER: assignment audit trail for the caller's organization */
  getByOrganization: async (page = 0, size = 50): Promise<PagedResponse<AuditLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AuditLogResponse>>>('/api/v1/audit-logs', {
      params: { page, size },
    });
    return response.data.data;
  },

  /** PLATFORM_ADMIN only: every admin/user action across the whole platform */
  getAllActionLogs: async (page = 0, size = 50): Promise<PagedResponse<UserActionAuditResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<UserActionAuditResponse>>>('/api/v1/audit-logs/actions', {
      params: { page, size },
    });
    return response.data.data;
  },
};
