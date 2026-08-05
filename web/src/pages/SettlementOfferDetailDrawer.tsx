import { useState } from 'react';
import { X, Loader2, AlertCircle, Send, ThumbsUp, ThumbsDown, Signature, BadgeIndianRupee } from 'lucide-react';
import { settlementOffersApi } from '../api/settlementOffersApi';
import type { SettlementOfferResponse, SettlementOfferStatus } from '../types/settlementOffers';
import { usePermissions } from '../hooks/usePermissions';
import { fmtDate, fmtDT } from './LoanDetailHelpers';
import '../styles/AppPage.css';
import '../styles/PtpsPage.css';

const fmtMoney = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v);

/** Local pill-tone map — mirrors BorrowersHelpers.tsx's RESTRUCTURE_PILL shape without
 *  editing that shared file (owned by a parallel workstream). Defined here (rather than in
 *  SettlementOffersPage.tsx, which already depends on this module for the drawer component)
 *  so the two new files stay a one-directional dependency instead of a cycle. */
export const SETTLEMENT_PILL: Record<SettlementOfferStatus, string> = {
  DRAFT: '',
  COMPLIANCE_REVIEW: 'is-info',
  APPROVED: 'is-accent',
  PROPOSED: 'is-info',
  ACCEPTED: 'is-accent',
  REJECTED: 'is-error',
  EXPIRED: 'is-error',
  PAID: 'is-accent',
};

export interface SettlementOfferDetailDrawerProps {
  offer: SettlementOfferResponse;
  onClose: () => void;
  onChanged: (updated: SettlementOfferResponse) => void;
}

