import axiosInstance from './axiosInstance';
import type {
  ApiResponse, PagedResponse,
  FraudCaseResponse, CreateFraudCaseRequest, TransitionFraudCaseRequest, FraudCaseStatus,
} from '../types';

export const fraudCasesApi = {
  create: async (data: CreateFraudCaseRequest): Promise<FraudCaseResponse> => {
    const response = await axiosInstance.post<ApiResponse<FraudCaseResponse>>('/api/v1/fraud-cases', data);
    return response.data.data;
  },

  transition: async (id: string, data: TransitionFraudCaseRequest): Promise<FraudCaseResponse> => {
    const response = await axiosInstance.patch<ApiResponse<FraudCaseResponse>>(`/api/v1/fraud-cases/${id}/transition`, data);
    return response.data.data;
  },

  cfrLookup: async (id: string): Promise<FraudCaseResponse> => {
    const response = await axiosInstance.post<ApiResponse<FraudCaseResponse>>(`/api/v1/fraud-cases/${id}/cfr-lookup`);
    return response.data.data;
  },

  getById: async (id: string): Promise<FraudCaseResponse> => {
    const response = await axiosInstance.get<ApiResponse<FraudCaseResponse>>(`/api/v1/fraud-cases/${id}`);
    return response.data.data;
  },

  list: async (params: {
    orgId: string;
    status?: FraudCaseStatus;
    page?: number;
    size?: number;
  }, signal?: AbortSignal): Promise<PagedResponse<FraudCaseResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<FraudCaseResponse>>>('/api/v1/fraud-cases', { params, signal });
    return response.data.data;
  },
};
