import { useEffect, useMemo, useRef } from 'react';
import {
  ChevronDown,
  Settings, LogOut,
} from 'lucide-react';
import { usePresence, type PresenceStatus } from '../utils/userPresence';
import { useT } from '../utils/i18n';
import { profileSettings } from '../utils/profileSettings';
import './UserMenu.css';

interface UserShape {
  id?: string | number;
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface UserMenuProps {
  user: UserShape;
  roleLabel: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onLogout: () => void;
  logoutConfirm?: boolean;
  onLogoutConfirmRequest?: () => void;
  onLogoutConfirmCancel?: () => void;
  avatarColor?: string;
  /** Optional click sound trigger. */
  playClick?: () => void;
}

function presenceColor(status: PresenceStatus): string {
  switch (status) {
    case 'online':  return 'var(--success)';
    case 'away':    return '#F59E0B';
    case 'busy':    return '#EF4444';
    case 'dnd':     return '#B91C1C';
    case 'offline': return '#9CA3AF';
  }
}

export default function UserMenu({
  user, roleLabel, open, onOpen, onClose, onLogout,
  logoutConfirm = false, onLogoutConfirmRequest, onLogoutConfirmCancel,
  avatarColor, playClick,
}: UserMenuProps) {
  const pres = usePresence();
  const t = useT();
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Outside-click closes the dropdown */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const initials = useMemo(() => {
    const f = (user.firstName?.[0] ?? '').toUpperCase();
    const l = (user.lastName?.[0]  ?? '').toUpperCase();
    return `${f}${l}` || 'U';
  }, [user.firstName, user.lastName]);

  const fullName = useMemo(() => {
    const f = user.firstName ?? '';
    const l = user.lastName  ?? '';
    return `${f} ${l}`.trim() || user.email || 'User';
  }, [user.firstName, user.lastName, user.email]);

  const handleAvatarClick = () => {
    playClick?.();
    open ? onClose() : onOpen();
  };

  return (
    <div
      className="app-user-dropdown-wrap"
      ref={wrapRef}
    >
      <button
        type="button"
        className="app-topbar-avatar-btn"
        onClick={handleAvatarClick}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`User menu — ${fullName}`}
      >
        <div className="app-user-avatar" aria-hidden="true" style={avatarColor ? { background: avatarColor } : undefined}>
          {initials}
          <span
            className={`app-user-status-dot status-${pres.status}`}
            style={{ background: presenceColor(pres.status) }}
            aria-hidden="true"
          />
        </div>
        <ChevronDown size={12} className={`app-user-chevron${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="app-user-dropdown is-rich" role="menu">
          <div className="app-user-dropdown-header">
            <div className="app-user-hover-avatar app-user-dropdown-avatar">
              {initials}
              <span
                className="app-user-status-dot is-large"
                style={{ background: presenceColor(pres.status) }}
                aria-hidden="true"
              />
            </div>
            <div className="app-user-dropdown-id">
              <div className="app-user-name">{fullName}</div>
              <div className="app-user-email">{user.email}</div>
              <span className="app-role-pill">{roleLabel}</span>
            </div>
          </div>

          <div className="app-user-dropdown-section">
            <button
              type="button"
              className="app-user-row"
              role="menuitem"
              onClick={() => { onClose(); playClick?.(); profileSettings.show(); }}
            >
              <span className="app-user-row-icon">
                <Settings size={12} aria-hidden="true" />
              </span>
              <span className="app-user-row-label">{t('Profile settings')}</span>
            </button>

            {logoutConfirm ? (
              <div className="app-user-row app-user-logout-confirm" role="menuitem">
                <span className="app-user-row-label" style={{ flex: 1, fontSize: 12 }}>Confirm sign out?</span>
                <button type="button" className="app-user-confirm-yes" onClick={() => { onClose(); onLogout(); }}>Yes</button>
                <button type="button" className="app-user-confirm-no" onClick={onLogoutConfirmCancel}>Cancel</button>
              </div>
            ) : (
              <button
                type="button"
                className="app-user-row is-danger"
                role="menuitem"
                onClick={onLogoutConfirmRequest ?? (() => { onClose(); onLogout(); })}
              >
                <span className="app-user-row-icon">
                  <LogOut size={12} aria-hidden="true" />
                </span>
                <span className="app-user-row-label">{t('Sign out')}</span>
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
