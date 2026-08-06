import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { Bell, AtSign, UserCheck, Clock, Check, ArrowRight, X } from 'lucide-react';
import { notifications, type Notification, type NotifType } from '../utils/notifications';

export const TYPE_ICON: Record<NotifType, ElementType> = {
  system:     Bell,
  mention:    AtSign,
  assignment: UserCheck,
  deadline:   Clock,
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}

interface NotifItemProps {
  notif: Notification;
  snoozeOpen: boolean;
  onToggleSnooze: () => void;
  onCloseSnooze: () => void;
  onClose: () => void;
  onNavigate?: (to: string) => void;
}

export function NotifItem({ notif, onClose, onNavigate }: NotifItemProps) {
  const showOpen        = notif.actions?.open        !== false && !!notif.to;
  const showAcknowledge = notif.actions?.acknowledge !== false;
  const Icon = TYPE_ICON[notif.type];

  const handleOpen = () => {
    if (!notif.to) return;
    notifications.markRead(notif.id);
    onClose();
    if (onNavigate) onNavigate(notif.to);
  };

  return (
    <div className={`app-topbar-custom-row${notif.read ? '' : ' is-unread'}`} style={{ alignItems: 'flex-start', position: 'relative' }}>
      {!notif.read && (
        <div style={{ position: 'absolute', top: '18px', left: '-2px', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ink-solid)' }} />
      )}
      
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', background: 'color-mix(in srgb, var(--text-primary) 4%, transparent)', flexShrink: 0, marginRight: '4px' }}>
        <Icon size={14} aria-hidden="true" style={{ color: 'var(--ink-secondary)' }} />
      </div>
      
      <div className="app-topbar-custom-row-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span className="app-topbar-custom-row-label" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.title}</span>
          <span style={{ fontSize: '11px', color: 'var(--ink-tertiary)', whiteSpace: 'nowrap' }}>{timeAgo(notif.createdAt)}</span>
        </div>
        
        {notif.body && <span className="app-topbar-custom-row-desc" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{notif.body}</span>}
        
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
          {showOpen && (
            <button type="button" onClick={handleOpen} className="app-topbar-custom-reset" style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', height: 'auto', gap: '4px' }}>
              Open <ArrowRight size={10} />
            </button>
          )}
          {showAcknowledge && !notif.read && (
            <button type="button" onClick={() => notifications.markRead(notif.id)} className="app-topbar-custom-reset" style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', height: 'auto', gap: '4px' }}>
              <Check size={11} /> Acknowledge
            </button>
          )}
          <button type="button" onClick={() => notifications.dismiss(notif.id)} className="app-topbar-custom-close" style={{ width: '24px', height: '24px', borderRadius: '6px', marginLeft: 'auto' }} aria-label="Dismiss">
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
