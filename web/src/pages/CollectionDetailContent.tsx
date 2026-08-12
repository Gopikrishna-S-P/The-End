import type { ReactNode } from 'react';
import {
  Loader2, Banknote, Calendar, FileText, ArrowLeft,
  CreditCard, User, IndianRupee, AlertCircle,
} from 'lucide-react';
import type { CollectionResponse, CollectionDocumentResponse, AllocationResponse } from '../types';
import { StatusPill, PaymentModePill, fmtINR, fmtDate, fmtDT } from './CollectionsHelpers';
import { getDynField } from './VisitDrawerHelpers';

function Field({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === '') return null;
  return (
    <div className="ld-field">
      <dt className="ld-field-label" title={label}>{label}</dt>
      <dd className="ld-field-value">{children}</dd>
    </div>
  );
}

function Section({ icon: Icon, label, children }: { icon: typeof FileText; label: string; children: ReactNode }) {
  return (
    <section className="ld-section">
      <h2 className="ld-section-label"><Icon size={12} /> {label}</h2>
      {children}
    </section>
  );
}

interface Props {
  collection: CollectionResponse;
  allocation: AllocationResponse | null;
  docs: CollectionDocumentResponse[];
  docsLoading: boolean;
  onOpenDoc: (docId: string) => void;
  openingDocId: string | null;
  onBack: () => void;
  children?: ReactNode;
}

export function CollectionDetailContent({
  collection, allocation, docs, docsLoading, onOpenDoc, openingDocId, onBack, children
}: Props) {
  const hasCheque = Boolean(collection.chequeNumber || collection.chequeDate || collection.bankName);
  const hasTxnRef = Boolean(collection.upiReferenceId || collection.transactionReferenceId);

  const segment = allocation ? getDynField(allocation.dynamicData, 'segment') : null;
  const branch  = allocation ? getDynField(allocation.dynamicData, 'branch')  : null;
  const product = allocation ? getDynField(allocation.dynamicData, 'product') : null;

  return (
    <div className="ds-card db-card ld-card">
      <header className="ld-head" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="db-detail-title" style={{ margin: 0, fontSize: 20 }}>{collection.borrowerName ?? allocation?.borrowerName ?? 'Collection details'}</h1>
            <PaymentModePill mode={collection.paymentMode} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="ld-loan-ref">{collection.loanNumber ?? allocation?.loanNumber ?? '—'}</span>
            <StatusPill status={collection.status} />
            {allocation?.npaFlagged && (
              <span className="ds-pill is-danger" style={{ fontWeight: 600 }}>
                <AlertCircle size={12} style={{ marginRight: 4 }} /> NPA
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 16, color: 'var(--ink-primary)' }}>
              <IndianRupee size={15} /> {fmtINR(collection.amount)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--ink-secondary)', fontWeight: 500 }}>
              <Calendar size={15} /> {fmtDate(collection.collectionDate)}
            </div>
          </div>
        </div>
      </header>

      <div className="alloc-detail-scroll ld-main-scroll">
      <div className="ld-sheet">
        <Section icon={Banknote} label="Collection details">
          <dl className="ld-grid">
            {collection.receiptNumber && <Field label="Receipt"><span style={{ fontFamily: 'var(--font-mono)' }}>{collection.receiptNumber}</span></Field>}
            {collection.notes && <Field label="Notes">{collection.notes}</Field>}
            {collection.rejectionReason && (
              <Field label="Rejection reason"><span style={{ color: 'var(--danger)', fontWeight: 500 }}>{collection.rejectionReason}</span></Field>
            )}
          </dl>
        </Section>

        {hasCheque && (
          <Section icon={CreditCard} label="Cheque details">
            <dl className="ld-grid">
              {collection.chequeNumber && <Field label="Cheque number"><span style={{ fontFamily: 'var(--font-mono)' }}>{collection.chequeNumber}</span></Field>}
              {collection.chequeDate && <Field label="Cheque date">{fmtDate(collection.chequeDate)}</Field>}
              {collection.bankName && <Field label="Bank">{collection.bankName}</Field>}
            </dl>
          </Section>
        )}

        {hasTxnRef && (
          <Section icon={CreditCard} label="Transaction reference">
            <dl className="ld-grid">
              {collection.upiReferenceId && <Field label="UPI reference"><span style={{ fontFamily: 'var(--font-mono)' }}>{collection.upiReferenceId}</span></Field>}
              {collection.transactionReferenceId && <Field label="Transaction ID"><span style={{ fontFamily: 'var(--font-mono)' }}>{collection.transactionReferenceId}</span></Field>}
            </dl>
          </Section>
        )}

        <Section icon={Calendar} label="Timeline">
          <dl className="ld-grid">
            <Field label="Submitted">{fmtDT(collection.createdAt)}</Field>
            {collection.approvedAt && <Field label="Approved at">{fmtDT(collection.approvedAt)}</Field>}
            {collection.depositedAt && <Field label="Deposited at">{fmtDT(collection.depositedAt)}</Field>}
          </dl>
        </Section>

        <Section icon={User} label="People">
          <dl className="ld-grid">
            <Field label="Submitted by">{collection.agentName ?? 'Unknown agent'}</Field>
          </dl>
        </Section>

        <Section icon={FileText} label="Payment proof">
          {docsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0 8px', fontSize: 13, color: 'var(--ink-tertiary)' }}>
              <Loader2 size={12} className="ds-spin" /> Loading…
            </div>
          ) : docs.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', fontStyle: 'italic', padding: '4px 0 8px', margin: 0 }}>No proof attached</p>
          ) : (
            <div style={{ padding: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onOpenDoc(doc.id)}
                  disabled={openingDocId === doc.id}
                  className="db-customize-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start', width: '100%', border: 'none', cursor: 'pointer' }}
                >
                  {openingDocId === doc.id
                    ? <Loader2 size={14} className="ds-spin" style={{ color: 'var(--ink-tertiary)' }} />
                    : <FileText size={14} style={{ color: 'var(--ink-tertiary)' }} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>{doc.fileName}</span>
                </button>
              ))}
            </div>
          )}
        </Section>

        {allocation && (segment || branch || product) && (
          <Section icon={FileText} label="Loan information">
            <dl className="ld-grid">
              {segment && <Field label="Segment">{segment}</Field>}
              {branch && <Field label="Branch">{branch}</Field>}
              {product && <Field label="Product">{product}</Field>}
            </dl>
          </Section>
        )}
      </div>
      {children}
      </div>
    </div>
  );
}
