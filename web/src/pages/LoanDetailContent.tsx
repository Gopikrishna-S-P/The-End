import { useState, useRef, useEffect, type RefObject, type KeyboardEvent } from 'react';
import {
  AlertCircle, RefreshCw, User,
  IndianRupee, MapPin, Info,
  ArrowRightLeft, ChevronDown, Loader2,
} from 'lucide-react';
import CaseTimeline from '../components/CaseTimeline';
import { CallHistorySection } from '../components/CallHistorySection';
import type { AllocationResponse, AllocationStatus } from '../types';
import {
  Pill, fmtCurrency, fmtDate, fmtDT, fmtRelative,
  FIELD_GROUPS, ALL_DISPOSITIONS, bucketFor, dynField, parseDynAmount,
  type GroupedFields, type Tone, type NextAction,
} from './LoanDetailHelpers';
import './Dashboard.css';
import '../styles/LoanDetailPage.css';

interface Props {
  allocation: AllocationResponse;
  agentName: string | null;
  lastKnownLocation: { lat: number; lng: number } | null;
  canChangeStatus: boolean;
  onReassign?: () => void;
  groups: GroupedFields | null;
  outstandingTone: Tone;
  daysOverdueTone: Tone;
  dueDateIso: string | null;
  daysOverdue: number | null;
  nextAction: NextAction | null;
  statusUpdating: boolean;
  statusDropdown: boolean;
  setDrop: (v: boolean | ((p: boolean) => boolean)) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLDivElement | null>;
  requestStatus: (s: AllocationStatus) => void;
  onMenuKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
  dispositionUpdating: boolean;
  requestDisposition: (d: string) => void;
}

