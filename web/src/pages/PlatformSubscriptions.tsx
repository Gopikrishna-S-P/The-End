import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Building2, CreditCard, AlertCircle,
  ArrowUpRight, RefreshCw, Download, ExternalLink, X,
  SquarePen, Receipt, Settings2, ChevronDown,
  ToggleLeft, ToggleRight, RotateCcw, FileDown, Users, Search, SlidersHorizontal,
  Gift, Loader2,
} from 'lucide-react';
import { platformApi, type PlatformSubRow, type InvoiceRow } from '../api/platformApi';
import { featureFlagsApi, type FeatureFlag } from '../api/featureFlagsApi';
import { Modal, ModalFooter } from './PlatformSetupShared';
import '../styles/AppPage.css';
import './PlatformSubscriptions.css';
import '../styles/PlatformSetupPage.css';
import './Dashboard.css';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

function fmtNum(v?: number | null) {
  return v != null ? v.toLocaleString('en-IN') : '—';
}

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtAmount(paise: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(paise / 100);
}

// ── Status helpers ─────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  ACTIVE:    'is-success',
  TRIAL:     'is-info',
  PAST_DUE:  'is-warn',
  CANCELLED: 'is-error',
  INACTIVE:  'is-neutral',
};

const PLAN_LABEL: Record<string, string> = {
  NONE: '—', STARTER: 'Starter', GROWTH: 'Growth', ENTERPRISE: 'Enterprise',
};

const PLAN_OPTIONS = ['NONE', 'STARTER', 'GROWTH', 'ENTERPRISE'] as const;

// ── Filter model ──────────────────────────────────────────────────────────────

type StatusKey = PlatformSubRow['status'];
type PlanKey   = PlatformSubRow['plan'];
type PaidKey   = 'ANY' | 'PAID' | 'UNPAID';

/**
 * Derived conditions worth acting on, as opposed to raw column values.
 *
 * <p>Each answers a question the plain status column cannot. `cancelling` in
 * particular reads `cancelAtPeriodEnd`, which the table displays nowhere -- an
 * org can be sitting at ACTIVE while already scheduled to lapse, and until now
 * that was invisible. `unbillable` catches the inverse config error: a paid plan
 * with no Stripe customer behind it, which can never actually be charged.
 */
const ATTENTION = {
  failing:    { label: 'Payment failing',       test: (r: PlatformSubRow) => r.status === 'PAST_DUE' },
  endingSoon: { label: 'Trial ends within 7d',  test: (r: PlatformSubRow) => r.status === 'TRIAL' && r.trialDaysLeft > 0 && r.trialDaysLeft <= 7 },
  expired:    { label: 'Trial expired',         test: (r: PlatformSubRow) => r.status === 'TRIAL' && r.trialDaysLeft <= 0 },
  cancelling: { label: 'Cancelling at period end', test: (r: PlatformSubRow) => !!r.cancelAtPeriodEnd },
  unbillable: { label: 'Paid plan, no Stripe customer', test: (r: PlatformSubRow) => !r.stripeCustomerId && r.plan !== 'NONE' },
  comped:     { label: 'On a comp',                 test: (r: PlatformSubRow) => isCompLive(r) },
} as const;

/** A grant with a past expiry is history, not access — mirrors OrgSubscription.activeComp(). */
function isCompLive(r: PlatformSubRow): boolean {
  if (!r.compedPlan) return false;
  if (r.compedUntil && new Date(r.compedUntil).getTime() <= Date.now()) return false;
  return true;
}

type AttentionKey = keyof typeof ATTENTION;

interface Filters {
  q: string;
  statuses: StatusKey[];
  plans: PlanKey[];
  paid: PaidKey;
  attention: AttentionKey[];
}

const EMPTY_FILTERS: Filters = { q: '', statuses: [], plans: [], paid: 'ANY', attention: [] };

