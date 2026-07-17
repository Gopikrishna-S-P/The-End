import axiosInstance from './axiosInstance';
import type { ApiResponse, UserResponse } from '../types';

export interface OrganizationSummary {
  id: string;
  name: string;
  code: string;
  orgType?: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  orgAdminEmail?: string;
  orgAdminFirstName?: string;
  orgAdminLastName?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  code: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;
}

export interface UpdateOrganizationRequest {
  name: string;
  code: string;
}

export interface UpdateOrgAdminRequest {
  firstName: string;
  lastName: string;
  email: string;
}

export const platformApi = {
  listOrganizations: async (): Promise<OrganizationSummary[]> => {
    const r = await axiosInstance.get<ApiResponse<OrganizationSummary[]>>(
      '/api/v1/platform/organizations',
    );
    return r.data.data;
  },

  getOrganization: async (id: string): Promise<OrganizationSummary> => {
    const r = await axiosInstance.get<ApiResponse<OrganizationSummary>>(
      `/api/v1/platform/organizations/${id}`,
    );
    return r.data.data;
  },

  createOrganization: async (data: CreateOrganizationRequest): Promise<OrganizationSummary> => {
    const r = await axiosInstance.post<ApiResponse<OrganizationSummary>>(
      '/api/v1/platform/organizations',
      data,
    );
    return r.data.data;
  },

  updateOrganization: async (id: string, data: UpdateOrganizationRequest): Promise<OrganizationSummary> => {
    const r = await axiosInstance.patch<ApiResponse<OrganizationSummary>>(
      `/api/v1/platform/organizations/${id}`,
      data,
    );
    return r.data.data;
  },

  updateOrgAdmin: async (id: string, data: UpdateOrgAdminRequest): Promise<OrganizationSummary> => {
    const r = await axiosInstance.patch<ApiResponse<OrganizationSummary>>(
      `/api/v1/platform/organizations/${id}/admin`,
      data,
    );
    return r.data.data;
  },

  deleteOrganization: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/platform/organizations/${id}`);
  },

  setActive: async (id: string, active: boolean): Promise<OrganizationSummary> => {
    const r = await axiosInstance.patch<ApiResponse<OrganizationSummary>>(
      `/api/v1/platform/organizations/${id}/active`,
      null,
      { params: { active } },
    );
    return r.data.data;
  },

  listAdminUsers: async (): Promise<UserResponse[]> => {
    const r = await axiosInstance.get<ApiResponse<UserResponse[]>>('/api/v1/platform/users');
    return r.data.data;
  },

  createAdminUser: async (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId?: string;
  }): Promise<UserResponse> => {
    const r = await axiosInstance.post<ApiResponse<UserResponse>>('/api/v1/platform/users', data);
    return r.data.data;
  },

  getStats: async (): Promise<PlatformStats> => {
    const r = await axiosInstance.get<ApiResponse<PlatformStats>>('/api/v1/platform/stats');
    return r.data.data;
  },

  getAnalytics: async (months = 6): Promise<PlatformAnalytics> => {
    const r = await axiosInstance.get<ApiResponse<PlatformAnalytics>>(
      '/api/v1/platform/analytics',
      { params: { months } },
    );
    return r.data.data;
  },

  listSubscriptions: async (): Promise<PlatformSubRow[]> => {
    const r = await axiosInstance.get<ApiResponse<PlatformSubRow[]>>(
      '/api/v1/platform/subscriptions',
    );
    return r.data.data;
  },

  getRevenueTrend: async (granularity = 'monthly', periods = 0): Promise<RevenueTrendPoint[]> => {
    const r = await axiosInstance.get<ApiResponse<RevenueTrendPoint[]>>(
      '/api/v1/platform/subscriptions/revenue-trend',
      { params: { granularity, periods } },
    );
    return r.data.data;
  },

  listInvoices: async (orgId: string): Promise<InvoiceRow[]> => {
    const r = await axiosInstance.get<ApiResponse<InvoiceRow[]>>(
      `/api/v1/platform/subscriptions/${orgId}/invoices`,
    );
    return r.data.data;
  },

  changePlan: async (orgId: string, plan: string): Promise<void> => {
    await axiosInstance.put(`/api/v1/platform/subscriptions/${orgId}/plan`, { plan });
  },
};

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
}

export interface RevenueTrendPoint {
  month: string;
  revenue: number;
  count: number;
}

/** Monthly point from the platform analytics endpoint (mirrors server TrendPoint). */
export interface PlatformTrendPoint {
  year: number;
  month: number;
  label: string;
  totalAmount: number;
  totalCount: number;
}

export interface PlatformAnalytics {
  mrr: number;
  arr: number;
  mrrGrowthRate: number;
  payingOrgs: number;
  trialOrgs: number;
  trialsEndingSoon: number;
  planCounts: { none: number; starter: number; growth: number; enterprise: number };
  statusCounts: { trial: number; active: number; pastDue: number; cancelled: number; inactive: number };
  revenueTrend: PlatformTrendPoint[];
  orgGrowthTrend: PlatformTrendPoint[];
  topOrgsByUsers: { name: string; value: number }[];
  userGrowthTrend: PlatformTrendPoint[];
}

export interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  amountPaid: number;
  currency: string;
  date: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export interface PlatformStats {
  totalOrgs: number;
  activeOrgs: number;
  inactiveOrgs: number;
  newOrgsThisMonth: number;
  totalUsers: number;
  roleBreakdown: {
    orgAdmin: number;
    manager: number;
    tl: number;
    fo: number;
    caller: number;
    tracer: number;
  };
  totalAllocations: number;
  totalUploads: number;
  totalRowsProcessed: number;
  uploadsLast7Days: number;
  pendingUserRequests: number;
  staleOrgs: number;
}