export default function LoanDetailContent(p: Props) {
  const { allocation: a } = p;
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [dispositionOpen, setDispositionOpen] = useState(false);
  const dispositionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dispositionOpen) return;
    const onDown = (e: MouseEvent) => {
      if (dispositionRef.current?.contains(e.target as Node)) return;
      setDispositionOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [dispositionOpen]);

  const dyn = (a as unknown as { dynamicData?: Record<string, unknown> }).dynamicData ?? {};
  const dispositionValue = (a.latestDisposition || dyn.disposition || dyn.Disposition || dyn.DISPOSITION) as string | undefined;
  const addressText = ['address', 'address_line', 'address1', 'street', 'city', 'state']
    .map(k => dyn[k])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .join(', ');
  const mapsHref = p.lastKnownLocation
    ? `https://www.google.com/maps?q=${p.lastKnownLocation.lat},${p.lastKnownLocation.lng}`
    : addressText
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`
      : null;
  const bucket = bucketFor(p.daysOverdue);
  const bktTagValue = dynField(dyn, ['BKT TAG', 'Bkt Tag', 'bkt_tag', 'BKT']);
  const securitizationValue = dynField(dyn, ['SECURITIZATION', 'Securitization', 'securitization']);
  const fieldExecutiveValue = dynField(dyn, ['FE', 'FIELD EXECUTIVE', 'field executive', 'field_executive', 'fieldexecutive']);
  const posAmt = a.outstandingAmount ?? parseDynAmount(dynField(dyn, ['POS Amt', 'POS AMT', 'POS AMOUNT', 'pos_amount', 'pos_amt']));

  return (
    /* One card for the whole record: summary and case data are two columns
       inside it, divided by a hairline, rather than two separately-bordered
       cards floating next to each other. */
    <div className="ds-card db-card ld-card">

      {/* ── Fixed top block: identity + disposition, tabs, and the facts that
             give every field below its context. Nothing here scrolls. ───── */}
      <header className="ld-head">


        <div className="ld-head-top">
          <div className="ld-identity">
            <h1 className="db-detail-title">{a.borrowerName || 'Loan case'}</h1>
            <span className="ld-loan-ref">{a.loanNumber || a.loanAccountNo || '—'}</span>
          </div>

          {/* Disposition sits beside the name — it is the case's current state */}
          <div className="ld-head-pills">
            {p.canChangeStatus ? (
              <div ref={dispositionRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setDispositionOpen(v => !v)}
                  disabled={p.dispositionUpdating}
                  className="ld-disposition-btn"
                  aria-label="Change disposition"
                  aria-expanded={dispositionOpen}
                >
                  {dispositionValue ? <Pill status={dispositionValue} /> : <span className="ds-pill">Set disposition</span>}
                  {p.dispositionUpdating ? <Loader2 size={12} className="ds-spin" /> : <ChevronDown size={12} style={{ color: 'var(--ink-tertiary)' }} />}
                </button>
                {dispositionOpen && (
                  <div className="alloc-dropdown-menu" style={{ left: 0, right: 'auto' }}>
                    {ALL_DISPOSITIONS.map(d => (
                      <button
                        key={d}
                        type="button"
                        className={`alloc-dropdown-item${d === dispositionValue ? ' is-active' : ''}`}
                        onClick={() => { p.requestDisposition(d); setDispositionOpen(false); }}
                        disabled={d === dispositionValue}
                      >
                        {d.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              dispositionValue && <Pill status={dispositionValue} />
            )}
            {(bktTagValue || bucket) && (
              <span className={`ds-pill is-${bucket?.tone ?? 'neutral'}`}>{bktTagValue ?? bucket!.label}</span>
            )}
            {a.npaFlagged && (
              <span className="ds-pill is-danger" style={{ fontWeight: 600 }}>
                <AlertCircle size={12} style={{ marginRight: 4 }} /> NPA
              </span>
            )}
          </div>

          <div className="db-kpi-toggle ld-head-tabs">
            {[
              { id: 'details', label: 'Details' },
              { id: 'activity', label: 'Activity' }
            ].map(tab => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as 'details' | 'activity')}
                className={`db-kpi-toggle-btn${activeTab === tab.id ? ' is-active' : ''}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Facts strip — one type scale, no per-item bespoke sizing */}
        <div className="ld-facts">
          {posAmt != null && (
            <div className="ld-fact is-lead">
              <span className="ld-fact-label"><IndianRupee size={11} /> POS outstanding</span>
              <span className="ld-fact-value">{fmtCurrency(posAmt)}</span>
              {(a.npaFlagged || (p.daysOverdue != null && p.daysOverdue > 0)) && (
                <span className="ld-fact-note is-danger">
                  {a.npaFlagged ? 'NPA flagged' : `${p.daysOverdue} d overdue`}
                </span>
              )}
            </div>
          )}
          {a.totalDue != null && (
            <div className="ld-fact">
              <span className="ld-fact-label">Total due</span>
              <span className="ld-fact-value">{fmtCurrency(Number(a.totalDue))}</span>
              {p.dueDateIso && <span className="ld-fact-note">Due {fmtDate(p.dueDateIso)}</span>}
            </div>
          )}
          {a.assignedToUserId && (
            <div className="ld-fact">
              <span className="ld-fact-label">Assigned to</span>
              <span className="ld-fact-value">
                <User size={12} className="alloc-agent-icon" style={{ marginRight: 6 }} />
                {p.agentName ?? '—'}
              </span>
              {a.assignedAt && (
                <span className="ld-fact-note" title={fmtDT(a.assignedAt)}>since {fmtRelative(a.assignedAt)}</span>
              )}
            </div>
          )}
          {fieldExecutiveValue && (
            <div className="ld-fact">
              <span className="ld-fact-label">Field Executive</span>
              <span className="ld-fact-value">{fieldExecutiveValue}</span>
            </div>
          )}
          {securitizationValue && (
            <div className="ld-fact">
              <span className="ld-fact-label">Securitization</span>
              <span className="ld-fact-value">{securitizationValue}</span>
            </div>
          )}

          <div className="ld-head-actions">
            {p.canChangeStatus && a.assignedToUserId && p.onReassign && (
              <button type="button" className="ds-btn is-secondary is-sm" onClick={p.onReassign}>
                <ArrowRightLeft size={13} /> Reassign
              </button>
            )}
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noreferrer"
                className="ds-btn is-secondary is-sm" style={{ textDecoration: 'none' }}>
                <MapPin size={12} />
                {p.lastKnownLocation ? 'Last GPS' : 'Maps'}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="ld-main">
        <div className="alloc-detail-scroll ld-main-scroll">
        {activeTab === 'details' && p.groups && (
          /* Hairline-separated sections — not five cards that differ only by
             icon and label. No card chrome of its own: it IS the card body. */
          <div className="ld-sheet">
            {FIELD_GROUPS.map(g => {
              const entries = p.groups![g.id];
              if (entries.length === 0) return null;
              const Icon = g.icon;
              return (
                <section key={g.id} className="ld-section">
                  <h2 className="ld-section-label"><Icon size={12} /> {g.label}</h2>
                  <dl className="ld-grid">
                    {entries.map(([k, v]) => (
                      <div key={k} className="ld-field">
                        <dt className="ld-field-label" title={k.replace(/_/g, ' ')}>{k.replace(/_/g, ' ')}</dt>
                        <dd className="ld-field-value">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}

            {p.groups.other.length > 0 && (
              <details className="ld-more">
                <summary>
                  <Info size={13} />
                  Additional data
                  <span className="ld-more-count">{p.groups.other.length}</span>
                  <ChevronDown size={14} className="ld-more-chevron" />
                </summary>
                <dl className="ld-grid">
                  {p.groups.other.map(([k, v]) => (
                    <div key={k} className="ld-field">
                      <dt className="ld-field-label" title={k.replace(/_/g, ' ')}>{k.replace(/_/g, ' ')}</dt>
                      <dd className="ld-field-value">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          /* No nested card — the tab already names this view, and the page's
             single card is the only surface. */
          <>
            <CallHistorySection allocationId={a.id} />
            <CaseTimeline allocationId={a.id} />
          </>
        )}
        </div>
      </div>
    </div>
  );
}
