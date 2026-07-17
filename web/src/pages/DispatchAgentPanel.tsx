import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, Search, Users, UserCheck, X } from 'lucide-react';
import type { UserResponse, AllocationResponse } from '../types';
import { hashColor } from '../utils/navConfig';

interface Props {
  agents: UserResponse[];
  agentsLoading: boolean;
  selectedAgent: string;
  agentObj: UserResponse | undefined;
  agentFullName: string;
  filteredAgents: UserResponse[];
  setAgent: (id: string) => void;
  cases: AllocationResponse[];
  dispatched: AllocationResponse[];
  undispatchedCases: AllocationResponse[];
  casesLoading: boolean;
  dispatchPct: number;
  initials: (a: UserResponse) => string;
  dispatchDayLabel: string;
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
}

// ── Count-up animation ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let start: number | null = null;
    const frame = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
}

// ── Stats footer ──────────────────────────────────────────────────────────────

function AgentStats({ cases, dispatched, dispatchPct, casesLoading }: {
  cases: AllocationResponse[];
  dispatched: AllocationResponse[];
  dispatchPct: number;
  casesLoading: boolean;
}) {
  useCountUp(dispatched.length);

  if (casesLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Loader2 size={14} className="ds-spin" style={{ color: 'var(--ink-tertiary)' }} />
        <span className="ds-skel" style={{ height: 12, flex: 1 }} />
      </div>
    );
  }

  const fmtC = (n: number) =>
    n >= 1e7 ? `₹${(n/1e7).toFixed(1)}Cr` :
    n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L`  :
    n >= 1e3 ? `₹${(n/1e3).toFixed(0)}K`  : `₹${Math.round(n)}`;

  const resolveAmt = (c: AllocationResponse) => {
    if (typeof c.outstandingAmount === 'number') return c.outstandingAmount;
    if (typeof c.totalDue === 'number') return c.totalDue;
    const dd = c.dynamicData || {};
    const key = Object.keys(dd).find(k => {
      const kl = k.toLowerCase();
      return kl.includes('outstanding') || kl.includes('pos') || kl.includes('balance')
        || (kl.includes('total') && kl.includes('due'));
    });
    if (key != null) {
      const num = Number(String(dd[key]).replace(/[^0-9.\-]/g, ''));
      if (!Number.isNaN(num) && num !== 0) return num;
    }
    return 0;
  };

  const totalPortfolio = cases.reduce((s, c) => s + resolveAmt(c), 0);

  if (cases.length === 0) {
    return (
      <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center', margin: 0 }}>
        No cases assigned today
      </p>
    );
  }

  const R = 36; const sw = 12; const SIZE = (R + sw) * 2;
  const circ = 2 * Math.PI * R;

  return (
    <div className="dd-dispatch-ring-wrap">
      <svg width={SIZE} height={SIZE} aria-hidden="true" style={{ flexShrink: 0 }}>
        <g transform={`rotate(-90 ${SIZE/2} ${SIZE/2})`}>
          <circle cx={SIZE/2} cy={SIZE/2} r={R} stroke="var(--bg-subtle)" strokeWidth={sw} fill="none" />
          <motion.circle cx={SIZE/2} cy={SIZE/2} r={R}
            stroke="var(--ink-solid)" strokeWidth={sw} fill="none" strokeLinecap="round"
            strokeDasharray={`${circ} ${circ}`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - dispatchPct / 100) }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </g>
        <text x={SIZE/2} y={SIZE/2 - 2} textAnchor="middle" fill="var(--ink-primary)" fontSize="14" fontWeight="700">{dispatchPct}%</text>
        <text x={SIZE/2} y={SIZE/2 + 13} textAnchor="middle" fill="var(--ink-tertiary)" fontSize="9"
          style={{ fontFamily: 'var(--font-mono)' }} letterSpacing="0.06em">DONE</text>
      </svg>
      <div className="dd-ap-stats">
        <div className="dd-ap-stat">
          <span className="dd-ap-stat-num is-done">{dispatched.length}</span>
          <span className="dd-ap-stat-lbl">Sent</span>
        </div>
        <div className="dd-ap-stat">
          <span className="dd-ap-stat-num">{cases.length - dispatched.length}</span>
          <span className="dd-ap-stat-lbl">Left</span>
        </div>
        <div className="dd-ap-stat">
          <span className="dd-ap-stat-num" style={{ fontSize: 13, letterSpacing: '-0.01em' }}>{fmtC(totalPortfolio)}</span>
          <span className="dd-ap-stat-lbl">Portfolio</span>
        </div>
      </div>
    </div>
  );
}

// ── Agent Panel ───────────────────────────────────────────────────────────────

export default function DispatchAgentPanel(p: Props) {
  return (
    <div className="dd-officers-card ds-card is-overflow-hidden">
      <div className="dd-ap-header db-card-head">
        <span className="dd-ap-header-label">
          <Users size={12} aria-hidden="true" />
          Field Officers
        </span>
        {!p.agentsLoading && (
          <span className="dd-cp-tab-count" style={{ marginLeft: 'auto' }}>
            {p.agents.length}
          </span>
        )}
      </div>

      <div className="dd-agent-list">
        {p.agentsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dd-agent-skel" style={{ opacity: 1 - i * 0.12 }}>
              <span className="ds-skel" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
              <span className="ds-skel" style={{ height: 13, flex: 1 }} />
            </div>
          ))
        ) : p.filteredAgents.length === 0 ? (
          <div className="ds-empty" style={{ padding: '40px 0' }}>
            <UserCheck size={22} className="ds-empty-icon" />
            <span className="ds-empty-title">No officers match</span>
          </div>
        ) : (
          p.filteredAgents.map((a) => {
            const isActive = p.selectedAgent === a.id;
            return (
              <button
                key={a.id}
                type="button"
                className={`dd-agent-row${isActive ? ' is-active' : ''}`}
                onClick={() => p.setAgent(a.id)}
              >
                <span
                  className="dd-fo-avatar"
                  style={{ background: hashColor(`${a.firstName}${a.lastName}`), color: '#fff', border: 'none' }}
                >
                  {p.initials(a)}
                </span>
                <span className="dd-agent-row-name">
                  {`${a.firstName} ${a.lastName}`.trim()}
                </span>
                {isActive && (
                  <CheckCircle2 size={14} className="dd-agent-row-check" aria-hidden="true" />
                )}
              </button>
            );
          })
        )}
      </div>

      <AnimatePresence mode="wait">
        {p.agentObj && (
          <motion.div
            key={p.agentObj.id}
            className="dd-agent-stats-footer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <AgentStats
              cases={p.cases}
              dispatched={p.dispatched}
              dispatchPct={p.dispatchPct}
              casesLoading={p.casesLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
