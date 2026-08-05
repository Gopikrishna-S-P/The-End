import { useEffect, useState } from 'react';
import { CreditCard, Loader2, ChevronDown, ChevronUp, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { subscriptionApi, PLANS, type SubscriptionInfo } from '../api/subscriptionApi';
import { usePermissions } from '../hooks/usePermissions';
import { SectionHeader } from './ProfileSettingsSectionHeader';
import '../pages/Dashboard.css';

function fmtDate(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
}

export function ProfileBillingSection() {
  const { hasRole } = usePermissions();
  const canManage = hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN');

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    subscriptionApi.get()
      .then(s => { if (!cancelled) setSub(s); })
      .catch(() => { if (!cancelled) setSub(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleChoosePlan(planKey: string) {
    setCheckoutLoading(planKey);
    setActionError(null);
    try {
      if (planKey === 'STARTER') {
        await subscriptionApi.selectFree();
        window.location.reload();
        return;
      }
      const url = await subscriptionApi.checkout(planKey);
      window.location.href = url;
    } catch {
      setActionError('Could not start checkout — check Stripe config.');
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setActionError(null);
    try {
      const url = await subscriptionApi.portal();
      window.location.href = url;
    } catch {
      setActionError('Could not open billing portal — check Stripe config.');
      setPortalLoading(false);
    }
  }

  const plan = sub && sub.plan !== 'NONE' ? PLANS.find(p => p.key === sub.plan) : undefined;

  return (
    <section className="ps-section" aria-label="Billing">
      <SectionHeader icon={<CreditCard size={18} />} title="Billing" sub="Your plan and payment details" />
      <div className="ps-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="ds-skel" style={{ height: 18, width: 140 }} />
            <div className="ds-skel" style={{ height: 14, width: 200 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', border: '1px solid var(--border-subtle)', borderRadius: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-primary)' }}>
                  {plan ? `${plan.name} plan` : 'No active plan'}
                </span>
                {plan && !plan.free && (
                  <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>Monthly</span>
                )}
                {sub?.status === 'TRIAL' && sub.trialEndsAt && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--warning)' }}>
                    <Clock size={11} /> Trial ends {fmtDate(sub.trialEndsAt)}
                  </span>
                )}
                {sub?.status === 'ACTIVE' && sub.currentPeriodEnd && (
                  <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
                    {sub.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on {fmtDate(sub.currentPeriodEnd)}
                  </span>
                )}
              </div>
              {canManage && (
                <button type="button" onClick={() => setShowPlans(v => !v)} className="ds-btn is-secondary" style={{ flexShrink: 0 }}>
                  Adjust plan {showPlans ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
            </div>

            {showPlans && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PLANS.map(p => {
                  const isCurrent = sub?.plan === p.key;
                  return (
                    <div key={p.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 16px', border: `1px solid ${isCurrent ? 'var(--ink-solid)' : 'var(--border-subtle)'}`, borderRadius: 10, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-primary)' }}>{p.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)' }}>{p.price}{!p.free && `/${p.priceNote.replace('per ', '')}`}</span>
                      </div>
                      {isCurrent ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--success)', flexShrink: 0 }}>
                          <CheckCircle2 size={13} /> Current plan
                        </span>
                      ) : (
                        <button type="button" onClick={() => handleChoosePlan(p.key)} disabled={checkoutLoading !== null} className="ds-btn is-primary" style={{ flexShrink: 0, height: 32 }}>
                          {checkoutLoading === p.key ? <Loader2 size={13} className="ds-spin" /> : null}
                          Choose plan
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {canManage && sub?.hasStripeCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="ps-section-sub" style={{ marginTop: 0 }}>Payment</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 20px', border: '1px solid var(--border-subtle)', borderRadius: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>Manage your payment method and view invoices in Stripe.</span>
              <button type="button" onClick={handlePortal} disabled={portalLoading} className="ds-btn is-secondary" style={{ flexShrink: 0 }}>
                {portalLoading ? <Loader2 size={14} className="ds-spin" /> : null}
                Manage billing <ExternalLink size={13} />
              </button>
            </div>
          </div>
        )}

        {actionError && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{actionError}</span>}
      </div>
    </section>
  );
}
