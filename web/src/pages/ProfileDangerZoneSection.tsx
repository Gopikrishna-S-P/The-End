import { LogOut } from 'lucide-react';
import { SectionHeader } from './ProfileSettingsSectionHeader';

interface Props {
  onRequestLogout: () => void;
}

export function ProfileDangerZoneSection({ onRequestLogout }: Props) {
  return (
    <section className="ps-section">
      <SectionHeader icon={<LogOut size={18} />} title="Danger Zone" sub="Manage your active session" tone="danger" />
      <div className="ps-section-body">
        <div style={{ padding: '18px 20px', border: '1px solid var(--danger-subtle)', borderRadius: 12, background: 'color-mix(in srgb, var(--danger) 3%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)' }}>Sign out of this device</span>
            <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>You'll need to sign in again to access Recoverpro.</span>
          </div>
          <button type="button" onClick={onRequestLogout}
            className="ds-btn is-primary" style={{ background: 'var(--danger)', color: '#fff', border: 'none', flexShrink: 0 }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
