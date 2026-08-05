import axiosInstance from './axiosInstance';
import type { ApiResponse, BorrowerRiskScoreResponse } from '../types';

export const riskApi = {
  /** Returns null when the borrower has never been scored (backend responds 404). */
  getLatest: async (borrowerId: string): Promise<BorrowerRiskScoreResponse | null> => {
    try {
      const response = await axiosInstance.get<ApiResponse<BorrowerRiskScoreResponse>>(`/api/v1/risk/borrowers/${borrowerId}`);
      return response.data.data;
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },

  score: async (borrowerId: string): Promise<BorrowerRiskScoreResponse> => {
    const response = await axiosInstance.post<ApiResponse<BorrowerRiskScoreResponse>>(`/api/v1/risk/borrowers/${borrowerId}/score`);
    return response.data.data;
  },

  scoreWithFeatures: async (borrowerId: string, features: Record<string, unknown>): Promise<BorrowerRiskScoreResponse> => {
    const response = await axiosInstance.post<ApiResponse<BorrowerRiskScoreResponse>>(`/api/v1/risk/borrowers/${borrowerId}/score-with-features`, features);
    return response.data.data;
  },
};
