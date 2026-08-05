import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, BadgeCheck, X } from 'lucide-react';

export interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface Props {
  toast: ToastState | null;
  onDismiss: () => void;
}

export function ProfileSettingsToast({ toast, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div key="toast" className={`ds-toast is-${toast.type === 'error' ? 'err' : 'ok'}`} role="status"
          style={{ margin: '0 24px' }}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
          onClick={onDismiss}>
          {toast.type === 'error' ? <AlertCircle size={14} /> : <BadgeCheck size={14} />}
          <span>{toast.message}</span>
          <X size={13} className="ds-toast-x" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
