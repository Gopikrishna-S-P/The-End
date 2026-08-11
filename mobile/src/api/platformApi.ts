import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export interface PlatformStats {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  totalAllocations: number;
  totalUploads: number;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  code: string;
  orgType?: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  orgAdminEmail?: string;
}

export type RevenueBasis = 'contracted' | 'collected';

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  count: number;
}

export interface PlatformSubRow {
  orgId: string;
  orgName: string;
  orgCode: string;
  status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'INACTIVE';
  plan: 'NONE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  trialDaysLeft: number;
  lifetimeRevenue: number;
  compedPlan: 'STARTER' | 'GROWTH' | 'ENTERPRISE' | null;
  compedUntil: string | null;
  compedReason: string | null;
  compedAt: string | null;
  effectivePlan: 'NONE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
}

export const platformApi = {
  getStats: async (): Promise<PlatformStats> => {
    const r = await axiosInstance.get<ApiResponse<PlatformStats>>('/api/v1/platform/stats');
    return r.data.data;
  },

  listOrganizations: async (): Promise<OrganizationSummary[]> => {
    const r = await axiosInstance.get<ApiResponse<OrganizationSummary[]>>('/api/v1/platform/organizations');
    return r.data.data;
  },

  getRevenueTrend: async (
    granularity = 'monthly',
    periods = 0,
    basis: RevenueBasis = 'contracted',
  ): Promise<RevenueTrendPoint[]> => {
    const r = await axiosInstance.get<ApiResponse<RevenueTrendPoint[]>>(
      '/api/v1/platform/subscriptions/revenue-trend',
      { params: { granularity, periods, basis } },
    );
    return r.data.data;
  },

  listSubscriptions: async (): Promise<PlatformSubRow[]> => {
    const r = await axiosInstance.get<ApiResponse<PlatformSubRow[]>>('/api/v1/platform/subscriptions');
    return r.data.data;
  },
};
