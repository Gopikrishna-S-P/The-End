import axiosInstance from './axiosInstance';
import type { AuditLogResponse, ApiResponse, PagedResponse } from '../types';

export const auditApi = {
  getAssignmentAuditLogs: async (assignmentId: string, page = 0, size = 20): Promise<PagedResponse<AuditLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AuditLogResponse>>>(`/api/v1/audit-logs/assignment/${assignmentId}`, {
      params: { page, size },
    });
    return response.data.data;
  },

  getAllocationAuditLogs: async (allocationId: string, page = 0, size = 20): Promise<PagedResponse<AuditLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AuditLogResponse>>>(`/api/v1/audit-logs/allocation/${allocationId}`, {
      params: { page, size },
    });
    return response.data.data;
  },

  getUserAuditLogs: async (userId: string, page = 0, size = 20): Promise<PagedResponse<AuditLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AuditLogResponse>>>(`/api/v1/audit-logs/user/${userId}`, {
      params: { page, size },
    });
    return response.data.data;
  },

  getUserActionLogs: async (userId: string, page = 0, size = 20): Promise<PagedResponse<any>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<any>>>(`/api/v1/audit-logs/actions/user/${userId}`, {
      params: { page, size },
    });
    return response.data.data;
  },

  getAllActionLogs: async (page = 0, size = 20): Promise<PagedResponse<any>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<any>>>('/api/v1/audit-logs/actions', {
      params: { page, size },
    });
    return response.data.data;
  },
};
