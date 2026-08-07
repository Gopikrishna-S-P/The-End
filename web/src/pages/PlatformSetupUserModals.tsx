import { useState } from 'react';
import { usersApi } from '../api/usersApi';
import type { UserResponse } from '../types';
import { AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { Modal } from './PlatformSetupShared';

export function DeleteUserModal({ user, onClose, onDeleted }: {
  user: UserResponse; onClose: () => void; onDeleted: (id: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setSubmitting(true); setError(null);
    try {
      await usersApi.deleteUser(user.id);
      onDeleted(user.id);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to delete user');
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Delete admin user" onClose={onClose}>
      <div className="ps-banner is-error" style={{ margin: 0, alignItems: 'flex-start' }}>
        <Trash2 size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span className="ps-banner-content">
          <strong>This action cannot be undone.</strong><br />
          <strong>{user.firstName} {user.lastName}</strong> ({user.email}) will be permanently deleted.
        </span>
      </div>
      {error && (
        <div className="ps-banner is-error" style={{ margin: 0, marginTop: 10 }}>
          <AlertCircle size={14} /><span className="ps-banner-content">{error}</span>
        </div>
      )}
      <div className="ds-modal-actions">
        <button type="button" onClick={onClose} disabled={submitting}
          className="ds-btn is-secondary" style={{ flex: 1 }}>Cancel</button>
        <button type="button" onClick={confirm} disabled={submitting}
          className="ds-btn is-danger" style={{ flex: 1, justifyContent: 'center' }}>
          {submitting ? <Loader2 size={14} className="ds-spin" /> : <Trash2 size={14} />}
          Delete user
        </button>
      </div>
    </Modal>
  );
}
