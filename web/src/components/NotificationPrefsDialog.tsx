import { useEffect, useRef, useState } from 'react';
import {
  X, Bell, UserCheck, Clock,
  Volume2, Monitor, Mail, RefreshCcw, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useNotificationPrefs, notificationPrefs, type NotifChannel } from '../utils/notificationPrefs';
import { getDesktopPermission, requestDesktopPermission } from '../utils/notificationDispatch';
import type { NotifType } from '../utils/notifications';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './NotificationPrefsDialog.css';

interface NotificationPrefsDialogProps {
  onClose: () => void;
}

const TYPE_LABELS: Array<{ type: NotifType; label: string; icon: React.ElementType }> = [
  { type: 'assignment', label: 'Assignments', icon: UserCheck  },
  { type: 'deadline',   label: 'Deadlines',   icon: Clock      },
  { type: 'system',     label: 'System',      icon: Bell       },
];

const CHANNEL_LABELS: Array<{ key: NotifChannel; label: string; icon: React.ElementType; description: string }> = [
  { key: 'sound',   label: 'Sound',    icon: Volume2, description: 'Play a tone when the notification arrives.' },
  { key: 'desktop', label: 'Desktop',  icon: Monitor, description: 'Native browser notification when the tab is hidden.' },
  { key: 'email',   label: 'Email',    icon: Mail,    description: 'Send a summary email (backend not yet wired).' },
];

export default function NotificationPrefsDialog({ onClose }: NotificationPrefsDialogProps) {
  const prefs = useNotificationPrefs();
  const [permission, setPermission] = useState(getDesktopPermission());
  const [requesting, setRequesting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  /* If permission state changes elsewhere (e.g. browser settings), keep in sync */
  useEffect(() => {
    const id = window.setInterval(() => {
      setPermission(getDesktopPermission());
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const anyDesktopWanted = TYPE_LABELS.some(t => prefs[t.type].desktop);
  const showPermissionBanner =
    anyDesktopWanted && permission !== 'granted' && permission !== 'unsupported';
  const desktopDenied = permission === 'denied';
  const desktopUnsupported = permission === 'unsupported';

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const result = await requestDesktopPermission();
      setPermission(result);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div
      className="app-prefs-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Notification preferences"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="app-prefs-dialog" ref={dialogRef} tabIndex={-1}>
        <header className="app-prefs-header">
          <div className="app-prefs-title">
            <Bell size={14} aria-hidden="true" />
            <span>Notification preferences</span>
          </div>
          <button
            type="button"
            className="app-prefs-close"
            aria-label="Close preferences"
            onClick={onClose}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </header>

        {showPermissionBanner && (
          <div className="app-prefs-banner">
            <AlertCircle size={14} aria-hidden="true" />
            <div className="app-prefs-banner-body">
              <strong>Allow desktop notifications</strong>
              <span>
                Your browser must grant permission for desktop notifications to fire.
              </span>
            </div>
            <button
              type="button"
              className="app-prefs-banner-btn"
              onClick={handleRequestPermission}
              disabled={requesting}
            >
              {requesting ? 'Requesting…' : 'Enable'}
            </button>
          </div>
        )}

        {permission === 'granted' && anyDesktopWanted && (
          <div className="app-prefs-banner is-success">
            <CheckCircle2 size={14} aria-hidden="true" />
            <div className="app-prefs-banner-body">
              <strong>Desktop notifications active</strong>
              <span>You'll get a native popup when the tab is in the background.</span>
            </div>
          </div>
        )}

        {desktopDenied && (
          <div className="app-prefs-banner is-warning">
            <AlertCircle size={14} aria-hidden="true" />
            <div className="app-prefs-banner-body">
              <strong>Desktop notifications blocked</strong>
              <span>Re-enable them in your browser's site settings to use this channel.</span>
            </div>
          </div>
        )}

        <div className="app-prefs-table" role="grid">
          <div className="app-prefs-row app-prefs-row-header" role="row">
            <span role="columnheader" className="app-prefs-cell-type">Type</span>
            {CHANNEL_LABELS.map(c => {
              const Icon = c.icon;
              return (
                <span
                  key={c.key}
                  role="columnheader"
                  className="app-prefs-cell-channel"
                  title={c.description}
                >
                  <Icon size={11} aria-hidden="true" />
                  <span>{c.label}</span>
                </span>
              );
            })}
          </div>

          {TYPE_LABELS.map(({ type, label, icon: Icon }) => (
            <div className="app-prefs-row" key={type} role="row">
              <span role="rowheader" className={`app-prefs-cell-type tone-${type}`}>
                <Icon size={13} aria-hidden="true" />
                <span>{label}</span>
              </span>
              {CHANNEL_LABELS.map(c => {
                const checked = prefs[type][c.key];
                const isEmail = c.key === 'email';
                const isDesktopDisabled = c.key === 'desktop' && desktopUnsupported;
                return (
                  <label
                    key={c.key}
                    className={`app-prefs-toggle${checked ? ' is-on' : ''}${isDesktopDisabled ? ' is-disabled' : ''}`}
                    role="gridcell"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isDesktopDisabled}
                      onChange={(e) => notificationPrefs.set(type, c.key, e.target.checked)}
                      aria-label={`${label} – ${c.label}`}
                    />
                    <span className="app-prefs-toggle-track" aria-hidden="true">
                      <span className="app-prefs-toggle-thumb" />
                    </span>
                    {isEmail && checked && (
                      <span className="app-prefs-toggle-hint">stub</span>
                    )}
                  </label>
                );
              })}
            </div>
          ))}
        </div>

        <footer className="app-prefs-footer">
          <button
            type="button"
            className="app-prefs-reset"
            onClick={() => notificationPrefs.reset()}
          >
            <RefreshCcw size={11} aria-hidden="true" />
            Reset to defaults
          </button>
          <span className="app-prefs-footer-hint">
            Changes save automatically.
          </span>
        </footer>
      </div>
    </div>
  );
}
