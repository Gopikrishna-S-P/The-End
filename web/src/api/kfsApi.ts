import axiosInstance from './axiosInstance';
import type { ApiResponse } from '../types';
import type { KeyFactStatementResponse, GenerateKfsRequest } from '../types/kfs';

/**
 * Key Fact Statement (KFS) — generated once from an APPROVED RestructureProposal
 * (1:1 link, idempotent). Ground truth: server KfsController.java (/api/v1/kfs).
 * No standalone list/create UI — always reached through the restructure-proposal drawer.
 */
export const kfsApi = {
  /** Idempotent — calling again for the same proposal just returns the existing KFS. */
  generate: async (restructureProposalId: string): Promise<KeyFactStatementResponse> => {
    const body: GenerateKfsRequest = { restructureProposalId };
    const response = await axiosInstance.post<ApiResponse<KeyFactStatementResponse>>('/api/v1/kfs', body);
    return response.data.data;
  },

  getById: async (id: string): Promise<KeyFactStatementResponse> => {
    const response = await axiosInstance.get<ApiResponse<KeyFactStatementResponse>>(`/api/v1/kfs/${id}`);
    return response.data.data;
  },

  /** Returns null (not an error) when no KFS has been generated for this proposal yet. */
  getByRestructureProposal: async (restructureProposalId: string): Promise<KeyFactStatementResponse | null> => {
    try {
      const response = await axiosInstance.get<ApiResponse<KeyFactStatementResponse>>(
        `/api/v1/kfs/restructure-proposal/${restructureProposalId}`
      );
      return response.data.data;
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  },

  /** Fetches the PDF as a blob and triggers a browser download — no return value. */
  downloadPdf: async (id: string): Promise<void> => {
    const response = await axiosInstance.get(`/api/v1/kfs/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kfs_${id}.pdf`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  },
};
