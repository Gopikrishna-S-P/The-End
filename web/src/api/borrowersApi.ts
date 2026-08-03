import axiosInstance from './axiosInstance';
import type {
  ApiResponse, PagedResponse,
  BorrowerResponse, CreateBorrowerRequest,
  ConsentArtifactResponse, GrantConsentRequest, ConsentPurpose, ConsentScope,
  DataErasureRequestResponse, CreateErasureRequestRequest,
  NomineeResponse, UpsertNomineeRequest,
} from '../types';

export const borrowersApi = {
  create: async (data: CreateBorrowerRequest): Promise<BorrowerResponse> => {
    const response = await axiosInstance.post<ApiResponse<BorrowerResponse>>('/api/v1/borrowers', data);
    return response.data.data;
  },

  getById: async (id: string): Promise<BorrowerResponse> => {
    const response = await axiosInstance.get<ApiResponse<BorrowerResponse>>(`/api/v1/borrowers/${id}`);
    return response.data.data;
  },

  list: async (params: { orgId: string; page?: number; size?: number }): Promise<PagedResponse<BorrowerResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<BorrowerResponse>>>('/api/v1/borrowers', { params });
    return response.data.data;
  },

  grantConsent: async (id: string, data: GrantConsentRequest): Promise<ConsentArtifactResponse> => {
    const response = await axiosInstance.post<ApiResponse<ConsentArtifactResponse>>(`/api/v1/borrowers/${id}/consent`, data);
    return response.data.data;
  },

  revokeConsent: async (id: string, purpose: ConsentPurpose, scope: ConsentScope, reason?: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/borrowers/${id}/consent/${purpose}/${scope}`, { params: reason ? { reason } : undefined });
  },

  listConsents: async (id: string): Promise<ConsentArtifactResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<ConsentArtifactResponse[]>>(`/api/v1/borrowers/${id}/consents`);
    return response.data.data;
  },

  requestErasure: async (id: string, data: CreateErasureRequestRequest): Promise<DataErasureRequestResponse> => {
    const response = await axiosInstance.post<ApiResponse<DataErasureRequestResponse>>(`/api/v1/borrowers/${id}/erasure-request`, data);
    return response.data.data;
  },

  listErasureRequests: async (id: string): Promise<DataErasureRequestResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<DataErasureRequestResponse[]>>(`/api/v1/borrowers/${id}/erasure-requests`);
    return response.data.data;
  },

  executeErasure: async (id: string, requestId: string, complianceNotes?: string): Promise<DataErasureRequestResponse> => {
    const response = await axiosInstance.patch<ApiResponse<DataErasureRequestResponse>>(
      `/api/v1/borrowers/${id}/erasure-requests/${requestId}/execute`,
      complianceNotes ? { complianceNotes } : {});
    return response.data.data;
  },

  upsertNominee: async (id: string, data: UpsertNomineeRequest): Promise<NomineeResponse> => {
    const response = await axiosInstance.post<ApiResponse<NomineeResponse>>(`/api/v1/borrowers/${id}/nominee`, data);
    return response.data.data;
  },

  /** Returns null when the borrower has no nominee recorded (backend responds 404). */
  getNominee: async (id: string): Promise<NomineeResponse | null> => {
    try {
      const response = await axiosInstance.get<ApiResponse<NomineeResponse>>(`/api/v1/borrowers/${id}/nominee`);
      return response.data.data;
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },
};
