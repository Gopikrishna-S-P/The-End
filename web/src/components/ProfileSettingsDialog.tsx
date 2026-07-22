import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi, clearAllAuthStorage } from '../api';
import {
  User, Mail, Shield, LogOut, Loader2, AlertCircle,
  ChevronRight, Building2, Phone, BadgeCheck, X, KeyRound,
} from 'lucide-react';
import {
  type UserProfile, type ChangePasswordValues,
  ROLE_LABELS, getInitials,
} from '../pages/ProfileSettingsTypes';
import { ProfileChangePasswordForm } from '../pages/ProfileChangePasswordForm';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { profileSettings, useProfileSettingsOpen } from '../utils/profileSettings';
import '../pages/Dashboard.css';
import './ProfileSettingsDialog.css';

function SectionHeader({ icon, title, sub, tone }: { icon: React.ReactNode; title: string; sub: string; tone?: 'danger' }) {
  return (
    <header className="db-card-head" style={{ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="db-att-chip" style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: tone === 'danger' ? 'var(--danger-subtle)' : 'var(--bg-subtle)',
        color: tone === 'danger' ? 'var(--danger)' : 'var(--ink-solid)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h2 className="db-card-title" style={tone === 'danger' ? { color: 'var(--danger)' } : undefined}>{title}</h2>
        <span className="db-kpi2-foot-meta">{sub}</span>
      </div>
    </header>
  );
}

export default function ProfileSettingsDialog() {
  const open = useProfileSettingsOpen();
  const onClose = () => profileSettings.close();
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);

  const [profile,          setProfile]          = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError,     setProfileError]     = useState<string | null>(null);
  const [isLoggingOut,     setIsLoggingOut]     = useState(false);
  const [toast,            setToast]            = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
      <div className="ps-dialog" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="rp-profile-settings-title">
        <header className="ps-dialog-header">
          <div className="ps-dialog-title">
            <User size={16} aria-hidden="true" />
            <span id="rp-profile-settings-title">Profile settings</span>
          </div>
          <button type="button" className="ps-dialog-close" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <AnimatePresence>
          {toast && (
            <motion.div key="toast" className={`ds-toast is-${toast.type === 'error' ? 'err' : 'ok'}`} role="status"
              style={{ margin: '0 24px' }}
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
              onClick={() => setToast(null)}>
              {toast.type === 'error' ? <AlertCircle size={14} /> : <BadgeCheck size={14} />}
              <span>{toast.message}</span>
              <X size={13} className="ds-toast-x" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="ps-dialog-body">

          {/* ── Profile ── */}
          <section style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <SectionHeader icon={<User size={18} />} title="Profile" sub="Your personal profile details" />
            <div style={{ padding: '4px 28px 28px' }}>
              {isLoadingProfile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="ds-skel" style={{ width: 56, height: 56, borderRadius: 14 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    <div className="ds-skel" style={{ height: 18, width: 160 }} />
                    <div className="ds-skel" style={{ height: 14, width: 220 }} />
                    <div className="ds-skel" style={{ height: 18, width: 90, borderRadius: 999 }} />
                  </div>
                </div>
              ) : profileError ? (
                <div className="db-error-banner" role="alert" style={{ margin: 0 }}>
                  <AlertCircle size={16} className="db-error-icon" />
                  <div className="db-error-body">
                    <span className="db-error-title">{profileError}</span>
                  </div>
                </div>
              ) : profile ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--ink-solid)', color: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
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

          {/* ── Account ── */}
          {profile && !profileError && (
            <section style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <SectionHeader icon={<Mail size={18} />} title="Account" sub="Contact and organization details" />
              <div style={{ padding: '4px 28px 28px' }}>
                <div className="ps-account-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, background: 'var(--bg-subtle)', padding: 20, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="db-kpi2-foot-meta">Full name</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}><User size={13} style={{ color: 'var(--ink-tertiary)' }}/>{profile.name || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span className="db-kpi2-foot-meta">Email address</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}><Mail size={13} style={{ color: 'var(--ink-tertiary)' }}/>{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="db-kpi2-foot-meta">Phone number</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}><Phone size={13} style={{ color: 'var(--ink-tertiary)' }}/>{profile.phone}</span>
                    </div>
                  )}
                  {profile.agency && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span className="db-kpi2-foot-meta">Agency</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-primary)', fontWeight: 500 }}><Building2 size={13} style={{ color: 'var(--ink-tertiary)' }}/>{profile.agency}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Password ── */}
          <ProfileChangePasswordForm onSubmit={onChangePassword} />

          {/* ── Security ── */}
          <section style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <SectionHeader icon={<KeyRound size={18} />} title="Security" sub="Two-factor authentication" />
            <div style={{ padding: '4px 28px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', border: `1px solid ${profile?.mfaEnabled ? 'var(--success-subtle)' : 'var(--border-subtle)'}`, borderRadius: 12, background: profile?.mfaEnabled ? 'color-mix(in srgb, var(--success) 4%, transparent)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                  <div style={{ color: profile?.mfaEnabled ? 'var(--success)' : 'var(--ink-tertiary)', flexShrink: 0 }}><Shield size={20} /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)' }}>Two-factor authentication</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
                      {profile?.mfaEnabled ? 'Active — your account is protected' : 'Not enabled — add extra security'}
                    </span>
                  </div>
                </div>
                <a href="/settings/mfa" onClick={onClose} className={`ds-btn ${profile?.mfaEnabled ? 'is-secondary' : 'is-primary'}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  {profile?.mfaEnabled ? 'Manage' : 'Enable'} <ChevronRight size={13} />
                </a>
              </div>
            </div>
          </section>

          {/* ── Danger Zone ── */}
          <section>
            <SectionHeader icon={<LogOut size={18} />} title="Danger Zone" sub="Sign out of your account" tone="danger" />
            <div style={{ padding: '4px 28px 28px' }}>
              <div style={{ padding: '18px 20px', border: '1px solid var(--danger-subtle)', borderRadius: 12, background: 'color-mix(in srgb, var(--danger) 3%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger)' }}>Sign out of this device</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>You'll need to sign in again to access Recoverpro.</span>
                </div>
                <button type="button" onClick={() => setShowLogoutConfirm(true)}
                  className="ds-btn is-primary" style={{ background: 'var(--danger)', color: '#fff', border: 'none', flexShrink: 0 }}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div className="ds-modal-overlay" onClick={() => setShowLogoutConfirm(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <motion.div className="ds-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.15 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 16px 8px' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--danger-subtle)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <LogOut size={24} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-primary)', marginBottom: 8 }}>Sign out?</span>
                <span style={{ fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.5 }}>You'll be redirected to the sign-in page. Any unsaved changes will be lost.</span>
              </div>
              <div className="ds-modal-actions" style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowLogoutConfirm(false)} className="ds-btn is-secondary" style={{ flex: 1, height: 36 }}>Cancel</button>
                <button type="button" onClick={handleLogout} disabled={isLoggingOut} className="ds-btn is-primary" style={{ flex: 1, height: 36, background: 'var(--danger)', border: 'none', color: '#fff' }}>
                  {isLoggingOut ? <Loader2 size={14} className="ds-spin" /> : <LogOut size={14} />}Sign out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
