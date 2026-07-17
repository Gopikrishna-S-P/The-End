import { useNavigate } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import type { UserResponse } from '../types';
import { TrendingUp, Loader2, ChevronRight, UserX, UserCheck } from 'lucide-react';

interface AgentPerformance {
  totalAssigned: number; totalVisited: number; totalCollected: number; totalPending: number;
  amountCollected: number; visitCompletionRate: number; efficiencyScore: number;
}

interface Props {
  agent: UserResponse;
  perf?: AgentPerformance;
  togglingId: string | null;
  canUpdateUser: boolean;
  onToggle: (agent: UserResponse) => void;
  variants?: Variants;
}

const AVATAR_COLORS = ['#0AA550','#0EA5E9','#8B5CF6','#F59E0B','#EF4444','#14B8A6','#EC4899','#F97316'];
function avatarColor(name: string) { const sum = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0); return AVATAR_COLORS[sum % AVATAR_COLORS.length]; }
const fmtINR = (n?: number | null) => n != null && Number(n) > 0 ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';
const completionVariant = (pct: number) => pct >= 80 ? 'is-success' : pct >= 50 ? 'is-warn' : 'is-error';
const completionColor = (pct: number) => pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--error)';

export function AgentRow({ agent, perf: p, togglingId, canUpdateUser, onToggle, variants }: Props) {
  const navigate = useNavigate();
  const assigned   = p?.totalAssigned ?? 0;
  const visited    = p?.totalVisited ?? 0;
  const pending    = p?.totalPending ?? (assigned - visited);
  const collected  = p?.totalCollected ?? 0;
  const amount     = p?.amountCollected ?? 0;
  const completion = p?.visitCompletionRate ?? 0;
  const efficiency = p?.efficiencyScore ?? 0;
  const color = avatarColor(`${agent.firstName}${agent.lastName}`);

  return (
    <motion.div
      variants={variants}
      className="dd-case-row is-clickable"
      onClick={() => navigate(`/app/agents/${agent.id}`)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/app/agents/${agent.id}`); } }}
      tabIndex={0} role="row"
      aria-label={`${agent.firstName} ${agent.lastName}, ${agent.enabled ? 'active' : 'disabled'}`}
    >
      <div className="dd-case-info">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, background: `${color}20`, border: `1px solid ${color}40`, color }}>
            {(agent.firstName?.[0] ?? '?').toUpperCase()}{(agent.lastName?.[0] ?? '').toUpperCase()}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              <span className="dd-case-borrower" style={{ fontSize: 13 }}>{agent.firstName} {agent.lastName}</span>
              <span className={`ds-pill ${agent.enabled ? 'is-success' : 'is-neutral'}`} style={{ fontSize: 9, padding: '0 6px', height: 16, flexShrink: 0 }}>{agent.enabled ? 'Active' : 'Disabled'}</span>
            </div>
            <div className="dd-case-meta">
              <span>{agent.email}</span>
              <span>• Assigned: {assigned} | Visited: {visited} | Pending: {pending}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 100 }}>
                <span className={`ds-pill ${completionVariant(Number(completion))}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, height: 16, padding: '0 4px' }}>
                  {p ? `${Number(completion).toFixed(1)}%` : '0%'}
                </span>
                <div style={{ flex: 1, height: 3, borderRadius: 1.5, background: 'var(--bg-subtle)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Number(completion))}%`, height: '100%', background: completionColor(Number(completion)), transition: 'width 300ms ease-out' }} />
                </div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <TrendingUp size={10} style={{ color: efficiency > 0 ? 'var(--success)' : 'var(--text-tertiary)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: efficiency > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{Number(efficiency).toFixed(1)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="dd-case-right">
        {Number(amount) > 0 && <span className="dd-case-amount">{fmtINR(amount)}</span>}
        {collected > 0 && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{collected} collections</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          {canUpdateUser && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(agent); }} disabled={togglingId === agent.id} 
              className={`ds-btn is-secondary is-sm`} 
              style={{ padding: '0 8px', ...(agent.enabled ? { color: 'var(--danger)' } : { color: 'var(--text-tertiary)' }) }}
              title={agent.enabled ? 'Disable' : 'Enable'} aria-label={agent.enabled ? 'Disable' : 'Enable'}>
              {togglingId === agent.id ? <Loader2 size={13} className="ds-spin" /> : agent.enabled ? <UserX size={13} /> : <UserCheck size={13} />}
            </button>
          )}
          <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', marginLeft: 4 }} />
        </div>
      </div>
    </motion.div>
  );
}

