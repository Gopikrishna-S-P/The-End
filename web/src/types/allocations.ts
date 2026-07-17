import type { AllocationStatus, AssignmentStatus, Priority, Role } from "./core";

export interface DashboardFilterRequest {
  trendMonths?: number;
  leaderboardSize?: number;
}

export interface TrendPoint {
  year: number;
  month: number;
  label: string;
  totalAmount: number;
  totalCount: number;
}

export interface AgentLeaderboardEntry {
  agentId: string;
  agentName: string;
  rank: number;
  totalCasesAssigned: number;
  totalCasesCompleted: number;
  totalCollected: number;
  completionRate: number;
  collectionEfficiency: number;
  ptpFulfilled: number;
  ptpBroken: number;
}

export interface TodayAssignmentEntry {
  assignmentId: string;
  allocationId: string;
  loanNumber: string;
  borrowerName: string;
  status: AssignmentStatus;
  priorityLevel: string;
  sequenceOrder?: number;
  npaFlagged: boolean;
}

export interface FieldAgentSection {
  agentId: string;
  agentFirstName: string;
  agentLastName: string;
  today: string;
  todayTotalCases: number;
  todayCompletedCases: number;
  todayPendingCases: number;
  todayRescheduledCases: number;
  todayCompletionRate: number;
  collectedAmountToday: number;
  collectionsSubmittedToday: number;
  collectedAmountThisWeek: number;
  collectionsThisWeek: number;
  pendingPtps: number;
  ptpsDueToday: number;
  ptpsFulfilledThisMonth: number;
  ptpsBrokenThisMonth: number;
  ptpFulfillmentRate: number;
  todayAssignments: TodayAssignmentEntry[];
}

export interface AgencyPerformanceSummary {
  agencyId: string;
  agencyName: string;
  totalAgents: number;
  activeAgents: number;
  totalAssignments: number;
  completedAssignments: number;
  collectionAmount: number;
  collectionEfficiency: number;
  pendingApprovals: number;
}

export interface AgencyAdminSection {
  agencyId: string;
  agencyName: string;
  totalAgents: number;
  activeAgents: number;
  totalAssignmentsToday: number;
  completedAssignmentsToday: number;
  pendingAssignmentsToday: number;
  collectionAmountToday: number;
  targetAmountToday: number;
  dailyTargetAchievementRate: number;
  pendingApprovals: number;
  collectionEfficiencyPercent: number;
  totalCollectionThisMonth: number;
  totalPtpPending: number;
  totalPtpBrokenThisMonth: number;
  agentLeaderboard: AgentLeaderboardEntry[];
  weeklyCollectionTrend: TrendPoint[];
}

export interface BankCollectionSummary {
  bankId: string;
  bankName: string;
  bankCode: string;
  collectionVolume: number;
}

export interface BankAdminSection {
  bankId: string;
  bankName: string;
  totalCases: number;
  assignedCases: number;
  assignmentPercentage: number;
  collectedCases: number;
  collectedAmount: number;
  pendingCases: number;
  npaFlaggedCases: number;
  recoveryRate: number;
  totalDue: number;
  totalOutstanding: number;
  totalAgencies: number;
  totalAgents: number;
  monthlyCollectionTrend: TrendPoint[];
  agencyBreakdown: AgencyPerformanceSummary[];
}

export interface PlatformAdminSection {
  totalBanks: number;
  activeBanks: number;
  totalAgencies: number;
  activeAgencies: number;
  totalAgents: number;
  activeAgents: number;
  totalAllocations: number;
  systemWideCollectionVolume: number;
  collectionGrowthRate: number;
  systemWideRecoveryRate: number;
  totalCollectionsThisMonth: number;
  collectionVolumeThisMonth: number;
  collectionVolumeLastMonth: number;
  monthlyCollectionTrend: TrendPoint[];
  topBanksByCollection: BankCollectionSummary[];
}

export interface UnifiedDashboardResponse {
  role: string;
  generatedAt: string;
  platformAdmin?: PlatformAdminSection;
  bankAdmin?: BankAdminSection;
  agencyAdmin?: AgencyAdminSection;
  fieldAgent?: FieldAgentSection;
}

export interface AllocationResponse {
  id: string;
  fileUploadId: string;
  organizationId: string;
  loanNumber: string;
  borrowerName: string;
  status: AllocationStatus;
  latestDisposition?: string;
  assignedToUserId?: string;
  assignedAt?: string;
  dynamicData: Record<string, unknown>;
  rowNumber?: number;
  npaFlagged?: boolean;
  totalDue?: number;
  outstandingAmount?: number;
  /** Monthly EMI — resolved server-side from dynamicData. */
  emi?: number;
  /** Display name of the assigned field officer (enriched server-side). */
  agentName?: string;
  /** Loose link to Borrower (server §10.3). Null for legacy rows. */
  borrowerId?: string;
  loanAccountNo?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AssignmentResponse {
  id: string;
  allocationId: string;
  agentId: string;
  organizationId: string;
  assignedBy: string;
  priority: Priority;
  status: AssignmentStatus;
  assignmentDate: string;
  sequenceOrder?: number;
  reassignmentReason?: string;
  previousAgentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BulkAssignRequest {
  agentId: string;
  organizationId: string;
  assignmentDate: string;
  allocationIds: string[];
  priority: Priority;
  strictMode?: boolean;
  sequenceOrders?: Array<{ allocationId: string; sequenceOrder: number }>;
}

