import axiosInstance from './axiosInstance';
import type { ReportJobResponse, ApiResponse, PagedResponse, NpaRiskLevel } from '../types';

// Ground truth: server ReportingController.java (/api/v1/reports/*) and
// ExportController.java (/api/v1/reports/export/*). Field names below are copied
// 1:1 from the server response DTOs — do not rename without checking both sides.

export interface ReportRequest {
  organizationId: string;
  reportType: string;
  exportFormat: string;
  fromDate?: string;
  toDate?: string;
  agentId?: string;
  teamId?: number;
  month?: number;
  year?: number;
}

export interface AgentPerformanceResponse {
  agentId: string;
  organizationId: string;
  snapshotDate: string;
  totalAssigned: number;
  totalVisited: number;
  totalCollected: number;
  totalPending: number;
  totalReassignedOut: number;
  totalReassignedIn: number;
  amountCollected: number;
  amountOutstanding: number;
  visitCompletionRate: number;
  collectionEfficiency: number;
  efficiencyScore: number;
  rankInOrg: number | null;
}

export interface TeamPerformanceResponse {
  organizationId: string;
  fromDate: string;
  toDate: string;
  totalAgents: number;
  totalAssigned: number;
  totalVisited: number;
  totalCollected: number;
  totalAmountCollected: number;
  totalAmountOutstanding: number;
  avgCollectionEfficiency: number;
  avgVisitCompletionRate: number;
  overallEfficiencyScore: number;
  agentBreakdown: AgentPerformanceResponse[];
}

export interface AgentDailyRow {
  agentId: string;
  assigned: number;
  visited: number;
  pending: number;
  completionRate: number;
}

export interface DailyVisitCompletionResponse {
  reportDate: string;
  organizationId: string;
  totalAgentsWorking: number;
  totalAssigned: number;
  totalVisited: number;
  totalPending: number;
  overallCompletionRate: number;
  agentRows: AgentDailyRow[];
}

export interface AgentEfficiencyRow {
  agentId: string;
  amountOutstanding: number;
  amountCollected: number;
  efficiencyPct: number;
  recoveryRatePct: number;
  rank: number;
}

export interface CollectionEfficiencyResponse {
  organizationId: string;
  fromDate: string;
  toDate: string;
  totalOutstanding: number;
  totalCollected: number;
  collectionEfficiencyPct: number;
  recoveryRatePct: number;
  agentBreakdown: AgentEfficiencyRow[];
}

export interface AgentReassignmentRow {
  agentId: string;
  reassignedOut: number;
  reassignedIn: number;
  netReassignments: number;
  reassignmentRate: number;
}

export interface ReassignmentFrequencyResponse {
  organizationId: string;
  fromDate: string;
  toDate: string;
  totalReassignments: number;
  avgReassignmentsPerAgent: number;
  agentBreakdown: AgentReassignmentRow[];
}

export interface MonthlyLoanBookResponse {
  organizationId: string;
  snapshotMonth: string;
  totalLoans: number;
  totalOutstandingAmount: number;
  totalCollectedAmount: number;
  totalNpaCount: number;
  totalNpaAmount: number;
  totalAssignedLoans: number;
  totalUnassignedLoans: number;
  collectionEfficiencyPct: number;
  recoveryRatePct: number;
}

export interface BankReconciliationRow {
  collectionId: string;
  receiptNumber: string;
  loanNumber: string | null;
  borrowerName: string | null;
  amount: number;
  paymentMode: string;
  status: string;
  collectionDate: string | null;
  depositedDate: string | null;
  agentId: string | null;
}

export interface BankReconciliationResponse {
  organizationId: string;
  month: number;
  year: number;
  generatedOn: string;
  totalCollectedCash: number;
  totalCollectedUpi: number;
  totalCollectedCheque: number;
  totalCollectedNeft: number;
  totalCollectedRtgs: number;
  grandTotalCollected: number;
  totalApprovedTransactions: number;
  totalDepositedTransactions: number;
  totalPendingDeposit: number;
  totalDepositedAmount: number;
  totalPendingDepositAmount: number;
  npaBreakdown: Partial<Record<NpaRiskLevel, number>>;
  totalNpaAmount: number;
  rows: BankReconciliationRow[];
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

  getCollectionEfficiency: async (orgId?: string, from?: string, to?: string): Promise<CollectionEfficiencyResponse> => {
    const response = await axiosInstance.get<ApiResponse<CollectionEfficiencyResponse>>('/api/v1/reports/collection-efficiency', {
      params: { orgId, from, to },
    });
    return response.data.data;
  },

  getReassignmentFrequency: async (orgId?: string, from?: string, to?: string): Promise<ReassignmentFrequencyResponse> => {
    const response = await axiosInstance.get<ApiResponse<ReassignmentFrequencyResponse>>('/api/v1/reports/reassignment-frequency', {
      params: { orgId, from, to },
    });
    return response.data.data;
  },

  getLoanBookHistory: async (orgId?: string, page = 0, size = 20): Promise<PagedResponse<MonthlyLoanBookResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<MonthlyLoanBookResponse>>>('/api/v1/reports/loan-book/history', {
      params: { orgId, page, size },
    });
    return response.data.data;
  },

  getLoanBook: async (orgId?: string, month?: number, year?: number): Promise<MonthlyLoanBookResponse> => {
    const response = await axiosInstance.get<ApiResponse<MonthlyLoanBookResponse>>('/api/v1/reports/loan-book', {
      params: { orgId, month, year },
    });
    return response.data.data;
  },

  getBankReconciliation: async (orgId?: string, month?: number, year?: number): Promise<BankReconciliationResponse> => {
    const response = await axiosInstance.get<ApiResponse<BankReconciliationResponse>>('/api/v1/reports/bank-reconciliation', {
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

  /**
   * Blob download for a completed report job. Ground truth: ExportController is
   * mounted at /api/v1/reports/export (nested under ReportingController's
   * /api/v1/reports) — the route is .../reports/export/jobs/{jobId}/download,
   * NOT .../reports/jobs/{jobId}/download (that path only has a GET-status route).
   */
  downloadReportJob: async (jobId: string, orgId: string): Promise<Blob> => {
    const response = await axiosInstance.get(`/api/v1/reports/export/jobs/${jobId}/download`, {
      params: { orgId },
      responseType: 'blob',
    });
    return response.data;
  },
};
