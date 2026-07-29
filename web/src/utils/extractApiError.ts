import axios from 'axios';

export function extractApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;

  if (axios.isAxiosError(err)) {
    if (err.code === 'ERR_CANCELED') return '';

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return 'The request timed out — the server is taking longer than expected. Please try again.';
    }

    if (!err.response) {
      return 'Network error — check your connection and try again.';
    }

    const data = err.response.data as Record<string, unknown> | undefined;
    if (data) {
      if (typeof data.message === 'string' && data.message.trim()) return data.message.trim();
      if (typeof data.error   === 'string' && data.error.trim())   return data.error.trim();
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const first = data.errors[0] as Record<string, unknown>;
        const msg = first?.message ?? first?.defaultMessage ?? first?.msg;
        if (typeof msg === 'string' && msg.trim()) return msg.trim();
      }
    }

    switch (err.response.status) {
      case 400: return 'Invalid request — check your input and try again.';
      case 403: return 'You don\'t have permission to do this.';
      case 404: return 'The requested resource was not found.';
      case 409: return 'A conflict occurred — this record may already exist.';
      case 413: return 'File is too large to upload.';
      case 429: return 'Too many requests — slow down and try again shortly.';
      case 500: return 'Server error — please try again or contact support.';
      case 502:
      case 503:
      case 504: return 'Service temporarily unavailable — please try again.';
      default:  return fallback;
    }
  }

  if (err instanceof Error && err.message.trim()) return err.message.trim();

  return fallback;
}
