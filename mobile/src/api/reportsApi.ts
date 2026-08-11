import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface ReportJobResponse {
  id: string;
  organizationId: string;
  reportType: string;
  exportFormat: string;
  status: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  requestedBy: string;
  errorMessage: string | null;
  completedAt: string | null;
  createdAt: string;
}

export const reportsApi = {
  listReportJobs: async (params: {
    orgId?: string;
    type?: string;
    status?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<ReportJobResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<ReportJobResponse>>>('/api/v1/reports/jobs', { params });
    return response.data.data;
  },
};