export default function SettlementOfferDetailDrawer({ offer: o, onClose, onChanged }: SettlementOfferDetailDrawerProps) {
  const { hasRole } = usePermissions();
  const isSubmitter = hasRole('PLATFORM_ADMIN') || hasRole('ORG_ADMIN') || hasRole('MANAGER')
    || hasRole('TL') || hasRole('FO') || hasRole('CALLER');
  const isApprover = hasRole('PLATFORM_ADMIN') || hasRole('ORG_ADMIN') || hasRole('MANAGER') || hasRole('TL');
  const isOrgLevel = hasRole('PLATFORM_ADMIN') || hasRole('ORG_ADMIN');

  // Compliance-gated approval: when the drafted discount exceeds the org threshold, only an
  // org-level approver may approve — matches SettlementOfferServiceImpl.approve()'s server-side check.
  const canApprove = isApprover && (!o.complianceReviewRequired || isOrgLevel);
  const complianceBlocked = isApprover && !canApprove;

  const [busy, setBusy]   = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason]     = useState('');

  const run = async (key: string, fn: () => Promise<SettlementOfferResponse>) => {
    setBusy(key); setError(null);
    try {
      const updated = await fn();
      onChanged(updated);
      setShowRejectForm(false); setRejectReason('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Action failed.');
    } finally { setBusy(null); }
  };

  const approve       = () => run('approve', () => settlementOffersApi.approve(o.id));
  const reject         = () => {
    if (!rejectReason.trim()) { setShowRejectForm(true); return; }
    run('reject', () => settlementOffersApi.reject(o.id, { reason: rejectReason.trim() }));
  };
  const propose        = () => run('propose', () => settlementOffersApi.propose(o.id));
  const borrowerAccept = () => run('accept', () => settlementOffersApi.borrowerAccept(o.id));
  const markPaid        = () => run('paid', () => settlementOffersApi.markPaid(o.id));

  const canReject = isSubmitter && (o.status === 'DRAFT' || o.status === 'COMPLIANCE_REVIEW'
    || o.status === 'APPROVED' || o.status === 'PROPOSED');

  return (
    <>
      <div className="ds-drawer-overlay" onClick={onClose} />
      <div className="ds-drawer" role="dialog" aria-modal="true">
        <div className="ds-drawer-header">
          <div className="ptp-drawer-title-col">
            <div className="ptp-drawer-title">Settlement offer</div>
            <div className="ptp-drawer-sub-meta" style={{ fontFamily: 'var(--font-mono)' }}>{o.allocationId}</div>
            <div className="ptp-drawer-sub">Drafted {fmtDate(o.createdAt)}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-drawer-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-drawer-body">
          <div className="ptp-drawer-pills" style={{ marginBottom: 16 }}>
            <span className={`ds-pill ${SETTLEMENT_PILL[o.status]}`}>{o.status.replace(/_/g, ' ')}</span>
            {o.complianceReviewRequired && <span className="ds-pill is-warn">Compliance review</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-card" style={{ padding: 14 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 11 }}>Outstanding at offer</span>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Balance</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{fmtMoney(o.outstandingAtOffer)}</span>
                </div>
              </div>
            </div>
            <div className="ds-card" style={{ padding: 14, borderColor: 'var(--ink-solid)' }}>
              <span className="db-att-label" style={{ color: 'var(--ink-solid)', fontSize: 11 }}>Offered terms</span>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Amount</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{fmtMoney(o.offeredAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Discount</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{o.discountPct.toFixed(2)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>Tenor</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{o.tenorDays} days</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: 'var(--ink-tertiary)' }}>
            Valid until {fmtDT(o.validityUntil)}
          </div>

          {o.conditions && (
            <div style={{ marginTop: 16 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Conditions</span>
              <p style={{ fontSize: 13, color: 'var(--ink-primary)', marginTop: 4 }}>{o.conditions}</p>
            </div>
          )}

          {o.rejectionReason && (
            <div style={{ marginTop: 12 }}>
              <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Rejection reason</span>
              <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 4 }}>{o.rejectionReason}</p>
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {o.approvedAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Approved {fmtDT(o.approvedAt)}</span>}
            {o.proposedAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Proposed to borrower {fmtDT(o.proposedAt)}</span>}
            {o.acceptedAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Borrower accepted {fmtDT(o.acceptedAt)}</span>}
            {o.paidAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Marked paid {fmtDT(o.paidAt)}</span>}
            {o.rejectedAt && <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Rejected {fmtDT(o.rejectedAt)}</span>}
          </div>

          {error && <div className="ptp-modal-error" role="alert" style={{ marginTop: 12 }}><AlertCircle size={14} /><span>{error}</span></div>}

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(o.status === 'DRAFT' || o.status === 'COMPLIANCE_REVIEW') && (canApprove || complianceBlocked) && (
              <>
                {complianceBlocked && (
                  <p style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                    This offer's discount requires compliance review — only an org admin or platform admin can approve it.
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {canApprove && (
                    <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={approve}>
                      {busy === 'approve' ? <Loader2 size={13} className="ds-spin" /> : <ThumbsUp size={13} />} Approve
                    </button>
                  )}
                  {canReject && !showRejectForm && (
                    <button type="button" className="ds-btn is-secondary is-sm" disabled={busy !== null} onClick={reject}>
                      {busy === 'reject' ? <Loader2 size={13} className="ds-spin" /> : <ThumbsDown size={13} />} Reject
                    </button>
                  )}
                </div>
              </>
            )}

            {canReject && (o.status === 'APPROVED' || o.status === 'PROPOSED') && (
              <div style={{ display: 'flex', gap: 8 }}>
                {o.status === 'APPROVED' && (
                  <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={propose}>
                    {busy === 'propose' ? <Loader2 size={13} className="ds-spin" /> : <Send size={13} />} Propose to borrower
                  </button>
                )}
                {o.status === 'PROPOSED' && (
                  <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={borrowerAccept}>
                    {busy === 'accept' ? <Loader2 size={13} className="ds-spin" /> : <Signature size={13} />} Record borrower acceptance
                  </button>
                )}
                {!showRejectForm && (
                  <button type="button" className="ds-btn is-secondary is-sm" disabled={busy !== null} onClick={reject}>
                    {busy === 'reject' ? <Loader2 size={13} className="ds-spin" /> : <ThumbsDown size={13} />} Reject
                  </button>
                )}
              </div>
            )}

            {showRejectForm && canReject && (
              <>
                <div className="ds-field">
                  <span className="ds-label is-required">Rejection reason</span>
                  <textarea className="ds-textarea" rows={2} maxLength={500} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Why this offer is being declined" autoFocus />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="ds-btn is-secondary is-sm" disabled={busy !== null || !rejectReason.trim()} onClick={reject}>
                    {busy === 'reject' ? <Loader2 size={13} className="ds-spin" /> : <ThumbsDown size={13} />} Confirm reject
                  </button>
                  <button type="button" className="ds-btn is-secondary is-sm" onClick={() => { setShowRejectForm(false); setRejectReason(''); }}>Cancel</button>
                </div>
              </>
            )}

            {isSubmitter && o.status === 'ACCEPTED' && (
              <button type="button" className="ds-btn is-primary is-sm" disabled={busy !== null} onClick={markPaid}>
                {busy === 'paid' ? <Loader2 size={13} className="ds-spin" /> : <BadgeIndianRupee size={13} />} Mark paid
              </button>
            )}

            {(o.status === 'REJECTED' || o.status === 'EXPIRED' || o.status === 'PAID') && (
              <p style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                This offer is closed. No further actions apply.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
