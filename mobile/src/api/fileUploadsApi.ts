import axiosInstance from './axiosInstance';
import type { ApiResponse, PagedResponse } from '@/types/core';

export interface FileUploadResponse {
  id: string;
  organizationId: string;
  originalFilename: string;
  status: string;
  uploadType: string;
  totalRows: number;
  failedRows: number;
  createdAt: string;
}

export interface FileProcessingErrorResponse {
  id: string;
  rowNumber: number;
  columnName?: string;
  errorMessage: string;
  rawValue?: string;
}

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

export const fileUploadsApi = {
  list: async (params: { page?: number; size?: number }): Promise<PagedResponse<FileUploadResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<FileUploadResponse>>>('/api/v1/file-uploads', { params });
    return response.data.data;
  },

  getUploadErrors: async (id: string, page = 0, size = 20): Promise<PagedResponse<FileProcessingErrorResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<FileProcessingErrorResponse>>>(`/api/v1/file-uploads/${id}/errors`, {
      params: { page, size },
    });
    return response.data.data;
  },

  getRows: async (uploadId: string, page = 0, size = 50): Promise<UploadDataResponse> => {
    const response = await axiosInstance.get<ApiResponse<UploadDataResponse>>(
      `/api/v1/file-uploads/${uploadId}/rows`,
      { params: { page, size } }
    );
    return response.data.data;
  },
};
