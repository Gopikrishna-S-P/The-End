import axiosInstance from './axiosInstance';
import type { PtpResponse, CreatePtpRequest, UpdatePtpStatusRequest, ApiResponse, PagedResponse } from '../types';

interface PtpFilterRequest {
  organizationId?: string;
  status?: string;
  agentId?: string;
  fromDate?: string;
  toDate?: string;
}

interface PtpHistoryResponse {
  ptpId: string;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

interface PtpStatisticsResponse {
  agentId: string;
  totalPtps: number;
  fulfilled: number;
  broken: number;
  partial: number;
  fulfillmentRate: number;
}

export const ptpsApi = {
  createPtp: async (data: CreatePtpRequest): Promise<PtpResponse> => {
    const response = await axiosInstance.post<ApiResponse<PtpResponse>>('/api/v1/ptps', data);
    return response.data.data;
  },

  listPtps: async (params: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDir?: string;
  }, filterData?: PtpFilterRequest): Promise<PagedResponse<PtpResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<PtpResponse>>>('/api/v1/ptps', {
      params: { ...filterData, ...params },
    });
    return response.data.data;
  },

  getPtpById: async (id: string): Promise<PtpResponse> => {
    const response = await axiosInstance.get<ApiResponse<PtpResponse>>(`/api/v1/ptps/${id}`);
    return response.data.data;
  },

  getPtpsByAllocation: async (allocationId: string): Promise<PtpResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<PtpResponse[]>>(`/api/v1/ptps/allocation/${allocationId}`);
    return response.data.data;
  },

  updatePtpStatus: async (id: string, data: UpdatePtpStatusRequest): Promise<PtpResponse> => {
    const response = await axiosInstance.patch<ApiResponse<PtpResponse>>(`/api/v1/ptps/${id}/status`, data);
    return response.data.data;
  },

  deletePtp: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/ptps/${id}`);
  },

  getPtpHistory: async (id: string): Promise<PtpHistoryResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<PtpHistoryResponse[]>>(`/api/v1/ptps/${id}/history`);
    return response.data.data;
  },

  getAllocationHistory: async (allocationId: string): Promise<PtpHistoryResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<PtpHistoryResponse[]>>(`/api/v1/ptps/allocation/${allocationId}/history`);
    return response.data.data;
  },

  getAgentStatistics: async (agentId: string): Promise<PtpStatisticsResponse> => {
    const response = await axiosInstance.get<ApiResponse<PtpStatisticsResponse>>(`/api/v1/ptps/agents/${agentId}/statistics`);
    return response.data.data;
  },

  markBrokenPtps: async (): Promise<void> => {
    await axiosInstance.post('/api/v1/ptps/scheduler/mark-broken');
  },

  sendReminders: async (): Promise<void> => {
    await axiosInstance.post('/api/v1/ptps/scheduler/send-reminders');
  },

  exportCsv: async (params?: { fromDate?: string; toDate?: string }): Promise<string> => {
    const response = await axiosInstance.get<string>('/api/v1/ptps/export', {
      params,
      responseType: 'text',
      headers: { Accept: 'text/csv' },
    });
    return response.data;
  },

  getBankPtps: async (params: {
    orgId?: string;
    agentId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<any>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<any>>>('/api/v1/ptps/bank', { params });
    return response.data.data;
  },
};
