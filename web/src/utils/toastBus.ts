export type ToastType = 'error' | 'success' | 'warn' | 'info';

export interface ToastPayload {
  type: ToastType;
  title: string;
  message?: string;
}

type Listener = (toast: ToastPayload) => void;

let _listener: Listener | null = null;

export const toastBus = {
  subscribe(fn: Listener): () => void {
    _listener = fn;
    return () => { _listener = null; };
  },
  emit(toast: ToastPayload): void {
    _listener?.(toast);
  },
  error(title: string, message?: string): void {
    _listener?.({ type: 'error', title, message });
  },
  success(title: string, message?: string): void {
    _listener?.({ type: 'success', title, message });
  },
  warn(title: string, message?: string): void {
    _listener?.({ type: 'warn', title, message });
  },
  info(title: string, message?: string): void {
    _listener?.({ type: 'info', title, message });
  },
};
