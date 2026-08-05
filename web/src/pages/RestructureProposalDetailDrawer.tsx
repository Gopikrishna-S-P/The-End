import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Send, ThumbsUp, ThumbsDown, Signature, FileText, Download } from 'lucide-react';
import { restructureProposalsApi } from '../api/restructureProposalsApi';
import { kfsApi } from '../api/kfsApi';
import type { RestructureProposalResponse } from '../types';
import type { KeyFactStatementResponse } from '../types/kfs';
import { usePermissions } from '../hooks/usePermissions';
import { fmtDate, fmtDT } from './LoanDetailHelpers';
import { RESTRUCTURE_PILL } from './BorrowersHelpers';
import '../styles/AppPage.css';
import '../styles/PtpsPage.css';

const fmtMoney = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);
const fmtApr = (v: number) => `${Number(v).toFixed(2)}%`;

export interface RestructureProposalDetailDrawerProps {
  proposal: RestructureProposalResponse;
  onClose: () => void;
  onChanged: (updated: RestructureProposalResponse) => void;
}

export default function RestructureProposalDetailDrawer({ proposal: p, onClose, onChanged }: RestructureProposalDetailDrawerProps) {
  const { hasRole } = usePermissions();
  const isLead   = hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN') || hasRole('MANAGER') || hasRole('TL');
  const isLender = hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN');

  const [busy, setBusy]   = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason]     = useState('');

  const run = async (key: string, fn: () => Promise<RestructureProposalResponse>) => {
    setBusy(key); setError(null);
    try {
      const updated = await fn();
      onChanged(updated);
      setShowRejectForm(false); setRejectReason('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Action failed.');
    } finally { setBusy(null); }
  };

  const proposeToLender = () => run('propose', () => restructureProposalsApi.proposeToLender(p.id));
  const lenderApprove    = () => run('approve', () => restructureProposalsApi.lenderApprove(p.id));
  const lenderReject     = () => {
    if (!rejectReason.trim()) { setShowRejectForm(true); return; }
    run('reject', () => restructureProposalsApi.lenderReject(p.id, { reason: rejectReason.trim() }));
  };
  const borrowerAccept   = () => run('accept', () => restructureProposalsApi.borrowerAccept(p.id));

  const emiDelta = p.newEmiAmount - p.originalEmiAmount;

  // Key Fact Statement: 1:1 with this proposal, only reachable once lender-approved.
  // undefined = not checked yet, null = checked and none exists, object = exists.
  const kfsVisible = p.status === 'APPROVED' || p.status === 'ACCEPTED' || p.status === 'ACTIVE';
  const [kfs, setKfs]           = useState<KeyFactStatementResponse | null | undefined>(undefined);
  const [kfsLoading, setKfsLoading] = useState(false);
  const [kfsBusy, setKfsBusy]   = useState<string | null>(null);
  const [kfsError, setKfsError] = useState<string | null>(null);

  useEffect(() => {
    if (!kfsVisible) { setKfs(undefined); return; }
    let cancelled = false;
    setKfs(undefined);
    setKfsError(null);
    setKfsLoading(true);
    kfsApi.getByRestructureProposal(p.id)
      .then((result) => { if (!cancelled) setKfs(result); })
      .catch((e: any) => { if (!cancelled) setKfsError(e?.response?.data?.message || 'Failed to load Key Fact Statement.'); })
      .finally(() => { if (!cancelled) setKfsLoading(false); });
    return () => { cancelled = true; };
  }, [p.id, kfsVisible]);

  const generateKfs = () => {
    setKfsBusy('generate'); setKfsError(null);
    kfsApi.generate(p.id)
      .then((result) => setKfs(result))
      .catch((e: any) => setKfsError(e?.response?.data?.message || 'Failed to generate Key Fact Statement.'))
      .finally(() => setKfsBusy(null));
  };

  const downloadKfsPdf = () => {
    if (!kfs) return;
    setKfsBusy('download'); setKfsError(null);
    kfsApi.downloadPdf(kfs.id)
      .catch((e: any) => setKfsError(e?.response?.data?.message || 'Failed to download the KFS PDF.'))
      .finally(() => setKfsBusy(null));
  };

  return (
    <>
      <div className="ds-drawer-overlay" onClick={onClose} />
      <div className="ds-drawer" role="dialog" aria-modal="true">
        <div className="ds-drawer-header">
          <div className="ptp-drawer-title-col">
            <div className="ptp-drawer-title">Restructure proposal</div>
            <div className="ptp-drawer-sub-meta" style={{ fontFamily: 'var(--font-mono)' }}>{p.allocationId}</div>
            <div className="ptp-drawer-sub">Drafted {fmtDate(p.createdAt)}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-drawer-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-drawer-body">
          <div className="ptp-drawer-pills" style={{ marginBottom: 16 }}>
            <span className={`ds-pill ${RESTRUCTURE_PILL[p.status]}`}>{p.status.replace(/_/g, ' ')}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-card" style={{ padding: 14 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 11 }}>Original terms</span>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>EMI</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmtMoney(p.originalEmiAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Tenure</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{p.originalEmiCount} EMIs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>APR</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmtApr(p.originalApr)}</span>
                </div>
              </div>
            </div>
            <div className="ds-card" style={{ padding: 14, borderColor: 'var(--ink-solid)' }}>
              <span className="db-att-label" style={{ color: 'var(--ink-solid)', fontSize: 11 }}>Proposed terms</span>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>EMI</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{fmtMoney(p.newEmiAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Tenure</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{p.newEmiCount} EMIs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>APR</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{fmtApr(p.newApr)}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: emiDelta <= 0 ? 'var(--success)' : 'var(--warning)' }}>
            EMI {emiDelta <= 0 ? 'reduces' : 'increases'} by {fmtMoney(Math.abs(emiDelta))} per instalment
          </div>

          {p.rationale && (
            <div style={{ marginTop: 16 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Rationale</span>
              <p style={{ fontSize: 13, color: 'var(--ink-primary)', marginTop: 4 }}>{p.rationale}</p>
            </div>
          )}

          {p.rejectionReason && (
            <div style={{ marginTop: 12 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Rejection reason</span>
              <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 4 }}>{p.rejectionReason}</p>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {p.proposedToLenderAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Proposed to lender {fmtDT(p.proposedToLenderAt)}</span>}
            {p.lenderApprovalAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Lender approved {fmtDT(p.lenderApprovalAt)}</span>}
            {p.borrowerAcceptedAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Borrower accepted {fmtDT(p.borrowerAcceptedAt)}</span>}
            {p.rejectedAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Rejected {fmtDT(p.rejectedAt)}</span>}
          </div>

          {kfsVisible && (
            <div className="ds-card" style={{ marginTop: 16, padding: 14 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 11 }}>Key Fact Statement</span>

              {kfsLoading && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-tertiary)' }}>
                  <Loader2 size={13} className="ds-spin" /> Checking for an existing KFS…
                </div>
              )}

              {!kfsLoading && kfsError && (
                <div className="ptp-modal-error" role="alert" style={{ marginTop: 10 }}><AlertCircle size={14} /><span>{kfsError}</span></div>
              )}

              {!kfsLoading && !kfs && (
                <div style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginBottom: 10 }}>
                    No Key Fact Statement has been generated for this proposal yet.
                  </p>
                  <button type="button" className="ds-btn is-primary is-sm" disabled={kfsBusy !== null} onClick={generateKfs}>
                    {kfsBusy === 'generate' ? <Loader2 size={13} className="ds-spin" /> : <FileText size={13} />} Generate KFS
                  </button>
                </div>
              )}

              {!kfsLoading && kfs && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Sanctioned</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmtMoney(kfs.sanctionedAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>APR</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmtApr(kfs.aprPercent)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>EMI</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmtMoney(kfs.emiAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Tenure</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{kfs.tenureMonths} EMIs</span>
                    </div>
                  </div>
                  <button type="button" className="ds-btn is-secondary is-sm" disabled={kfsBusy !== null} onClick={downloadKfsPdf}>
                    {kfsBusy === 'download' ? <Loader2 size={13} className="ds-spin" /> : <Download size={13} />} Download PDF
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <div className="ptp-modal-error" role="alert" style={{ marginTop: 12 }}><AlertCircle size={14} /><span>{error}</span></div>}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {p.status === 'DRAFT' && isLead && (
              <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={proposeToLender}>
                {busy === 'propose' ? <Loader2 size={13} className="ds-spin" /> : <Send size={13} />} Send to lender
              </button>
            )}

            {p.status === 'PROPOSED_TO_LENDER' && isLender && (
              <>
                {showRejectForm && (
                  <div className="ds-field">
                    <span className="ds-label is-required">Rejection reason</span>
                    <textarea className="ds-textarea" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Why the lender is declining this proposal" autoFocus />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={lenderApprove}>
                    {busy === 'approve' ? <Loader2 size={13} className="ds-spin" /> : <ThumbsUp size={13} />} Approve
                  </button>
                  <button type="button" className="ds-btn is-secondary is-sm" disabled={busy !== null || (showRejectForm && !rejectReason.trim())} onClick={lenderReject}>
                    {busy === 'reject' ? <Loader2 size={13} className="ds-spin" /> : <ThumbsDown size={13} />} Reject
                  </button>
                  {showRejectForm && (
                    <button type="button" className="ds-btn is-secondary is-sm" onClick={() => { setShowRejectForm(false); setRejectReason(''); }}>Cancel</button>
                  )}
                </div>
              </>
            )}

            {p.status === 'APPROVED' && isLead && (
              <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={borrowerAccept}>
                {busy === 'accept' ? <Loader2 size={13} className="ds-spin" /> : <Signature size={13} />} Record borrower acceptance
              </button>
            )}

            {(p.status === 'ACCEPTED' || p.status === 'REJECTED' || p.status === 'EXPIRED' || p.status === 'ACTIVE') && (
              <p style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                {p.status === 'ACCEPTED' ? 'Accepted — new-loan activation is not yet automated; track manually until the linked-allocation cascade ships.' : 'This proposal is closed. No further actions apply.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
