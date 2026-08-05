import axiosInstance from './axiosInstance';
import type { AllocationResponse, ApiResponse, PagedResponse } from '../types';

/** Matches server's UpdateAllocationStatusRequest — no `notes` field exists server-side. */
interface UpdateAllocationStatusRequest {
  status: string;
  assignedToUserId?: string;
}

export const allocationsApi = {
  /**
   * Org-scoped allocation query — server derives organizationId from JWT,
   * so the caller does not need to supply it.
   */
  getAllocations: async (params: {
    status?: string;
    assignedToUserId?: string;
    fileUploadId?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
  }, signal?: AbortSignal): Promise<PagedResponse<AllocationResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AllocationResponse>>>(
      '/api/v1/allocations', { params, signal });
    return response.data.data;
  },

  listAllocations: async (params: {
    organizationId: string;
    searchTerm?: string;
    status?: string;
    fileUploadId?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
  }, signal?: AbortSignal): Promise<PagedResponse<AllocationResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AllocationResponse>>>('/api/v1/allocations', { params, signal });
    return response.data.data;
  },

  getAllocationById: async (id: string): Promise<AllocationResponse> => {
    const response = await axiosInstance.get<ApiResponse<AllocationResponse>>(`/api/v1/allocations/${id}`);
    return response.data.data;
  },

  updateAllocationStatus: async (id: string, data: UpdateAllocationStatusRequest): Promise<AllocationResponse> => {
    const response = await axiosInstance.patch<ApiResponse<AllocationResponse>>(`/api/v1/allocations/${id}/status`, data);
    return response.data.data;
  },

  deleteAllocation: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/allocations/${id}`);
  },

  /** Loan cases linked to a borrower (server §10.3). Uses full /api/v1 path. */
  listForBorrower: async (borrowerId: string): Promise<AllocationResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<AllocationResponse[]>>(
      `/api/v1/allocations/borrower/${borrowerId}`,
    );
    return response.data.data;
  },

  /** Link or relink an allocation to a borrower (loose UUID — no FK enforced). */
  linkBorrower: async (allocationId: string, borrowerId: string): Promise<AllocationResponse> => {
    const response = await axiosInstance.patch<ApiResponse<AllocationResponse>>(
      `/api/v1/allocations/${allocationId}/borrower`,
      { borrowerId },
    );
    return response.data.data;
  },

  /** Directly reassign one allocation to a different FO (no Assignment entity required). */
  reassignToFo: async (allocationId: string, assignedToUserId: string): Promise<AllocationResponse[]> => {
    const response = await axiosInstance.post<ApiResponse<AllocationResponse[]>>('/api/v1/allocations/bulk-assign', {
      allocationIds: [allocationId],
      assignedToUserId,
    });
    return response.data.data;
  },
};
