import { useState } from 'react';
import {
  X, Loader2, AlertCircle, ClipboardCheck, Search, TrendingUp, CheckCheck, Lock,
  User, Mail, Phone, CreditCard,
} from 'lucide-react';
import { grievancesApi } from '../api/grievancesApi';
import type { GrievanceResponse } from '../types/grievances';
import { usePermissions } from '../hooks/usePermissions';
import { fmtDate, fmtDT } from './LoanDetailHelpers';
import { GRIEVANCE_PILL, GRIEVANCE_CATEGORY_LABEL } from './GrievancesPage';
import '../styles/AppPage.css';
import '../styles/PtpsPage.css';

export interface GrievanceDetailDrawerProps {
  grievance: GrievanceResponse;
  onClose: () => void;
  onChanged: (updated: GrievanceResponse) => void;
}

export default function GrievanceDetailDrawer({ grievance: g, onClose, onChanged }: GrievanceDetailDrawerProps) {
  const { hasRole } = usePermissions();
  const isHandler = hasRole('TL') || hasRole('MANAGER') || hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN');

  const [busy, setBusy]     = useState<string | null>(null);
  const [error, setError]   = useState<string | null>(null);

  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [escalateRemarks, setEscalateRemarks]   = useState('');
  const [showResolveForm, setShowResolveForm]   = useState(false);
  const [resolutionNotes, setResolutionNotes]   = useState('');

  const run = async (key: string, fn: () => Promise<GrievanceResponse>) => {
    setBusy(key); setError(null);
    try {
      const updated = await fn();
      onChanged(updated);
      setAssignedToUserId(''); setEscalateRemarks('');
      setShowResolveForm(false); setResolutionNotes('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Action failed.');
    } finally { setBusy(null); }
  };

  const acknowledge = () => run('acknowledge', () => grievancesApi.acknowledge(g.id));
  const investigate = () => run('investigate', () => grievancesApi.investigate(g.id,
    assignedToUserId.trim() ? { assignedToUserId: assignedToUserId.trim() } : undefined));
  const escalate = () => run('escalate', () => grievancesApi.escalate(g.id,
    escalateRemarks.trim() ? { remarks: escalateRemarks.trim() } : undefined));
  const resolve = () => {
    if (!resolutionNotes.trim()) { setShowResolveForm(true); return; }
    run('resolve', () => grievancesApi.resolve(g.id, { resolutionNotes: resolutionNotes.trim() }));
  };
  const close = () => run('close', () => grievancesApi.close(g.id));

  const now = Date.now();
  const ackOverdue = !g.acknowledgedAt && !!g.acknowledgementDueAt && new Date(g.acknowledgementDueAt).getTime() < now;
  const resOverdue = !g.resolvedAt && !!g.resolutionDueAt && new Date(g.resolutionDueAt).getTime() < now;

  const resolveForm = (
    <>
      {showResolveForm && (
        <div className="ds-field">
          <span className="ds-label is-required">Resolution notes</span>
          <textarea className="ds-textarea" rows={3} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="How this grievance was resolved" autoFocus />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null || (showResolveForm && !resolutionNotes.trim())} onClick={resolve}>
          {busy === 'resolve' ? <Loader2 size={13} className="ds-spin" /> : <CheckCheck size={13} />} Resolve
        </button>
        {showResolveForm && (
          <button type="button" className="ds-btn is-secondary is-sm" onClick={() => { setShowResolveForm(false); setResolutionNotes(''); }}>Cancel</button>
        )}
      </div>
    </>
  );

  const escalateForm = (
    <>
      <div className="ds-field">
        <span className="ds-label">Escalation remarks (optional)</span>
        <textarea className="ds-textarea" rows={2} value={escalateRemarks} onChange={(e) => setEscalateRemarks(e.target.value)}
          placeholder="Why this is being escalated" />
      </div>
      <button type="button" className="ds-btn is-secondary is-sm" disabled={busy !== null} onClick={escalate}>
        {busy === 'escalate' ? <Loader2 size={13} className="ds-spin" /> : <TrendingUp size={13} />} Escalate
      </button>
    </>
  );

  return (
    <>
      <div className="ds-drawer-overlay" onClick={onClose} />
      <div className="ds-drawer" role="dialog" aria-modal="true">
        <div className="ds-drawer-header">
          <div className="ptp-drawer-title-col">
            <div className="ptp-drawer-title">{g.ticketNumber}</div>
            <div className="ptp-drawer-sub-meta" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.subject}</div>
            <div className="ptp-drawer-sub">Raised {fmtDate(g.createdAt)}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-drawer-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-drawer-body">
          <div className="ptp-drawer-pills">
            <span className={`ds-pill ${GRIEVANCE_PILL[g.status]}`}>{g.status.replace(/_/g, ' ')}</span>
            <span className="ds-pill">{GRIEVANCE_CATEGORY_LABEL[g.category] || g.category}</span>
          </div>

          <div className="ptp-stat-grid">
            <div className={`ptp-stat ${ackOverdue ? 'is-error' : ''}`}>
              <div className="ptp-stat-label">Acknowledgement due</div>
              <div className="ptp-stat-value is-text">
                {g.acknowledgedAt ? `Met ${fmtDate(g.acknowledgedAt)}` : fmtDate(g.acknowledgementDueAt)}
                {ackOverdue ? ' — overdue' : ''}
              </div>
            </div>
            <div className={`ptp-stat ${resOverdue ? 'is-error' : ''}`}>
              <div className="ptp-stat-label">Resolution due</div>
              <div className="ptp-stat-value is-text">
                {g.resolvedAt ? `Met ${fmtDate(g.resolvedAt)}` : fmtDate(g.resolutionDueAt)}
                {resOverdue ? ' — overdue' : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-tertiary)', marginBottom: 16 }}>
            <CreditCard size={13} />
            {g.allocationId
              ? <span style={{ fontFamily: 'var(--font-mono)' }}>{g.allocationId}</span>
              : <span>Not linked to a specific loan</span>}
          </div>

          <div>
            <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Description</span>
            <p style={{ fontSize: 13, color: 'var(--ink-primary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{g.description}</p>
          </div>

          {g.evidenceUrl && (
            <div style={{ marginTop: 12 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Evidence</span>
              <p style={{ fontSize: 13, marginTop: 4, wordBreak: 'break-all' }}>
                <a href={g.evidenceUrl} target="_blank" rel="noreferrer">{g.evidenceUrl}</a>
              </p>
            </div>
          )}

          {(g.borrowerName || g.borrowerEmail || g.borrowerPhone) && (
            <div className="ds-card" style={{ padding: 14, marginTop: 16 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 11 }}>Borrower contact</span>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.borrowerName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-primary)' }}>
                    <User size={13} style={{ color: 'var(--ink-tertiary)' }} />{g.borrowerName}
                  </div>
                )}
                {g.borrowerEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-primary)' }}>
                    <Mail size={13} style={{ color: 'var(--ink-tertiary)' }} />{g.borrowerEmail}
                  </div>
                )}
                {g.borrowerPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-primary)' }}>
                    <Phone size={13} style={{ color: 'var(--ink-tertiary)' }} />{g.borrowerPhone}
                  </div>
                )}
              </div>
            </div>
          )}

          {g.resolutionNotes && (
            <div style={{ marginTop: 16 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Resolution notes</span>
              <p style={{ fontSize: 13, color: 'var(--ink-primary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{g.resolutionNotes}</p>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {g.acknowledgedAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Acknowledged {fmtDT(g.acknowledgedAt)}</span>}
            {g.assignedToUserId && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)' }}>Assigned to {g.assignedToUserId}</span>}
            {g.resolvedAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Resolved {fmtDT(g.resolvedAt)}</span>}
            {g.closedAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Closed {fmtDT(g.closedAt)}</span>}
          </div>

          {isHandler && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {error && <div className="ptp-modal-error" role="alert"><AlertCircle size={14} /><span>{error}</span></div>}

              {g.status === 'RECEIVED' && (
                <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={acknowledge}>
                  {busy === 'acknowledge' ? <Loader2 size={13} className="ds-spin" /> : <ClipboardCheck size={13} />} Acknowledge
                </button>
              )}

              {g.status === 'ACKNOWLEDGED' && (
                <>
                  <div className="ds-field">
                    <span className="ds-label">Assign to (user ID, optional — defaults to you)</span>
                    <input type="text" className="ds-input" value={assignedToUserId} onChange={(e) => setAssignedToUserId(e.target.value)}
                      placeholder="User UUID" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                  </div>
                  <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={investigate}>
                    {busy === 'investigate' ? <Loader2 size={13} className="ds-spin" /> : <Search size={13} />} Start investigation
                  </button>

                  {escalateForm}
                </>
              )}

              {g.status === 'INVESTIGATING' && (
                <>
                  {escalateForm}
                  {resolveForm}
                </>
              )}

              {g.status === 'ESCALATED' && resolveForm}

              {g.status === 'RESOLVED' && (
                <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={close}>
                  {busy === 'close' ? <Loader2 size={13} className="ds-spin" /> : <Lock size={13} />} Close grievance
                </button>
              )}

              {g.status === 'CLOSED' && (
                <p style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>This grievance is closed. No further actions apply.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
