import axiosInstance from './axiosInstance';
import type { ApiResponse } from '@/types/core';
import type { AttendanceCheckInRequest, AttendanceResponse } from '@/types/domain';

export const attendanceApi = {
  checkIn: async (data: AttendanceCheckInRequest): Promise<AttendanceResponse> => {
    const response = await axiosInstance.post<ApiResponse<AttendanceResponse>>('/api/v1/attendance/check-in', data);
    return response.data.data;
  },

  me: async (from?: string, to?: string): Promise<AttendanceResponse[]> => {
    const response = await axiosInstance.get<ApiResponse<AttendanceResponse[]>>('/api/v1/attendance/me', {
      params: { from, to },
    });
    return response.data.data;
  },
};
