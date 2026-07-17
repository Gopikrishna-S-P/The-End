import { useState } from 'react';
import type { CaseEvent } from '../types';
import { styleFor, UUID_FIELD_KEY, UUID_VALUE, fmtDateTime, fmtCellValue } from './CaseTimelineHelpers';

export function EventRow({ ev }: { ev: CaseEvent }) {
  const [open, setOpen] = useState(false);
  const style = styleFor(ev.eventType);
  const Icon = style.icon;

  const dataEntries = ev.data
    ? Object.entries(ev.data).filter(([k, v]) => {
        if (v == null || v === '') return false;
        if (UUID_FIELD_KEY.test(k)) return false;
        if (typeof v === 'string' && UUID_VALUE.test(v)) return false;
        return true;
      })
    : [];
  const hasDetails = dataEntries.length > 0 || !!ev.narrative;

  return (
    <li className="case-timeline-row">
      <div className="case-timeline-rail" aria-hidden="true">
        <span className="case-timeline-rail-line" />
        <span className="case-timeline-rail-dot" style={{ background: `color-mix(in srgb, ${style.accent} 14%, transparent)`, borderColor: style.accent, color: style.accent }}>
          <Icon size={13} />
        </span>
      </div>
      <button
        type="button"
        className={`case-timeline-card${open ? ' is-open' : ''}${hasDetails ? '' : ' is-static'}`}
        onClick={() => hasDetails && setOpen((o) => !o)}
        aria-expanded={hasDetails ? open : undefined}
        disabled={!hasDetails}
      >
        <div className="case-timeline-card-head">
          <span className="case-timeline-chip" style={{ color: style.accent, borderColor: `color-mix(in srgb, ${style.accent} 35%, transparent)` }}>{style.label}</span>
          <span className="case-timeline-summary">{ev.summary}</span>
          <span className="case-timeline-when">{fmtDateTime(ev.timestamp)}</span>
        </div>
        <div className="case-timeline-card-meta">
          {ev.actorName && (
            <span className="case-timeline-actor">
              {ev.actorRole && <em>{ev.actorRole.replace(/_/g, ' ').toLowerCase()}</em>}
              {ev.actorName}
            </span>
          )}
          {!ev.actorName && ev.actorRole === 'SYSTEM' && (
            <span className="case-timeline-actor case-timeline-actor-system">system</span>
          )}
        </div>
        {open && hasDetails && (
          <div className="case-timeline-details">
            {dataEntries.length > 0 && (
              <dl className="case-timeline-kv">
                {dataEntries.map(([k, v]) => (
                  <div key={k} className="case-timeline-kv-row">
                    <dt>{k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}</dt>
                    <dd>{fmtCellValue(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {ev.narrative && <blockquote className="case-timeline-narrative">{ev.narrative}</blockquote>}
          </div>
        )}
      </button>
    </li>
  );
}
