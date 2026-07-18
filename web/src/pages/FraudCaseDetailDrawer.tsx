import { useState } from 'react';
import { X, Loader2, AlertCircle, ShieldAlert, Search, XCircle, CheckCircle2, Lock } from 'lucide-react';
import { fraudCasesApi } from '../api/fraudCasesApi';
import type { FraudCaseResponse, FraudCaseStatus } from '../types';
import { fmtDate, fmtDT, fmtCurrency } from './LoanDetailHelpers';
import { FRAUD_PILL } from './BorrowersHelpers';
import '../styles/AppPage.css';
import '../styles/PtpsPage.css';

const CATEGORY_LABEL: Record<string, string> = {
  CHEATING_AND_FORGERY: 'Cheating & forgery',
  MISAPPROPRIATION: 'Misappropriation',
  FRAUDULENT_ENCASHMENT: 'Fraudulent encashment',
  UNAUTHORISED_CREDIT_FACILITIES: 'Unauthorised credit facilities',
  DOCUMENTATION_FRAUD: 'Documentation fraud',
  CYBER_FRAUD: 'Cyber fraud',
  OTHER: 'Other',
};

/** Mirrors FraudCaseServiceImpl.validateTransition exactly — server is the source of truth. */
const NEXT_STATUSES: Record<FraudCaseStatus, FraudCaseStatus[]> = {
  REPORTED: ['UNDER_INVESTIGATION', 'REJECTED'],
  UNDER_INVESTIGATION: ['CONFIRMED', 'REJECTED'],
  CONFIRMED: ['CLOSED'],
  REJECTED: [],
  CLOSED: [],
};

const ACTION_LABEL: Record<FraudCaseStatus, { label: string; icon: typeof CheckCircle2 }> = {
  REPORTED: { label: 'Reopen', icon: Search },
  UNDER_INVESTIGATION: { label: 'Start investigation', icon: Search },
  CONFIRMED: { label: 'Confirm fraud', icon: CheckCircle2 },
  REJECTED: { label: 'Reject case', icon: XCircle },
  CLOSED: { label: 'Close case', icon: Lock },
};

export interface FraudCaseDetailDrawerProps {
  fraudCase: FraudCaseResponse;
  onClose: () => void;
  onChanged: (updated: FraudCaseResponse) => void;
  canTransition: boolean;
}

