import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse, AttendanceRecord, AttendanceCheckInRequest } from '../types';

export const attendanceApi = {
  checkIn: async (req: AttendanceCheckInRequest): Promise<AttendanceRecord> => {
    const response = await axiosInstance.post<ApiResponse<AttendanceRecord>>(
      '/api/v1/attendance/check-in', req
    );
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

  getMyAttendance: async (from: string, to: string): Promise<AttendanceRecord[]> => {
    const response = await axiosInstance.get<ApiResponse<AttendanceRecord[]>>(
      '/api/v1/attendance/me', { params: { from, to } }
    );
    return response.data.data;
  },
};
