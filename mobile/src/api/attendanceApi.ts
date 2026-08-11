import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  organizationId: string;
  checkedInAt: string;
  attendanceDate: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}

export interface AttendanceCheckInRequest {
  lat?: number;
  lng?: number;
  accuracy?: number;
}

export const attendanceApi = {
  checkIn: async (data: AttendanceCheckInRequest): Promise<AttendanceRecord> => {
    const response = await axiosInstance.post<ApiResponse<AttendanceRecord>>('/api/v1/attendance/check-in', data);
    return response.data.data;
  },

  me: async (from?: string, to?: string): Promise<AttendanceRecord[]> => {
    const response = await axiosInstance.get<ApiResponse<AttendanceRecord[]>>('/api/v1/attendance/me', {
      params: { from, to },
    });
    return response.data.data;
  },

  getByDate: async (
    date: string,
    page = 0,
    size = 20
  ): Promise<PagedResponse<AttendanceRecord>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<AttendanceRecord>>>(
      '/api/v1/attendance', { params: { date, page, size } }
    );
    return response.data.data;
  },
};
