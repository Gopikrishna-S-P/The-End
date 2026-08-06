import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  CheckCircle2, Zap, ArrowUpRight, Loader2,
  AlertTriangle, Crown, Clock, CreditCard, ExternalLink, X
} from 'lucide-react';
import { subscriptionApi, PLANS, type SubscriptionInfo, type PlanInfo } from '../api/subscriptionApi';
import { usePermissions } from '../hooks/usePermissions';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import '../styles/AppPage.css';
import './Dashboard.css';
import './SubscriptionPage.css';

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
};

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status?: string }) {
  const cls = {
    TRIAL:    'is-warn',
    ACTIVE:   'is-success',
    PAST_DUE: 'is-danger',
    CANCELLED:'is-neutral',
    INACTIVE: 'is-neutral',
  }[status ?? ''] ?? 'is-neutral';
  return <span className={`ds-pill ${cls}`}>{status ?? '—'}</span>;
}

function PlanCard({ plan, current, canManage, onSelect, loading }: {
  plan: PlanInfo; current?: string; canManage: boolean;
  onSelect: (key: string) => void; loading: boolean;
}) {
  const isCurrent = current === plan.key;
  return (
    <motion.div variants={fadeUp} className="ds-card db-card" style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', border: isCurrent ? '2px solid var(--ink-solid)' : plan.highlighted ? '2px solid var(--info)' : '1px solid var(--border-subtle)' }}>
      {plan.highlighted && <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 12px', background: 'var(--info-subtle)', color: 'var(--info)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottomLeftRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={10} />Most popular</div>}
      {isCurrent && <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 12px', background: 'var(--ink-solid)', color: 'var(--text-on-solid)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottomLeftRadius: 8, display: 'flex', alignItems: 'center', gap: 4 }}><Crown size={10} />Current plan</div>}
      
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-primary)', marginBottom: 8, display: 'block' }}>{plan.name}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
        <span style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>{plan.price}</span>
        <span style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>/{plan.priceNote.replace('per ', '')}</span>
      </div>
      
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {plan.features.map(f => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.4 }}>
            <CheckCircle2 size={14} style={{ color: plan.highlighted ? 'var(--info)' : 'var(--success)', flexShrink: 0, marginTop: 2 }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      
      {canManage && (
        <button
          type="button"
          className={`ds-btn ${plan.highlighted ? 'is-primary' : isCurrent ? 'is-secondary' : 'is-primary'}`}
          style={isCurrent ? { width: '100%', marginTop: 24, height: 40, opacity: 0.6 } : { width: '100%', marginTop: 24, height: 40 }}
          onClick={() => onSelect(plan.key)}
          disabled={isCurrent || loading}
        >
          {loading ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : null}
          {isCurrent ? 'Current plan' : 'Choose plan'}
          {!isCurrent && !loading && <ArrowUpRight size={14} style={{ marginLeft: 6 }} />}
        </button>
      )}
    </motion.div>
  );
}

