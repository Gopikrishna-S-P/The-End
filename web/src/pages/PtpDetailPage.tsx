import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ptpsApi } from '../api/ptpsApi';
import { usePermissions } from '../hooks/usePermissions';
import type { PtpResponse, PtpStatus } from '../types';
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, AlertTriangle, XCircle,
  Phone, User, FileText, IndianRupee, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';
import { STATUS_VARIANT, fmtINR, fmtDate } from './PtpsHelpers';
import { PtpUpdateModal } from './PtpUpdateModal';
import '../styles/AppPage.css';
import './Dashboard.css';
import '../styles/LoanDetailPage.css';
import '../styles/PtpsPage.css';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' as const } },
};

const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export default function PtpDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermissions();

  const isBankView  = location.pathname.startsWith('/bank');
  const canUpdate   = !isBankView && hasPermission('PTP_CREATE');

  const [ptp, setPtp]                 = useState<PtpResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [activeTab, setActiveTab]     = useState<'details' | 'timeline'>('details');

  const fetchPtp = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const data = await ptpsApi.getPtpById(id);
      setPtp(data);
    } catch {
      setPtp(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPtp();
  }, [fetchPtp]);

  const prefix = location.pathname.startsWith('/bank')
    ? '/bank'
    : location.pathname.startsWith('/agent')
    ? '/agent'
    : '/app';

  if (loading) {
    return (
      <div className="db-root alloc-detail-root">
        <div className="db-content">
          <div className="db-inner">
            <div className="db-page-header">
              <div className="db-page-header-left">
                <button type="button" onClick={() => navigate(`${prefix}/ptps`)} className="ds-btn is-secondary is-sm">
                  <ArrowLeft size={14} /> Back to PTPs
                </button>
              </div>
            </div>
            <div className="ds-card ld-card" style={{ padding: '60px 0', textAlign: 'center' }}>
              <RefreshCw size={24} className="ds-spin" style={{ color: 'var(--ink-tertiary)', margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--ink-tertiary)', fontSize: 13 }}>Loading PTP commitment details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !ptp) {
    return (
      <div className="db-root alloc-detail-root">
        <div className="db-content">
          <div className="db-inner">
            <div className="db-page-header">
              <div className="db-page-header-left">
                <button type="button" onClick={() => navigate(`${prefix}/ptps`)} className="ds-btn is-secondary is-sm">
                  <ArrowLeft size={14} /> Back to PTPs
                </button>
              </div>
            </div>
            <div className="ds-card ld-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
              <AlertCircle size={32} style={{ color: 'var(--danger)', margin: '0 auto 12px' }} />
              <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8 }}>PTP Record Not Found</h2>
              <p style={{ color: 'var(--ink-secondary)', fontSize: 13, marginBottom: 20 }}>The Promise-to-Pay record you requested could not be found.</p>
              <button type="button" onClick={() => navigate(`${prefix}/ptps`)} className="ds-btn is-primary">
                Return to PTPs list
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPast       = new Date(ptp.promisedDate) < new Date();
  const isActionable = ptp.status === 'PENDING' || ptp.status === 'PARTIALLY_FULFILLED';

  return (
    <div className="db-root alloc-detail-root">
      <div className="db-content">
        <div className="db-inner">

          {/* Top Page Header */}
          <div className="db-page-header">
            <div className="db-page-header-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <button type="button" onClick={() => navigate(`${prefix}/ptps`)} className="ds-btn is-secondary is-sm">
                  <ArrowLeft size={14} /> Back to PTPs
                </button>
              </div>
              <p className="dd-page-context">Detailed Promise-to-Pay commitment overview</p>
            </div>

            <div className="db-page-header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="db-kpi-toggle" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={`db-kpi-toggle-btn ${activeTab === 'details' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('details')}
                >
                  Details
                </button>
                <button
                  type="button"
                  className={`db-kpi-toggle-btn ${activeTab === 'timeline' ? 'is-active' : ''}`}
                  onClick={() => setActiveTab('timeline')}
                >
                  Timeline
                </button>
              </div>

              {canUpdate && isActionable && (
                <button type="button" onClick={() => setShowUpdateModal(true)} className="ds-btn is-primary">
                  Update status
                </button>
              )}
            </div>
          </div>

          {/* Main Card */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="ds-card ld-card">
            
            {/* Header section inside card */}
            <div className="ld-head" style={{ padding: '36px 32px 24px' }}>
              <div className="ld-head-top" style={{ padding: 0 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <h1 className="ld-borrower">{ptp.borrowerName}</h1>
                    <span className={`ds-pill ${STATUS_VARIANT[ptp.status]}`}>{ptp.status.replace('_', ' ')}</span>
                    {isPast && ptp.status === 'PENDING' && (
                      <span className="ds-pill is-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={11} /> OVERDUE
                      </span>
                    )}
                    {ptp.reminderSent && (
                      <span className="ds-pill"><Clock size={11} style={{ marginRight: 4 }} /> Reminder sent</span>
                    )}
                  </div>
                  
                  <div className="ld-ref-line" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <span className="ld-loan-ref">Loan #{ptp.loanNumber ?? '—'}</span>
                    {ptp.allocationId && (
                      <button
                        type="button"
                        onClick={() => navigate(`${prefix}/allocations/${ptp.allocationId}`)}
                        className="ds-btn is-secondary is-sm"
                        style={{ padding: '2px 8px', fontSize: 11, gap: 4 }}
                      >
                        <ExternalLink size={11} /> View full loan case
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Horizontal Facts Strip */}
              <div className="ld-facts" style={{ padding: 0, marginTop: 24, gap: '24px 32px', flexWrap: 'wrap' }}>
                <div className="ld-fact">
                  <span className="ld-fact-label">Promised amount</span>
                  <span className="ld-fact-val" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, color: 'var(--ink-primary)' }}>
                    {fmtINR(ptp.promisedAmount)}
                  </span>
                </div>

                <div className="ld-fact">
                  <span className="ld-fact-label">Collected amount</span>
                  <span className="ld-fact-val" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16, color: ptp.collectedAmount > 0 ? 'var(--success)' : 'var(--ink-secondary)' }}>
                    {fmtINR(ptp.collectedAmount)}
                  </span>
                </div>

                <div className="ld-fact">
                  <span className="ld-fact-label">Promised date</span>
                  <span className="ld-fact-val" style={{ color: isPast && ptp.status === 'PENDING' ? 'var(--danger)' : 'var(--ink-primary)' }}>
                    {fmtDate(ptp.promisedDate)}
                  </span>
                </div>

                <div className="ld-fact">
                  <span className="ld-fact-label">Fulfillment</span>
                  <span className="ld-fact-val" style={{ fontFamily: 'var(--font-mono)' }}>
                    {ptp.fulfillmentPercentage?.toFixed(0) ?? '0'}%
                  </span>
                </div>

                <div className="ld-fact">
                  <span className="ld-fact-label">Field Officer</span>
                  <span className="ld-fact-val">{ptp.agentName}</span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="ld-main" style={{ padding: '0 32px 36px' }}>
              {activeTab === 'details' && (
                <div className="ld-sheet">
                  
                  {/* Commitment details section */}
                  <section className="ld-section">
                    <h2 className="ld-section-label"><FileText size={12} /> Commitment Details</h2>
                    <dl className="ld-grid">
                      <div className="ld-field">
                        <dt className="ld-field-label">Borrower Name</dt>
                        <dd className="ld-field-value">{ptp.borrowerName}</dd>
                      </div>
                      <div className="ld-field">
                        <dt className="ld-field-label">Loan Account</dt>
                        <dd className="ld-field-value">{ptp.loanNumber}</dd>
                      </div>
                      <div className="ld-field">
                        <dt className="ld-field-label">Promised Amount</dt>
                        <dd className="ld-field-value" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtINR(ptp.promisedAmount)}</dd>
                      </div>
                      <div className="ld-field">
                        <dt className="ld-field-label">Promised Date</dt>
                        <dd className="ld-field-value">{fmtDate(ptp.promisedDate)}</dd>
                      </div>
                      <div className="ld-field">
                        <dt className="ld-field-label">Amount Collected</dt>
                        <dd className="ld-field-value" style={{ fontFamily: 'var(--font-mono)', color: ptp.collectedAmount > 0 ? 'var(--success)' : undefined }}>
                          {fmtINR(ptp.collectedAmount)}
                        </dd>
                      </div>
                      <div className="ld-field">
                        <dt className="ld-field-label">Status</dt>
                        <dd className="ld-field-value" style={{ textTransform: 'capitalize' }}>{ptp.status.replace(/_/g, ' ').toLowerCase()}</dd>
                      </div>
                      <div className="ld-field">
                        <dt className="ld-field-label">Assigned Field Officer</dt>
                        <dd className="ld-field-value">{ptp.agentName}</dd>
                      </div>
                      <div className="ld-field">
                        <dt className="ld-field-label">Reminder Status</dt>
                        <dd className="ld-field-value">{ptp.reminderSent ? `Sent at ${fmtDT(ptp.reminderSentAt)}` : 'Not sent'}</dd>
                      </div>
                    </dl>
                  </section>

                  {/* Notes & Remarks section */}
                  {ptp.contactNotes && (
                    <section className="ld-section">
                      <h2 className="ld-section-label"><Phone size={12} /> Contact Notes</h2>
                      <div style={{ background: 'var(--bg-subtle)', padding: 16, borderRadius: 8, fontSize: 13, color: 'var(--ink-primary)', lineHeight: 1.5 }}>
                        {ptp.contactNotes}
                      </div>
                    </section>
                  )}

                  {/* Reason section (if broken or cancelled) */}
                  {(ptp.brokenReason || ptp.cancellationReason) && (
                    <section className="ld-section">
                      <h2 className="ld-section-label"><AlertTriangle size={12} /> Resolution Notes</h2>
                      <dl className="ld-grid">
                        {ptp.brokenReason && (
                          <div className="ld-field" style={{ gridColumn: 'span 2' }}>
                            <dt className="ld-field-label">Broken Reason</dt>
                            <dd className="ld-field-value" style={{ color: 'var(--danger)' }}>{ptp.brokenReason}</dd>
                          </div>
                        )}
                        {ptp.cancellationReason && (
                          <div className="ld-field" style={{ gridColumn: 'span 2' }}>
                            <dt className="ld-field-label">Cancellation Reason</dt>
                            <dd className="ld-field-value">{ptp.cancellationReason}</dd>
                          </div>
                        )}
                      </dl>
                    </section>
                  )}

                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="ld-sheet">
                  <section className="ld-section">
                    <h2 className="ld-section-label"><Calendar size={12} /> Activity & Audit Timeline</h2>
                    <dl className="ld-grid">
                      <div className="ld-field">
                        <dt className="ld-field-label">Created At</dt>
                        <dd className="ld-field-value">{fmtDT(ptp.createdAt)}</dd>
                      </div>
                      <div className="ld-field">
                        <dt className="ld-field-label">Created By</dt>
                        <dd className="ld-field-value">{ptp.createdBy || 'System'}</dd>
                      </div>
                      {ptp.updatedAt && (
                        <div className="ld-field">
                          <dt className="ld-field-label">Last Updated</dt>
                          <dd className="ld-field-value">{fmtDT(ptp.updatedAt)}</dd>
                        </div>
                      )}
                      {ptp.fulfilledAt && (
                        <div className="ld-field">
                          <dt className="ld-field-label">Fulfilled At</dt>
                          <dd className="ld-field-value" style={{ color: 'var(--success)' }}>{fmtDT(ptp.fulfilledAt)}</dd>
                        </div>
                      )}
                      {ptp.brokenAt && (
                        <div className="ld-field">
                          <dt className="ld-field-label">Broken At</dt>
                          <dd className="ld-field-value" style={{ color: 'var(--danger)' }}>{fmtDT(ptp.brokenAt)}</dd>
                        </div>
                      )}
                      {ptp.reminderSentAt && (
                        <div className="ld-field">
                          <dt className="ld-field-label">Reminder Notification Sent</dt>
                          <dd className="ld-field-value">{fmtDT(ptp.reminderSentAt)}</dd>
                        </div>
                      )}
                    </dl>
                  </section>
                </div>
              )}
            </div>

          </motion.div>

        </div>
      </div>

      {/* Update Modal */}
      <AnimatePresence>
        {showUpdateModal && (
          <PtpUpdateModal
            ptp={ptp}
            onClose={() => setShowUpdateModal(false)}
            onSuccess={() => {
              setShowUpdateModal(false);
              fetchPtp();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
