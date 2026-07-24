import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  isLoggingOut: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function LogoutConfirmDialog({ open, isLoggingOut, onCancel, onConfirm }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="ds-modal-overlay" onClick={onCancel}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <motion.div className="ds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 16px 8px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--danger-subtle)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <LogOut size={24} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8 }}>Sign out?</span>
              <span style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>You'll be redirected to the sign-in page. Any unsaved changes will be lost.</span>
            </div>
            <div className="ds-modal-actions" style={{ marginTop: 24, display: 'flex', gap: 8 }}>
              <button type="button" onClick={onCancel} className="ds-btn is-secondary" style={{ flex: 1, height: 36 }}>Cancel</button>
              <button type="button" onClick={onConfirm} disabled={isLoggingOut} className="ds-btn is-primary" style={{ flex: 1, height: 36, background: 'var(--danger)', border: 'none', color: '#fff' }}>
                {isLoggingOut ? <Loader2 size={14} className="ds-spin" /> : <LogOut size={14} />}Sign out
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
