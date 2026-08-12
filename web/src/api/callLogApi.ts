import axiosInstance from './axiosInstance';
import type { CallLogResponse, CallOutcome, ApiResponse, PagedResponse } from '../types';

/** Read-only web surface — starting a call and uploading its recording only
 *  happens from the mobile app, which is what actually places the call. */
export const callLogApi = {
  getByAllocation: async (allocationId: string): Promise<CallLogResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<CallLogResponse[]>>(`/api/v1/call-logs/allocation/${allocationId}`);
    return response.data.data;
  },

  listCalls: async (params: {
    orgId?: string;
    agentId?: string;
    outcome?: CallOutcome;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
  }): Promise<PagedResponse<CallLogResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<CallLogResponse>>>('/api/v1/call-logs', { params });
    return response.data.data;
  },

  /** Opens a recording in a new tab via the authenticated download endpoint —
   *  ORG_ADMIN/MANAGER/TL only server-side; not exposed as a plain URL. */
  openRecording: async (callLogId: string): Promise<void> => {
    const response = await axiosInstance.get(`/api/v1/call-logs/${callLogId}/recording`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
