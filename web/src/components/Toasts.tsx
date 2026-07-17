import { AnimatePresence, motion } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import type { Toast } from '../context/ToastContext';
import './Toasts.css';

const ICONS = {
  error:   <AlertCircle   size={14} />,
  success: <CheckCircle2  size={14} />,
  warn:    <AlertTriangle size={14} />,
  info:    <Info          size={14} />,
};

const slide = {
  initial: { opacity: 0, x: 40, scale: 0.96 },
  animate: { opacity: 1, x: 0,  scale: 1,    transition: { type: 'spring' as const, stiffness: 380, damping: 30 } },
  exit:    { opacity: 0, x: 40, scale: 0.94, transition: { duration: 0.18 } },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <motion.div
      layout
      key={toast.id}
      variants={slide}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`toast is-${toast.type}`}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="toast-body">
        <span className="toast-icon">{ICONS[toast.type]}</span>
        <div className="toast-text">
          <span className="toast-title">{toast.title}</span>
          {toast.message && <span className="toast-message">{toast.message}</span>}
        </div>
        <button className="toast-close" onClick={onDismiss} aria-label="Dismiss">
          <X size={12} />
        </button>
      </div>
    </motion.div>
  );
}

export default function Toasts() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toasts-container" aria-label="Notifications">
      <AnimatePresence initial={false} mode="sync">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
