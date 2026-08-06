import { Shield, AlertCircle, BadgeCheck } from 'lucide-react';
import { type UserProfile, ROLE_LABELS, getInitials } from './ProfileSettingsTypes';

interface Props {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

export function ProfileOverviewSection({ profile, isLoading, error }: Props) {
  return (
    <section className="ps-section">
      <div className="ps-section-body" style={{ paddingTop: 8 }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="ds-skel" style={{ width: 56, height: 56, borderRadius: 14 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              <div className="ds-skel" style={{ height: 18, width: 160 }} />
              <div className="ds-skel" style={{ height: 14, width: 220 }} />
              <div className="ds-skel" style={{ height: 18, width: 90, borderRadius: 999 }} />
            </div>
          </div>
        ) : error ? (
          <div className="db-error-banner" role="alert" style={{ margin: 0 }}>
            <AlertCircle size={16} className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">{error}</span>
            </div>
          </div>
        ) : profile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--ink-solid)', color: 'var(--text-on-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name} style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' }} /> : getInitials(profile.name)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-primary)' }}>{profile.name || '—'}</span>
              <span style={{ fontSize: 14, color: 'var(--ink-secondary)' }}>{profile.email}</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <span className="ds-pill is-info">
                  <BadgeCheck size={11} style={{ marginRight: 4 }} />{ROLE_LABELS[profile.role] ?? profile.role}
                </span>
                {profile.mfaEnabled && <span className="ds-pill is-success"><Shield size={11} style={{ marginRight: 4 }} /> MFA On</span>}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
