import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';

interface FeatureGateProps {
  flagKey: string;
  children: React.ReactNode;
  hardBlock?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  LUCIEN_AI: 'Lucien AI',
  ADVANCED_REPORTS: 'Advanced Reports',
  CUSTOM_INTEGRATIONS: 'Custom Integrations',
};

export function FeatureGate({ flagKey, children, hardBlock = false }: FeatureGateProps) {
  const { isEnabled, requiredPlan } = useFeatureFlags();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  if (isEnabled(flagKey)) return <>{children}</>;

  const plan = requiredPlan(flagKey);
  const label = FEATURE_LABELS[flagKey] ?? flagKey;

  if (hardBlock) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', padding: '32px'
      }}>
        <div style={{
          background: 'var(--surface, #1a1a1a)', border: '1px solid var(--border, #2a2a2a)',
          borderRadius: '12px', padding: '40px 48px', maxWidth: '420px',
          textAlign: 'center', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: '16px'
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Lock size={22} style={{ color: 'var(--muted, #777)' }} />
          </div>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 600 }}>
              {label} requires {plan}
            </h2>
            <p style={{ margin: 0, color: 'var(--muted, #888)', fontSize: '13px', lineHeight: 1.55 }}>
              Upgrade your plan to unlock this feature for your organization.
            </p>
          </div>
          <button
            onClick={() => navigate('/app/subscription')}
            style={{
              marginTop: '4px', background: 'var(--ink-solid)', color: 'var(--text-on-solid)',
              border: 'none', borderRadius: '8px', padding: '10px 28px',
              cursor: 'pointer', fontSize: '14px', fontWeight: 500
            }}
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        title={`Upgrade to ${plan} to unlock`}
        style={{ position: 'relative', cursor: 'pointer', opacity: 0.4, pointerEvents: 'all', userSelect: 'none' }}
      >
        {children}
        <span style={{
          position: 'absolute', top: 4, right: 4,
          background: 'rgba(0,0,0,0.65)', borderRadius: '4px', padding: '2px 5px',
          display: 'inline-flex', alignItems: 'center'
        }}>
          <Lock size={9} style={{ color: '#aaa' }} />
        </span>
      </div>

      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface, #1a1a1a)', border: '1px solid var(--border, #2a2a2a)',
              borderRadius: '12px', padding: '28px 32px', maxWidth: '360px', width: '90%',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '14px', textAlign: 'center'
            }}
          >
            <Lock size={26} style={{ color: 'var(--muted, #777)' }} />
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 600 }}>
                Upgrade to {plan}
              </h3>
              <p style={{ margin: 0, color: 'var(--muted, #888)', fontSize: '13px', lineHeight: 1.5 }}>
                {label} is included in the {plan} plan. Upgrade to unlock it for your organization.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1, background: 'transparent',
                  border: '1px solid var(--border, #333)', borderRadius: '8px',
                  padding: '9px', cursor: 'pointer', fontSize: '13px', color: 'inherit'
                }}
              >
                Not now
              </button>
              <button
                onClick={() => { setShowModal(false); navigate('/app/subscription'); }}
                style={{
                  flex: 1, background: 'var(--ink-solid)', color: 'var(--text-on-solid)',
                  border: 'none', borderRadius: '8px', padding: '9px',
                  cursor: 'pointer', fontSize: '13px', fontWeight: 500
                }}
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
