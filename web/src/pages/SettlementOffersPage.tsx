import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { settlementOffersApi } from '../api/settlementOffersApi';
import { usePermissions } from '../hooks/usePermissions';
import type { SettlementOfferResponse, SettlementOfferStatus } from '../types/settlementOffers';
import { RefreshCcw, Plus, HandCoins, ChevronRight } from 'lucide-react';
import SettlementOfferDetailDrawer, { SETTLEMENT_PILL } from './SettlementOfferDetailDrawer';
import { SettlementOfferCreateModal } from './SettlementOfferCreateModal';
import { fmtDate } from './LoanDetailHelpers';
import { Pagination } from '../components/Pagination';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE = 25;

const STATUS_OPTIONS: Array<{ value: SettlementOfferStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'COMPLIANCE_REVIEW', label: 'Compliance review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PROPOSED', label: 'Proposed' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'PAID', label: 'Paid' },
];

const fmtMoney = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } } };
const fadeUp: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } } };
const fadeIn: Variants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } } };

export default function SettlementOffersPage() {
  const { hasRole } = usePermissions();
  const canDraft = hasRole('PLATFORM_ADMIN') || hasRole('ORG_ADMIN') || hasRole('MANAGER')
    || hasRole('TL') || hasRole('FO') || hasRole('CALLER');

  const [offers, setOffers]               = useState<SettlementOfferResponse[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadError, setLoadError]         = useState(false);
  const [page, setPage]                   = useState(0);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter]   = useState<SettlementOfferStatus | ''>('');
  const [selected, setSelected]           = useState<SettlementOfferResponse | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchOffers = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setLoadError(false);
    try {
      const data = await settlementOffersApi.list({ status: statusFilter || undefined, page, size: PAGE_SIZE }, controller.signal);
      setOffers(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (err: any) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') setLoadError(true);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleChanged = (updated: SettlementOfferResponse) => {
    setSelected(updated);
    setOffers(prev => prev.map(o => (o.id === updated.id ? updated : o)));
  };

  return (
    <div className="db-root db-fill-root" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="db-content" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1, paddingBottom: 36 }}>
        <div className="db-page-header">
          <div className="db-page-header-left is-list-header">
            {!loading && (
              <p className="dd-page-context">
                You have <strong>{totalElements.toLocaleString('en-IN')} settlement offers</strong> registered on file.
              </p>
            )}
          </div>
          <div className="db-list-page-actions">
            <div className="db-list-btn-group">
              <select
                className="ds-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as SettlementOfferStatus | ''); setPage(0); }}
                style={{ width: 'auto' }}
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {canDraft && (
                <button type="button" onClick={() => setShowCreateModal(true)} className="ds-btn is-primary">
                  <Plus size={14} /> New offer
                </button>
              )}
              <button type="button" onClick={fetchOffers} disabled={loading} className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
                <RefreshCcw size={14} className={loading ? 'ds-spin' : ''} /> Refresh
              </button>
            </div>
          </div>
        </div>

        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <motion.section variants={fadeUp} className="ds-card db-card is-list-card" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', ...(offers.length > 0 ? { flex: 1, minHeight: 0 } : {}) }}>
            <header className="db-card-head db-list-head" style={{ borderBottom: 'none' }}>
              <h3 className="db-list-title">Settlement</h3>
            </header>

            <div className="db-list-body db-list-scroll">
              {loadError ? (
                <div className="ds-empty" style={{ padding: '60px 0' }}>
                  <span className="ds-empty-title">Settlement offers could not be loaded.</span>
                  <div className="ds-empty-actions" style={{ marginTop: 12 }}>
                    <button type="button" onClick={fetchOffers} className="ds-btn is-secondary">Retry</button>
                  </div>
                </div>
              ) : loading ? (
                <div className="db-list-skel-wrap">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="dd-case-skel db-list-skel" style={{ opacity: 1 - i * 0.09 }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span className="ds-skel" style={{ height: 16, width: '40%' }} />
                        <span className="ds-skel" style={{ height: 12, width: '25%' }} />
                      </div>
                      <span className="ds-skel" style={{ height: 18, width: 80 }} />
                    </div>
                  ))}
                </div>
              ) : offers.length === 0 ? (
                <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show">

                  <HandCoins size={32} className="ds-empty-icon" />
                  <span className="ds-empty-title">No settlement offers</span>
                  <span className="ds-empty-sub">
                    {statusFilter ? 'No offers match this status filter.' : 'Draft a settlement offer to negotiate a reduced payoff with a borrower.'}
                  </span>
                </motion.div>
              ) : (
                <motion.div>
                  {offers.map((o, idx) => (
                    <motion.button
                      key={o.id}
                      variants={{ ...fadeUp, show: { ...fadeUp.show, transition: { ...((fadeUp.show as any)?.transition || {}), delay: idx * 0.02 } } }}
                      initial="hidden" animate="show"
                      className="db-att-row is-list-row"
                      style={{ background: selected?.id === o.id ? 'var(--bg-active)' : undefined }}
                      onClick={() => setSelected(o)}
                      whileHover={{ background: 'var(--bg-subtle)' }}
                    >
                      <div className="db-list-row-main">
                        <span className="db-att-label">
                          <HandCoins size={13} style={{ color: 'var(--ink-tertiary)' }} />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{o.allocationId}</span>
                          <span className={`ds-pill ${SETTLEMENT_PILL[o.status]}`}>{o.status.replace(/_/g, ' ')}</span>
                        </span>
                        <div className="db-list-row-meta" style={{ padding: 0, flexWrap: 'wrap' }}>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            {fmtMoney(o.outstandingAtOffer)} → {fmtMoney(o.offeredAmount)}
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                            / {o.discountPct.toFixed(1)}% discount
                          </span>
                          <span className="db-kpi2-foot-meta" style={{ fontSize: 11 }}>
                            / Drafted {fmtDate(o.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="db-list-row-right" style={{ flexShrink: 0 }}>
                        <span className="db-list-amount">
                          {fmtMoney(o.offeredAmount)}
                        </span>
                        <ChevronRight size={16} className="db-list-chevron" />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </div>

            {totalPages > 1 && !loading && (
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalElements={totalElements} itemLabel="records" />
            )}
          </motion.section>
        </motion.div>
      </div>

      <AnimatePresence>
        {selected && (
          <SettlementOfferDetailDrawer
            offer={selected}
            onClose={() => setSelected(null)}
            onChanged={handleChanged}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateModal && (
          <SettlementOfferCreateModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => { setShowCreateModal(false); fetchOffers(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
