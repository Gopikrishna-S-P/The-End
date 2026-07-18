import axiosInstance from './axiosInstance';
import type { AuditLogResponse, ApiResponse, PagedResponse, UserActionAuditResponse } from '../types';

export const auditApi = {
  /** PLATFORM_ADMIN/ORG_ADMIN/MANAGER: audit trail for the caller's own organization. */
  getByOrganization: async (page = 0, size = 20): Promise<PagedResponse<AuditLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AuditLogResponse>>>('/api/v1/audit-logs', {
      params: { page, size },
    });
    return response.data.data;
  },

  getAssignmentAuditLogs: async (assignmentId: string, page = 0, size = 20): Promise<PagedResponse<AuditLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AuditLogResponse>>>(`/api/v1/audit-logs/assignment/${assignmentId}`, {
      params: { page, size },
    });
    return response.data.data;
  },

  /** Not paginated on the backend — returns the full list for the allocation's loan number. */
  getAllocationAuditLogs: async (allocationId: string): Promise<AuditLogResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<AuditLogResponse[]>>(`/api/v1/audit-logs/allocation/${allocationId}`);
    return response.data.data;
  },

  getUserAuditLogs: async (userId: string, page = 0, size = 20): Promise<PagedResponse<AuditLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AuditLogResponse>>>(`/api/v1/audit-logs/user/${userId}`, {
      params: { page, size },
    });
    return response.data.data;
  },

  getUserActionLogs: async (userId: string, page = 0, size = 20): Promise<PagedResponse<UserActionAuditResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<UserActionAuditResponse>>>(`/api/v1/audit-logs/actions/user/${userId}`, {
      params: { page, size },
    });
    return response.data.data;
  },

  /** PLATFORM_ADMIN only: every admin/user action across the whole platform. */
  getAllActionLogs: async (page = 0, size = 20): Promise<PagedResponse<UserActionAuditResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<UserActionAuditResponse>>>('/api/v1/audit-logs/actions', {
      params: { page, size },
    });
    return response.data.data;
  },
};
