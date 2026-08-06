export { fmtDate, fmtDT, fmtINR, VisitPill } from './VisitDrawerHelpers';

import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { visitsApi } from '../api/visitsApi';
import { visitSessionApi } from '../api/visitSessionApi';
import { usePermissions } from '../hooks/usePermissions';
import type { VisitLogResponse, AllocationResponse } from '../types';
import type { VisitSession } from '../types/visitSession';
import { X, AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown, Loader2, Trash2 } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { VisitDrawerBody } from './VisitDrawerBody';
import '../styles/AppPage.css';

const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } }
};

export interface VisitDetailDrawerProps {
  visit: VisitLogResponse;
  onClose: () => void;
  onChanged: () => void;
  allocation?: AllocationResponse | null;
}

export default function VisitDetailDrawer({ visit, onClose, onChanged, allocation: presetAllocation }: VisitDetailDrawerProps) {
  const { hasPermission, hasAnyRole } = usePermissions();
  const canApprove = hasAnyRole('PLATFORM_ADMIN', 'ORG_ADMIN', 'MANAGER', 'TL');
  const canDelete  = hasPermission('FILE_DELETE');

  const [allocation, setAllocation] = useState<AllocationResponse | null>(presetAllocation ?? null);
  const [img1, setImg1] = useState<string | null>(null);
  const [img2, setImg2] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [proofDocs, setProofDocs] = useState<any[]>([]);
  const [proofLoading, setProofLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [approving, setApproving] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [session, setSession] = useState<VisitSession | null>(null);

  useEffect(() => {
    visitSessionApi.getByVisitLogId(visit.id)
      .then(s => setSession(s))
      .catch(() => setSession(null));
  }, [visit.id]);

  useEffect(() => {
    setImgLoading(true);
    if (!presetAllocation) {
      setAllocation(null);
      axiosInstance.get(`/api/v1/allocations/${visit.allocationId}`)
        .then((r) => setAllocation(r.data?.data ?? null))
        .catch(() => null);
    } else {
      setAllocation(presetAllocation);
    }

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
  }, [visit.id, visit.allocationId, visit.collectionId, presetAllocation]);

  const handleApproval = async (action: 'APPROVE' | 'REJECT') => {
    setApproving(action); setApprovalError(null);
    try {
      await visitsApi.approveVisit(visit.id, { action, remarks: remarks.trim() || undefined });
      onChanged();
    } catch (e: any) {
      setApprovalError(e?.response?.data?.message || 'Failed to submit approval.');
      setApproving(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await visitsApi.deleteVisit(visit.id);
      onChanged();
    } catch (e: any) {
      setApprovalError(e?.response?.data?.message || 'Failed to delete visit.');
      setDeleting(false); setConfirmDelete(false);
    }
  };

  const isPending = visit.approvalStatus === 'PENDING';
  const hasGPS = visit.latitude != null && visit.longitude != null;

  return (
    <>
      {lightboxUrl && (
        <div className="vis-lightbox" onClick={() => setLightboxUrl(null)}>
          <button type="button" onClick={() => setLightboxUrl(null)} className="vis-lightbox-close" aria-label="Close">
            <X size={18} />
          </button>
          <img src={lightboxUrl} alt="Visit photo" className="vis-lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <motion.div className="ds-drawer-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
      <motion.div className="ds-drawer" style={{ width: '70%', height: '100vh', background: 'var(--bg-canvas)', boxShadow: '-24px 0 48px color-mix(in srgb, var(--text-primary) 8%, transparent)' }} role="dialog" aria-modal="true" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.8 }}>
        <div className="ds-drawer-body" style={{ background: 'var(--bg-canvas)' }}>
          <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">
            <motion.div variants={fadeUp}>
              <VisitDrawerBody
                visit={visit} allocation={allocation}
                img1={img1} img2={img2} imgLoading={imgLoading}
                proofDocs={proofDocs} proofLoading={proofLoading}
                hasGPS={hasGPS} setLightboxUrl={setLightboxUrl}
                session={session}
                onClose={onClose}
                canDelete={canDelete}
                onDeleteClick={() => setConfirmDelete(true)}
              />
            </motion.div>
          </motion.div>
        </div>

        {(confirmDelete || approvalError || (canApprove && isPending)) && (
          <div className="ds-drawer-footer vis-drawer-footer">
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
          </div>
        )}
      </motion.div>
    </>
  );
}
