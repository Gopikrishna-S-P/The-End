import axiosInstance from './axiosInstance';
import type { FieldAgentSection, ApiResponse } from '../types';

export type { FieldAgentSection };

export interface OrgOverviewSection {
  organizationId: string;
  organizationName: string;
  organizationCode?: string;
  totalAllocations: number;
  assignedAllocations: number;
  unassignedAllocations: number;
  totalUsers: number;
  collectionVolumeThisMonth: number;
  collectionsThisMonth: number;
  outstandingTotal?: number;
}

export interface OrgTodaySection {
  collectedToday: number;
  collectedYesterday: number;
  visitsTotalToday: number;
  visitsCompletedToday: number;
  visitsInProgressToday: number;
  visitsPendingToday: number;
  fosTotalCount: number;
  fosActiveToday: number;
  fosIdleToday: number;
  ptpsDueToday: number;
  ptpAmountDueToday: number;
}

export interface CallerSection {
  casesAssignedToday: number;
  callsCompletedToday: number;
  callsPendingToday: number;
  ptpsMadeToday: number;
  amountCommittedToday: number;
}

export interface TrendPoint {
  year: number;
  month: number;
  label: string;
  totalAmount: number;
  totalCount: number;
}

export interface TopAgentPoint {
  name: string;
  amount: number;
  count: number;
}

export interface CollectionsSection {
  collectionVolumeThisMonth: number;
  collectionCountThisMonth: number;
  collectionVolumeLastMonth: number;
  growthRate: number;
  monthlyTrend: TrendPoint[];
  ptpMonthlyTrend: TrendPoint[];
  visitMonthlyTrend: TrendPoint[];
  topAgents?: TopAgentPoint[];
}

export interface CaseAgeBucket {
  label: string;
  count: number;
}

export interface AllocationsSection {
  totalAllocations: number;
  assignedCount: number;
  unassignedCount: number;
  npaFlaggedCount: number;
  caseAgeBuckets?: CaseAgeBucket[];
}

export interface PtpSummarySection {
  activePtps: number;
  brokenPtpsThisMonth: number;
  fulfilledPtpsThisMonth: number;
  fulfillmentRatePct: number;
}

export interface TeamSection {
  totalUsers: number;
  activeUsers: number;
  usersByRole: { roleName: string; count: number }[];
}

export interface PlatformAdminSection {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalAllocations: number;
  systemWideCollectionVolume: number;
  collectionVolumeThisMonth: number;
  collectionVolumeLastMonth: number;
  collectionGrowthRate: number;
  totalCollectionsThisMonth: number;
  monthlyCollectionTrend: TrendPoint[];
  topOrgsByCollection: { id: string; name: string; code: string; userCount: number }[];
}

export type DashboardRole =
  | 'PLATFORM_ADMIN'
  | 'ORG_ADMIN'
  | 'MANAGER'
  | 'TL'
  | 'FO'
  | 'CALLER';

export interface UnifiedDashboardData {
  role: DashboardRole;
  organizationId?: string;
  generatedAt: string;
  // PLATFORM_ADMIN only
  platform?: PlatformAdminSection;
  // strategic / cumulative
  orgOverview?: OrgOverviewSection;
  // today operational (ORG_ADMIN / MANAGER / TL)
  orgToday?: OrgTodaySection;
  // permission-gated sections
  collections?: CollectionsSection;
  allocations?: AllocationsSection;
  ptpSummary?: PtpSummarySection;
  team?: TeamSection;
  // role-specific today views
  callerToday?: CallerSection;
}

export const dashboardApi = {
  unified: async (trendMonths = 12): Promise<UnifiedDashboardData> => {
    const r = await axiosInstance.get<ApiResponse<UnifiedDashboardData>>(
      '/api/v1/analytics/dashboard', { params: { trendMonths } });
    return r.data.data;
  },

  fieldAgent: async (agentId: string): Promise<FieldAgentSection> => {
    const r = await axiosInstance.get<ApiResponse<FieldAgentSection>>(`/api/v1/dashboard/field-agent/${agentId}`);
    return r.data.data;
  },
};
