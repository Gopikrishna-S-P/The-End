import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ArrowUpRight, Clock, CreditCard } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import './SubscriptionBanner.css';

const SNOOZE_KEY = 'rp-sub-expired-snoozed-until';
const SNOOZE_MS  = 30 * 60 * 1000;

export default function SubscriptionBanner() {
  const navigate = useNavigate();
  const { sub, loading, isExpired, isTrial, isPlatformAdmin } = useSubscription();
  const [visible, setVisible] = useState(false);
  const [trialVisible, setTrialVisible] = useState(false);

  useEffect(() => {
    if (!isExpired) { setVisible(false); return; }
    const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    if (snoozedUntil && snoozedUntil > Date.now()) {
      setVisible(false);
      const t = window.setTimeout(() => setVisible(true), snoozedUntil - Date.now());
      return () => window.clearTimeout(t);
    }
    setVisible(true);
  }, [isExpired]);

  const snooze = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch {}
    setVisible(false);
  };

  useEffect(() => {
    if (!sub || !isTrial || sub.trialDaysLeft > 7) {
      setTrialVisible(false);
      return;
    }
    const snoozedUntil = Number(localStorage.getItem('rp-trial-snoozed-until') ?? 0);
    if (snoozedUntil > Date.now()) {
      setTrialVisible(false);
      const t = window.setTimeout(() => setTrialVisible(true), snoozedUntil - Date.now());
      return () => window.clearTimeout(t);
    }
    setTrialVisible(true);
  }, [sub, isTrial]);

  const dismissTrial = () => {
    try { localStorage.setItem('rp-trial-snoozed-until', String(Date.now() + 60 * 60 * 1000)); } catch {}
    setTrialVisible(false);
  };

  const renew = () => {
    snooze();
    navigate('/app/subscription');
  };

  if (loading || isPlatformAdmin || !sub) return null;

  const isPastDue = sub.status === 'PAST_DUE';

  if (isExpired && visible) {
    return createPortal(
      <div className="sub-wall-overlay" role="dialog" aria-modal="true" aria-label="Subscription required"
        onClick={e => { if (e.target === e.currentTarget) snooze(); }}>
        <div className="sub-wall-card">
          <button type="button" className="sub-wall-close" onClick={snooze} aria-label="Dismiss">
            <X size={14} />
          </button>
          <div className="sub-wall-icon">
            <CreditCard size={22} />
          </div>
          <h2 className="sub-wall-title">
            {isPastDue ? 'Payment failed' : 'Subscription expired'}
          </h2>
          <p className="sub-wall-body">
            {isPastDue
              ? "We couldn't process your last payment. Update your billing details to restore full access."
              : 'Your subscription has ended. Renew to continue using all features.'}
          </p>
          <button type="button" className="sub-wall-btn" onClick={renew}>
            {isPastDue ? 'Update billing' : 'Renew subscription'}
            <ArrowUpRight size={14} />
          </button>
          <p className="sub-wall-hint">This reminder appears every 30 minutes.</p>
        </div>
      </div>,
      document.body,
    );
  }

  if (trialVisible) {
    return (
      <div className="sub-banner is-trial" role="status">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={16} className="sub-banner-icon" aria-hidden="true" />
          <span className="sub-banner-text">
            {sub!.trialDaysLeft <= 0 ? (
              <>Your free trial has <strong>ended</strong>. Please upgrade your subscription immediately to continue using Recoverpro and keep access to all premium features without interruption.</>
            ) : (
              <>Your free trial ends in <strong>{sub!.trialDaysLeft} day{sub!.trialDaysLeft !== 1 ? 's' : ''}</strong>. Upgrade your subscription today to ensure uninterrupted access to all your data and premium features.</>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 24 }}>
          <button type="button" className="sub-banner-btn" onClick={() => navigate('/app/subscription')}>
            Upgrade <ArrowUpRight size={11} />
          </button>
        </div>
        <button type="button" className="sub-banner-dismiss" onClick={dismissTrial} aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    );
  }

  return null;
}
