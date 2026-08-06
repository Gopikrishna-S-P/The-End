import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { authApi, clearAllAuthStorage } from '../api';
import { Logo } from './Logo';
import { X, Compass, UserRound, CreditCard, KeyRound, ShieldAlert } from 'lucide-react';
import { type UserProfile, type ChangePasswordValues } from '../pages/ProfileSettingsTypes';
import { ProfileChangePasswordForm } from '../pages/ProfileChangePasswordForm';
import { ProfileGeneralSection } from '../pages/ProfileGeneralSection';
import { ProfileOverviewSection } from '../pages/ProfileOverviewSection';
import { ProfileAccountSection } from '../pages/ProfileAccountSection';
import { ProfileBillingSection } from '../pages/ProfileBillingSection';
import { ProfileSecuritySection } from '../pages/ProfileSecuritySection';
import { ProfileDangerZoneSection } from '../pages/ProfileDangerZoneSection';
import { LogoutConfirmDialog } from '../pages/LogoutConfirmDialog';
import { ProfileSettingsToast, type ToastState } from '../pages/ProfileSettingsToast';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { profileSettings, useProfileSettingsOpen, type SettingsTab } from '../utils/profileSettings';
import '../pages/Dashboard.css';
import './ProfileSettingsDialog.css';

const NAV_ITEMS: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { key: 'general',  label: 'General',     icon: <Compass size={16} /> },
  { key: 'account',  label: 'Account',     icon: <UserRound size={16} /> },
  { key: 'billing',  label: 'Billing',     icon: <CreditCard size={16} /> },
  { key: 'security', label: 'Security',    icon: <KeyRound size={16} /> },
  { key: 'danger',   label: 'Danger Zone', icon: <ShieldAlert size={16} /> },
];

export default function ProfileSettingsDialog() {
  const open = useProfileSettingsOpen();
  const onClose = () => profileSettings.close();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  const [profile,          setProfile]          = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError,     setProfileError]     = useState<string | null>(null);
  const [isLoggingOut,     setIsLoggingOut]     = useState(false);
  const [toast,            setToast]            = useState<ToastState | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab,        setActiveTab]        = useState<SettingsTab>('general');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) setActiveTab(profileSettings.getTab());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoadingProfile(true);
    setProfileError(null);
    (async () => {
      try {
        const u = await authApi.me();
        const rolesArr: any[] = Array.isArray(u.roles) ? u.roles : Array.from((u.roles as any) ?? []);
        const rawRole = rolesArr[0]?.name as string | undefined;
        const role = ((rawRole ?? 'FO').replace('ROLE_', '')) as UserProfile['role'];
        if (cancelled) return;
        setProfile({
          id: u.id, name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
          email: u.email, role, mfaEnabled: !!u.mfaEnabled, createdAt: u.createdAt,
        });
      } catch (err: any) {
        if (cancelled) return;
        setProfileError(err?.response?.data?.message || 'Failed to load profile. Please refresh.');
      } finally { if (!cancelled) setIsLoadingProfile(false); }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const onChangePassword = async (data: ChangePasswordValues) => {
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      setToast({ message: 'Password changed. Signing you out…', type: 'success' });
      setTimeout(() => { clearAllAuthStorage(); window.location.replace('/login?reason=password_changed'); }, 1500);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (status === 401) setToast({ message: 'Current password is incorrect.', type: 'error' });
      else setToast({ message: msg || 'Failed to change password. Please try again.', type: 'error' });
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { await authApi.logout(); } catch { /* proceed regardless */ }
    clearAllAuthStorage();
    window.location.replace('/login');
  };

  if (!open) return null;

  return createPortal(
    <div
      className="ps-dialog-backdrop"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="ps-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Profile settings">
        
        <nav className="ps-sidebar" aria-label="Settings sections">
          <div className="ps-sidebar-logo">
            <Logo height={28} />
          </div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              type="button"
              className={`ps-sidebar-item${activeTab === item.key ? ' is-active' : ''}${item.key === 'danger' ? ' is-danger' : ''}`}
              onClick={() => setActiveTab(item.key)}
              aria-current={activeTab === item.key ? 'page' : undefined}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ps-dialog-content">
          <header className="ps-dialog-header">
            <h1 className="ps-dialog-title">Settings</h1>
            <button type="button" className="ps-dialog-close" onClick={onClose} aria-label="Close">
              <X size={16} aria-hidden="true" />
            </button>
          </header>

          <ProfileSettingsToast toast={toast} onDismiss={() => setToast(null)} />

          <div className="ps-dialog-body">
            {activeTab === 'general' && <ProfileGeneralSection onClose={onClose} />}

            {activeTab === 'account' && (
              <>
                {/* identity */}
                <ProfileOverviewSection profile={profile} isLoading={isLoadingProfile} error={profileError} />

                {/* contact / org details — only shown when there's something beyond what's already on the profile card */}
                {profile && !profileError && <ProfileAccountSection profile={profile} />}

                <ProfileChangePasswordForm onSubmit={onChangePassword} />
              </>
            )}

            {activeTab === 'billing' && <ProfileBillingSection />}

            {activeTab === 'security' && <ProfileSecuritySection />}

            {activeTab === 'danger' && <ProfileDangerZoneSection onRequestLogout={() => setShowLogoutConfirm(true)} />}
          </div>
        </div>
      </div>

      <LogoutConfirmDialog
        open={showLogoutConfirm}
        isLoggingOut={isLoggingOut}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
      />
    </div>,
    document.body,
  );
}
