import type { RefObject } from 'react';
import type { IncidentReportResponse } from '../types';
import { AlertTriangle, ShieldCheck, Headphones, Loader2, Check, MapPin, X } from 'lucide-react';
import { initials, relativeTime } from './FieldOpsUtils';
import './Dashboard.css';

interface Props {
  incidents: IncidentReportResponse[];
  loading: boolean;
  showResolved: boolean;
  openCount: number;
  firstOpenRef: RefObject<HTMLLIElement | null>;
  resolvingId: string | null;
  resolveNotes: string;
  resolveLoading: boolean;
  setShowResolved: (v: boolean) => void;
  setResolvingId: (id: string | null) => void;
  setResolveNotes: (v: string) => void;
  doResolve: (id: string) => void;
  onListen: (incidentId: string, agentId: string) => void;
}

export function FieldOpsIncidentPanel({
  incidents, loading, showResolved, openCount, firstOpenRef,
  resolvingId, resolveNotes, resolveLoading,
  setShowResolved, setResolvingId, setResolveNotes, doResolve, onListen,
}: Props) {
  return (
    <div className="ds-card db-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {openCount > 0 && (
        <div className="db-att-row is-warn" role="alert" style={{ borderRadius: '12px 12px 0 0', padding: '12px 20px', borderBottom: '1px solid var(--warning-subtle)' }}>
          <AlertTriangle size={14} style={{ color: 'var(--warning)', marginRight: 8 }} />
          <span style={{ fontSize: 13, color: 'var(--ink-primary)' }}><strong>{openCount}</strong> active SOS {openCount === 1 ? 'incident' : 'incidents'}</span>
          <button type="button" className="db-error-retry" style={{ marginLeft: 'auto', background: 'var(--bg-surface)' }}
            onClick={() => firstOpenRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            Jump to first ↓
          </button>
        </div>
      )}

      <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '0 20px' }}>
        <div className="db-trend-range-toggle" style={{ margin: '12px 0' }}>
          <button type="button" className={`db-trend-range-btn${!showResolved ? ' is-active' : ''}`} onClick={() => setShowResolved(false)}>
            Open<span className={`ds-pill ${openCount > 0 ? 'is-danger' : 'is-neutral'}`} style={{ marginLeft: 6, fontSize: 10 }}>{openCount}</span>
          </button>
          <button type="button" className={`db-trend-range-btn${showResolved ? ' is-active' : ''}`} onClick={() => setShowResolved(true)}>
            All<span className="ds-pill is-neutral" style={{ marginLeft: 6, fontSize: 10 }}>{incidents.length}</span>
          </button>
        </div>
      </header>

      <div className="db-card-body" style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, opacity: 1 - i * 0.2 }}>
                <div className="ds-skel" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div className="ds-skel" style={{ height: 14, width: '40%' }} />
                  <div className="ds-skel" style={{ height: 12, width: '65%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <div className="ds-empty" style={{ padding: '60px 20px' }}>
            <div className="ds-empty-icon" style={{ background: showResolved ? 'var(--bg-subtle)' : 'var(--success-subtle)', color: showResolved ? 'var(--ink-secondary)' : 'var(--success)' }}>
              <ShieldCheck size={28} />
            </div>
            <div className="ds-empty-title">{showResolved ? 'No incidents on record' : 'All clear'}</div>
            <div className="ds-empty-sub">
              {showResolved
                ? 'Field agents have not reported any incidents yet.'
                : 'No open SOS incidents. Switch to All to see history.'}
            </div>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
            {incidents.map((incident, idx) => {
              const open = !incident.resolvedAt;
              const agentLabel = incident.agentName ?? 'Unknown agent';
              const isResolving = resolvingId === incident.id;
              return (
                <li key={incident.id} ref={open && idx === 0 ? firstOpenRef : null}
                  style={{ borderBottom: '1px solid var(--border-subtle)', padding: '20px', background: open ? 'var(--danger-subtle)' : 'transparent', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span className="db-att-chip" style={{ width: 40, height: 40, flexShrink: 0, background: open ? 'var(--danger)' : 'var(--bg-subtle)', color: open ? 'var(--text-on-solid)' : 'var(--ink-solid)', fontSize: 13 }}>
                      {initials(agentLabel)}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <span className="db-att-label" style={{ fontWeight: 600, color: 'var(--ink-primary)', fontSize: 14 }}>{agentLabel}</span>
                        {open && !isResolving && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => onListen(incident.id, incident.agentId)}
                              className="db-error-retry" style={{ background: 'var(--danger)', color: 'var(--text-on-solid)', padding: '0 10px', height: 28, fontSize: 11 }}>
                              <Headphones size={12} style={{ marginRight: 4 }} /> Listen
                            </button>
                            <button type="button" onClick={() => { setResolvingId(incident.id); setResolveNotes(''); }}
                              className="db-error-retry" style={{ background: 'var(--bg-surface)', padding: '0 10px', height: 28, fontSize: 11 }}>
                              Resolve
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: open ? 'var(--danger)' : 'var(--success)' }}>
                        {open ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                        {open ? 'SOS triggered' : 'Resolved'}
                        <span style={{ color: 'var(--ink-tertiary)', fontWeight: 400, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-tertiary)' }} />
                          <span title={new Date(incident.triggeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}>{relativeTime(incident.triggeredAt)}</span>
                        </span>
                      </div>
                      
                      {incident.notes && <p style={{ margin: '8px 0 0 0', fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.4 }}>{incident.notes}</p>}
                      
                      {incident.lastKnownLat != null && incident.lastKnownLng != null && (
                        <a href={`https://www.google.com/maps?q=${incident.lastKnownLat},${incident.lastKnownLng}`}
                          target="_blank" rel="noreferrer" className="db-customize-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, width: 'fit-content' }}>
                          <MapPin size={12} /> Last known location
                        </a>
                      )}
                      
                      {incident.resolutionNotes && (
                        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--success-subtle)', borderRadius: 8, fontSize: 12.5, color: 'var(--ink-secondary)', border: '1px solid color-mix(in srgb, var(--success) 20%, transparent)' }}>
                          <span style={{ fontWeight: 600, color: 'var(--success)', display: 'block', marginBottom: 4 }}>Resolution notes</span>
                          {incident.resolutionNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  {isResolving && (
                    <div style={{ padding: 16, background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 12, marginLeft: 56 }}>
                      <span className="ds-label" style={{ display: 'block' }}>Resolution notes (optional)</span>
                      <textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
                        placeholder="e.g. Agent confirmed safe, false alarm" className="ds-input" rows={2} autoFocus
                        style={{ width: '100%', resize: 'vertical' }} />
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => { setResolvingId(null); setResolveNotes(''); }}
                          className="ds-btn is-secondary" style={{ height: 32 }}>Cancel</button>
                        <button type="button" onClick={() => doResolve(incident.id)} disabled={resolveLoading}
                          className="ds-btn is-primary" style={{ height: 32 }}>
                          {resolveLoading ? <Loader2 size={13} className="ds-spin" style={{ marginRight: 6 }} /> : <Check size={13} style={{ marginRight: 6 }} />}
                          Confirm resolve
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
