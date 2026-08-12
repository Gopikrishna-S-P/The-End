import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface SettlementOfferResponse {
  id: string;
  organizationId: string;
  allocationId: string;
  status: string;
  outstandingAtOffer: number;
  offeredAmount: number;
  discountPct: number;
  createdAt: string;
}

export const settlementOffersApi = {
  list: async (params: {
    status?: string;
    page?: number;
    size?: number;
  } = {}, signal?: AbortSignal): Promise<PagedResponse<SettlementOfferResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<SettlementOfferResponse>>>('/api/v1/settlement-offers', { params, signal });
    return response.data.data;
  },
};