export default function SubscriptionPage() {
  const location = useLocation();
  const { hasRole } = usePermissions();
  const canManage = hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN');
  const { flags } = useFeatureFlags();
  const GATED_FLAGS = [
    { key: 'LUCIEN_AI',           label: 'Lucien AI' },
    { key: 'ADVANCED_REPORTS',    label: 'Advanced Reports' },
    { key: 'CUSTOM_INTEGRATIONS', label: 'Custom Integrations' },
  ];

  const [sub,      setSub]      = useState<SubscriptionInfo | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [btnLoad,  setBtnLoad]  = useState<string | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  const checkoutStatus = new URLSearchParams(location.search).get('checkout');

  useEffect(() => {
    subscriptionApi.get().then(setSub).catch(() => setSub(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (checkoutStatus === 'success') setToast({ msg: 'Payment successful — subscription activated!', ok: true });
    if (checkoutStatus === 'cancel')  setToast({ msg: 'Checkout cancelled — no charge made.', ok: false });
  }, [checkoutStatus]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handlePlan(plan: string) {
    setBtnLoad(plan);
    try {
      if (plan === 'STARTER') {
        await subscriptionApi.selectFree();
        window.location.reload();
        return;
      }
      const url = await subscriptionApi.checkout(plan);
      window.location.href = url;
    } catch {
      setToast({ msg: 'Could not start checkout — check Stripe config.', ok: false });
      setBtnLoad(null);
    }
  }

  async function handlePortal() {
    setBtnLoad('portal');
    try {
      const url = await subscriptionApi.portal();
      window.location.href = url;
    } catch {
      setToast({ msg: 'Could not open billing portal — check Stripe config.', ok: false });
      setBtnLoad(null);
    }
  }

  const currentPlan = sub?.plan !== 'NONE' ? sub?.plan : undefined;

  return (
    <div className="db-root">
      <AnimatePresence>
        {toast && (
          <motion.div key="toast" className={`ds-toast is-${toast.ok ? 'ok' : 'err'}`} role="status"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
            onClick={() => setToast(null)}>
            {toast.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{toast.msg}</span>
            <X size={13} className="ds-toast-x" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ maxWidth: 960 }}>
          <header className="db-card-head" style={{ marginBottom: 20, padding: 0, background: 'transparent', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h2 className="db-card-title" style={{ fontSize: 20 }}>Billing & Plans</h2>
              </div>
            </div>
          </header>
          
          {sub?.status === 'PAST_DUE' && (
            <motion.div variants={fadeUp} className="db-att-row is-warn" style={{ marginBottom: 24, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
                <span style={{ fontSize: 13, color: 'var(--ink-primary)', fontWeight: 600 }}>Payment failed — update your payment method to avoid service interruption.</span>
              </div>
              {canManage && sub.hasStripeCustomer && (
                <button type="button" className="ds-btn is-secondary" onClick={handlePortal}>Update payment</button>
              )}
            </motion.div>
          )}

          {!loading && sub && (
            <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginBottom: 32 }}>
              <div className="db-card-body" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
                <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="db-kpi2-foot-meta">Subscription Status</span>
                    <StatusBadge status={sub.status} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="db-kpi2-foot-meta">Current Plan</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)' }}>{sub.plan === 'NONE' ? 'No active plan' : sub.plan.charAt(0) + sub.plan.slice(1).toLowerCase()}</span>
                  </div>
                  {sub.status === 'TRIAL' && sub.trialEndsAt && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span className="db-kpi2-foot-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> Trial ends</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--warning)' }}>
                        {fmtDate(sub.trialEndsAt)}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink-tertiary)', marginLeft: 6 }}>({sub.trialDaysLeft} day{sub.trialDaysLeft !== 1 ? 's' : ''} left)</span>
                      </span>
                    </div>
                  )}
                  {sub.currentPeriodEnd && sub.status === 'ACTIVE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <span className="db-kpi2-foot-meta">{sub.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>{fmtDate(sub.currentPeriodEnd)}</span>
                    </div>
                  )}
                </div>
                {canManage && sub.hasStripeCustomer && sub.status === 'ACTIVE' && (
                  <button type="button" className="ds-btn is-secondary" onClick={handlePortal} disabled={btnLoad === 'portal'} style={{ height: 36 }}>
                    {btnLoad === 'portal' ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <CreditCard size={14} style={{ marginRight: 6 }} />}
                    Manage billing
                    <ExternalLink size={13} style={{ marginLeft: 6, color: 'var(--ink-tertiary)' }} />
                  </button>
                )}
              </div>
            </motion.section>
          )}

          <div style={{ marginBottom: 32 }}>
            <h2 className="db-section-label" style={{ marginBottom: 16 }}>Available Plans</h2>
            <div style={{ display: 'flex', gap: 24, alignItems: 'stretch' }}>
              {PLANS.map(plan => (
                <PlanCard
                  key={plan.key}
                  plan={plan}
                  current={currentPlan}
                  canManage={canManage}
                  onSelect={handlePlan}
                  loading={btnLoad === plan.key}
                />
              ))}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', textAlign: 'center', marginTop: 16 }}>
              All plans include a 14-day free trial. Cancel anytime. Prices exclude GST.
            </p>
          </div>

          <motion.section variants={fadeUp} className="ds-card db-card">
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="db-card-title">Included Features</h2>
            </header>
            <div className="ds-table-wrap" style={{ border: 'none' }}>
              <table className="ds-table">
                <tbody>
                  {GATED_FLAGS.map(({ key, label }, idx) => {
                    const flag = flags.find(f => f.flagKey === key);
                    const enabled = flag?.enabled ?? false;
                    return (
                      <tr key={key} style={{ borderBottom: idx === GATED_FLAGS.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--ink-primary)' }}>{label}</td>
                        <td className="is-right" style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: enabled ? 'var(--success)' : 'var(--ink-tertiary)' }}>
                              {enabled ? <CheckCircle2 size={14} /> : <X size={14} />}
                              {enabled ? 'Active' : 'Not included'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.section>

        </motion.div>
      </div>
    </div>
  );
}
