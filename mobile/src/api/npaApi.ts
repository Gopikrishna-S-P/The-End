import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface RiskRecordResponse {
  id: string;
  allocationId: string;
  loanNumber: string | null;
  borrowerName: string | null;
  outstandingAmount: number;
  overdueDays: number;
  riskLevel: string;
  flaggedDate: string | null;
  lastPaymentDate: string | null;
  assignedAgentId: string | null;
}

export interface RiskReportResponse {
  organizationId: string;
  reportDate: string;
  totalNpaCount: number;
  totalNpaAmount: number;
  npaRatioPct: number;
  countByRiskLevel: Partial<Record<string, number>>;
  amountByRiskLevel: Partial<Record<string, number>>;
  records: RiskRecordResponse[] | null;
}

export interface FlagRiskRequest {
  organizationId: string;
  overdueThresholdDays: number;
}

export const npaApi = {
  flag: async (data: FlagRiskRequest): Promise<RiskReportResponse> => {
    const response = await axiosInstance.post<ApiResponse<RiskReportResponse>>('/api/v1/reports/npa/flag', data);
    return response.data.data;
  },

  getReport: async (orgId: string, date?: string): Promise<RiskReportResponse> => {
    const response = await axiosInstance.get<ApiResponse<RiskReportResponse>>('/api/v1/reports/npa', {
      params: { orgId, date },
    });
    return response.data.data;
  },

  getRecords: async (
    orgId: string,
    riskLevel?: string,
    page = 0,
    size = 20,
  ): Promise<PagedResponse<RiskRecordResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<RiskRecordResponse>>>('/api/v1/reports/npa/records', {
      params: { orgId, riskLevel, page, size },
    });
    return response.data.data;
  },

  resolve: async (id: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/reports/npa/records/${id}/resolve`);
  },
};
