import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { toastBus } from '../utils/toastBus';
import type { ToastType } from '../utils/toastBus';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

interface ToastContextValue {
  toasts: Toast[];
  dismiss: (id: string) => void;
  push: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATIONS: Record<ToastType, number> = {
  error:   5000,
  success: 3000,
  warn:    4000,
  info:    4000,
};

const DEDUP_TTL = 3_000; // suppress identical toast within 3 s

let _counter = 0;
const nextId = () => `t-${++_counter}-${Date.now().toString(36)}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers  = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const dedupAt = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, title: string, message?: string) => {
    if (!title) return;
    const key = `${type}|${title}|${message ?? ''}`;
    const last = dedupAt.current.get(key) ?? 0;
    if (Date.now() - last < DEDUP_TTL) return;
    dedupAt.current.set(key, Date.now());
    const id = nextId();
    const duration = DURATIONS[type];
    setToasts(prev => {
      const next = [...prev, { id, type, title, message, duration }];
      return next.length > 5 ? next.slice(next.length - 5) : next;
    });
    const timer = setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => {
    const unsub = toastBus.subscribe(payload => {
      push(payload.type, payload.title, payload.message);
    });
    return unsub;
  }, [push]);

  useEffect(() => {
    return () => {
      timers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, dismiss, push }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
