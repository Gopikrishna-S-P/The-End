import { useState } from 'react';
import { Compass, Sun, Moon, Volume2, VolumeX, LayoutGrid, Keyboard, Sparkles, RotateCcw } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { apiClient } from '../client';
import { useDarkMode } from '../hooks/useDarkMode';
import { sounds } from '../utils/sounds';
import { TOPBAR_BUTTONS, topbarPrefs, useTopbarPrefs } from '../utils/topbarPrefs';
import { ACTIONS, keymap, useKeymapOverrides, formatBinding } from '../utils/keymap';
import { tour } from '../utils/tour';
import { SectionHeader } from './ProfileSettingsSectionHeader';
import '../components/TopbarCustomizeDialog.css';

function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <label className={`app-topbar-custom-toggle${checked ? ' is-on' : ''}${disabled ? ' is-protected' : ''}`} aria-label={label} style={{ pointerEvents: 'none' }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="app-topbar-custom-toggle-track" aria-hidden="true">
        <span className="app-topbar-custom-toggle-knob" />
      </span>
    </label>
  );
}

function Row({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '12px 16px',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none'
      }}
    >
      {children}
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export function ProfileGeneralSection({ onClose }: Props) {
  const { refreshAuth } = useAuth();
  const isDark = useDarkMode();
  const [soundOn, setSoundOn] = useState(() => sounds.isEnabled());
  const topbarHidden = useTopbarPrefs();
  useKeymapOverrides(); // re-render this section whenever a shortcut binding changes

  async function toggleDarkMode(next: boolean) {
    const mode = next ? 'dark' : 'light';
    window.dispatchEvent(new CustomEvent('rp-set-theme', { detail: mode }));
    sounds.play('toggle');
    try {
      await apiClient.patch('/api/v1/users/me/preferences', { theme: mode });
      await refreshAuth();
    } catch { /* dark mode already applied locally; server sync is best-effort */ }
  }

  function toggleSound(next: boolean) {
    sounds.setEnabled(next);
    setSoundOn(next);
    if (next) sounds.play('toggle');
  }

  function restartTour() {
    onClose();
    tour.start();
  }

  return (
    <section className="ps-section" aria-label="General">
      <SectionHeader icon={<Compass size={18} />} title="General" sub="App-wide preferences" />
      <div className="ps-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="ps-section-sub" style={{ marginTop: 0 }}>Appearance</span>

          <Row onClick={() => toggleDarkMode(!isDark)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
              {isDark ? <Moon size={15} /> : <Sun size={15} />} Dark mode
            </span>
            <Toggle checked={isDark} onChange={toggleDarkMode} label="Dark mode" />
          </Row>

        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="ps-section-sub" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 6 }}><Keyboard size={12} /> Keyboard shortcuts</span>
            <button type="button" onClick={() => keymap.resetAll()} className="ds-btn is-secondary" style={{ height: 26, padding: '0 10px', fontSize: 11.5 }}>
              <RotateCcw size={11} /> Reset
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ACTIONS.map(a => (
              <Row key={a.id}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>{a.label}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>{a.description}</span>
                </div>
                <kbd style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>
                  {formatBinding(keymap.getBinding(a.id))}
                </kbd>
              </Row>
            ))}
          </div>
        </div>

        <Row>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
            <Sparkles size={15} /> Product tour
          </span>
          <button type="button" onClick={restartTour} className="ds-btn is-secondary">
            Restart tour
          </button>
        </Row>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <span className="ps-section-sub" style={{ marginTop: 0 }}>Support</span>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '16px',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            background: 'var(--bg-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
                <Compass size={15} /> support@recoverpro.in
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="ds-btn is-secondary"
                  style={{ height: 30, fontSize: '11.5px', padding: '0 10px' }}
                  onClick={() => {
                    navigator.clipboard.writeText('support@recoverpro.in');
                    alert('Email copied to clipboard!');
                  }}
                >
                  Copy Email
                </button>
                <button
                  type="button"
                  className="ds-btn"
                  style={{ height: 30, fontSize: '11.5px', background: 'var(--ink-solid)', color: 'var(--text-on-solid)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0 12px', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    window.open('mailto:support@recoverpro.in');
                  }}
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
