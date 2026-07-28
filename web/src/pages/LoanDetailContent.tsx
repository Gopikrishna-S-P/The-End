import { useState, useRef, useEffect, type RefObject, type KeyboardEvent } from 'react';
import {
  AlertCircle, RefreshCw, User,
  IndianRupee, MapPin, Info,
  ArrowRightLeft, ChevronDown, Loader2,
} from 'lucide-react';
import CaseTimeline from '../components/CaseTimeline';
import type { AllocationResponse, AllocationStatus } from '../types';
import {
  Pill, Row, fmtCurrency, fmtDate, fmtDT, fmtRelative,
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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flex: 1, minHeight: 0 }}>

      {/* ── Left — fixed summary sidebar, sized to content, never scrolls ── */}
      <aside style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="ds-card db-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-tertiary)' }}>
            Everything on file for this case.
          </span>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <h1 style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink-primary)', margin: 0, lineHeight: 1.25, wordBreak: 'break-word' }}>
                {a.borrowerName || '—'}
              </h1>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-secondary)', fontWeight: 500 }}>
                {a.loanNumber || '—'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {p.canChangeStatus ? (
              <div ref={dispositionRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setDispositionOpen(v => !v)}
                  disabled={p.dispositionUpdating}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', padding: 0, cursor: p.dispositionUpdating ? 'not-allowed' : 'pointer', opacity: p.dispositionUpdating ? 0.6 : 1 }}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
            {posAmt != null && (
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IndianRupee size={12} /> POS (Principal Outstanding)
                </span>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-primary)', display: 'block', marginTop: 2 }}>
                  {fmtCurrency(posAmt)}
                </span>
                {(a.npaFlagged || (p.daysOverdue != null && p.daysOverdue > 0)) && (
                  <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
                    {a.npaFlagged ? 'NPA flagged' : `${p.daysOverdue} d overdue`}
                  </span>
                )}
              </div>
            )}
            {a.totalDue != null && (
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>Total due</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-primary)', display: 'block', marginTop: 2 }}>
                  {fmtCurrency(Number(a.totalDue))}
                </span>
                {p.dueDateIso && (
                  <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>Due {fmtDate(p.dueDateIso)}</span>
                )}
              </div>
            )}
          </div>

          {a.assignedToUserId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>Assigned to</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-primary)', fontWeight: 600, fontSize: 14 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User size={12} style={{ color: 'var(--ink-tertiary)' }} />
                </div>
                {p.agentName ?? '—'}
              </div>
              {a.assignedAt && (
                <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }} title={fmtDT(a.assignedAt)}>
                  since {fmtRelative(a.assignedAt)}
                </span>
              )}
            </div>
          )}

          {(fieldExecutiveValue || securitizationValue) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
              {fieldExecutiveValue && (
                <div>
                  <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>Field Executive</span>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-primary)', marginTop: 2 }}>{fieldExecutiveValue}</div>
                </div>
              )}
              {securitizationValue && (
                <div>
                  <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>Securitization</span>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-primary)', marginTop: 2 }}>{securitizationValue}</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
            {p.canChangeStatus && a.assignedToUserId && p.onReassign && (
              <button type="button" className="ds-btn is-secondary" onClick={p.onReassign} style={{ height: 32, width: '100%' }}>
                <ArrowRightLeft size={14} style={{ marginRight: 6 }} /> Reassign
              </button>
            )}
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noreferrer"
                className="db-customize-btn" style={{ padding: '4px 10px', height: 30, fontSize: 12.5, textDecoration: 'none', background: 'var(--bg-subtle)', width: '100%', justifyContent: 'center' }}>
                <MapPin size={12} style={{ marginRight: 6 }} />
                {p.lastKnownLocation ? 'Last GPS location' : 'Address in Maps'}
              </a>
            )}
          </div>
        </div>
      </aside>

      {/* ── Right — case data, independently scrollable ─────────────────── */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>
            {activeTab === 'activity' && 'Every visit, collection, PTP, and reassignment on this case, newest first.'}
          </span>
          <div className="db-kpi-toggle" style={{ display: 'inline-flex' }}>
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

        <div className="alloc-detail-scroll" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {p.groups && FIELD_GROUPS.map(g => {
              const entries = p.groups![g.id];
              if (entries.length === 0) return null;
              const Icon = g.icon;
              return (
                <div key={g.id} className="ds-card db-card">
                  <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
                    <h2 className="db-card-title"><Icon size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> {g.label} details</h2>
                  </header>
                  <div className="db-card-body" style={{ padding: '4px 20px 8px' }}>
                    {entries.map(([k, v]) => (
                      <Row key={k} label={k.replace(/_/g, ' ')}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Row>
                    ))}
                  </div>
                </div>
              );
            })}

            {p.groups && p.groups.other.length > 0 && (
              <div className="ds-card db-card">
                <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
                  <h2 className="db-card-title"><Info size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Additional data</h2>
                </header>
                <div className="db-card-body" style={{ padding: '4px 20px 8px' }}>
                  {p.groups.other.map(([k, v]) => (
                    <Row key={k} label={k.replace(/_/g, ' ')}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Row>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="ds-card db-card" style={{ minHeight: 400 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
              <h2 className="db-card-title">Activity Feed</h2>
            </header>
            <div className="db-card-body" style={{ padding: 0 }}>
              <CaseTimeline allocationId={a.id} />
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
