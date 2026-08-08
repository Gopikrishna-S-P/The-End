import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X, Bell, Inbox, UserCheck, Clock, CheckCheck, Check, ArrowRight,
  Clock3, Volume2, Monitor, Mail, RefreshCcw, AlertCircle, CheckCircle2, SlidersHorizontal,
} from 'lucide-react';
import {
  notifications, useNotifications, type Notification, type NotifType,
} from '../utils/notifications';
import { useNotificationPrefs, notificationPrefs, type NotifChannel } from '../utils/notificationPrefs';
import { getDesktopPermission, requestDesktopPermission } from '../utils/notificationDispatch';
import { TYPE_ICON, timeAgo } from './NotifItem';
import { notificationsDialog, useNotificationsDialogOpen } from '../utils/notificationsDialog';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { Logo } from './Logo';
import '../pages/Dashboard.css';
import './ProfileSettingsDialog.css';

const SNOOZE_MS = 3 * 60 * 60 * 1000; // 3h

type Tab = 'all' | 'unread' | NotifType | 'preferences';

const TYPE_LABEL: Record<NotifType, string> = {
  system: 'System', assignment: 'Assignments', deadline: 'Deadlines',
};
const TYPE_COLOR: Record<NotifType, string> = {
  system: 'var(--info)', assignment: 'var(--success)', deadline: 'var(--warning)',
};

const NAV_ITEMS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'all',         label: 'All',          icon: <Inbox size={16} /> },
  { key: 'unread',      label: 'Unread',       icon: <Bell size={16} /> },
  { key: 'assignment',  label: 'Assignments',  icon: <UserCheck size={16} /> },
  { key: 'deadline',    label: 'Deadlines',    icon: <Clock size={16} /> },
  { key: 'system',      label: 'System',       icon: <Bell size={16} /> },
  { key: 'preferences', label: 'Preferences',  icon: <SlidersHorizontal size={16} /> },
];

