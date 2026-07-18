import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../client';
import { documentsApi } from '../api/documentsApi';
import { useAuth } from '../AuthContext';
import type { CollectionResponse, CollectionDocumentResponse, ApprovalAction } from '../types';
import {
  X, Banknote, CheckCircle2, FileText,
  Loader2, AlertCircle, ThumbsUp, ThumbsDown, Calendar,
  User, CreditCard,
} from 'lucide-react';
import { StatusPill, PaymentModePill, fmtINR } from './CollectionsHelpers';
import './Dashboard.css';

const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const DR = ({ label, children }: { label: string; children: React.ReactNode }) => {
  if (children == null || children === '' || children === '—') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
      <span className="db-kpi2-foot-meta" style={{ letterSpacing: '0.02em' }}>{label}</span>
      <span style={{ color: 'var(--ink-primary)', textAlign: 'right' }}>{children}</span>
    </div>
  );
};

const Group = ({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) => {
  let hasChildren = false;
  // Simple check to prevent rendering empty groups if all DRs return null
  try { hasChildren = Array.isArray(children) ? children.some(c => c) : !!children; } catch { hasChildren = true; }
  if (!hasChildren) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--ink-primary)', fontWeight: 600, fontSize: 13 }}>
        <Icon size={14} style={{ color: 'var(--ink-tertiary)' }} />
        {title}
      </div>
      <div style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: '0 16px', border: '1px solid var(--border-subtle)' }}>
        {children}
      </div>
    </div>
  );
}

const APPROVER_ROLES = ['ROLE_TL', 'ROLE_MANAGER', 'ROLE_ORG_ADMIN', 'ROLE_PLATFORM_ADMIN'];

export interface CollectionDetailDrawerProps {
  collection: CollectionResponse;
  onClose: () => void;
  onChanged: () => void;
}

