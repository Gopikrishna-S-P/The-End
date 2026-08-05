import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '../types';
import type {
  SettlementOfferResponse, CreateSettlementOfferRequest,
  SettlementBorrowerAcceptRequest, SettlementMarkPaidRequest,
  SettlementRejectRequest, SettlementOfferStatus,
} from '../types/settlementOffers';

export const settlementOffersApi = {
  draft: async (data: CreateSettlementOfferRequest): Promise<SettlementOfferResponse> => {
    const response = await axiosInstance.post<ApiResponse<SettlementOfferResponse>>('/api/v1/settlement-offers', data);
    return response.data.data;
  },

  approve: async (id: string): Promise<SettlementOfferResponse> => {
    const response = await axiosInstance.post<ApiResponse<SettlementOfferResponse>>(`/api/v1/settlement-offers/${id}/approve`);
    return response.data.data;
  },

  reject: async (id: string, data: SettlementRejectRequest): Promise<SettlementOfferResponse> => {
    const response = await axiosInstance.post<ApiResponse<SettlementOfferResponse>>(`/api/v1/settlement-offers/${id}/reject`, data);
    return response.data.data;
  },

  propose: async (id: string): Promise<SettlementOfferResponse> => {
    const response = await axiosInstance.post<ApiResponse<SettlementOfferResponse>>(`/api/v1/settlement-offers/${id}/propose`);
    return response.data.data;
  },

  borrowerAccept: async (id: string, data?: SettlementBorrowerAcceptRequest): Promise<SettlementOfferResponse> => {
    const response = await axiosInstance.post<ApiResponse<SettlementOfferResponse>>(`/api/v1/settlement-offers/${id}/borrower-accept`, data);
    return response.data.data;
  },

  markPaid: async (id: string, data?: SettlementMarkPaidRequest): Promise<SettlementOfferResponse> => {
    const response = await axiosInstance.post<ApiResponse<SettlementOfferResponse>>(`/api/v1/settlement-offers/${id}/mark-paid`, data);
    return response.data.data;
  },

  getById: async (id: string): Promise<SettlementOfferResponse> => {
    const response = await axiosInstance.get<ApiResponse<SettlementOfferResponse>>(`/api/v1/settlement-offers/${id}`);
    return response.data.data;
  },

  getByAllocation: async (allocationId: string): Promise<SettlementOfferResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<SettlementOfferResponse[]>>(`/api/v1/settlement-offers/allocation/${allocationId}`);
    return response.data.data;
  },

  list: async (params: {
    status?: SettlementOfferStatus;
    page?: number;
    size?: number;
  } = {}, signal?: AbortSignal): Promise<PagedResponse<SettlementOfferResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<SettlementOfferResponse>>>('/api/v1/settlement-offers', { params, signal });
    return response.data.data;
  },
};
