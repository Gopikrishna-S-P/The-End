import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usersApi } from '../api/usersApi';
import { allocationsApi } from '../api/allocationsApi';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import axiosInstance from '../api/axiosInstance';
import type { AllocationResponse, UserResponse, ApiResponse } from '../types';
import { CheckCircle2, AlertCircle, X, Search, RefreshCw } from 'lucide-react';
import ReassignModal from '../components/ReassignModal';
import AssignFoPanel from './AssignFoPanel';
import AssignCasePanel from './AssignCasePanel';
import ReassignPanel from './ReassignPanel';
import '../styles/AppPage.css';
import '../styles/DailyDispatchPage.css';
import '../styles/DailyDispatch.shell.css';
import '../styles/DailyDispatch.cases.css';
import './Dashboard.css';

export type AssignTab = 'assign' | 'reassign';

export default function CaseAssignmentsPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const orgId = user?.organizationId ?? '';

  const [activeTab,    setActiveTab]    = useState<AssignTab>('assign');
  const [tabSearch,    setTabSearch]    = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [fos,        setFos]        = useState<UserResponse[]>([]);
  const [fosLoading, setFosLoading] = useState(true);
  const [fosStats, setFosStats] = useState<Map<string, { count: number; value: number; pending: number }>>(new Map());
  const [selectedFo, setSelectedFo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback,   setFeedback]   = useState<{ kind: 'ok' | 'err'; msg: string; sub?: string; onRetry?: () => void } | null>(null);

  const [reassignAssignmentId, setReassignAssignmentId] = useState<string | null>(null);
  const [reassignAllocationId, setReassignAllocationId] = useState<string | null>(null);
  const [reassignCaseName,     setReassignCaseName]     = useState<string | null>(null);

  const resolveAmt = (c: AllocationResponse) => {
    if (typeof c.outstandingAmount === 'number') return c.outstandingAmount;
    if (typeof c.totalDue === 'number') return c.totalDue;
    const dd = c.dynamicData || {};
    const key = Object.keys(dd).find(k => {
      const kl = k.toLowerCase();
      return kl.includes('outstanding') || kl.includes('pos') || kl.includes('balance') || (kl.includes('total') && kl.includes('due'));
    });
    if (key != null) {
      const num = Number(String(dd[key]).replace(/[^0-9.\-]/g, ''));
      if (!Number.isNaN(num)) return num;
    }
    return 0;
  };

  useEffect(() => {
    setFosLoading(true);
    usersApi.listByRole('FO')
      .then(list => {
        setFos(list);
        if (list.length > 0) setSelectedFo(list[0].id);
        Promise.allSettled(
          list.map(f => allocationsApi.getAllocations({ assignedToUserId: f.id, page: 0, size: 1000 }))
        ).then(results => {
          const m = new Map<string, { count: number; value: number; pending: number }>();
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') {
              const cases = r.value.content || [];
              const count = r.value.totalElements ?? cases.length;
              const pending = cases.filter(c => c.status === 'ASSIGNED').length;
              const value = cases.reduce((sum, c) => sum + resolveAmt(c), 0);
              m.set(list[i].id, { count, value, pending });
            }
          });
          setFosStats(m);
        });
      })
      .catch(() => {})
      .finally(() => setFosLoading(false));
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const assign = async (pickedIds: string[]) => {
    if (!selectedFo || pickedIds.length === 0) return;
    const fo = fos.find(f => f.id === selectedFo);
    const foName = fo ? `${fo.firstName} ${fo.lastName}`.trim() : 'selected agent';
    setSubmitting(true); setFeedback(null);
    try {
      const r = await axiosInstance.post<ApiResponse<AllocationResponse[]>>(
        '/api/v1/allocations/bulk-assign',
        { allocationIds: pickedIds, assignedToUserId: selectedFo },
      );
      const count = r.data.data?.length ?? pickedIds.length;
      setFeedback({ kind: 'ok', msg: `${count} case(s) assigned to ${foName}.` });
      refreshFoCount(selectedFo);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setFeedback({ kind: 'err', msg: 'Failed to assign cases.', sub: err?.response?.data?.message });
    } finally { setSubmitting(false); }
  };

  const selectedFoObj = useMemo(() => fos.find(f => f.id === selectedFo), [fos, selectedFo]);
  const agentFullName = selectedFoObj ? `${selectedFoObj.firstName} ${selectedFoObj.lastName}`.trim() : '';

  const refreshFoCount = (foId: string) => {
    allocationsApi.getAllocations({ assignedToUserId: foId, page: 0, size: 1000 })
      .then(r => {
        const cases = r.content || [];
        const count = r.totalElements ?? cases.length;
        const pending = cases.filter(c => c.status === 'ASSIGNED').length;
        const value = cases.reduce((sum, c) => sum + resolveAmt(c), 0);
        setFosStats(prev => new Map(prev).set(foId, { count, value, pending }));
      })
      .catch(() => {});
  };

  const openReassignModal = (assignmentId: string, allocationId: string, caseName: string | null) => {
    setReassignAssignmentId(assignmentId);
    setReassignAllocationId(allocationId);
    setReassignCaseName(caseName);
  };

  const closeReassignModal = () => {
    setReassignAssignmentId(null);
    setReassignAllocationId(null);
    setReassignCaseName(null);
  };

  const onReassignSuccess = () => {
    closeReassignModal();
    const fo = fos.find(f => f.id === selectedFo);
    setFeedback({ kind: 'ok', msg: `Case reassigned.${fo ? ` Removed from ${fo.firstName}'s list.` : ''}` });
    if (selectedFo) refreshFoCount(selectedFo);
  };

  return (
    <div className="dd-page">
      <div className="dd-page-header">
        <div className="dd-page-titles">
          <h1 className="dd-page-title">Case Assignments</h1>
          <span className="dd-page-context">
            {agentFullName ? (
              <>Field Officer: <strong>{agentFullName}</strong></>
            ) : (
              'Select a Field Officer'
            )}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {feedback?.kind === 'ok' && (
          <motion.div key="toast-ok" className="ds-toast is-ok" role="status"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
            onClick={() => setFeedback(null)}>
            <CheckCircle2 size={14} />
            <span>{feedback.msg}</span>
            <X size={13} className="ds-toast-x" />
          </motion.div>
        )}
        {feedback?.kind === 'err' && (
          <motion.div key="toast-err" className="db-error-banner" role="alert"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">{feedback.msg}</span>
              {feedback.sub && <span className="db-error-sub">{feedback.sub}</span>}
            </div>
            {feedback.onRetry && (
              <button className="db-error-retry" onClick={() => { setFeedback(null); feedback.onRetry?.(); }} aria-label="Retry">
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            )}
            <button className="db-error-retry" onClick={() => setFeedback(null)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="dd-main-container">
        <div className="dd-grid">
          <div className="dd-agent-panel">
            <AssignFoPanel
              fos={fos} fosLoading={fosLoading} fosStats={fosStats}
              selectedFo={selectedFo} onSelect={setSelectedFo}
            />
          </div>

          <div className="dd-case-panel">
            <div className="ds-card dd-cases-card is-overflow-hidden">
              <div className="dd-cases-head">
                <div className="dd-cp-tabs">
                  <button type="button" onClick={() => setActiveTab('assign')} className={`dd-cp-tab${activeTab === 'assign' ? ' is-active' : ''}`}>
                    Assign New
                  </button>
                  <button type="button" onClick={() => setActiveTab('reassign')} className={`dd-cp-tab${activeTab === 'reassign' ? ' is-active' : ''}`}>
                    Reassign
                    <span className="dd-cp-tab-count">
                      {selectedFoObj ? fosStats.get(selectedFoObj.id)?.count ?? 0 : 0}
                    </span>
                  </button>
                </div>

                <AnimatePresence mode="popLayout">
                  {!isSearchActive && !tabSearch ? (
                    <motion.button
                      key="search-btn"
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}
                      type="button" onClick={() => setIsSearchActive(true)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, border: 'none', background: 'transparent', color: 'var(--ink-tertiary)', cursor: 'pointer', borderRadius: 8, marginLeft: 'auto' }}
                      aria-label="Open search"
                    >
                      <Search size={14} />
                    </motion.button>
                  ) : (
                    <motion.div
                      key="search-bar"
                      initial={{ opacity: 0, width: 32 }} animate={{ opacity: 1, width: 240 }} exit={{ opacity: 0, width: 32 }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="dd-cp-search" style={{ overflow: 'hidden', marginLeft: 'auto' }}
                    >
                      <Search size={14} className="dd-agent-search-icon" style={{ flexShrink: 0, color: 'var(--ink-tertiary)', marginLeft: 4 }} />
                      <input
                        autoFocus
                        value={tabSearch}
                        onChange={e => setTabSearch(e.target.value)}
                        placeholder="Search borrower or loan ID..."
                        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
                      />
                      <button
                        type="button" className="dd-cp-search-clear"
                        onClick={() => { setIsSearchActive(false); setTabSearch(''); }} aria-label="Close search"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

                {activeTab === 'assign' && (
                  <AssignCasePanel
                    orgId={orgId} selectedFo={selectedFo} selectedFoObj={selectedFoObj}
                    submitting={submitting}
                    canAssignBase={hasPermission('CASE_ASSIGN') && !!selectedFo}
                    onAssign={assign}
                    externalSearch={tabSearch}
                  />
                )}
                {activeTab === 'reassign' && (
                  <ReassignPanel
                    selectedFo={selectedFo} selectedFoObj={selectedFoObj}
                    onFeedback={setFeedback}
                    onOpenReassign={openReassignModal}
                    externalSearch={tabSearch}
                  />
                )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {reassignAssignmentId && reassignAllocationId && (
          <ReassignModal
            assignmentId={reassignAssignmentId}
            allocationId={reassignAllocationId}
            currentAgentName={selectedFoObj
              ? `${selectedFoObj.firstName} ${selectedFoObj.lastName ?? ''}`.trim()
              : reassignCaseName}
            onClose={closeReassignModal}
            onSuccess={onReassignSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