function matches(row: PlatformSubRow, f: Filters): boolean {
  const q = f.q.trim().toLowerCase();
  if (q && !row.orgName.toLowerCase().includes(q) && !row.orgCode.toLowerCase().includes(q)) return false;
  if (f.statuses.length && !f.statuses.includes(row.status)) return false;
  if (f.plans.length    && !f.plans.includes(row.plan))      return false;
  if (f.paid === 'PAID'   && !(row.lifetimeRevenue > 0)) return false;
  if (f.paid === 'UNPAID' && row.lifetimeRevenue > 0)    return false;
  // Attention conditions are OR'd: selecting two asks "show me either problem",
  // which is how someone triaging actually reads this list. AND'ing them would
  // mostly produce empty results, since the conditions are near-exclusive.
  if (f.attention.length && !f.attention.some(k => ATTENTION[k].test(row))) return false;
  return true;
}

function countActive(f: Filters): number {
  return (f.q.trim() ? 1 : 0) + f.statuses.length + f.plans.length
       + (f.paid === 'ANY' ? 0 : 1) + f.attention.length;
}

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter(x => x !== v) : [...list, v];
}

// ── Subscriber row ────────────────────────────────────────────────────────────

function SubRow({ row, onInvoices, onOpenFlags, onEditPlan, onComp }: {
  row: PlatformSubRow;
  onInvoices: () => void;
  onOpenFlags: () => void;
  onEditPlan: () => void;
  onComp: () => void;
}) {
  const pillCls = STATUS_PILL[row.status] ?? 'is-neutral';
  const dateLabel = row.status === 'TRIAL'
    ? (row.trialDaysLeft > 0 ? `Trial · ${row.trialDaysLeft}d left` : `Trial expired`)
    : fmt(row.currentPeriodEnd);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
    >
      <td>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink-primary)' }}>{row.orgName}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{row.orgCode}</div>
      </td>
      <td style={{ color: 'var(--ink-secondary)' }}>
        {/* Shows what they can use, with what they pay for kept visible beside it —
            collapsing the two would hide that a plan is being given away. */}
        {isCompLive(row) ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {PLAN_LABEL[row.compedPlan as PlanKey]}
            <span className="ds-pill is-info" style={{ fontSize: 10 }}
              title={[
                `Comped${row.compedReason ? `: ${row.compedReason}` : ''}`,
                row.compedUntil ? `Until ${fmt(row.compedUntil)}` : 'No expiry',
                `Paying for ${PLAN_LABEL[row.plan]}`,
              ].join('\n')}>
              Comp
            </span>
          </span>
        ) : PLAN_LABEL[row.plan]}
      </td>
      <td><span className={`ds-pill ${pillCls}`}>{row.status.replace('_', ' ')}</span></td>
      <td className="is-mono is-right" style={{ whiteSpace: 'nowrap' }}
        title="Total actually settled through Stripe, all time">
        {row.lifetimeRevenue > 0
          ? fmtAmount(row.lifetimeRevenue, 'INR')
          : <span className="is-muted">—</span>}
      </td>
      <td className="is-mono is-muted" style={{ whiteSpace: 'nowrap' }}>{dateLabel}</td>
      <td className="is-right">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onOpenFlags} className="ds-table-row-action" title="Feature flags">
            <Settings2 size={14} />
          </button>
          <button type="button" onClick={onEditPlan} className="ds-table-row-action" title="Change plan">
            <SquarePen size={14} />
          </button>
          <button type="button" onClick={onComp} className="ds-table-row-action"
            title={isCompLive(row) ? 'Edit or remove comp' : 'Grant free access'}>
            <Gift size={14} />
          </button>
          <button type="button" onClick={onInvoices} className="ds-table-row-action"
            disabled={!row.stripeCustomerId}
            title={row.stripeCustomerId ? 'View invoices' : 'No Stripe customer'}>
            <Receipt size={14} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Comp modal ────────────────────────────────────────────────────────────────

/**
 * Grants, edits or removes free plan access.
 *
 * <p>Deliberately separate from "Change plan": that sets what an org is billed
 * for and is refused outright for Stripe-billed orgs, since Stripe owns the plan
 * and overwrites it on the next webhook. A comp is the channel that survives.
 */
