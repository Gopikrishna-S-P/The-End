import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCheck, Inbox } from 'lucide-react';
import { notifications, useNotifications } from '../utils/notifications';
import { confetti } from '../utils/confetti';
import { NotifItem } from './NotifItem';
import { Logo } from './Logo';
import './TopbarCustomizeDialog.css';
import './NotificationPanel.css';

interface NotificationPanelProps {
  onClose: () => void;
  onNavigate?: (to: string) => void;
}

export default function NotificationPanel({ onClose, onNavigate }: NotificationPanelProps) {
  const list = useNotifications();
  const [snoozeOpenId, setSnoozeOpenId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const now = Date.now();
    return list.filter(n => !n.snoozedUntil || new Date(n.snoozedUntil).getTime() <= now);
  }, [list]);

  const unreadCount = useMemo(() => visible.filter(n => !n.read).length, [visible]);

  return createPortal(
    <div className="app-topbar-custom-backdrop" role="dialog" aria-modal="true" aria-label="Notifications" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="app-topbar-custom-dialog">
        <div className="app-topbar-custom-header">
          <div className="app-topbar-custom-title">
            <Bell size={14} aria-hidden="true" />
            <span id="rp-topbar-custom-title">Notifications</span>
            {unreadCount > 0 && (
              <span style={{
                background: 'color-mix(in srgb, var(--text-primary) 8%, transparent)', padding: '2px 6px', borderRadius: 'var(--radius-full)', fontSize: '10px', fontWeight: 'bold', color: 'var(--ink-primary)'
              }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button type="button" className="app-topbar-custom-reset" onClick={(e) => { if (unreadCount >= 3) confetti.fireFrom(e.currentTarget, { count: 22 }); notifications.markAllRead(); }}
                style={{ padding: '6px 10px', fontSize: '11px', height: 'auto', gap: '4px' }}
                title="Mark all as read">
                <CheckCheck size={12} /> <span>Mark read</span>
              </button>
            )}
            <button type="button" onClick={onClose} className="app-topbar-custom-close" aria-label="Close notifications"><X size={14} aria-hidden="true" /></button>
          </div>
        </div>

        <p className="app-topbar-custom-intro">
          Review your recent alerts, mentions, and system updates. 
          Acknowledge or open them directly from this panel.
        </p>

        <div className="app-topbar-custom-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {visible.length === 0 ? (
            <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--ink-tertiary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)', flexShrink: 0 }}>
                  <Inbox size={14} aria-hidden="true" style={{ color: 'var(--ink-secondary)' }} />
                </div>
                <span className="app-topbar-custom-row-label">All caught up</span>
              </div>
              <div className="app-topbar-custom-row-desc">New activity will appear here.</div>
            </div>
          ) : (
            visible.map((notif) => (
              <NotifItem
                key={notif.id}
                notif={notif}
                snoozeOpen={snoozeOpenId === notif.id}
                onToggleSnooze={() => setSnoozeOpenId(snoozeOpenId === notif.id ? null : notif.id)}
                onCloseSnooze={() => setSnoozeOpenId(null)}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            ))
          )}
        </div>

        <div className="app-topbar-custom-footer">
          <Logo height={18} className="app-topbar-custom-footer-logo" />
          {onNavigate && (
            <button type="button" className="app-topbar-custom-reset"
              onClick={() => onNavigate('/app/notifications')}>
              View all notifications
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
