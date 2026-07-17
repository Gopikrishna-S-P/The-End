import { motion, type Variants } from 'framer-motion';
import type { VisitLogResponse } from '../types';
import { MapPin, ArrowUpRight, Navigation, Calendar } from 'lucide-react';
import { VisitPill, fmtDate } from './VisitDrawerHelpers';

interface Props {
  visit: VisitLogResponse;
  isSelected: boolean;
  onToggle: () => void;
  variants?: Variants;
}

export function VisitRow({ visit: v, isSelected, onToggle, variants }: Props) {
  return (
    <motion.button
      variants={variants}
      onClick={onToggle}
      type="button"
      className={`dd-case-row${isSelected ? ' is-picked' : ''}`}
      aria-label={`Visit by ${v.agentName ?? 'unknown'} on ${fmtDate(v.visitDate)}`}
      aria-pressed={isSelected}
      style={{ paddingLeft: 16, boxShadow: isSelected ? 'none' : undefined }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minWidth: 96, padding: '6px 12px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
          <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{fmtDate(v.visitDate)}</span>
        </div>
      </div>

      <div className="dd-case-info" style={{ flex: '1 1 35%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{v.borrowerName || 'Unknown Customer'}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v.loanNumber || 'No Loan ID'}</span>
      </div>

      <div style={{ flex: '1 1 35%', display: 'flex', alignItems: 'center', gap: 6 }}>
        <VisitPill status={v.disp} />
        <VisitPill status={v.visitStatus} />
        <VisitPill status={v.approvalStatus} />
      </div>

      <div className="dd-case-right" style={{ flex: '1 1 30%', justifyContent: 'flex-end', gap: 24, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{v.agentName || 'Unassigned'}</span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Field Officer</span>
        </div>
        <div className="dd-case-amt" style={{ flex: 'none', minWidth: 60, display: 'flex', justifyContent: 'flex-end' }}>
          {v.latitude != null && v.longitude != null ? (
            <a
              href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
              target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ds-btn is-secondary is-sm"
              style={{ textDecoration: 'none' }}
            >
              <MapPin size={13} /> GPS
            </a>
          ) : v.gpsAddress ? (
            <span style={{ fontSize: '12px', color: 'var(--ink-tertiary)', maxWidth: 150, display: 'inline-block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.gpsAddress}>{v.gpsAddress}</span>
          ) : (
            <span style={{ color: 'var(--ink-tertiary)' }}>—</span>
          )}
        </div>
      </div>
    </motion.button>
  );
}
