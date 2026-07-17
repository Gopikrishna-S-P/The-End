import axiosInstance from './axiosInstance';
import type { ReportJobResponse, ApiResponse, PagedResponse } from '../types';

interface ReportRequest {
  organizationId: string;
  reportType: string;
  exportFormat: string;
  fromDate?: string;
  toDate?: string;
  filters?: Record<string, unknown>;
}

interface AgentPerformanceResponse {
  agentId: string;
  agentName: string;
  date: string;
  visitsCompleted: number;
  collectionsCount: number;
  totalAmountCollected: number;
  efficiencyScore: number;
}

interface TeamPerformanceResponse {
  teamSize: number;
  totalVisits: number;
  totalCollections: number;
  totalAmount: number;
  averageEfficiency: number;
}

export interface FoDaySessionRow {
  sessionId: string;
  allocationId: string | null;
  loanNumber: string | null;
  borrowerName: string | null;
  status: string;
  startedAt: string | null;
  reachedAt: string | null;
  waitingSince: string | null;
  closedAt: string | null;
  transitMins: number | null;
  waitingMins: number | null;
  totalMins: number | null;
  distanceKm: number;
  outcome: string | null;
  amountCollected: number | null;
  paymentMode: string | null;
}

export interface FoDayReportResponse {
  agentId: string;
  agentName: string;
  date: string;
  generatedAt: string;
  dayStartedAt: string | null;
  dayEndedAt: string | null;
  totalDayMins: number | null;
  totalDistanceKm: number;
  totalSessions: number;
  completedVisits: number;
  abandonedSessions: number;
  sessions: FoDaySessionRow[];
}

export interface MisEodCaseRow {
  loanNumber: string | null;
  borrowerName: string | null;
  status: string;
  startedAt: string | null;
  reachedAt: string | null;
  waitingSince: string | null;
  closedAt: string | null;
  transitMins: number | null;
  waitingMins: number | null;
  totalMins: number | null;
  distanceKm: number;
  outcome: string | null;
  amountCollected: number | null;
  paymentMode: string | null;
  /** Data-quality flag: MOCK_GPS | INSTANT | NO_MOVEMENT | OK | null. */
  flag: string | null;
}

export interface MisEodFoRow {
  agentId: string;
  agentName: string;
  loginTime: string | null;
  logoutTime: string | null;
  dispatched: number;
  visited: number;
  collected: number;
  amountCollected: number;
  ptpMade: number;
  nonContactable: number;
  distanceKm: number;
  cases: MisEodCaseRow[];
}

export interface MisEodReportResponse {
  date: string;
  organizationId: string;
  organizationName: string;
  generatedAt: string;
  totalDispatched: number;
  activeAgents: number;
  visitsCompleted: number;
  visitsInProgress: number;
  visitsAbandoned: number;
  completionRate: number;
  collectionsCount: number;
  totalCollected: number;
  ptpCount: number;
  totalPromised: number;
  nonContactableCount: number;
  pendingApprovals: number;
  foBreakdown: MisEodFoRow[];
}

interface DailyVisitCompletionResponse {
  date: string;
  totalAssigned: number;
  completed: number;
  pending: number;
  completionRate: number;
}

export const reportsApi = {
  getAgentPerformance: async (agentId: string, params: { date?: string; orgId?: string } = {}): Promise<AgentPerformanceResponse> => {
    const response = await axiosInstance.get<ApiResponse<AgentPerformanceResponse>>(`/api/v1/reports/agent/${agentId}/performance`, { params });
    return response.data.data;
  },

  getAgentRankings: async (orgId?: string, date?: string, page = 0, size = 20): Promise<PagedResponse<AgentPerformanceResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AgentPerformanceResponse>>>('/api/v1/reports/agent/rankings', {
      params: { orgId, date, page, size },
    });
    return response.data.data;
  },

  getTeamPerformance: async (params: { orgId?: string; from?: string; to?: string } = {}): Promise<TeamPerformanceResponse> => {
    const response = await axiosInstance.get<ApiResponse<TeamPerformanceResponse>>('/api/v1/reports/team/performance', { params });
    return response.data.data;
  },

  getDailyVisitCompletion: async (orgId?: string, date?: string): Promise<DailyVisitCompletionResponse> => {
    const response = await axiosInstance.get<ApiResponse<DailyVisitCompletionResponse>>('/api/v1/reports/visit-completion/daily', {
      params: { orgId, date },
    });
    return response.data.data;
  },

  getCollectionEfficiency: async (orgId?: string, from?: string, to?: string): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>('/api/v1/reports/collection-efficiency', {
      params: { orgId, from, to },
    });
    return response.data.data;
  },

  getReassignmentFrequency: async (orgId?: string, from?: string, to?: string): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>('/api/v1/reports/reassignment-frequency', {
      params: { orgId, from, to },
    });
    return response.data.data;
  },

  getLoanBookHistory: async (orgId?: string, page = 0, size = 20): Promise<PagedResponse<any>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<any>>>('/api/v1/reports/loan-book/history', {
      params: { orgId, page, size },
    });
    return response.data.data;
  },

  getLoanBook: async (orgId?: string, month?: number, year?: number): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>('/api/v1/reports/loan-book', {
      params: { orgId, month, year },
    });
    return response.data.data;
  },

  getBankReconciliation: async (orgId?: string, month?: number, year?: number): Promise<any> => {
    const response = await axiosInstance.get<ApiResponse<any>>('/api/v1/reports/bank-reconciliation', {
      params: { orgId, month, year },
    });
    return response.data.data;
  },

  generateReport: async (data: ReportRequest): Promise<ReportJobResponse> => {
    const response = await axiosInstance.post<ApiResponse<ReportJobResponse>>('/api/v1/reports/generate', data);
    return response.data.data;
  },

  getReportJob: async (jobId: string, orgId?: string): Promise<ReportJobResponse> => {
    const response = await axiosInstance.get<ApiResponse<ReportJobResponse>>(`/api/v1/reports/jobs/${jobId}`, {
      params: { orgId },
    });
    return response.data.data;
  },

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

  getFoDay: async (orgId: string, agentId: string, date?: string): Promise<FoDayReportResponse> => {
    const response = await axiosInstance.get<ApiResponse<FoDayReportResponse>>('/api/v1/reports/fo-day', {
      params: { orgId, agentId, date },
    });
    return response.data.data;
  },

  getMisEod: async (orgId: string, date?: string): Promise<MisEodReportResponse> => {
    const response = await axiosInstance.get<ApiResponse<MisEodReportResponse>>('/api/v1/reports/mis-eod', {
      params: { orgId, date },
    });
    return response.data.data;
  },

};
