import { KeyRound, Shield, ChevronRight } from 'lucide-react';
import { type UserProfile } from './ProfileSettingsTypes';
import { SectionHeader } from './ProfileSettingsSectionHeader';

interface Props {
  profile: UserProfile | undefined;
  onNavigate: () => void;
}

export function ProfileSecuritySection({ profile, onNavigate }: Props) {
  return (
    <section className="ps-section">
      <SectionHeader icon={<KeyRound size={18} />} title="Security" sub="Extra protection for your account" />
      <div className="ps-section-body">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', border: `1px solid ${profile?.mfaEnabled ? 'var(--success-subtle)' : 'var(--border-subtle)'}`, borderRadius: 12, background: profile?.mfaEnabled ? 'color-mix(in srgb, var(--success) 4%, transparent)' : 'transparent' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            <div style={{ color: profile?.mfaEnabled ? 'var(--success)' : 'var(--ink-tertiary)', flexShrink: 0 }}><Shield size={20} /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>Two-factor authentication</span>
              <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
                {profile?.mfaEnabled ? 'Active — your account is protected' : 'Not enabled — add extra security'}
              </span>
            </div>
          </div>
          <a href="/settings/mfa" onClick={onNavigate} className={`ds-btn ${profile?.mfaEnabled ? 'is-secondary' : 'is-primary'}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
            {profile?.mfaEnabled ? 'Manage' : 'Enable'} <ChevronRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}
