import axiosInstance from './axiosInstance';
import type { VisitLogResponse, VisitImportResult, ApprovalRequest, ApiResponse, PagedResponse } from '../types';

/**
 * Server expects the body as a multipart payload:
 *   - one JSON part named `data` with the visit fields
 *   - up to two image parts named `image1` and `image2`
 */
export interface SubmitVisitRequest {
  allocationId: string;
  /** ISO date YYYY-MM-DD */
  visitDate: string;
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  mockLocationDetected?: boolean;
  /** Server enum (Disp). */
  disp?: string;
  /** Server enum (Contactability). */
  contactability?: string;
  contactPerson?: string;
  contactNumber?: string;
  visitNotes?: string;
  amountCollected?: number;
  paymentMode?: string;
  nextVisitDate?: string;
  afterHoursOverrideReason?: string;
}

export const visitsApi = {
  /**
   * Submits a visit. `images` may have 0–2 entries; the server enforces
   * "at least one image is required" (spec §6.3) and returns 400 otherwise.
   */
  submitVisit: async (
    data: SubmitVisitRequest,
    images: File[] = [],
  ): Promise<VisitLogResponse> => {
    const fd = new FormData();
    fd.append(
      'data',
      new Blob([JSON.stringify(data)], { type: 'application/json' }),
    );
    if (images[0]) fd.append('image1', images[0]);
    if (images[1]) fd.append('image2', images[1]);
    if (images[2]) fd.append('image3', images[2]);
    const response = await axiosInstance.post<ApiResponse<VisitLogResponse>>(
      '/api/v1/visit-logs',
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  createVisitLog: async (data: FormData): Promise<VisitLogResponse> => {
    const response = await axiosInstance.post<ApiResponse<VisitLogResponse>>('/api/v1/visit-logs', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  getVisitById: async (id: string): Promise<VisitLogResponse> => {
    const response = await axiosInstance.get<ApiResponse<VisitLogResponse>>(`/api/v1/visit-logs/${id}`);
    return response.data.data;
  },

  getTodaysVisits: async (): Promise<VisitLogResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<VisitLogResponse[]>>('/api/v1/visit-logs/today');
    return response.data.data;
  },

  getVisitsByAllocation: async (allocationId: string): Promise<VisitLogResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<VisitLogResponse[]>>(`/api/v1/visit-logs/allocation/${allocationId}`);
    return response.data.data;
  },

  getLastVisitedAddress: async (allocationId: string): Promise<{ lastVisitedAddress: string }> => {
    const response = await axiosInstance.get<ApiResponse<{ lastVisitedAddress: string }>>(`/api/v1/visit-logs/allocation/${allocationId}/last-address`);
    return response.data.data;
  },

  listByOrg: async (page = 0, size = 20, signal?: AbortSignal): Promise<PagedResponse<VisitLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<VisitLogResponse>>>('/api/v1/visit-logs', {
      params: { page, size, sort: 'visitDate,desc' },
      signal,
    });
    return response.data.data;
  },

  getVisitsByAgent: async (agentId: string, page = 0, size = 20): Promise<PagedResponse<VisitLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<VisitLogResponse>>>(`/api/v1/visit-logs/agent/${agentId}`, {
      params: { page, size },
    });
    return response.data.data;
  },

  approveVisit: async (id: string, data: ApprovalRequest): Promise<VisitLogResponse> => {
    const response = await axiosInstance.patch<ApiResponse<VisitLogResponse>>(`/api/v1/visit-logs/${id}/approve`, data);
    return response.data.data;
  },

  getImageUrl: async (id: string, seq: number): Promise<string> => {
    const response = await axiosInstance.get<ApiResponse<string>>(`/api/v1/visit-logs/${id}/image/${seq}/url`);
    return response.data.data;
  },

  deleteVisit: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/visit-logs/${id}`);
  },

  importFromExcel: async (file: File): Promise<VisitImportResult> => {
    const fd = new FormData();
    fd.append('file', file);
    const response = await axiosInstance.post<ApiResponse<VisitImportResult>>(
      '/api/v1/visit-logs/import',
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  listAllForExport: async (): Promise<VisitLogResponse[]> => {
    const all: VisitLogResponse[] = [];
    const size = 500;
    let page = 0;
    while (true) {
      const res = await axiosInstance.get<ApiResponse<PagedResponse<VisitLogResponse>>>('/api/v1/visit-logs', {
        params: { page, size, sort: 'visitDate,desc' },
      });
      const d = res.data.data;
      all.push(...(d.content ?? []));
      if (page >= (d.totalPages ?? 1) - 1) break;
      page++;
    }
    return all;
  },
};
