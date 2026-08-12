import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { collectionsApi } from '../api/collectionsApi';
import { documentsApi } from '../api/documentsApi';
import { useAuth } from '../AuthContext';
import type { CollectionResponse, CollectionDocumentResponse, AllocationResponse, ApprovalAction } from '../types';
import { AlertCircle, ThumbsUp, ThumbsDown, Loader2, Banknote } from 'lucide-react';
import { CollectionDetailContent } from './CollectionDetailContent';
import '../styles/AppPage.css';
import './Dashboard.css';
import '../styles/LoanDetailPage.css';

const APPROVER_ROLES = ['ROLE_TL', 'ROLE_MANAGER', 'ROLE_ORG_ADMIN', 'ROLE_PLATFORM_ADMIN'];

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' as const } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

const apiMessage = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canApprove = user?.roles.some((r) => APPROVER_ROLES.includes(r.name)) ?? false;

  const [collection, setCollection] = useState<CollectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [allocation, setAllocation] = useState<AllocationResponse | null>(null);
  const [docs, setDocs] = useState<CollectionDocumentResponse[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);

  const [remarks, setRemarks] = useState('');
  const [approving, setApproving] = useState<ApprovalAction | null>(null);
  const [depositNotes, setDepositNotes] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true); setNotFound(false);
    collectionsApi.getCollectionById(id)
      .then(c => { if (!cancelled) setCollection(c); })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!collection) return;
    setAllocation(null);
    axiosInstance.get(`/api/v1/allocations/${collection.allocationId}`)
      .then((r) => setAllocation(r.data?.data ?? null))
      .catch(() => null);

    setDocs([]); setDocsLoading(true);
    documentsApi.getDocuments(collection.id)
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false));
  }, [collection]);

  const backToList = () => navigate('/app/collections');

  const openDoc = async (docId: string) => {
    if (!collection) return;
    setOpeningDocId(docId); setActionError(null);
    try {
      await documentsApi.openDocument(collection.id, docId);
    } catch {
      setActionError('Failed to open document.');
    } finally { setOpeningDocId(null); }
  };

  const handleApproval = async (action: ApprovalAction) => {
    if (!collection) return;
    if (action === 'REJECT' && !remarks.trim()) { setActionError('Rejection reason is required.'); return; }
    setApproving(action); setActionError(null);
    try {
      const updated = await collectionsApi.approveCollection(collection.id, {
        action, remarks: remarks.trim() || undefined,
      });
      setCollection(updated);
      setRemarks('');
    } catch (e: unknown) {
      setActionError(apiMessage(e, 'Failed to process approval.'));
    } finally { setApproving(null); }
  };

  const handleDeposit = async () => {
    if (!collection) return;
    setDepositing(true); setActionError(null);
    try {
      const updated = await collectionsApi.depositCollection(collection.id, {
        notes: depositNotes.trim() || undefined,
      });
      setCollection(updated);
      setDepositNotes('');
    } catch (e: unknown) {
      setActionError(apiMessage(e, 'Failed to mark as deposited.'));
    } finally { setDepositing(false); }
  };

  if (loading) return (
    <div className="db-root">
      <div className="db-content">
        <div className="db-inner">
          <div className="ds-card db-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span className="ds-skel" style={{ height: 24, width: 240 }} />
            <span className="ds-skel" style={{ height: 14, width: 150 }} />
          </div>
        </div>
      </div>
    </div>
  );

  if (notFound || !collection) return (
    <div className="db-root">
      <div className="db-content">
        <div className="db-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
            <AlertCircle size={32} className="ds-empty-icon" style={{ color: 'var(--error)' }} />
            <span className="ds-empty-title">Collection not found</span>
            <button type="button" onClick={backToList} className="ds-btn is-secondary" style={{ marginTop: 12 }}>
              Back to collections
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );

  const isPending  = collection.status === 'PENDING_APPROVAL';
  const isApproved = collection.status === 'APPROVED';

  return (
    <div className="db-root alloc-detail-root">
      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="alloc-detail-split" style={{ display: 'flex', flexDirection: 'column' }}>
            <CollectionDetailContent
              collection={collection} allocation={allocation}
              docs={docs} docsLoading={docsLoading}
              onOpenDoc={openDoc} openingDocId={openingDocId}
              onBack={backToList}
            >
              {(actionError || (canApprove && (isPending || isApproved))) && (
                <section className="ld-section">
                  <h2 className="ld-section-label"><ThumbsUp size={12} /> Approval</h2>

                  {actionError && (
                    <div className="vis-drawer-error" style={{ marginBottom: 12 }}>
                      <AlertCircle size={13} /> {actionError}
                    </div>
                  )}

                  {canApprove && isPending && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (required for reject)…" className="ds-textarea" />
                      <div className="vis-drawer-action-row">
                        <button type="button" onClick={() => handleApproval('REJECT')} disabled={!!approving} className="ds-btn is-danger">
                          {approving === 'REJECT' ? <Loader2 size={14} className="ds-spin" /> : <ThumbsDown size={14} />} Reject
                        </button>
                        <button type="button" onClick={() => handleApproval('APPROVE')} disabled={!!approving} className="ds-btn is-primary" style={{ flex: 1 }}>
                          {approving === 'APPROVE' ? <Loader2 size={14} className="ds-spin" /> : <ThumbsUp size={14} />} Approve
                        </button>
                      </div>
                    </div>
                  )}

                  {canApprove && isApproved && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <textarea rows={2} value={depositNotes} onChange={(e) => setDepositNotes(e.target.value)} placeholder="Deposit notes (optional)…" className="ds-textarea" />
                      <div className="vis-drawer-action-row">
                        <button type="button" onClick={handleDeposit} disabled={depositing} className="ds-btn is-primary" style={{ flex: 1 }}>
                          {depositing ? <Loader2 size={14} className="ds-spin" /> : <Banknote size={14} />} Mark as deposited
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </CollectionDetailContent>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
