import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';

export interface SubscriptionInfo {
  status: string;
  plan: string;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  hasStripeCustomer: boolean;
  hasActiveSubscription: boolean;
  trialDaysLeft: number;
}

export const subscriptionApi = {
  get: async (): Promise<SubscriptionInfo> => {
    const r = await axiosInstance.get<ApiResponse<SubscriptionInfo>>('/api/v1/subscription');
    return r.data.data;
  },
};
