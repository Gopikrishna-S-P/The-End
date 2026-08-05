import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'INACTIVE';
export type SubscriptionPlan   = 'NONE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  hasStripeCustomer: boolean;
  hasActiveSubscription: boolean;
  trialDaysLeft: number;
}

export interface PlanInfo {
  key: SubscriptionPlan;
  name: string;
  price: string;
  priceNote: string;
  features: string[];
  highlighted?: boolean;
  free?: boolean;
}

export const PLANS: PlanInfo[] = [
  {
    key: 'STARTER',
    name: 'Starter',
    price: 'Free',
    priceNote: 'forever',
    free: true,
    features: [
      'Up to 10 users',
      'Up to 5,000 loan cases',
      'File uploads & dispatch',
      'Basic reports',
      'Email support',
    ],
  },
  {
    key: 'GROWTH',
    name: 'Growth',
    price: '₹2,999',
    priceNote: 'per month',
    highlighted: true,
    features: [
      'Up to 50 users',
      'Up to 25,000 loan cases',
      'All Starter features',
      'Advanced analytics',
      'Lucien AI assistant',
      'Priority support',
    ],
  },
  {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    price: '₹5,999',
    priceNote: 'per month',
    features: [
      'Unlimited users',
      'Unlimited loan cases',
      'All Growth features',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
  },
];

export const subscriptionApi = {
  get: async (): Promise<SubscriptionInfo> => {
    const r = await axiosInstance.get<ApiResponse<SubscriptionInfo>>('/api/v1/subscription');
    return r.data.data;
  },

  selectFree: async (): Promise<void> => {
    await axiosInstance.post('/api/v1/subscription/free');
  },

  checkout: async (plan: string): Promise<string> => {
    const r = await axiosInstance.post<ApiResponse<{ url: string }>>('/api/v1/subscription/checkout', { plan });
    return r.data.data.url;
  },

  portal: async (): Promise<string> => {
    const r = await axiosInstance.post<ApiResponse<{ url: string }>>('/api/v1/subscription/portal');
    return r.data.data.url;
  },
};
