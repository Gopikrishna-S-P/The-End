import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import type { UserResponse, ApiResponse } from '../types';
import { Search, RefreshCw, Users, X, MapPin, Activity, CheckCircle2 } from 'lucide-react';
import { AgentRow } from './AgentRow';
import TeamStatusTab from '../components/TeamStatusTab';
import '../styles/AppPage.css';
import '../styles/AgentsPage.css';
import './Dashboard.css';

interface AgentPerformance {
  agentId: string; totalAssigned: number; totalVisited: number; totalCollected: number;
  totalPending: number; amountCollected: number; amountOutstanding: number;
  visitCompletionRate: number; collectionEfficiency: number; efficiencyScore: number; rankInOrg: number;
}

// ── Motion variants ────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

// ── Ripple hook ────────────────────────────────────────────────────────────────

function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const fire = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const span = document.createElement('span');
    span.className = 'db-ripple';
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }, []);
  return { ref, fire };
}

// ── Count-up animation ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
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

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, footer, icon: Icon, accent, onClick }: {
  label: string; value: string;
  footer?: React.ReactNode;
  icon?: React.ElementType; accent?: boolean;
  onClick?: () => void;
}) {
  const { ref, fire } = useRipple<HTMLButtonElement>();
  return (
    <motion.button ref={ref} type="button" variants={fadeUp}
      className={`db-kpi2-card${accent ? ' is-accent' : ''}${onClick ? ' is-hoverable' : ''}`}
      onClick={e => { fire(e); onClick?.(); }} disabled={!onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <div className="db-kpi2-top">
        <span className="db-kpi2-label">{label}</span>
        {Icon && <span className="db-kpi2-icon"><Icon size={14} aria-hidden="true" /></span>}
      </div>
      <div className="db-kpi2-value-row">
        <span className="db-kpi2-value">{value}</span>
      </div>
      {footer && <div className="db-kpi2-footer">{footer}</div>}
    </motion.button>
  );
}

const fmtNum = (v?: number | null) => v != null ? v.toLocaleString('en-IN') : '—';
const fmtINR = (n?: number | null) => n != null && Number(n) > 0 ? `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '₹0';

export default function AgentsPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canUpdateUser = hasPermission('USER_UPDATE');
  const orgId = user?.organizationId ?? '';

  const [agents, setAgents]         = useState<UserResponse[]>([]);
  const [perfMap, setPerfMap]       = useState<Record<string, AgentPerformance>>({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault(); inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true); setError(null);
    try {
      const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const [istYear, istMonth] = todayIso.split('-');
      const from = `${istYear}-${istMonth}-01`;
      const to   = todayIso;
      const [foRes, teamRes] = await Promise.allSettled([
        axiosInstance.get<ApiResponse<UserResponse[]>>('/api/v1/users/by-role/FO'),
        axiosInstance.get('/api/v1/reports/team/performance', { params: { orgId, from, to } }),
      ]);
      if (foRes.status === 'fulfilled') setAgents(foRes.value.data.data ?? []);
      else setError('Failed to load field agents.');
      if (teamRes.status === 'fulfilled') {
        const breakdown: AgentPerformance[] = teamRes.value.data?.data?.agentBreakdown ?? [];
        setPerfMap(Object.fromEntries(breakdown.map(r => [r.agentId, r])));
      }
    } finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (agent: UserResponse) => {
    setTogglingId(agent.id);
    try {
      await axiosInstance.patch(`/api/v1/users/${agent.id}/${agent.enabled ? 'disable' : 'enable'}`);
      await load();
    } catch { /* ignore */ } finally { setTogglingId(null); }
  };

  const filtered = agents.filter(a =>
    !searchTerm ||
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const teamStats = useMemo(() => {
    let assigned = 0, visited = 0, amount = 0;
    Object.values(perfMap).forEach(p => {
      assigned += (p.totalAssigned || 0);
      visited += (p.totalVisited || 0);
      amount += (p.amountCollected || 0);
    });
    return { assigned, visited, amount };
  }, [perfMap]);

  const activeAgents = agents.filter(a => a.enabled).length;

  const agentsAnim   = useCountUp(activeAgents);
  const assignedAnim = useCountUp(teamStats.assigned);
  const visitedAnim  = useCountUp(teamStats.visited);

  return (
    <div className="dd-page">
      <div className="dd-page-header">
        <div className="dd-page-titles">
          <h1 className="dd-page-title">Field Agents</h1>
          <span className="dd-page-context">
            {!loading && agents.length > 0 ? `${agents.length} officers` : 'Manage field team'}
          </span>
        </div>
        <div className="dd-page-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0 8px', height: 32 }}>
            <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
            <input
              ref={inputRef}
              type="search"
              placeholder="Search by name or email…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search agents"
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, width: 200, paddingLeft: 8 }}
            />
            <AnimatePresence>
              {searchTerm && (
                <motion.button type="button" onClick={() => setSearchTerm('')}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--text-tertiary)' }}
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}>
                  <X size={12} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <button type="button" onClick={load} disabled={loading}
            className="ds-btn is-secondary" aria-label="Refresh" title="Refresh">
            <RefreshCw size={14} className={loading ? 'ds-spin' : ''} style={{ marginRight: 6 }} /> Refresh
          </button>
        </div>
      </div>

      <div className="dd-main-container">
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--ds-text-subtle)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Live Field Status
          </h2>
          <TeamStatusTab />
        </div>
        <div className="dd-grid">
          <div className="dd-case-panel">
            <div className="ds-card dd-cases-card is-overflow-hidden" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="dd-cases-head">
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Agent Directory</span>
              </div>

              <div className="dd-cp-list-wrap">
                <div className="dd-cp-list">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="dd-case-skel">
                        <span className="ds-skel" style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span className="ds-skel" style={{ height: 14, width: '40%', borderRadius: 4 }} />
                          <span className="ds-skel" style={{ height: 11, width: '25%', borderRadius: 4 }} />
                        </div>
                      </div>
                    ))
                  ) : filtered.length === 0 ? (
                    <motion.div className="dd-cp-empty" variants={fadeIn} initial="hidden" animate="show">
                      <div className="dd-cp-empty-icon">
                        <Users size={20} />
                      </div>
                      <span className="dd-cp-empty-title">{searchTerm ? 'No agents match your search' : 'No field agents found'}</span>
                      <span className="dd-cp-empty-sub">{searchTerm ? 'Try a different name or email address.' : 'Field officers with the FO role will appear here once they are added to your organization.'}</span>
                    </motion.div>
                  ) : (
                    <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column' }}>
                      {filtered.map((agent) => (
                        <AgentRow
                          key={agent.id}
                          agent={agent}
                          perf={perfMap[agent.id]}
                          togglingId={togglingId}
                          canUpdateUser={canUpdateUser}
                          onToggle={toggleStatus}
                          variants={fadeUp}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
