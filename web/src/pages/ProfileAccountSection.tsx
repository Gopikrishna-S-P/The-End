import { Building2, Mail, Phone } from 'lucide-react';
import { type UserProfile } from './ProfileSettingsTypes';
import { SectionHeader } from './ProfileSettingsSectionHeader';

interface Props {
  profile: UserProfile;
}

export function ProfileAccountSection({ profile }: Props) {
  if (!profile.phone && !profile.agency) return null;

  return (
    <section className="ps-section">
      <SectionHeader icon={<Mail size={18} />} title="Account" sub="Contact and organization details" />
      <div className="ps-section-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, background: 'var(--bg-subtle)', padding: 20, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
          {profile.phone && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="ps-section-sub">Phone number</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}><Phone size={13} style={{ color: 'var(--ink-tertiary)' }}/>{profile.phone}</span>
            </div>
          )}
          {profile.agency && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="ps-section-sub">Agency</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}><Building2 size={13} style={{ color: 'var(--ink-tertiary)' }}/>{profile.agency}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
