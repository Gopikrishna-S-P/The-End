import { useState, useEffect } from 'react';
import { apiClient } from '../client';
import { usePermissions } from '../hooks/usePermissions';
import type { PtpResponse } from '../types';
import { X, CheckCircle2, AlertTriangle, Clock, Calendar, User, FileText, Loader2, Banknote } from 'lucide-react';
import { fmtINR, fmtDate, fmtDT, STATUS_VARIANT, DR, Group, type PtpHistoryEntry } from './PtpDetailHelpers';
import { PtpUpdateModal } from './PtpUpdateModal';
import '../styles/AppPage.css';

export interface PtpDetailDrawerProps {
  ptp: PtpResponse;
  onClose: () => void;
  onChanged: () => void;
  canUpdate?: boolean;
}

export default function PtpDetailDrawer({ ptp, onClose, onChanged, canUpdate: canUpdateProp }: PtpDetailDrawerProps) {
  const { hasPermission } = usePermissions();
  const canUpdate = canUpdateProp ?? hasPermission('PTP_CREATE');

  const [history, setHistory]               = useState<PtpHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const isPast       = new Date(ptp.promisedDate) < new Date();
  const isActionable = ptp.status === 'PENDING' || ptp.status === 'PARTIALLY_FULFILLED';

  useEffect(() => {
    setHistory([]); setHistoryLoading(true);
    apiClient.get(`/api/v1/ptps/${ptp.id}/history`)
      .then(({ data }) => { const d = data?.data ?? data; setHistory(Array.isArray(d) ? d : []); })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [ptp.id]);

  return (
    <>
      <div className="ds-drawer-overlay" onClick={onClose} />
      <div className="ds-drawer" role="dialog" aria-modal="true">

        <div className="ds-drawer-header">
          <div className="ptp-drawer-title-col">
            <div className="ptp-drawer-title">{ptp.borrowerName}</div>
            <div className="ptp-drawer-sub-meta">Loan #{ptp.loanNumber}</div>
            <div className="ptp-drawer-sub">{ptp.agentName} · {fmtDate(ptp.createdAt)}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-drawer-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-drawer-body">
          <div className="ptp-drawer-pills">
            <span className={`ds-pill ${STATUS_VARIANT[ptp.status]}`}>{ptp.status.replace('_', ' ')}</span>
            {isPast && ptp.status === 'PENDING' && (
              <span className="ds-pill is-error"><AlertTriangle size={11} /> Overdue</span>
            )}
            {ptp.reminderSent && (
              <span className="ds-pill"><Clock size={11} /> Reminder sent</span>
            )}
          </div>

          <div className="ptp-stat-grid">
            <div className="ptp-stat">
              <div className="ptp-stat-label">Promised</div>
              <div className="ptp-stat-value">{fmtINR(ptp.promisedAmount)}</div>
            </div>
            <div className={`ptp-stat${ptp.collectedAmount > 0 ? ' is-accent' : ''}`}>
              <div className="ptp-stat-label">Collected</div>
              <div className="ptp-stat-value">{fmtINR(ptp.collectedAmount)}</div>
            </div>
            <div className={`ptp-stat${isPast && ptp.status === 'PENDING' ? ' is-error' : ''}`}>
              <div className="ptp-stat-label">Promised date</div>
              <div className="ptp-stat-value is-text">{fmtDate(ptp.promisedDate)}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Fulfillment</div>
              <div className="ptp-stat-value is-mono">{ptp.fulfillmentPercentage?.toFixed(0) ?? '0'}%</div>
            </div>
          </div>

          <Group title="Loan information" icon={FileText}>
            <DR label="Borrower">{ptp.borrowerName}</DR>
            <DR label="Loan number">{ptp.loanNumber}</DR>
          </Group>

          <Group title="Agent" icon={User}>
            <DR label="Name">{ptp.agentName}</DR>
          </Group>

          <Group title="Promise details" icon={FileText}>
            <DR label="Promised amount">
              <span className="ptp-mono-bold">{fmtINR(ptp.promisedAmount)}</span>
            </DR>
            <DR label="Promised date">{fmtDate(ptp.promisedDate)}</DR>
            <DR label="Amount collected">
              <span className={`ptp-mono-bold${ptp.collectedAmount > 0 ? ' ptp-collected-text' : ''}`}>
                {fmtINR(ptp.collectedAmount)}
              </span>
            </DR>
            {ptp.contactNotes && <DR label="Contact notes">{ptp.contactNotes}</DR>}
          </Group>

          {(ptp.brokenReason || ptp.cancellationReason) && (
            <Group title="Reason" icon={AlertTriangle}>
              {ptp.brokenReason && (
                <DR label="Broken reason"><span className="ptp-error-text">{ptp.brokenReason}</span></DR>
              )}
              {ptp.cancellationReason && <DR label="Cancellation reason">{ptp.cancellationReason}</DR>}
            </Group>
          )}

          <Group title="Timeline" icon={Calendar}>
            <DR label="Created">{fmtDT(ptp.createdAt)}</DR>
            {ptp.fulfilledAt    && <DR label="Fulfilled at">{fmtDT(ptp.fulfilledAt)}</DR>}
            {ptp.brokenAt       && <DR label="Broken at">{fmtDT(ptp.brokenAt)}</DR>}
            {ptp.reminderSentAt && <DR label="Reminder sent">{fmtDT(ptp.reminderSentAt)}</DR>}
          </Group>

          <Group title="Status history" icon={Banknote}>
            {historyLoading ? (
              <span className="ptp-loading">
                <Loader2 size={12} className="ds-spin" /> Loading…
              </span>
            ) : history.length === 0 ? (
              <p className="ptp-no-history">No history available</p>
            ) : (
              <div className="ptp-history-list">
                {history.map((h) => (
                  <div key={h.id} className="ptp-history-row">
                    <span className={`ds-pill ${STATUS_VARIANT[h.oldStatus] ?? ''} ptp-history-pill`}>
                      {h.oldStatus.replace('_', ' ')}
                    </span>
                    <span className="ptp-history-arrow">→</span>
                    <span className={`ds-pill ${STATUS_VARIANT[h.newStatus] ?? ''} ptp-history-pill`}>
                      {h.newStatus.replace('_', ' ')}
                    </span>
                    <span className="ptp-history-time">{fmtDT(h.changedAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </Group>
        </div>

        <div className="ds-drawer-footer">
          {canUpdate && isActionable ? (
            <button type="button" onClick={() => setShowUpdateModal(true)} className="ds-btn is-primary" style={{ width: '100%' }}>
              Update status
            </button>
          ) : (
            <button type="button" onClick={onClose} className="ds-btn is-primary" style={{ width: '100%' }}>
              <CheckCircle2 size={14} /> Done
            </button>
          )}
        </div>
      </div>

      {showUpdateModal && (
        <PtpUpdateModal
          ptp={ptp}
          onClose={() => setShowUpdateModal(false)}
          onSuccess={() => { setShowUpdateModal(false); onChanged(); onClose(); }}
        />
      )}
    </>
  );
}
