import { useState, useEffect, useRef } from 'react';
import { X, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { usersApi } from '../api/usersApi';
import { assignmentsApi } from '../api/assignmentsApi';
import { allocationsApi } from '../api/allocationsApi';
import type { UserResponse } from '../types';

interface Props {
  /** Present when a proper Assignment entity exists — uses full reassign API. */
  assignmentId?: string | null;
  /** Always present — used as fallback when no Assignment entity exists. */
  allocationId: string;
  currentAgentName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export default function ReassignModal({ assignmentId, allocationId, currentAgentName, onClose, onSuccess }: Props) {
  const [agents, setAgents] = useState<UserResponse[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [newAgentId, setNewAgentId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState(todayIso);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const hasAssignment = !!assignmentId;

  useEffect(() => {
    usersApi.listByRole('FO')
      .then(list => setAgents(list))
      .catch(() => setError('Failed to load field officers.'))
      .finally(() => setAgentsLoading(false));
  }, []);

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const reasonLen = reason.trim().length;
  const canSubmit = !!newAgentId && !submitting &&
    (!hasAssignment || (!!assignmentDate && reasonLen >= 10 && reasonLen <= 1000));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (hasAssignment) {
        await assignmentsApi.reassignAssignment(assignmentId!, {
          newAgentId,
          assignmentDate,
          reason: reason.trim(),
        });
      } else {
        await allocationsApi.reassignToFo(allocationId, newAgentId);
      }
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Reassignment failed. Please try again.');
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-surface)',
    color: 'var(--ink-primary)',
    fontSize: 13.5,
    fontFamily: 'var(--sans)',
    outline: 'none',
    boxShadow: '0 1px 2px color-mix(in srgb, var(--text-primary) 4%, transparent)',
    transition: 'border-color 150ms var(--ease), box-shadow 150ms var(--ease)',
    boxSizing: 'border-box',
  };

  return (
    <div
      className="app-page-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reassign-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="app-page-modal">
        <div className="app-page-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div className="app-page-modal-header-icon">
              <ArrowRightLeft size={16} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="app-page-modal-title" id="reassign-title">Reassign case</div>
              {currentAgentName && (
                <div className="app-page-modal-sub">Currently: {currentAgentName}</div>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} className="app-page-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="app-page-modal-body">
          {error && (
            <div className="app-page-banner is-error" role="alert">
              <span>{error}</span>
            </div>
          )}

          <div className="app-page-field">
            <label className="app-page-field-label" htmlFor="reassign-agent">New agent</label>
            <div className="app-page-select-wrap" style={{ width: '100%' }}>
              <select
                id="reassign-agent"
                className="app-page-select"
                style={{ width: '100%', minWidth: 0 }}
                value={newAgentId}
                onChange={e => setNewAgentId(e.target.value)}
                disabled={agentsLoading || submitting}
              >
                <option value="">{agentsLoading ? 'Loading…' : '— Select field officer —'}</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName ?? ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasAssignment && (
            <div className="app-page-field">
              <label className="app-page-field-label" htmlFor="reassign-date">Assignment date</label>
              <input
                id="reassign-date"
                type="date"
                className="app-page-date"
                style={{ width: '100%' }}
                value={assignmentDate}
                min={todayIso()}
                onChange={e => setAssignmentDate(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}

          {hasAssignment && (
            <div className="app-page-field">
              <label className="app-page-field-label" htmlFor="reassign-reason">
                Reason
                <span style={{ color: 'var(--ink-tertiary)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  {' '}({reasonLen}/1000, min 10)
                </span>
              </label>
              <textarea
                id="reassign-reason"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', height: 'auto' }}
                value={reason}
                onChange={e => setReason(e.target.value)}
                disabled={submitting}
                placeholder="Explain why this case is being reassigned…"
                maxLength={1000}
              />
            </div>
          )}
        </div>

        <div className="app-page-modal-footer">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="app-page-btn app-page-btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="app-page-btn app-page-btn-primary"
          >
            {submitting
              ? <RefreshCw size={14} className="app-page-spinner-icon" />
              : <ArrowRightLeft size={14} />}
            Reassign
          </button>
        </div>
      </div>
    </div>
  );
}
