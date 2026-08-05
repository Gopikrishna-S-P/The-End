import axiosInstance from './axiosInstance';
import type {
  ApiResponse, PagedResponse,
  RestructureProposalResponse, CreateRestructureProposalRequest,
  RestructureBorrowerAcceptRequest, RestructureRejectRequest, RestructureStatus,
} from '../types';

export const restructureProposalsApi = {
  draft: async (data: CreateRestructureProposalRequest): Promise<RestructureProposalResponse> => {
    const response = await axiosInstance.post<ApiResponse<RestructureProposalResponse>>('/api/v1/restructure-proposals', data);
    return response.data.data;
  },

  proposeToLender: async (id: string): Promise<RestructureProposalResponse> => {
    const response = await axiosInstance.post<ApiResponse<RestructureProposalResponse>>(`/api/v1/restructure-proposals/${id}/propose-to-lender`);
    return response.data.data;
  },

  lenderApprove: async (id: string): Promise<RestructureProposalResponse> => {
    const response = await axiosInstance.post<ApiResponse<RestructureProposalResponse>>(`/api/v1/restructure-proposals/${id}/lender-approve`);
    return response.data.data;
  },

  lenderReject: async (id: string, data: RestructureRejectRequest): Promise<RestructureProposalResponse> => {
    const response = await axiosInstance.post<ApiResponse<RestructureProposalResponse>>(`/api/v1/restructure-proposals/${id}/lender-reject`, data);
    return response.data.data;
  },

  borrowerAccept: async (id: string, data?: RestructureBorrowerAcceptRequest): Promise<RestructureProposalResponse> => {
    const response = await axiosInstance.post<ApiResponse<RestructureProposalResponse>>(`/api/v1/restructure-proposals/${id}/borrower-accept`, data);
    return response.data.data;
  },

  getById: async (id: string): Promise<RestructureProposalResponse> => {
    const response = await axiosInstance.get<ApiResponse<RestructureProposalResponse>>(`/api/v1/restructure-proposals/${id}`);
    return response.data.data;
  },

  getByAllocation: async (allocationId: string): Promise<RestructureProposalResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<RestructureProposalResponse[]>>(`/api/v1/restructure-proposals/allocation/${allocationId}`);
    return response.data.data;
  },

  list: async (params: {
    status?: RestructureStatus;
    page?: number;
    size?: number;
  } = {}, signal?: AbortSignal): Promise<PagedResponse<RestructureProposalResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<RestructureProposalResponse>>>('/api/v1/restructure-proposals', { params, signal });
    return response.data.data;
  },
};