export default function NotificationsDialog() {
  const open = useNotificationsDialogOpen();
  const onClose = () => notificationsDialog.close();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const list = useNotifications();

  const active = useMemo(() => {
    const now = Date.now();
    return list.filter(n => !n.snoozedUntil || new Date(n.snoozedUntil).getTime() <= now);
  }, [list]);

  const unreadCount = useMemo(() => active.filter(n => !n.read).length, [active]);

  const visible = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'preferences') return active;
    if (activeTab === 'unread') return active.filter(n => !n.read);
    return active.filter(n => n.type === activeTab);
  }, [active, activeTab]);

  if (!open) return null;

  return createPortal(
    <div
      className="ps-dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ps-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Notifications">
        
        <nav className="ps-sidebar" aria-label="Notification sections">
          <div className="ps-sidebar-logo">
            <Logo height={28} />
          </div>
          {NAV_ITEMS.map(item => {
            const count = item.key === 'unread' ? unreadCount
              : item.key === 'all' || item.key === 'preferences' ? undefined
              : active.filter(n => n.type === item.key).length;
            return (
              <button
                key={item.key}
                type="button"
                className={`ps-sidebar-item${activeTab === item.key ? ' is-active' : ''}`}
                onClick={() => setActiveTab(item.key)}
                aria-current={activeTab === item.key ? 'page' : undefined}
              >
                {item.icon}
                {item.label}
                {!!count && <span className="ds-pill is-neutral" style={{ marginLeft: 'auto', fontSize: 10 }}>{count}</span>}
              </button>
            );
          })}
        </nav>

        <div className="ps-dialog-content">
          <header className="ps-dialog-header">
            <h1 className="ps-dialog-title">Notifications</h1>
            <button type="button" className="ps-dialog-close" onClick={onClose} aria-label="Close">
              <X size={16} aria-hidden="true" />
            </button>
          </header>

          <div className="ps-dialog-body">
            {activeTab === 'preferences' ? (
              <PreferencesSection />
            ) : (
              <NotifListSection
                items={visible}
                unreadCount={activeTab === 'unread' ? visible.length : active.filter(n => !n.read).length}
                onNavigate={(to) => { onClose(); navigate(to); }}
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NotifListSection({ items, unreadCount, onNavigate }: { items: Notification[]; unreadCount: number; onNavigate: (to: string) => void }) {
  return (
    <section className="ps-section" aria-label="Notification list">
      <div className="ps-section-body" style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          {unreadCount > 0 && (
            <button type="button" className="ds-btn is-secondary" style={{ height: 30 }} onClick={() => notifications.markAllRead()}>
              <CheckCheck size={13} style={{ marginRight: 6 }} /> Mark all read
            </button>
          )}
          {items.length > 0 && (
            <button type="button" className="ds-btn is-secondary" style={{ height: 30, color: 'var(--danger)', background: 'var(--danger-subtle)', border: 'none' }} onClick={() => notifications.clearAll()}>
              <X size={13} style={{ marginRight: 6 }} /> Clear all
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '64px 0', color: 'var(--ink-tertiary)' }}>
            <Inbox size={28} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-secondary)' }}>All caught up</span>
            <span style={{ fontSize: 12 }}>New activity will appear here.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(n => <NotifRow key={n.id} notif={n} onNavigate={onNavigate} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function NotifRow({ notif, onNavigate }: { notif: Notification; onNavigate: (to: string) => void }) {
  const Icon = TYPE_ICON[notif.type];
  const color = TYPE_COLOR[notif.type];
  const showOpen = notif.actions?.open !== false && !!notif.to;
  const showAck = notif.actions?.acknowledge !== false;
  const showSnooze = notif.actions?.snooze !== false;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14, padding: 14,
      background: notif.read ? 'transparent' : 'color-mix(in srgb, var(--ink-solid) 2%, transparent)',
      borderRadius: 12, border: '1px solid var(--border-subtle)', position: 'relative',
    }}>

      <div style={{ width: 32, height: 32, borderRadius: '50%', background: `color-mix(in srgb, ${color} 15%, transparent)`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: notif.read ? 500 : 700, color: 'var(--ink-primary)' }}>{notif.title}</span>
          <time dateTime={notif.createdAt} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {timeAgo(notif.createdAt)}
          </time>
        </div>
        {notif.body && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>{notif.body}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {showOpen && (
            <button type="button" className="ds-btn is-secondary" style={{ height: 26, padding: '0 10px', fontSize: 11.5 }} onClick={() => { notifications.markRead(notif.id); onNavigate(notif.to!); }}>
              Open <ArrowRight size={11} style={{ marginLeft: 4 }} />
            </button>
          )}
          {showAck && !notif.read && (
            <button type="button" className="ds-btn is-secondary" style={{ height: 26, padding: '0 10px', fontSize: 11.5 }} onClick={() => notifications.markRead(notif.id)}>
              <Check size={11} style={{ marginRight: 4 }} /> Mark read
            </button>
          )}
          {showSnooze && (
            <button type="button" className="ds-btn is-secondary" style={{ height: 26, padding: '0 10px', fontSize: 11.5 }} onClick={() => notifications.snooze(notif.id, SNOOZE_MS)}>
              <Clock3 size={11} style={{ marginRight: 4 }} /> Snooze 3h
            </button>
          )}
          <button type="button" style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => notifications.dismiss(notif.id)} aria-label="Dismiss">
            <X size={13} style={{ color: 'var(--ink-tertiary)' }} />
          </button>
        </div>
      </div>
    </div>
  );
}

const CHANNEL_LABELS: Array<{ key: NotifChannel; label: string; icon: React.ElementType; description: string }> = [
  { key: 'sound',   label: 'Sound',   icon: Volume2, description: 'Play a tone when the notification arrives.' },
  { key: 'desktop', label: 'Desktop', icon: Monitor, description: 'Native browser notification when the tab is hidden.' },
  { key: 'email',   label: 'Email',   icon: Mail,    description: 'Send a summary email (backend not yet wired).' },
];

const TYPE_ROWS: Array<{ type: NotifType; label: string; icon: React.ElementType }> = [
  { type: 'assignment', label: 'Assignments', icon: UserCheck },
  { type: 'deadline',   label: 'Deadlines',   icon: Clock },
  { type: 'system',     label: 'System',      icon: Bell },
];

function PreferencesSection() {
  const prefs = useNotificationPrefs();
  const [permission, setPermission] = useState(getDesktopPermission());
  const [requesting, setRequesting] = useState(false);

  const anyDesktopWanted = TYPE_ROWS.some(t => prefs[t.type].desktop);
  const showPermissionBanner = anyDesktopWanted && permission !== 'granted' && permission !== 'unsupported';
  const desktopDenied = permission === 'denied';
  const desktopUnsupported = permission === 'unsupported';

  const handleRequestPermission = async () => {
    setRequesting(true);
    try { setPermission(await requestDesktopPermission()); }
    finally { setRequesting(false); }
  };

  return (
    <section className="ps-section" aria-label="Notification preferences">
      <div className="ps-section-body" style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {showPermissionBanner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid var(--warning-subtle)', borderRadius: 10, background: 'color-mix(in srgb, var(--warning) 6%, transparent)' }}>
            <AlertCircle size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-secondary)', flex: 1 }}>Allow desktop notifications so this channel can actually fire.</span>
            <button type="button" onClick={handleRequestPermission} disabled={requesting} className="ds-btn is-secondary" style={{ height: 28, flexShrink: 0 }}>
              {requesting ? 'Requesting…' : 'Enable'}
            </button>
          </div>
        )}
        {permission === 'granted' && anyDesktopWanted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid var(--success-subtle)', borderRadius: 10, background: 'color-mix(in srgb, var(--success) 6%, transparent)' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--success)', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>Desktop notifications are active.</span>
          </div>
        )}
        {desktopDenied && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid var(--danger-subtle)', borderRadius: 10, background: 'color-mix(in srgb, var(--danger) 5%, transparent)' }}>
            <AlertCircle size={15} style={{ color: 'var(--danger)', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>Desktop notifications are blocked — re-enable them in your browser's site settings.</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 72px)', alignItems: 'center', gap: 8, padding: '0 4px' }}>
            <span />
            {CHANNEL_LABELS.map(c => (
              <span key={c.key} title={c.description} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10.5, fontWeight: 700, color: 'var(--ink-tertiary)', textTransform: 'uppercase' }}>
                <c.icon size={13} />{c.label}
              </span>
            ))}
          </div>

          {TYPE_ROWS.map(({ type, label, icon: Icon }) => (
            <div key={type} style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, 72px)', alignItems: 'center', gap: 8, padding: '10px 4px', border: '1px solid var(--border-subtle)', borderRadius: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink-primary)' }}>
                <Icon size={14} /> {label}
              </span>
              {CHANNEL_LABELS.map(c => {
                const checked = prefs[type][c.key];
                const disabled = c.key === 'desktop' && desktopUnsupported;
                return (
                  <label key={c.key} style={{ display: 'flex', justifyContent: 'center' }} aria-label={`${label} – ${c.label}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => notificationPrefs.set(type, c.key, e.target.checked)}
                    />
                  </label>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" onClick={() => notificationPrefs.reset()} className="ds-btn is-secondary" style={{ height: 28, fontSize: 11.5 }}>
            <RefreshCcw size={11} style={{ marginRight: 6 }} /> Reset to defaults
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>Changes save automatically.</span>
        </div>
      </div>
    </section>
  );
}