function CompModal({ row, onClose, onSaved }: {
  row: PlatformSubRow; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const live = isCompLive(row);
  const [plan, setPlan]     = useState<string>(row.compedPlan ?? 'GROWTH');
  const [reason, setReason] = useState(row.compedReason ?? '');
  const [until, setUntil]   = useState(row.compedUntil ? row.compedUntil.slice(0, 10) : '');
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    if (!reason.trim()) { setError('Add a reason so the next admin knows why this exists.'); return; }
    setBusy(true); setError('');
    try {
      // Date input gives a local calendar day; send end-of-day UTC so a comp
      // dated "31 Dec" lasts through the 31st rather than expiring at midnight.
      await platformApi.grantComp(row.orgId, plan, reason.trim(),
        until ? new Date(`${until}T23:59:59Z`).toISOString() : null);
      await onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not save the comp.');
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true); setError('');
    try {
      await platformApi.revokeComp(row.orgId);
      await onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not remove the comp.');
      setBusy(false);
    }
  };

  return (
    <Modal title={live ? 'Edit comp' : 'Grant free access'}
      subtitle={`${row.orgName} · paying for ${PLAN_LABEL[row.plan]}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label className="ds-label">Plan to grant</label>
          <div className="ps-filter-chips" style={{ marginTop: 6 }}>
            {(['STARTER', 'GROWTH', 'ENTERPRISE'] as const).map(p => (
              <button key={p} type="button"
                className={`ps-filter-chip${plan === p ? ' is-on' : ''}`}
                aria-pressed={plan === p}
                onClick={() => setPlan(p)}>
                {PLAN_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="ds-label" htmlFor="comp-reason">Reason</label>
          <input id="comp-reason" className="ds-input" value={reason} autoFocus
            placeholder="Design partner, migration goodwill, pilot…"
            onChange={e => setReason(e.target.value)} />
        </div>

        <div>
          <label className="ds-label" htmlFor="comp-until">Expires</label>
          <input id="comp-until" type="date" className="ds-input" value={until}
            min={new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)}
            onChange={e => setUntil(e.target.value)} />
          <span className="ds-help">Leave empty for an open-ended grant.</span>
        </div>

        <p className="ds-help" style={{ margin: 0 }}>
          Grants access without charging. It does not change what Stripe bills, and it is
          never counted as revenue.
        </p>

        {error && <div className="ds-error" role="alert">{error}</div>}

        <div className="ds-modal-actions">
          {live && (
            <button type="button" className="ds-btn is-secondary" onClick={revoke} disabled={busy}>
              Remove comp
            </button>
          )}
          <button type="button" className="ds-btn is-secondary" onClick={onClose} disabled={busy} style={{ flex: 1 }}>
            Cancel
          </button>
          <button type="button" className="ds-btn is-primary" onClick={save} disabled={busy}
            style={{ flex: 1, justifyContent: 'center' }}>
            {busy ? <Loader2 size={14} className="ds-spin" /> : <Gift size={14} />}
            {live ? 'Update comp' : 'Grant access'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Filter toolbar ────────────────────────────────────────────────────────────

/**
 * Search stays on the toolbar because it is used constantly; everything else
 * lives behind one trigger so the header does not become a wall of controls.
 *
 * <p>Counts next to each option are computed against the *other* active filters,
 * so a option showing 0 is genuinely a dead end rather than merely unselected.
 * Options that would return nothing are shown disabled instead of hidden --
 * "there are no past-due orgs" is useful information, an absent row is not.
 */
function FilterBar({ rows, filters, onChange }: {
  rows: PlatformSubRow[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activeCount = countActive(filters);
  const shown = rows.filter(r => matches(r, filters)).length;

  /** How many rows a given change would yield, holding every other filter steady. */
  const previewCount = (patch: Partial<Filters>) =>
    rows.filter(r => matches(r, { ...filters, ...patch })).length;

  return (
    <>
      <div className="ds-toolbar" style={{ width: 'auto', justifyContent: 'flex-end', border: 'none', background: 'transparent', padding: 0, height: 'auto' }}>
        <div className="ps-filter-anchor" ref={anchorRef}>
          <button type="button"
            style={{ padding: '0 16px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: 'var(--bg-surface)', color: 'var(--ink-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', fontWeight: 500, letterSpacing: '0.02em', fontSize: 13, cursor: 'pointer' }}
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-haspopup="dialog"
          >
            {activeCount > 0 && <span className="ds-filter-dot" aria-hidden="true" style={{ background: 'var(--brand)' }} />}
            <SlidersHorizontal size={13} aria-hidden="true" />
            Filter{activeCount > 0 ? ` · ${activeCount}` : ''}
            <ChevronDown size={12} aria-hidden="true" />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div className="ps-filter-pop" role="dialog" aria-label="Filter organizations"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
              >
                <div className="ps-filter-group">
                  <span className="ps-filter-group-title">Search</span>
                  <div className="ps-filter-search">
                    <Search size={14} className="ds-search-icon" aria-hidden="true" />
                    <input
                      className="ds-search-input"
                      placeholder="Search by name or code"
                      value={filters.q}
                      onChange={e => onChange({ ...filters, q: e.target.value })}
                      aria-label="Search organizations"
                      autoFocus
                    />
                    {filters.q && (
                      <button type="button" className="ds-search-clear" aria-label="Clear search"
                        onClick={() => onChange({ ...filters, q: '' })}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="ps-filter-group">
                  <span className="ps-filter-group-title">Needs attention</span>
                  <div className="ps-filter-rows">
                    {(Object.keys(ATTENTION) as AttentionKey[]).map(k => {
                      const on = filters.attention.includes(k);
                      const n  = rows.filter(ATTENTION[k].test).length;
                      return (
                        <button key={k} type="button"
                          className={`ps-filter-row${on ? ' is-on' : ''}`}
                          data-empty={n === 0 && !on}
                          disabled={n === 0 && !on}
                          aria-pressed={on}
                          onClick={() => onChange({ ...filters, attention: toggle(filters.attention, k) })}
                        >
                          <span>{ATTENTION[k].label}</span>
                          <span className="ps-filter-row-n">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="ps-filter-group">
                  <span className="ps-filter-group-title">Plan</span>
                  <div className="ps-filter-chips">
                    {PLAN_OPTIONS.map(p => {
                      const on = filters.plans.includes(p);
                      return (
                        <button key={p} type="button"
                          className={`ps-filter-chip${on ? ' is-on' : ''}`}
                          aria-pressed={on}
                          onClick={() => onChange({ ...filters, plans: toggle(filters.plans, p) })}
                        >
                          {PLAN_LABEL[p] === '—' ? 'No plan' : PLAN_LABEL[p]}
                          <span className="ps-filter-chip-n">{previewCount({ plans: [p] })}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="ps-filter-group">
                  <span className="ps-filter-group-title">Status</span>
                  <div className="ps-filter-chips">
                    {(Object.keys(STATUS_PILL) as StatusKey[]).map(s => {
                      const on = filters.statuses.includes(s);
                      return (
                        <button key={s} type="button"
                          className={`ps-filter-chip${on ? ' is-on' : ''}`}
                          aria-pressed={on}
                          onClick={() => onChange({ ...filters, statuses: toggle(filters.statuses, s) })}
                        >
                          {s.replace('_', ' ').toLowerCase()}
                          <span className="ps-filter-chip-n">{previewCount({ statuses: [s] })}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="ps-filter-group">
                  <span className="ps-filter-group-title">Revenue</span>
                  <div className="ps-filter-chips">
                    {([['ANY', 'Any'], ['PAID', 'Has paid'], ['UNPAID', 'Never paid']] as const).map(([k, label]) => (
                      <button key={k} type="button"
                        className={`ps-filter-chip${filters.paid === k ? ' is-on' : ''}`}
                        aria-pressed={filters.paid === k}
                        onClick={() => onChange({ ...filters, paid: k })}
                      >
                        {label}
                        <span className="ps-filter-chip-n">{previewCount({ paid: k })}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtering is live, so the count reports state rather than
                    promising an action, and the button only does what it says. */}
                <div className="ps-filter-foot">
                  <span style={{ flex: 1, fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {shown} of {rows.length} shown
                  </span>
                  <button type="button" className="ds-btn is-primary"
                    onClick={() => setOpen(false)}>
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="ps-active-filters">
          {filters.q.trim() && (
            <ActiveChip label={`“${filters.q.trim()}”`} onClear={() => onChange({ ...filters, q: '' })} />
          )}
          {filters.attention.map(k => (
            <ActiveChip key={k} label={ATTENTION[k].label}
              onClear={() => onChange({ ...filters, attention: toggle(filters.attention, k) })} />
          ))}
          {filters.plans.map(p => (
            <ActiveChip key={p} label={PLAN_LABEL[p] === '—' ? 'No plan' : PLAN_LABEL[p]}
              onClear={() => onChange({ ...filters, plans: toggle(filters.plans, p) })} />
          ))}
          {filters.statuses.map(s => (
            <ActiveChip key={s} label={s.replace('_', ' ').toLowerCase()}
              onClear={() => onChange({ ...filters, statuses: toggle(filters.statuses, s) })} />
          ))}
          {filters.paid !== 'ANY' && (
            <ActiveChip label={filters.paid === 'PAID' ? 'Has paid' : 'Never paid'}
              onClear={() => onChange({ ...filters, paid: 'ANY' })} />
          )}
          <button type="button" className="ds-btn is-ghost"
            style={{ padding: '2px 8px', fontSize: 11, height: 'auto' }}
            onClick={() => onChange(EMPTY_FILTERS)}>
            Clear all
          </button>
        </div>
      )}
    </>
  );
}

function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="ps-active-chip">
      {label}
      <button type="button" className="ps-active-chip-x" onClick={onClear} aria-label={`Remove filter ${label}`}>
        <X size={11} />
      </button>
    </span>
  );
}

// ── Invoice modal ──────────────────────────────────────────────────────────────

function InvoiceModal({ orgName, orgId, onClose }: {
  orgName: string; orgId: string; onClose: () => void;
}) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    platformApi.listInvoices(orgId)
      .then(setInvoices)
      .catch(e => setError(e?.response?.data?.message || 'Failed to load invoices'))
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <Modal title="Invoices" subtitle={orgName} onClose={onClose}>
      {loading && (
        <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--ink-tertiary)' }}>Loading…</div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--error)' }}>{error}</div>
      )}
      {!loading && !error && invoices.length === 0 && (
        <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--ink-tertiary)' }}>
          No invoices yet — org may not have a paid subscription.
        </div>
      )}
      {invoices.map((inv, i) => (
        <div key={inv.id}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                   padding: '10px 0', borderBottom: i < invoices.length - 1 ? '1px solid var(--border)' : 'none' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
              {inv.number || inv.id.slice(0, 14)}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{fmt(inv.date)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)', marginRight: 4 }}>
              {fmtAmount(inv.amountPaid, inv.currency)}
            </span>
            <span className={`ds-pill ${STATUS_PILL[inv.status?.toUpperCase()] ?? 'is-neutral'}`} style={{ fontSize: 10 }}>
              {inv.status}
            </span>
            {inv.pdfUrl && (
              <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="ds-table-row-action"
                style={{ textDecoration: 'none' }} title="Download PDF">
                <Download size={13} />
              </a>
            )}
            {inv.hostedUrl && (
              <a href={inv.hostedUrl} target="_blank" rel="noreferrer" className="ds-table-row-action"
                style={{ textDecoration: 'none' }} title="View on Stripe">
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      ))}
    </Modal>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ w, h, r = 6 }: { w?: string; h: number; r?: number }) {
  return <span className="ds-skel" style={{ width: w ?? '100%', height: h, borderRadius: r }} />;
}

function BillingSkeleton() {
  return (
    <motion.div className="db-skeleton" variants={stagger} initial="hidden" animate="show" role="status">
      <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <Skeleton w="140px" h={16} />
        <div style={{ display: 'flex', gap: 16 }}>
          <Skeleton w="70px" h={10} />
          <Skeleton w="70px" h={10} />
          <Skeleton w="90px" h={10} />
          <Skeleton w="100px" h={10} />
        </div>
      </motion.div>
      <div className="ds-card db-att-card">
        {[0,1,2,3,4].map(i => (
          <motion.div key={i} variants={fadeUp} className="db-att-row has-border">
            <Skeleton w="34px" h={34} r={8} /><Skeleton w="55%" h={13} /><Skeleton w="120px" h={22} r={10} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Platform Billing page ──────────────────────────────────────────────────────

export default function PlatformSubscriptions() {
  const [rows, setRows]           = useState<PlatformSubRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters]     = useState<Filters>(EMPTY_FILTERS);
  const [invoiceOrg, setInvoiceOrg] = useState<PlatformSubRow | null>(null);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [planEditOrg, setPlanEditOrg] = useState<PlatformSubRow | null>(null);
  const [planValue, setPlanValue] = useState<string>('NONE');
  const [drawerOrg, setDrawerOrg] = useState<PlatformSubRow | null>(null);
  const [drawerFlags, setDrawerFlags] = useState<FeatureFlag[]>([]);
  const [drawerFlagsLoading, setDrawerFlagsLoading] = useState(false);
  const [compOrg, setCompOrg]     = useState<PlatformSubRow | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await platformApi.listSubscriptions();
      if (aliveRef.current) setRows(r);
    } catch {
      if (aliveRef.current) setLoadError(true);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    load();
    return () => { aliveRef.current = false; };
  }, [load]);

  /**
   * Imports historical Stripe invoices into the local mirror. Idempotent, but it
   * walks the Stripe API once per customer, so it is a deliberate button rather
   * than something that fires on page load.
   */
  const handleBackfill = async () => {
    setBackfilling(true);
    setBackfillMsg(null);
    try {
      const imported = await platformApi.backfillInvoices();
      await load();
      if (aliveRef.current) {
        setBackfillMsg(imported > 0
          ? `Imported ${imported} invoice${imported === 1 ? '' : 's'} from Stripe.`
          : 'No invoices found in Stripe for any org.');
      }
    } catch {
      if (aliveRef.current) setBackfillMsg('Backfill failed — check Stripe configuration.');
    } finally {
      if (aliveRef.current) setBackfilling(false);
    }
  };

  const openPlanEdit = (row: PlatformSubRow) => {
    setPlanEditOrg(row);
    setPlanValue(row.plan);
  };

  const handleChangePlan = async (orgId: string, plan: string) => {
    setChangingPlan(orgId);
    try {
      await platformApi.changePlan(orgId, plan);
      await load();
      setPlanEditOrg(null);
    } finally {
      setChangingPlan(null);
    }
  };

  const openDrawer = async (row: PlatformSubRow) => {
    setDrawerOrg(row);
    setDrawerFlagsLoading(true);
    try {
      const flags = await featureFlagsApi.list(row.orgId);
      setDrawerFlags(flags);
    } finally {
      setDrawerFlagsLoading(false);
    }
  };

  const handleToggleFlag = async (orgId: string, flagKey: string, enabled: boolean) => {
    await featureFlagsApi.setOverride(orgId, flagKey, enabled);
    setDrawerFlags(await featureFlagsApi.list(orgId));
  };

  const handleResetFlag = async (orgId: string, flagKey: string) => {
    await featureFlagsApi.deleteOverride(orgId, flagKey);
    setDrawerFlags(await featureFlagsApi.list(orgId));
  };

  const counts = {
    total:    rows.length,
    active:   rows.filter(r => r.status === 'ACTIVE').length,
    trial:    rows.filter(r => r.status === 'TRIAL').length,
    pastDue:  rows.filter(r => r.status === 'PAST_DUE').length,
    cancelled:rows.filter(r => r.status === 'CANCELLED').length,
  };

  // Paise, summed across orgs. Zero until the invoice mirror has been backfilled,
  // which is what the Import button below exists to do.
  const totalCollected = rows.reduce((sum, r) => sum + (r.lifetimeRevenue ?? 0), 0);

  const visible = rows.filter(r => matches(r, filters));

  /** KPI cards and the attention panel are shortcuts into the same filter model. */
  const onlyStatus = (s: StatusKey) => setFilters({ ...EMPTY_FILTERS, statuses: [s] });
  const onlyAttention = (k: AttentionKey) => setFilters({ ...EMPTY_FILTERS, attention: [k] });

  const hasAttention = counts.pastDue > 0 || counts.cancelled > 0;

  return (
    <div className="db-root">
      {loadError && (
        <div className="db-error-banner" role="alert">
          <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
          <div className="db-error-body">
            <span className="db-error-title">Billing data could not be loaded.</span>
            <span className="db-error-sub">Check your connection or try refreshing.</span>
          </div>
          <button className="db-error-retry" onClick={load} aria-label="Retry">
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="db-content">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skel" exit={{ opacity: 0 }}><BillingSkeleton /></motion.div>
          ) : (
            <motion.div key="data" variants={stagger} initial="hidden" animate="show" className="db-inner">

              <div className="db-kpi-header">
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-tertiary)', margin: 0 }}>
                  You have <strong>{counts.total} organizations</strong>, with <span style={{ color: 'var(--success)', fontWeight: 500 }}>{counts.active} active</span> and <span style={{ color: 'var(--warning)', fontWeight: 500 }}>{counts.trial} on trial</span>.
                  {counts.pastDue > 0 ? (
                    <span> <button type="button" onClick={() => onlyStatus('PAST_DUE')} style={{ background: 'none', border: 'none', color: 'var(--danger)', textDecoration: 'underline', padding: 0, cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit', fontWeight: 500 }}>{counts.pastDue} past due</button>.</span>
                  ) : (
                    <span> All accounts are in good standing.</span>
                  )}
                  {totalCollected > 0 && (
                    <span> Total collected: <strong>{fmtAmount(totalCollected, 'INR')}</strong>.</span>
                  )}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button type="button"
                    style={{ padding: '0 16px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', background: 'var(--ink-solid)', color: 'var(--text-on-solid)', border: 'none', borderRadius: 'var(--radius-xs)', fontWeight: 500, letterSpacing:'0.02em', fontSize: 13, cursor: 'pointer' }}
                    onClick={handleBackfill} disabled={backfilling}
                    title="Import historical invoices from Stripe. Safe to re-run.">
                    {backfilling ? <Loader2 size={13} className="ds-spin" /> : <FileDown size={13} />}
                    {backfilling ? 'Importing…' : 'Import invoices'}
                  </button>
                  <FilterBar rows={rows} filters={filters} onChange={setFilters} />
                </div>
              </div>

              {backfillMsg && (
                <motion.div variants={fadeIn} initial="hidden" animate="show"
                  className="db-att-row" role="status"
                  style={{ marginBottom: 16, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                  {backfillMsg}
                </motion.div>
              )}

              {/* ── Needs attention ── */}
              {hasAttention && (
                <>
                  <p className="ds-section-label db-section-label">Needs attention</p>
                  <div className="ds-card db-att-card">
                    <motion.div variants={stagger} initial="hidden" animate="show">
                      {counts.pastDue > 0 && (
                        <motion.button variants={fadeUp} type="button"
                          className="db-att-row has-border is-urgent"
                          onClick={() => onlyAttention('failing')}
                          whileHover={{ scale: 1.025, zIndex: 2 }} whileTap={{ scale: 1.010, zIndex: 2 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                        >
                          <span className="db-att-chip is-urgent"><CreditCard size={15} /></span>
                          <span className="db-att-label">Past due payments</span>
                          <span className="db-att-right">
                            <span className="ds-pill is-error">{counts.pastDue}</span>
                          </span>
                          <ArrowUpRight size={14} className="db-att-arrow" />
                        </motion.button>
                      )}
                      {counts.cancelled > 0 && (
                        <motion.button variants={fadeUp} type="button"
                          className="db-att-row is-warn"
                          onClick={() => onlyStatus('CANCELLED')}
                          whileHover={{ scale: 1.025, zIndex: 2 }} whileTap={{ scale: 1.010, zIndex: 2 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                        >
                          <span className="db-att-chip is-warn"><Building2 size={15} /></span>
                          <span className="db-att-label">Cancelled subscriptions</span>
                          <span className="db-att-right">
                            <span className="ds-pill is-warn">{counts.cancelled}</span>
                          </span>
                          <ArrowUpRight size={14} className="db-att-arrow" />
                        </motion.button>
                      )}
                    </motion.div>
                  </div>
                </>
              )}

              {/* ── Subscriber list ── */}
              <motion.div variants={fadeUp} className="ds-table-card">
                <div className="ds-table-wrap">
                  <table className="ds-table is-no-row-hover ps-table">
                    <thead>
                      <tr>
                        <th>Organization</th>
                        <th>Plan</th>
                        <th>Status</th>
                        <th className="is-right">Collected</th>
                        <th>Period end</th>
                        <th className="is-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.length === 0 ? (
                        <tr>
                          <td colSpan={6}>
                            <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show">
                              <span className="ds-empty-icon"><Users size={20} /></span>
                              <span className="ds-empty-title">
                                {rows.length === 0 ? 'No subscribers yet' : 'Nothing matches'}
                              </span>
                              <span className="ds-empty-sub">
                                {rows.length === 0
                                  ? 'Organizations appear here once they sign up.'
                                  : 'Widen or clear the filters to see more organizations.'}
                              </span>
                              {rows.length > 0 && countActive(filters) > 0 && (
                                <div className="ds-empty-actions">
                                  <button type="button" className="ds-btn is-secondary"
                                    onClick={() => setFilters(EMPTY_FILTERS)}>
                                    Clear filters
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {visible.map(row => (
                            <SubRow key={row.orgId} row={row}
                              onInvoices={() => setInvoiceOrg(row)}
                              onOpenFlags={() => openDrawer(row)}
                              onEditPlan={() => openPlanEdit(row)}
                              onComp={() => setCompOrg(row)}
                            />
                          ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {compOrg && (
        <CompModal row={compOrg} onClose={() => setCompOrg(null)} onSaved={load} />
      )}

      {planEditOrg && (
        <Modal title="Change plan" subtitle={planEditOrg.orgName} onClose={() => setPlanEditOrg(null)}>
          <div className="ds-field" style={{ marginBottom: 4 }}>
            <label className="ds-label">Plan</label>
            <div className="ps-select-wrap">
              <select value={planValue} onChange={e => setPlanValue(e.target.value)}
                className="ds-select" style={{ width: '100%' }}>
                {PLAN_OPTIONS.map(p => <option key={p} value={p}>{PLAN_LABEL[p]}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-tertiary)', pointerEvents: 'none' }} />
            </div>
          </div>
          <ModalFooter onClose={() => setPlanEditOrg(null)}
            submitting={changingPlan === planEditOrg.orgId}
            onSubmit={() => handleChangePlan(planEditOrg.orgId, planValue)}
            label="Save plan" />
        </Modal>
      )}

      <AnimatePresence>
        {invoiceOrg && (
          <InvoiceModal
            key={invoiceOrg.orgId}
            orgId={invoiceOrg.orgId}
            orgName={invoiceOrg.orgName}
            onClose={() => setInvoiceOrg(null)}
          />
        )}
      </AnimatePresence>

      {drawerOrg && (
        <>
          <div className="ds-drawer-overlay" onClick={() => setDrawerOrg(null)} />
          <div className="ds-drawer is-sm" role="dialog" aria-modal="true">
            <div className="ds-drawer-header">
              <div>
                <div className="ds-drawer-title">{drawerOrg.orgName}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 2 }}>Feature flag overrides</div>
              </div>
              <button type="button" onClick={() => setDrawerOrg(null)} className="ds-drawer-close" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="ds-drawer-body">
              {drawerFlagsLoading ? (
                <div style={{ color: 'var(--ink-tertiary)', fontSize: 13 }}>Loading…</div>
              ) : (
                ['LUCIEN_AI', 'ADVANCED_REPORTS', 'CUSTOM_INTEGRATIONS'].map(key => {
                  const flag = drawerFlags.find(f => f.flagKey === key);
                  const enabled = flag?.enabled ?? false;
                  const isManual = flag?.source === 'MANUAL';
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '12px 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-primary)' }}>{key.replace(/_/g, ' ')}</span>
                        <span className={`ds-pill ${isManual ? 'is-warn' : 'is-neutral'}`} style={{ fontSize: 10, alignSelf: 'flex-start' }}>
                          {flag?.source ?? 'PLAN'}
                        </span>
                      </div>
                      <button type="button" onClick={() => handleToggleFlag(drawerOrg.orgId, key, !enabled)}
                        className="ds-table-row-action" title={enabled ? 'Disable' : 'Enable'}>
                        {enabled
                          ? <ToggleRight size={16} style={{ color: 'var(--success)' }} />
                          : <ToggleLeft size={16} />}
                      </button>
                      {isManual && (
                        <button type="button" onClick={() => handleResetFlag(drawerOrg.orgId, key)}
                          className="ds-table-row-action" title="Reset to plan default">
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
