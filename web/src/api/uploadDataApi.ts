import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';

export interface UploadRowResponse {
  id: string;
  rowNumber: number;
  data: Record<string, string>;
}

export interface UploadDataResponse {
  uploadId: string;
  filename: string;
  status: string;
  columns: string[];
  rows: UploadRowResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export const uploadDataApi = {
  getRows: async (uploadId: string, page = 0, size = 50): Promise<UploadDataResponse> => {
    const r = await axiosInstance.get<ApiResponse<UploadDataResponse>>(
      `/api/v1/file-uploads/${uploadId}/rows`,
      { params: { page, size } }
    );
    return r.data.data;
  },

  addRow: async (uploadId: string, data: Record<string, string>): Promise<UploadRowResponse> => {
    const r = await axiosInstance.post<ApiResponse<UploadRowResponse>>(
      `/api/v1/file-uploads/${uploadId}/rows`,
      { data }
    );
    return r.data.data;
  },

  updateRow: async (uploadId: string, rowId: string, data: Record<string, string>): Promise<UploadRowResponse> => {
    const r = await axiosInstance.put<ApiResponse<UploadRowResponse>>(
      `/api/v1/file-uploads/${uploadId}/rows/${rowId}`,
      { data }
    );
    return r.data.data;
  },

  deleteRow: async (uploadId: string, rowId: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/file-uploads/${uploadId}/rows/${rowId}`);
  },

  addColumn: async (uploadId: string, columnName: string, defaultValue = ''): Promise<void> => {
    await axiosInstance.post(`/api/v1/file-uploads/${uploadId}/columns`, { columnName, defaultValue });
  },

  deleteColumn: async (uploadId: string, columnName: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/file-uploads/${uploadId}/columns/${columnName}`);
  },
};
