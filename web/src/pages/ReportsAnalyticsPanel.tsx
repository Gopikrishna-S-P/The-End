import { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { reportsApi } from '../api/reportsApi';
import type {
  AgentPerformanceResponse, AgentEfficiencyRow, AgentReassignmentRow,
  MonthlyLoanBookResponse, BankReconciliationResponse, BankReconciliationRow,
} from '../api/reportsApi';
import type { UserResponse, ApiResponse, NpaRiskLevel } from '../types';
import { FeatureGate } from '../components/FeatureGate';
import {
  Trophy, TrendingDown, Shuffle, BookOpen, Landmark, Loader2, AlertCircle,
  Banknote, CheckCircle2, Clock,
} from 'lucide-react';

// Ground truth: these five ReportingController GET endpoints
// (agent/rankings, collection-efficiency, reassignment-frequency, loan-book[/history],
// bank-reconciliation) had wrapper functions in reportsApi.ts but no page ever called
// them — the async "Generate report" flow covers the same data as a downloadable
// file, but there was no on-screen live view. This panel is that live view.
// All five are gated server-side by @RequiresFeature(ADVANCED_REPORTS); mirrored
// here with <FeatureGate> so non-entitled orgs see the standard upgrade lock
// instead of a raw 403.

function fmtINR(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n.toFixed(0)}`;
}
function fmtPct(v: number | null | undefined): string {
  return `${Number(v ?? 0).toFixed(1)}%`;
}
function todayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
function monthStartStr(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString('en-CA');
}
function fmtDateOnly(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const RISK_LABELS: Record<NpaRiskLevel, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
};
const RISK_COLORS: Record<NpaRiskLevel, string> = {
  LOW: 'var(--ink-tertiary)', MEDIUM: 'var(--warning)', HIGH: 'var(--danger)', CRITICAL: 'var(--danger)',
};

function ErrorBanner({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'var(--danger-subtle)', borderRadius: 6 }}>
      <AlertCircle size={14} /> {text}
    </div>
  );
}
function EmptyNote({ text }: { text: string }) {
  return <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-tertiary)', fontSize: 13 }}>{text}</div>;
}

function KpiStrip({ items }: { items: { icon: React.ElementType; label: string; value: React.ReactNode; sub?: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 16 }}>
      {items.map(({ icon: Icon, label, value, sub }) => (
        <div key={label} style={{ background: 'var(--bg-subtle)', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Icon size={13} style={{ color: 'var(--ink-tertiary)' }} />
            <span style={{ fontSize: 11, color: 'var(--ink-tertiary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
          {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-secondary)', marginTop: 3 }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}

type Col = { key: string; label: string; align?: 'left' | 'right' };
function DataTable({ columns, rows, keyFn }: { columns: Col[]; rows: Record<string, React.ReactNode>[]; keyFn: (r: Record<string, React.ReactNode>, i: number) => string }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-default)', background: 'var(--bg-canvas)' }}>
            {columns.map(c => (
              <th key={c.key} style={{ padding: '7px 10px', textAlign: c.align ?? 'left', fontWeight: 600, fontSize: 10.5, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={keyFn(r, i)} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: '8px 10px', textAlign: c.align ?? 'left', color: 'var(--ink-secondary)' }}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Agent id → display name. Same pattern AgentsPage.tsx uses for
// team/performance's agentBreakdown: AgentPerformanceResponse only carries a
// UUID (no name field on the DTO), so field-officer identities are resolved
// from a side fetch and matched client-side. ──
function useAgentNames(organizationId: string) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!organizationId) return;
    axiosInstance.get<ApiResponse<UserResponse[]>>('/api/v1/users/by-role/FO')
      .then(r => {
        const map: Record<string, string> = {};
        (r.data?.data ?? []).forEach(u => { map[u.id] = `${u.firstName} ${u.lastName}`.trim() || u.email; });
        setNames(map);
      })
      .catch(() => { /* best-effort — falls back to a shortened id */ });
  }, [organizationId]);
  return useCallback((id: string) => names[id] || `${id.slice(0, 8)}…`, [names]);
}

// ── Rankings ─────────────────────────────────────────────────────────────────
function RankingsTab({ organizationId }: { organizationId: string }) {
  const agentLabel = useAgentNames(organizationId);
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState<AgentPerformanceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true); setError(null);
    try {
      const res = await reportsApi.getAgentRankings(organizationId, date, 0, 50);
      setRows(res.content);
    } catch {
      setError('Could not load agent rankings.');
    } finally { setLoading(false); }
  }, [organizationId, date]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <input type="date" value={date} max={todayStr()} onChange={e => setDate(e.target.value)} className="ds-input" style={{ height: 32, width: 148 }} />
        {loading && <Loader2 size={14} className="ds-spin" />}
      </div>
      {error && <ErrorBanner text={error} />}
      {!loading && !error && rows.length === 0 && <EmptyNote text="No agent snapshots for this date yet." />}
      {rows.length > 0 && (
        <DataTable
          keyFn={r => r.agentId as string}
          columns={[
            { key: 'rank', label: 'Rank' },
            { key: 'agent', label: 'Agent' },
            { key: 'assigned', label: 'Assigned', align: 'right' },
            { key: 'visited', label: 'Visited', align: 'right' },
            { key: 'collected', label: 'Collected', align: 'right' },
            { key: 'visitPct', label: 'Visit %', align: 'right' },
            { key: 'efficiency', label: 'Efficiency', align: 'right' },
          ]}
          rows={rows.map(r => ({
            agentId: r.agentId,
            rank: r.rankInOrg ?? '—',
            agent: agentLabel(r.agentId),
            assigned: r.totalAssigned,
            visited: r.totalVisited,
            collected: fmtINR(r.amountCollected),
            visitPct: fmtPct(r.visitCompletionRate),
            efficiency: Number(r.efficiencyScore ?? 0).toFixed(1),
          }))}
        />
      )}
    </div>
  );
}

// ── Collection efficiency ────────────────────────────────────────────────────
function CollectionTab({ organizationId }: { organizationId: string }) {
  const agentLabel = useAgentNames(organizationId);
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<{ totalOutstanding: number; totalCollected: number; collectionEfficiencyPct: number; recoveryRatePct: number; agentBreakdown: AgentEfficiencyRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true); setError(null);
    try {
      setData(await reportsApi.getCollectionEfficiency(organizationId, from, to));
    } catch {
      setError('Could not load collection efficiency.');
    } finally { setLoading(false); }
  }, [organizationId, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <DateRangeControls from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onRefresh={load} />
      {error && <ErrorBanner text={error} />}
      {data && !loading && (
        <>
          <KpiStrip items={[
            { icon: Banknote, label: 'Outstanding', value: fmtINR(data.totalOutstanding) },
            { icon: CheckCircle2, label: 'Collected', value: fmtINR(data.totalCollected) },
            { icon: TrendingDown, label: 'Efficiency', value: fmtPct(data.collectionEfficiencyPct) },
            { icon: TrendingDown, label: 'Recovery rate', value: fmtPct(data.recoveryRatePct) },
          ]} />
          {data.agentBreakdown.length === 0 ? <EmptyNote text="No agent activity in this range." /> : (
            <DataTable
              keyFn={r => r.agentId as string}
              columns={[
                { key: 'rank', label: 'Rank' },
                { key: 'agent', label: 'Agent' },
                { key: 'outstanding', label: 'Outstanding', align: 'right' },
                { key: 'collected', label: 'Collected', align: 'right' },
                { key: 'efficiency', label: 'Efficiency', align: 'right' },
                { key: 'recovery', label: 'Recovery', align: 'right' },
              ]}
              rows={data.agentBreakdown.map(r => ({
                agentId: r.agentId,
                rank: r.rank,
                agent: agentLabel(r.agentId),
                outstanding: fmtINR(r.amountOutstanding),
                collected: fmtINR(r.amountCollected),
                efficiency: fmtPct(r.efficiencyPct),
                recovery: fmtPct(r.recoveryRatePct),
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Reassignment frequency ───────────────────────────────────────────────────
function ReassignmentTab({ organizationId }: { organizationId: string }) {
  const agentLabel = useAgentNames(organizationId);
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<{ totalReassignments: number; avgReassignmentsPerAgent: number; agentBreakdown: AgentReassignmentRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true); setError(null);
    try {
      setData(await reportsApi.getReassignmentFrequency(organizationId, from, to));
    } catch {
      setError('Could not load reassignment frequency.');
    } finally { setLoading(false); }
  }, [organizationId, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <DateRangeControls from={from} to={to} setFrom={setFrom} setTo={setTo} loading={loading} onRefresh={load} />
      {error && <ErrorBanner text={error} />}
      {data && !loading && (
        <>
          <KpiStrip items={[
            { icon: Shuffle, label: 'Total reassignments', value: data.totalReassignments },
            { icon: Shuffle, label: 'Avg per agent', value: Number(data.avgReassignmentsPerAgent ?? 0).toFixed(1) },
          ]} />
          {data.agentBreakdown.length === 0 ? <EmptyNote text="No reassignments in this range." /> : (
            <DataTable
              keyFn={r => r.agentId as string}
              columns={[
                { key: 'agent', label: 'Agent' },
                { key: 'out', label: 'Reassigned out', align: 'right' },
                { key: 'in', label: 'Reassigned in', align: 'right' },
                { key: 'net', label: 'Net', align: 'right' },
                { key: 'rate', label: 'Rate', align: 'right' },
              ]}
              rows={data.agentBreakdown.map(r => ({
                agentId: r.agentId,
                agent: agentLabel(r.agentId),
                out: r.reassignedOut,
                in: r.reassignedIn,
                net: r.netReassignments,
                rate: Number(r.reassignmentRate ?? 0).toFixed(2),
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Loan book ─────────────────────────────────────────────────────────────────
function LoanBookTab({ organizationId }: { organizationId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<MonthlyLoanBookResponse | null>(null);
  const [history, setHistory] = useState<MonthlyLoanBookResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true); setError(null);
    try {
      const [snap, hist] = await Promise.allSettled([
        reportsApi.getLoanBook(organizationId, month, year),
        reportsApi.getLoanBookHistory(organizationId, 0, 6),
      ]);
      if (snap.status === 'fulfilled') setData(snap.value);
      else setData(null);
      if (hist.status === 'fulfilled') setHistory(hist.value.content);
      if (snap.status === 'rejected') setError('No loan book snapshot for this month.');
    } finally { setLoading(false); }
  }, [organizationId, month, year]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="ds-input" style={{ height: 32, width: 130 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
          ))}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="ds-input" style={{ height: 32, width: 90 }} />
        {loading && <Loader2 size={14} className="ds-spin" />}
      </div>
      {error && <ErrorBanner text={error} />}
      {data && !loading && (
        <KpiStrip items={[
          { icon: BookOpen, label: 'Total loans', value: data.totalLoans },
          { icon: Banknote, label: 'Outstanding', value: fmtINR(data.totalOutstandingAmount) },
          { icon: CheckCircle2, label: 'Collected', value: fmtINR(data.totalCollectedAmount) },
          { icon: AlertCircle, label: 'At-risk loans', value: data.totalNpaCount, sub: fmtINR(data.totalNpaAmount) },
          { icon: BookOpen, label: 'Assigned', value: data.totalAssignedLoans, sub: `${data.totalUnassignedLoans} unassigned` },
          { icon: TrendingDown, label: 'Efficiency', value: fmtPct(data.collectionEfficiencyPct), sub: fmtPct(data.recoveryRatePct) + ' recovery' },
        ]} />
      )}
      {history.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-tertiary)', marginBottom: 8 }}>
            Recent months
          </div>
          <DataTable
            keyFn={r => r.snapshotMonth as string}
            columns={[
              { key: 'month', label: 'Month' },
              { key: 'loans', label: 'Loans', align: 'right' },
              { key: 'outstanding', label: 'Outstanding', align: 'right' },
              { key: 'collected', label: 'Collected', align: 'right' },
              { key: 'atRisk', label: 'At-risk', align: 'right' },
            ]}
            rows={history.map(h => ({
              snapshotMonth: h.snapshotMonth,
              month: fmtDateOnly(h.snapshotMonth),
              loans: h.totalLoans,
              outstanding: fmtINR(h.totalOutstandingAmount),
              collected: fmtINR(h.totalCollectedAmount),
              atRisk: h.totalNpaCount,
            }))}
          />
        </div>
      )}
    </div>
  );
}

// ── Bank reconciliation ──────────────────────────────────────────────────────
function ReconciliationTab({ organizationId }: { organizationId: string }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<BankReconciliationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true); setError(null);
    try {
      setData(await reportsApi.getBankReconciliation(organizationId, month, year));
    } catch {
      setError('No reconciliation data for this month.');
    } finally { setLoading(false); }
  }, [organizationId, month, year]);

  useEffect(() => { load(); }, [load]);

  const riskEntries = data ? (Object.entries(data.npaBreakdown) as [NpaRiskLevel, number][]).filter(([, c]) => c > 0) : [];

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="ds-input" style={{ height: 32, width: 130 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
          ))}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="ds-input" style={{ height: 32, width: 90 }} />
        {loading && <Loader2 size={14} className="ds-spin" />}
      </div>
      {error && <ErrorBanner text={error} />}
      {data && !loading && (
        <>
          <KpiStrip items={[
            { icon: Banknote, label: 'Grand total', value: fmtINR(data.grandTotalCollected) },
            { icon: CheckCircle2, label: 'Deposited', value: data.totalDepositedTransactions, sub: fmtINR(data.totalDepositedAmount) },
            { icon: Clock, label: 'Pending deposit', value: data.totalPendingDeposit, sub: fmtINR(data.totalPendingDepositAmount) },
            { icon: Banknote, label: 'Cash', value: fmtINR(data.totalCollectedCash) },
            { icon: Banknote, label: 'UPI', value: fmtINR(data.totalCollectedUpi) },
            { icon: Banknote, label: 'Cheque / NEFT / RTGS', value: fmtINR(data.totalCollectedCheque + data.totalCollectedNeft + data.totalCollectedRtgs) },
          ]} />
          {riskEntries.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {riskEntries.map(([level, count]) => (
                <span key={level} className="ds-pill" style={{ color: RISK_COLORS[level] }}>
                  {RISK_LABELS[level]} risk: {count}
                </span>
              ))}
              <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', alignSelf: 'center' }}>· {fmtINR(data.totalNpaAmount)} at risk</span>
            </div>
          )}
          {data.rows.length === 0 ? <EmptyNote text="No collections recorded this month." /> : (
            <DataTable
              keyFn={r => r.collectionId as string}
              columns={[
                { key: 'receipt', label: 'Receipt' },
                { key: 'loan', label: 'Loan / Borrower' },
                { key: 'amount', label: 'Amount', align: 'right' },
                { key: 'mode', label: 'Mode' },
                { key: 'status', label: 'Status' },
                { key: 'deposited', label: 'Deposited', align: 'right' },
              ]}
              rows={data.rows.map((r: BankReconciliationRow) => ({
                collectionId: r.collectionId,
                receipt: r.receiptNumber,
                loan: `${r.loanNumber ?? '—'} / ${r.borrowerName ?? '—'}`,
                amount: fmtINR(r.amount),
                mode: r.paymentMode,
                status: r.status,
                deposited: fmtDateOnly(r.depositedDate),
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Shared date-range controls ───────────────────────────────────────────────
function DateRangeControls({ from, to, setFrom, setTo, loading, onRefresh }: {
  from: string; to: string; setFrom: (v: string) => void; setTo: (v: string) => void; loading: boolean; onRefresh: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
      <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="ds-input" style={{ height: 32, width: 148 }} />
      <span style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>to</span>
      <input type="date" value={to} max={todayStr()} onChange={e => setTo(e.target.value)} className="ds-input" style={{ height: 32, width: 148 }} />
      {loading ? <Loader2 size={14} className="ds-spin" /> : (
        <button type="button" onClick={onRefresh} className="ds-btn is-secondary" style={{ height: 32 }}>Refresh</button>
      )}
    </div>
  );
}

// ── Panel shell ───────────────────────────────────────────────────────────────
type TabKey = 'rankings' | 'collection' | 'reassignment' | 'loanbook' | 'reconciliation';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'rankings',       label: 'Agent rankings',        icon: Trophy },
  { key: 'collection',     label: 'Collection efficiency', icon: TrendingDown },
  { key: 'reassignment',   label: 'Reassignments',         icon: Shuffle },
  { key: 'loanbook',       label: 'Loan book',             icon: BookOpen },
  { key: 'reconciliation', label: 'Bank reconciliation',   icon: Landmark },
];

export function ReportsAnalyticsPanel({ organizationId }: { organizationId: string }) {
  const [tab, setTab] = useState<TabKey>('rankings');

  return (
    <FeatureGate flagKey="ADVANCED_REPORTS">
      <div className="ds-card db-card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`ds-btn ${tab === t.key ? 'is-primary' : 'is-secondary'}`}
                style={{ height: 30, fontSize: 12 }}
              >
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
        {tab === 'rankings' && <RankingsTab organizationId={organizationId} />}
        {tab === 'collection' && <CollectionTab organizationId={organizationId} />}
        {tab === 'reassignment' && <ReassignmentTab organizationId={organizationId} />}
        {tab === 'loanbook' && <LoanBookTab organizationId={organizationId} />}
        {tab === 'reconciliation' && <ReconciliationTab organizationId={organizationId} />}
      </div>
    </FeatureGate>
  );
}
