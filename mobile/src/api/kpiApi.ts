import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export interface OrgOverviewSection {
  organizationId: string;
  organizationName: string;
  totalAllocations: number;
  assignedAllocations: number;
  unassignedAllocations: number;
  totalUsers: number;
  collectionVolumeThisMonth: number;
  collectionsThisMonth: number;
  outstandingTotal?: number;
}

export interface KpiMetricResponse {
  metricName: string;
  targetValue: number;
  currentValue: number;
  status: string;
}

export const kpiApi = {
  getOrgMetrics: async (orgId: string): Promise<KpiMetricResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<KpiMetricResponse[]>>(`/api/v1/kpi/organization/${orgId}`);
    return response.data.data;
  },
};