export default function CollectionDetailDrawer({ collection, onClose, onChanged }: CollectionDetailDrawerProps) {
  const { user } = useAuth();
  const canApprove = user?.roles.some((r) => APPROVER_ROLES.includes(r.name)) ?? false;

  const [docs, setDocs] = useState<CollectionDocumentResponse[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [, setAction] = useState<ApprovalAction | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState<ApprovalAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositNotes, setDepositNotes] = useState('');

  useEffect(() => {
    setDocs([]); setDocsLoading(true); setAction(null); setRemarks(''); setError(null);
    documentsApi.getDocuments(collection.id)
      .then(r => setDocs(Array.isArray(r) ? r : []))
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false));
  }, [collection.id]);

  const handleApproval = async (a: ApprovalAction) => {
    if (a === 'REJECT' && !remarks.trim()) { setError('Rejection reason is required.'); return; }
    setSubmitting(a); setError(null);
    try {
      await apiClient.patch(`/api/v1/collections/${collection.id}/approval`, {
        action: a, remarks: remarks.trim() || undefined,
      });
      onChanged();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to process approval.');
      setSubmitting(null);
    }
  };

  const handleDeposit = async () => {
    setDepositLoading(true); setError(null);
    try {
      await apiClient.patch(`/api/v1/collections/${collection.id}/deposit`, { notes: depositNotes.trim() || undefined });
      onChanged();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to mark as deposited.');
      setDepositLoading(false);
    }
  };

  const isPending  = collection.status === 'PENDING_APPROVAL';
  const isApproved = collection.status === 'APPROVED';

  return (
    <>
      <motion.div className="ds-drawer-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      <motion.div className="ds-drawer" role="dialog" aria-modal="true"
        initial={{ x: '100%', opacity: 0.5 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0.5 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>

        <div className="ds-drawer-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>{fmtINR(collection.amount)}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
              {collection.paymentMode} · {fmtDate(collection.collectionDate)}
            </div>
          </div>
          <button type="button" onClick={onClose} className="ds-drawer-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-drawer-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatusPill status={collection.status} />
            <PaymentModePill mode={collection.paymentMode} />
          </div>

          <Group title="Collection details" icon={Banknote}>
            <DR label="Amount">
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>
                {fmtINR(collection.amount)}
              </span>
            </DR>
            <DR label="Collection date">{fmtDate(collection.collectionDate)}</DR>
            {collection.receiptNumber && <DR label="Receipt"><span style={{ fontFamily: 'var(--font-mono)' }}>{collection.receiptNumber}</span></DR>}
            {collection.notes && <DR label="Notes">{collection.notes}</DR>}
            {collection.rejectionReason && (
              <DR label="Rejection reason">
                <span style={{ color: 'var(--danger)', fontWeight: 500 }}>{collection.rejectionReason}</span>
              </DR>
            )}
          </Group>

          {(collection.chequeNumber || collection.chequeDate || collection.bankName) && (
            <Group title="Cheque details" icon={CreditCard}>
              {collection.chequeNumber && <DR label="Cheque number"><span style={{ fontFamily: 'var(--font-mono)' }}>{collection.chequeNumber}</span></DR>}
              {collection.chequeDate   && <DR label="Cheque date">{fmtDate(collection.chequeDate)}</DR>}
              {collection.bankName     && <DR label="Bank">{collection.bankName}</DR>}
            </Group>
          )}

          {(collection.upiReferenceId || collection.transactionReferenceId) && (
            <Group title="Transaction reference" icon={CreditCard}>
              {collection.upiReferenceId          && <DR label="UPI reference"><span style={{ fontFamily: 'var(--font-mono)' }}>{collection.upiReferenceId}</span></DR>}
              {collection.transactionReferenceId  && <DR label="Transaction ID"><span style={{ fontFamily: 'var(--font-mono)' }}>{collection.transactionReferenceId}</span></DR>}
            </Group>
          )}

          <Group title="Timeline" icon={Calendar}>
            <DR label="Submitted"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtDT(collection.createdAt)}</span></DR>
            {collection.approvedAt  && <DR label="Approved at"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtDT(collection.approvedAt)}</span></DR>}
            {collection.depositedAt && <DR label="Deposited at"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtDT(collection.depositedAt)}</span></DR>}
          </Group>

          <Group title="People" icon={User}>
            {collection.submittedBy && <DR label="Submitted by">{collection.submittedBy}</DR>}
            {collection.approvedBy  && <DR label="Approved by">{collection.approvedBy}</DR>}
            {collection.depositedBy && <DR label="Deposited by">{collection.depositedBy}</DR>}
          </Group>

          <Group title="Payment proof" icon={FileText}>
            {docsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 0', fontSize: 13, color: 'var(--ink-tertiary)' }}>
                <Loader2 size={12} className="ds-spin" /> Loading…
              </div>
            ) : docs.length === 0 ? (
              <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--ink-tertiary)', fontStyle: 'italic' }}>No proof attached</div>
            ) : (
              <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {docs.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="db-customize-btn"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', textDecoration: 'none' }}
                  >
                    <FileText size={14} style={{ color: 'var(--ink-tertiary)' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{doc.fileName}</span>
                  </a>
                ))}
              </div>
            )}
          </Group>
        </div>

        <div className="ds-drawer-footer" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-subtle)', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', color: 'var(--danger)', fontSize: 12.5, marginBottom: 16 }}>
              <AlertCircle size={14} /> <span>{error}</span>
            </div>
          )}

          {canApprove && isPending && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks (required for reject)…"
                className="ds-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => { setAction('REJECT'); handleApproval('REJECT'); }}
                  disabled={!!submitting}
                  className="ds-btn is-primary"
                  style={{ flex: 1, background: 'var(--danger)', border: 'none', color: '#fff' }}
                >
                  {submitting === 'REJECT' ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <ThumbsDown size={14} style={{ marginRight: 6 }} />}
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => { setAction('APPROVE'); handleApproval('APPROVE'); }}
                  disabled={!!submitting}
                  className="ds-btn is-primary"
                  style={{ flex: 2, background: 'var(--success)', border: 'none', color: '#fff' }}
                >
                  {submitting === 'APPROVE' ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <ThumbsUp size={14} style={{ marginRight: 6 }} />}
                  Approve
                </button>
              </div>
            </div>
          )}

          {canApprove && isApproved && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                rows={2}
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder="Deposit notes (optional)…"
                className="ds-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
              <button
                type="button"
                onClick={handleDeposit}
                disabled={depositLoading}
                className="ds-btn is-primary"
                style={{ width: '100%', background: 'var(--info)', border: 'none', color: '#fff' }}
              >
                {depositLoading ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <Banknote size={14} style={{ marginRight: 6 }} />}
                Mark as deposited
              </button>
            </div>
          )}

          {!(canApprove && (isPending || isApproved)) && (
            <button
              type="button"
              onClick={onClose}
              className="ds-btn is-primary"
              style={{ width: '100%' }}
            >
              <CheckCircle2 size={14} style={{ marginRight: 6 }} /> Done
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
