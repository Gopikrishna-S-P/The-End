import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type { VisitLogRequest, VisitLogResponse } from '@/types/domain';

export interface VisitPhoto {
  uri: string;
  name: string;
  type: string;
}

export const visitLogApi = {
  /** POST is multipart: a JSON `data` part plus up to 3 optional image parts. */
  create: async (data: VisitLogRequest, photos: VisitPhoto[]): Promise<VisitLogResponse> => {
    const formData = new FormData();
    formData.append('data', {
      string: JSON.stringify(data),
      type: 'application/json',
    } as unknown as Blob);

    photos.slice(0, 3).forEach((photo, index) => {
      formData.append(`image${index + 1}`, {
        uri: photo.uri,
        name: photo.name,
        type: photo.type,
      } as unknown as Blob);
    });

    const response = await axiosInstance.post<ApiResponse<VisitLogResponse>>('/api/v1/visit-logs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  getByAllocation: async (allocationId: string): Promise<VisitLogResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<VisitLogResponse[]>>(`/api/v1/visit-logs/allocation/${allocationId}`);
    return response.data.data;
  },

  getLastLocation: async (allocationId: string): Promise<{ lat: number; lng: number } | null> => {
    const response = await axiosInstance.get<ApiResponse<{ lat: number; lng: number } | null>>(
      `/api/v1/visit-logs/allocation/${allocationId}/last-location`,
    );
    return response.data.data;
  },
};
