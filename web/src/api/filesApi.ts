import axiosInstance from './axiosInstance';
import type { FileUploadResponse, FileProcessingErrorResponse, ApiResponse, PagedResponse } from '../types';

export const filesApi = {
  uploadFile: async (file: File, organizationId: string): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('organizationId', organizationId);

    const response = await axiosInstance.post<ApiResponse<FileUploadResponse>>('/api/v1/file-uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  getUploadStatus: async (id: string): Promise<FileUploadResponse> => {
    const response = await axiosInstance.get<ApiResponse<FileUploadResponse>>(`/api/v1/file-uploads/${id}/status`);
    return response.data.data;
  },

  listUploads: async (organizationId: string, page = 0, size = 20): Promise<PagedResponse<FileUploadResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<FileUploadResponse>>>('/api/v1/file-uploads', {
      params: { organizationId, page, size },
    });
    return response.data.data;
  },

  getUploadErrors: async (id: string, page = 0, size = 20): Promise<PagedResponse<FileProcessingErrorResponse>> => {
    const response = await axiosInstance.get<ApiResponse<PagedResponse<FileProcessingErrorResponse>>>(`/api/v1/file-uploads/${id}/errors`, {
      params: { page, size },
    });
    return response.data.data;
  },

  deleteUpload: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/api/v1/file-uploads/${id}`);
  },
};
