import axiosInstance, {
  setAccessToken,
  setRefreshToken,
  getAccessToken,
  getRefreshToken,
} from './api/axiosInstance';

export { setAccessToken, setRefreshToken, getAccessToken, getRefreshToken };

export const apiClient = axiosInstance;

export const unwrapApiResponse = <T>(response: any): T => {
  if (response?.data !== undefined) {
    return response.data as T;
  }
  return response as T;
};

export default apiClient;