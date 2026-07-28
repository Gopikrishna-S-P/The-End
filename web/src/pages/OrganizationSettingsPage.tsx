import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { organizationsApi } from '../api/organizationsApi';
import type { OrganizationSummary } from '../api/platformApi';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  Building2, Loader2, AlertCircle, CheckCircle2, RefreshCw, Save, Lock, X
} from 'lucide-react';
import '../styles/AppPage.css';
import './Dashboard.css';

// ── Motion variants ────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.28, ease: 'easeOut' as const } },
};

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const { hasAnyPermission } = usePermissions();

  const role = user?.roles?.[0]?.name?.replace('ROLE_', '');
  const canEdit =
    role === 'ORG_ADMIN' || role === 'PLATFORM_ADMIN'
      || role === 'AGENCY_ADMIN' || role === 'BANK_ADMIN'
      || hasAnyPermission('ORG_UPDATE');

  const [org, setOrg]         = useState<OrganizationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [name, setName]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await organizationsApi.getMyOrganization();
      setOrg(res); setName(res.name);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load organization');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!name.trim() || name.trim() === org?.name) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      const updated = await organizationsApi.updateMyOrganization({ name: name.trim() });
      setOrg(updated); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to update organization');
    } finally { setSaving(false); }
  };

  return (
    <div className="db-root">
      <AnimatePresence>
        {error && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body">
              <span className="db-error-title">{error}</span>
            </div>
            <button className="db-error-retry" onClick={() => setError(null)} aria-label="Dismiss">
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
        {saved && (
          <motion.div key="toast-ok" className="ds-toast is-ok" role="status"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}
            onClick={() => setSaved(false)}>
            <CheckCircle2 size={14} />
            <span>Organization updated successfully.</span>
            <X size={13} className="ds-toast-x" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ maxWidth: 640 }}>
          {loading ? (
            <motion.div variants={fadeUp} className="ds-card db-card" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--ink-tertiary)' }}>
              <Loader2 size={18} className="ds-spin" />
              <span>Loading organization profile…</span>
            </motion.div>
          ) : !org ? (
            <motion.div variants={fadeUp} className="ds-card db-card" style={{ padding: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Building2 size={32} style={{ color: 'var(--ink-tertiary)' }} />
              <span className="ds-empty-title">No organization context</span>
              <span className="ds-empty-sub">Your account is not linked to an organization profile.</span>
            </motion.div>
          ) : (
            <motion.section variants={fadeUp} className="ds-card db-card">
              <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
                  <h2 className="db-card-title">Organization Settings</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end', marginRight: 16 }}>
                      <span className="db-kpi2-foot-meta" style={{ letterSpacing: '0.04em' }}>CODE</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--ink-primary)' }}>{org.code}</span>
                    </div>
                    <span className={`ds-pill ${org.isActive ? 'is-success' : 'is-neutral'}`}>
                      {org.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button" onClick={load} disabled={loading}
                      className="ds-btn is-secondary" aria-label="Refresh" title="Refresh"
                    >
                      <RefreshCw size={14} className={loading ? 'ds-spin' : ''} />
                    </button>
                  </div>
                </div>
              </header>

              <div className="db-card-body" style={{ padding: '24px' }}>
                <div className="ds-field" style={{ marginBottom: 24 }}>
                  <label className="ds-label" htmlFor="org-name" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    Name
                    {!canEdit && (
                      <span className="ds-pill is-neutral" style={{ padding: '0 6px', height: 18, fontSize: 9 }}>
                        <Lock size={10} /> READ-ONLY
                      </span>
                    )}
                  </label>
                  <input
                    id="org-name" type="text" value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canEdit} className="ds-input"
                    style={{ fontSize: 14, height: 40 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, background: 'var(--bg-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span className="db-kpi2-foot-meta" style={{ display: 'block', marginBottom: 4 }}>Created</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>
                      {org.createdAt ? new Date(org.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="db-kpi2-foot-meta" style={{ display: 'block', marginBottom: 4 }}>Users</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-primary)', fontWeight: 600 }}>
                      {org.userCount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span className="db-kpi2-foot-meta" style={{ display: 'block', marginBottom: 4 }}>Org Admin</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{org.orgAdminEmail || '—'}</span>
                  </div>
                </div>

                {canEdit && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button" onClick={save}
                      disabled={saving || !name.trim() || name.trim() === org.name}
                      className="ds-btn is-primary"
                      style={{ height: 36 }}
                    >
                      {saving ? <Loader2 size={14} className="ds-spin" /> : <Save size={14} />}
                      Save changes
                    </button>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </motion.div>
      </div>
    </div>
  );
}
