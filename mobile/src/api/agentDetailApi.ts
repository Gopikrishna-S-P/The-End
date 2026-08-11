import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';
import type { VisitLogResponse } from '@/types/domain';

export interface AgentPerfResponse {
  agentId: string;
  totalAssigned: number;
  totalVisited: number;
  totalCollected: number;
  totalPending: number;
  amountCollected: number;
  amountOutstanding: number;
  visitCompletionRate: number;
  collectionEfficiency: number;
  efficiencyScore: number;
  rankInOrg: number;
}

export const agentDetailApi = {
  getPerformance: async (orgId: string, agentId: string): Promise<AgentPerfResponse | null> => {
    const todayIso = new Date().toISOString().split('T')[0];
    const [year, month] = todayIso.split('-');
    const from = `${year}-${month}-01`;
    const response = await axiosInstance.get(`/api/v1/reports/team/performance`, {
      params: { orgId, from, to: todayIso },
    });
    const breakdown: AgentPerfResponse[] = response.data?.data?.agentBreakdown ?? [];
    return breakdown.find((a) => a.agentId === agentId) ?? null;
  },

  getVisits: async (agentId: string): Promise<VisitLogResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<VisitLogResponse>>>(`/api/v1/visit-logs/agent/${agentId}`, {
      params: { page: 0, size: 20 },
    });
    const d = response.data?.data;
    return Array.isArray(d) ? d : d?.content ?? [];
  },
};
