import { motion, type Variants } from 'framer-motion';
import type { VisitLogResponse } from '../types';
import { MapPin, User } from 'lucide-react';
import { VisitPill, fmtDate } from './VisitDrawerHelpers';

interface Props {
  visit: VisitLogResponse;
  isSelected: boolean;
  onToggle: () => void;
  variants?: Variants;
}

export function VisitRow({ visit: v, isSelected, onToggle, variants }: Props) {
  const foName = v.agentName || 'Unassigned';

  return (
    <motion.button
      variants={variants}
      onClick={onToggle}
      type="button"
      className={`db-att-row is-list-row vis-row${isSelected ? ' is-picked' : ''}`}
      aria-label={`Visit for ${v.borrowerName ?? 'unknown customer'} by ${v.agentName ?? 'unknown'} on ${fmtDate(v.visitDate)}`}
      aria-pressed={isSelected}
    >
      {/* Identity — customer name with disposition pill next to it, and loan number beneath. */}
      <div className="vis-row-id">
        <span className="db-att-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <User size={13} style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }} />
          {v.borrowerName || 'Unknown Customer'}
          <VisitPill status={v.disp} />
        </span>
        <span className="vis-row-loan">{v.loanNumber || 'No Loan ID'}</span>
      </div>

      {/* verify status → approval status → FO → GPS. */}
      <div className="vis-row-cols">
        <VisitPill status={v.visitStatus} />
        <VisitPill status={v.approvalStatus} />

        <span className="vis-row-fo" title={foName}>{foName}</span>

        {v.latitude != null && v.longitude != null ? (
          <a
            href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
            target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ds-btn is-secondary is-sm vis-row-gps"
          >
            <MapPin size={13} /> GPS
          </a>
        ) : v.gpsAddress ? (
          <span className="vis-row-gps-text" title={v.gpsAddress}>{v.gpsAddress}</span>
        ) : (
          <span className="vis-row-gps-text">—</span>
        )}
      </div>
    </motion.button>
  );
}
