import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import axiosInstance from '../api/axiosInstance';
import { visitsApi } from '../api/visitsApi';
import { visitSessionApi } from '../api/visitSessionApi';
import { usePermissions } from '../hooks/usePermissions';
import type { VisitLogResponse, AllocationResponse } from '../types';
import type { VisitSession } from '../types/visitSession';
import { X, AlertCircle, ThumbsUp, ThumbsDown, Loader2, Trash2 } from 'lucide-react';
import { VisitDetailContent } from './VisitDetailContent';
import '../styles/AppPage.css';
import './Dashboard.css';
import '../styles/LoanDetailPage.css';
import '../styles/VisitsPage.css';

const stagger = {
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

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { hasPermission, hasAnyRole } = usePermissions();
  const canApprove = hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN', 'MANAGER', 'TL');
  const canDelete  = hasPermission('FILE_DELETE');

  const [visit, setVisit]     = useState<VisitLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [allocation, setAllocation] = useState<AllocationResponse | null>(null);
  const [img1, setImg1] = useState<string | null>(null);
  const [img2, setImg2] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [proofDocs, setProofDocs] = useState<unknown[]>([]);
  const [proofLoading, setProofLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [approving, setApproving] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [session, setSession] = useState<VisitSession | null>(null);

  // The drawer received the visit as a prop from the list; a route only has an
  // id, so the record is fetched here before anything else can load.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true); setNotFound(false);
    visitsApi.getVisitById(id)
      .then(v => { if (!cancelled) setVisit(v); })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!visit) return;
    visitSessionApi.getByVisitLogId(visit.id)
      .then(s => setSession(s))
      .catch(() => setSession(null));
  }, [visit]);

  useEffect(() => {
    if (!visit) return;
    setImgLoading(true);
    setAllocation(null);
    axiosInstance.get(`/api/v1/allocations/${visit.allocationId}`)
      .then((r) => setAllocation(r.data?.data ?? null))
      .catch(() => null);

    const fetch1 = axiosInstance.get(`/api/v1/visit-logs/${visit.id}/image/1/url`)
      .then((r) => (r.data?.data as string) ?? null).catch(() => null);
    const fetch2 = axiosInstance.get(`/api/v1/visit-logs/${visit.id}/image/2/url`)
      .then((r) => (r.data?.data as string) ?? null).catch(() => null);
    Promise.all([fetch1, fetch2]).then(([u1, u2]) => { setImg1(u1); setImg2(u2); setImgLoading(false); });

    if (visit.collectionId) {
      setProofDocs([]); setProofLoading(true);
      axiosInstance.get(`/api/v1/collections/${visit.collectionId}/documents`)
        .then((r) => { const d = r.data?.data ?? r.data; setProofDocs(Array.isArray(d) ? d : []); })
        .catch(() => setProofDocs([]))
        .finally(() => setProofLoading(false));
    } else {
      setProofDocs([]); setProofLoading(false);
    }
  }, [visit]);

  // The drawer called onChanged() to refresh the list behind it and close.
  // A page has nothing behind it, so it returns to the list instead.
  const backToList = () => navigate('/app/visits');

  const handleApproval = async (action: 'APPROVE' | 'REJECT') => {
    if (!visit) return;
    setApproving(action); setApprovalError(null);
    try {
      await visitsApi.approveVisit(visit.id, { action, remarks: remarks.trim() || undefined });
      backToList();
    } catch (e: unknown) {
      setApprovalError(apiMessage(e, 'Failed to submit approval.'));
      setApproving(null);
    }
  };

  const handleDelete = async () => {
    if (!visit) return;
    setDeleting(true);
    try {
      await visitsApi.deleteVisit(visit.id);
      backToList();
    } catch (e: unknown) {
      setApprovalError(apiMessage(e, 'Failed to delete visit.'));
      setDeleting(false); setConfirmDelete(false);
    }
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

  if (notFound || !visit) return (
    <div className="db-root">
      <div className="db-content">
        <div className="db-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
            <AlertCircle size={32} className="ds-empty-icon" style={{ color: 'var(--error)' }} />
            <span className="ds-empty-title">Visit not found</span>
            <button type="button" onClick={backToList} className="ds-btn is-secondary" style={{ marginTop: 12 }}>
              Back to visit log
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );

  const isPending = visit.approvalStatus === 'PENDING';
  const hasGPS = visit.latitude != null && visit.longitude != null;

  return (
    /* Plain .db-root — deliberately NOT .alloc-detail-root. That class is
       `height:100%; overflow:hidden`, which opts a page out of the shell's
       scroller (.app-main) and pins the card to viewport height. LoanDetail
       earns that because a loan always has enough dynamic fields to overflow;
       a visit does not, so it produced a full-height empty card with nothing
       to scroll. This page scrolls with the shell instead. */
    <div className="db-root">
      {lightboxUrl && (
        <div className="vis-lightbox" onClick={() => setLightboxUrl(null)}>
          <button type="button" onClick={() => setLightboxUrl(null)} className="vis-lightbox-close" aria-label="Close">
            <X size={18} />
          </button>
          <img src={lightboxUrl} alt="Visit photo" className="vis-lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fadeUp}>
            <VisitDetailContent
              visit={visit} allocation={allocation}
              img1={img1} img2={img2} imgLoading={imgLoading}
              proofDocs={proofDocs} proofLoading={proofLoading}
              hasGPS={hasGPS} setLightboxUrl={setLightboxUrl}
              session={session}
              onBack={backToList}
              canDelete={canDelete}
              onDeleteClick={() => setConfirmDelete(true)}
            />
          </motion.div>

          {/* The drawer parked these in a sticky footer. On a page they read as
              the last card in the column. */}
          {(confirmDelete || approvalError || (canApprove && isPending)) && (
            <motion.div variants={fadeUp} className="ds-card db-card vis-detail-actions">
              {confirmDelete && (
                <div className="vis-confirm-delete">
                  <p>Delete this visit permanently?</p>
                  <div className="vis-drawer-action-row">
                    <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="ds-btn is-secondary is-sm" style={{ flex: 1 }}>Cancel</button>
                    <button type="button" onClick={handleDelete} disabled={deleting} className="ds-btn is-danger is-sm" style={{ flex: 1 }}>
                      {deleting ? <Loader2 size={13} className="ds-spin" /> : <Trash2 size={13} />} Delete
                    </button>
                  </div>
                </div>
              )}

              {approvalError && (
                <div className="vis-drawer-error">
                  <AlertCircle size={13} /> {approvalError}
                </div>
              )}

              {canApprove && isPending && (
                <>
                  <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (optional)…" className="ds-textarea" />
                  <div className="vis-drawer-action-row">
                    <button type="button" onClick={() => handleApproval('REJECT')} disabled={!!approving} className="ds-btn is-danger">
                      {approving === 'REJECT' ? <Loader2 size={14} className="ds-spin" /> : <ThumbsDown size={14} />} Reject
                    </button>
                    <button type="button" onClick={() => handleApproval('APPROVE')} disabled={!!approving} className="ds-btn is-primary" style={{ flex: 1 }}>
                      {approving === 'APPROVE' ? <Loader2 size={14} className="ds-spin" /> : <ThumbsUp size={14} />} Approve
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