export default function FraudCaseDetailDrawer({ fraudCase: fc, onClose, onChanged, canTransition }: FraudCaseDetailDrawerProps) {
  const [busy, setBusy]           = useState<FraudCaseStatus | 'cfr' | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [notes, setNotes]         = useState('');

  const runTransition = async (newStatus: FraudCaseStatus) => {
    if (newStatus === 'REJECTED' && !rejectReason.trim()) { setShowRejectForm(true); return; }
    setBusy(newStatus); setError(null);
    try {
      const updated = await fraudCasesApi.transition(fc.id, {
        newStatus,
        investigationNotes: notes.trim() || undefined,
        rejectionReason: newStatus === 'REJECTED' ? rejectReason.trim() : undefined,
      });
      setShowRejectForm(false); setRejectReason(''); setNotes('');
      onChanged(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Transition failed.');
    } finally { setBusy(null); }
  };

  const runCfrLookup = async () => {
    setBusy('cfr'); setError(null);
    try {
      const updated = await fraudCasesApi.cfrLookup(fc.id);
      onChanged(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'CFR lookup unavailable.');
    } finally { setBusy(null); }
  };

  const nextStatuses = NEXT_STATUSES[fc.status] || [];

  return (
    <>
      <div className="ds-drawer-overlay" onClick={onClose} />
      <div className="ds-drawer" role="dialog" aria-modal="true">
        <div className="ds-drawer-header">
          <div className="ptp-drawer-title-col">
            <div className="ptp-drawer-title">{fc.caseNumber}</div>
            <div className="ptp-drawer-sub-meta">{CATEGORY_LABEL[fc.category] || fc.category}</div>
            <div className="ptp-drawer-sub">Reported {fmtDate(fc.reportedAt)}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-drawer-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-drawer-body">
          <div className="ptp-drawer-pills" style={{ marginBottom: 16 }}>
            <span className={`ds-pill ${FRAUD_PILL[fc.status]}`}>{fc.status.replace(/_/g, ' ')}</span>
          </div>

          <div className="ptp-stat-grid">
            <div className="ptp-stat is-accent">
              <div className="ptp-stat-label">Amount involved</div>
              <div className="ptp-stat-value is-mono">{fc.amountInvolved != null ? fmtCurrency(fc.amountInvolved) : '—'}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Incident date</div>
              <div className="ptp-stat-value is-text">{fc.incidentDate ? fmtDate(fc.incidentDate) : '—'}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Loan ID</div>
              <div className="ptp-stat-value is-mono" style={{ fontSize: 11 }}>{fc.allocationId || '—'}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Borrower ID</div>
              <div className="ptp-stat-value is-mono" style={{ fontSize: 11 }}>{fc.borrowerId || '—'}</div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Description</span>
            <p style={{ fontSize: 13, color: 'var(--ink-primary)', marginTop: 4 }}>{fc.description}</p>
          </div>

          {fc.evidenceUrl && (
            <div style={{ marginTop: 12 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Evidence</span>
              <p style={{ fontSize: 13, marginTop: 4 }}><a href={fc.evidenceUrl} target="_blank" rel="noreferrer">{fc.evidenceUrl}</a></p>
            </div>
          )}

          {fc.investigationNotes && (
            <div style={{ marginTop: 12 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Investigation notes</span>
              <p style={{ fontSize: 13, color: 'var(--ink-primary)', marginTop: 4 }}>{fc.investigationNotes}</p>
            </div>
          )}

          {fc.rejectionReason && (
            <div style={{ marginTop: 12 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Rejection reason</span>
              <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 4 }}>{fc.rejectionReason}</p>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Central Fraud Registry</span>
            {fc.cfrLookupAt ? (
              <p style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                Checked {fmtDT(fc.cfrLookupAt)} — {fc.cfrLookupResult}
              </p>
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--ink-tertiary)' }}>Not yet screened against the CFR portal.</p>
            )}
          </div>

          {canTransition && (
            <>
              {nextStatuses.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="db-section-label" style={{ padding: 0, marginBottom: 8, display: 'block' }}>Actions</span>

                  {!showRejectForm && (
                    <div className="ds-field">
                      <span className="ds-label">Notes (applied to whichever action you take)</span>
                      <textarea className="ds-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                        placeholder="Investigation notes…" />
                    </div>
                  )}

                  {showRejectForm && (
                    <div className="ds-field">
                      <span className="ds-label is-required">Rejection reason</span>
                      <textarea className="ds-textarea" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Why this case is being rejected" autoFocus />
                    </div>
                  )}

                  {error && <div className="ptp-modal-error" role="alert" style={{ marginBottom: 8 }}><AlertCircle size={14} /><span>{error}</span></div>}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {nextStatuses.map(s => {
                      const { label, icon: Icon } = ACTION_LABEL[s];
                      const isDanger = s === 'REJECTED';
                      return (
                        <button
                          key={s}
                          type="button"
                          className={`ds-btn is-sm ${isDanger ? 'is-secondary' : 'is-primary'}`}
                          disabled={busy !== null || (showRejectForm && s === 'REJECTED' && !rejectReason.trim())}
                          onClick={() => runTransition(s)}
                        >
                          {busy === s ? <Loader2 size={13} className="ds-spin" /> : <Icon size={13} />} {label}
                        </button>
                      );
                    })}
                    {showRejectForm && (
                      <button type="button" className="ds-btn is-secondary is-sm" onClick={() => { setShowRejectForm(false); setRejectReason(''); }}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <button type="button" className="ds-btn is-secondary is-sm" disabled={busy !== null} onClick={runCfrLookup}>
                  {busy === 'cfr' ? <Loader2 size={13} className="ds-spin" /> : <ShieldAlert size={13} />} Run CFR lookup
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
