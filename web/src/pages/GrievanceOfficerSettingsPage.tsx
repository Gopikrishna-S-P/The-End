import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { grievanceOfficersApi } from '../api/grievanceOfficersApi';
import type { GrievanceOfficerResponse } from '../types/grievances';
import { usePermissions } from '../hooks/usePermissions';
import { fmtDate, fmtDT } from './LoanDetailHelpers';
import {
  UserCheck, Loader2, AlertCircle, CheckCircle2, RefreshCw, Save, X,
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

export default function GrievanceOfficerSettingsPage() {
  const { hasRole } = usePermissions();
  const canEdit = hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN');

  const [officer, setOfficer] = useState<GrievanceOfficerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  const [name, setName]               = useState('');
  const [designation, setDesignation] = useState('');
  const [email, setEmail]             = useState('');
  const [phone, setPhone]             = useState('');
  const [address, setAddress]         = useState('');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await grievanceOfficersApi.get();
      setOfficer(res);
      if (res) {
        setName(res.name); setDesignation(res.designation);
        setEmail(res.email); setPhone(res.phone); setAddress(res.address || '');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load grievance officer');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const canSubmit = name.trim() && designation.trim() && email.trim() && phone.trim();

  const save = async () => {
    if (!canSubmit) return;
    setSaving(true); setError(null); setSaved(false);
    try {
      const updated = await grievanceOfficersApi.upsert({
        name: name.trim(),
        designation: designation.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
      });
      setOfficer(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save grievance officer');
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
            <span>Grievance officer saved successfully.</span>
            <X size={13} className="ds-toast-x" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ maxWidth: 640 }}>
          {loading ? (
            <motion.div variants={fadeUp} className="ds-card db-card" style={{ padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--ink-tertiary)' }}>
              <Loader2 size={18} className="ds-spin" />
              <span>Loading grievance officer…</span>
            </motion.div>
          ) : (
            <motion.section variants={fadeUp} className="ds-card db-card">
              <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
                  <h2 className="db-card-title">Grievance Redressal Officer</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
                    <span className={`ds-pill ${officer ? 'is-success' : 'is-neutral'}`}>
                      {officer ? 'Configured' : 'Not yet configured'}
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
                {!officer && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 12, marginBottom: 20 }}>
                    <UserCheck size={16} style={{ color: 'var(--ink-tertiary)', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 12.5, color: 'var(--ink-secondary)' }}>
                      RBI's digital lending guidelines require a designated Grievance Redressal Officer whose contact
                      details staff can relay to a borrower. No officer is on file yet — fill in the details below to set one up.
                    </span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="ds-field">
                    <label className="ds-label is-required" htmlFor="gro-name">Name</label>
                    <input id="gro-name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={200}
                      disabled={!canEdit} className="ds-input" placeholder="Full name" />
                  </div>
                  <div className="ds-field">
                    <label className="ds-label is-required" htmlFor="gro-designation">Designation</label>
                    <input id="gro-designation" type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} maxLength={200}
                      disabled={!canEdit} className="ds-input" placeholder="e.g. Head of Collections" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div className="ds-field">
                    <label className="ds-label is-required" htmlFor="gro-email">Email</label>
                    <input id="gro-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255}
                      disabled={!canEdit} className="ds-input" placeholder="officer@org.com" />
                  </div>
                  <div className="ds-field">
                    <label className="ds-label is-required" htmlFor="gro-phone">Phone</label>
                    <input id="gro-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30}
                      disabled={!canEdit} className="ds-input" placeholder="Phone number" />
                  </div>
                </div>

                <div className="ds-field" style={{ marginBottom: 20 }}>
                  <label className="ds-label" htmlFor="gro-address">Address</label>
                  <textarea id="gro-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                    disabled={!canEdit} className="ds-textarea" placeholder="Registered / correspondence address" />
                </div>

                {officer && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, background: 'var(--bg-subtle)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <span className="db-kpi2-foot-meta" style={{ display: 'block', marginBottom: 4 }}>Last updated</span>
                      <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{fmtDT(officer.updatedAt)}</span>
                    </div>
                    <div>
                      <span className="db-kpi2-foot-meta" style={{ display: 'block', marginBottom: 4 }}>Record created</span>
                      <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{fmtDate(officer.createdAt)}</span>
                    </div>
                  </div>
                )}

                {canEdit && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button" onClick={save}
                      disabled={saving || !canSubmit}
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
