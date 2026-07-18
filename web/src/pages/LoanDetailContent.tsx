import { useState, type RefObject, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, AlertCircle, ChevronDown, RefreshCw, User,
  ChevronRight,
  IndianRupee, MapPin, Info,
  ArrowRightLeft, Clock,
} from 'lucide-react';
import CaseTimeline from '../components/CaseTimeline';
import type { AllocationResponse, AllocationStatus } from '../types';
import {
  Pill, Row, fmtCurrency, fmtDate, fmtDT, fmtRelative,
  FIELD_GROUPS,
  type GroupedFields, type Tone, type NextAction,
} from './LoanDetailHelpers';
import './Dashboard.css';

interface Props {
  allocation: AllocationResponse;
  agentName: string | null;
  lastKnownLocation: { lat: number; lng: number } | null;
  canChangeStatus: boolean;
  onReassign?: () => void;
  onClose?: () => void;
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
}

export default function LoanDetailContent(p: Props) {
  const { allocation: a } = p;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      {/* ── Identity Header Cards ── */}
      <div className="db-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        
        {/* Main Identity Card */}
        <div className="ds-card db-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {p.onClose && (
                  <button type="button" onClick={p.onClose} className="ds-drawer-close" aria-label="Close" style={{ alignSelf: 'center' }}>
                    <ChevronRight size={16} />
                  </button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-primary)', margin: 0 }}>
                    {a.borrowerName || '—'}
                  </h1>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink-secondary)', fontWeight: 500 }}>
                    {a.loanNumber || '—'}
                  </span>
                </div>
                {dispositionValue && (
                  <Pill status={dispositionValue} />
                )}
                {a.npaFlagged && (
                  <span className="ds-pill is-danger" style={{ fontWeight: 600 }}>
                    <AlertCircle size={12} style={{ marginRight: 4 }} /> NPA
                  </span>
                )}
                {mapsHref && (
                  <a href={mapsHref} target="_blank" rel="noreferrer" 
                    className="db-customize-btn" style={{ padding: '4px 10px', height: 26, fontSize: 12, textDecoration: 'none', background: 'var(--bg-subtle)' }}>
                    <MapPin size={12} style={{ marginRight: 6 }} />
                    {p.lastKnownLocation ? `Last GPS` : 'Address in Maps'}
                  </a>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 32, alignItems: 'center', textAlign: 'right' }}>
              {a.outstandingAmount != null && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IndianRupee size={12} /> POS
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-primary)' }}>
                    {fmtCurrency(Number(a.outstandingAmount))}
                  </span>
                  {(a.npaFlagged || (p.daysOverdue != null && p.daysOverdue > 0)) && (
                    <span style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4, fontWeight: 600 }}>
                      {a.npaFlagged ? 'NPA flagged' : `${p.daysOverdue} d overdue`}
                    </span>
                  )}
                </div>
              )}
              {a.totalDue != null && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-secondary)', marginBottom: 4 }}>Total Due</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink-primary)' }}>
                    {fmtCurrency(Number(a.totalDue))}
                  </span>
                  {p.dueDateIso && (
                    <span style={{ fontSize: 12, color: 'var(--ink-secondary)', marginTop: 4 }}>
                      Due {fmtDate(p.dueDateIso)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {p.canChangeStatus && a.assignedToUserId && p.onReassign && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button type="button" className="ds-btn is-secondary" onClick={p.onReassign} style={{ height: 32 }}>
                <ArrowRightLeft size={14} style={{ marginRight: 6 }} /> Reassign
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
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

        {/* Related-workspace quick links — these pages aren't in the sidebar for
            every role, so this is how a case leads onward to its assignment,
            visit, PTP, and collection history. */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="db-customize-btn" style={{ padding: '4px 10px', height: 26, fontSize: 12 }}
            onClick={() => navigate('/app/assignments')}>Assignments</button>
          <button type="button" className="db-customize-btn" style={{ padding: '4px 10px', height: 26, fontSize: 12 }}
            onClick={() => navigate('/app/visits')}>Visit Logs</button>
          <button type="button" className="db-customize-btn" style={{ padding: '4px 10px', height: 26, fontSize: 12 }}
            onClick={() => navigate('/app/ptps')}>PTPs</button>
          <button type="button" className="db-customize-btn" style={{ padding: '4px 10px', height: 26, fontSize: 12 }}
            onClick={() => navigate('/app/collections')}>Collections</button>
        </div>
      </div>

      {/* ── Content Body ── */}
      <div className="db-grid" style={{ gridTemplateColumns: '1fr', gap: 24 }}>
        
        {activeTab === 'details' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
              {/* System & Metadata Card */}
              <div className="ds-card db-card">
                <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
              <h2 className="db-card-title"><Clock size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Case metadata</h2>
            </header>
            <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
                <Row label="Disposition"><Pill status={dispositionValue || a.status} /></Row>
                {a.npaFlagged && <Row label="NPA"><span style={{ color: 'var(--danger)', fontWeight: 600 }}>Flagged</span></Row>}
                <Row label="Row #"><span style={{ fontFamily: 'var(--font-mono)' }}>{a.rowNumber?.toString()}</span></Row>
                <Row label="Created" title={fmtDT(a.createdAt)}><span style={{ color: 'var(--ink-secondary)' }}>{fmtRelative(a.createdAt)}</span></Row>
                <Row label="Updated" title={fmtDT(a.updatedAt)}><span style={{ color: 'var(--ink-secondary)' }}>{fmtRelative(a.updatedAt)}</span></Row>
              </div>
            </div>
          </div>

          {/* Assignment Card */}
          {a.assignedToUserId && (
            <div className="ds-card db-card">
              <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
                <h2 className="db-card-title"><User size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Current assignment</h2>
              </header>
              <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', columnGap: 24, rowGap: 0 }}>
                  <Row label="Assigned to">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-primary)', fontWeight: 600 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={11} style={{ color: 'var(--ink-tertiary)' }} />
                      </div>
                      {p.agentName ?? '—'}
                    </div>
                  </Row>
                  {a.assignedAt && (
                    <Row label="Assigned at" title={fmtDT(a.assignedAt)}>
                      <span style={{ color: 'var(--ink-secondary)' }}>{fmtRelative(a.assignedAt)}</span>
                    </Row>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Grouped Dynamic Fields */}
        {p.groups && FIELD_GROUPS.map(g => {
          const entries = p.groups![g.id];
          if (entries.length === 0) return null;
          const Icon = g.icon;
          return (
            <div key={g.id} className="ds-card db-card" style={{ gridColumn: '1 / -1' }}>
              <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
                <h2 className="db-card-title"><Icon size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> {g.label} details</h2>
              </header>
              <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', columnGap: 32, rowGap: 0 }}>
                  {entries.map(([k, v]) => (
                    <Row key={k} label={k.replace(/_/g, ' ')}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Row>
                  ))}
                </div>
              </div>
            </div>
          );
        })}

        {/* Other / Extra Data */}
        {p.groups && p.groups.other.length > 0 && (
          <div className="ds-card db-card" style={{ gridColumn: '1 / -1' }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
              <h2 className="db-card-title"><Info size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} /> Additional data</h2>
            </header>
            <div className="db-card-body" style={{ padding: '8px 20px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', columnGap: 32, rowGap: 0 }}>
                {p.groups.other.map(([k, v]) => (
                  <Row key={k} label={k.replace(/_/g, ' ')}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</Row>
                ))}
              </div>
              </div>
            </div>
          )}
          </>
        )}

        {/* Timeline Tab */}
        {activeTab === 'activity' && (
          <div className="ds-card db-card" style={{ gridColumn: '1 / -1', minHeight: 400 }}>
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
  );
}
