import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse, NpaRiskLevel } from '../types';

// Ground truth: server NpaController.java (/api/v1/reports/npa/*). Field names
// below are copied 1:1 from NpaReportResponse / NpaFlagRequest — do not rename
// without checking both sides. UI-facing labels avoid the word "NPA" per
// web/docs/design-dna.md ("every loan is already an NPA; never surface the
// term") — this module instead frames everything as "risk exposure" /
// "overdue risk", while the wire fields themselves stay true to the DTO.

export interface RiskRecordResponse {
  id: string;
  allocationId: string;
  loanNumber: string | null;
  borrowerName: string | null;
  outstandingAmount: number;
  overdueDays: number;
  riskLevel: NpaRiskLevel;
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
  countByRiskLevel: Partial<Record<NpaRiskLevel, number>>;
  amountByRiskLevel: Partial<Record<NpaRiskLevel, number>>;
  records: RiskRecordResponse[] | null;
}

export interface FlagRiskRequest {
  organizationId: string;
  overdueThresholdDays: number;
}

export const npaApi = {
  /** POST /api/v1/reports/npa/flag — ADMINS only. Re-runs the overdue-threshold sweep. */
  flag: async (data: FlagRiskRequest): Promise<RiskReportResponse> => {
    const response = await axiosInstance.post<ApiResponse<RiskReportResponse>>('/api/v1/reports/npa/flag', data);
    return response.data.data;
  },

  /** GET /api/v1/reports/npa — READERS. Summary counts/amounts by risk level for a date. */
  getReport: async (orgId: string, date?: string): Promise<RiskReportResponse> => {
    const response = await axiosInstance.get<ApiResponse<RiskReportResponse>>('/api/v1/reports/npa', {
      params: { orgId, date },
    });
    return response.data.data;
  },

  /** GET /api/v1/reports/npa/records — READERS. Paginated, optionally filtered by risk level. */
  getRecords: async (
    orgId: string,
    riskLevel?: NpaRiskLevel,
    page = 0,
    size = 20,
  ): Promise<PagedResponse<RiskRecordResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<RiskRecordResponse>>>('/api/v1/reports/npa/records', {
      params: { orgId, riskLevel, page, size },
    });
    return response.data.data;
  },

  /** PATCH /api/v1/reports/npa/records/{id}/resolve — READERS. Marks one flagged record resolved. */
  resolve: async (id: string): Promise<void> => {
    await axiosInstance.patch(`/api/v1/reports/npa/records/${id}/resolve`);
  },
};
