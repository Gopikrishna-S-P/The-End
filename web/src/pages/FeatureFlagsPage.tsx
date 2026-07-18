import { useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Flag, Plus, Loader2, AlertCircle, X, Save, Building2, Globe } from 'lucide-react';
import { featureFlagsApi } from '../api/featureFlagsApi';
import type { FeatureFlag } from '../api/featureFlagsApi';
import '../styles/AppPage.css';
import './Dashboard.css';

type Scope = 'GLOBAL' | 'ORG';

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

export default function FeatureFlagsPage() {
  const [scope, setScope]               = useState<Scope>('GLOBAL');
  const [orgIdFilter, setOrgIdFilter]   = useState('');
  const [flags, setFlags]               = useState<FeatureFlag[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [newKey, setNewKey]             = useState('');
  const [newEnabled, setNewEnabled]     = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving]             = useState(false);
  const [togglingKey, setTogglingKey]   = useState<string | null>(null);

  const effectiveOrgId = scope === 'GLOBAL' ? null : (orgIdFilter.trim() || null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setFlags(await featureFlagsApi.list(effectiveOrgId) || []); }
    catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load flags.');
      setFlags([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [scope, orgIdFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setSaving(true); setError(null);
    try {
      await featureFlagsApi.upsert({
        organizationId: effectiveOrgId,
        flagKey: newKey.trim(),
        enabled: newEnabled,
        description: newDescription.trim() || undefined,
      });
      setNewKey(''); setNewEnabled(false); setNewDescription(''); setShowAdd(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create flag.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    setTogglingKey(flag.flagKey); setError(null);
    try {
      await featureFlagsApi.upsert({
        organizationId: flag.organizationId,
        flagKey: flag.flagKey,
        enabled: !flag.enabled,
        description: flag.description ?? undefined,
      });
      // Backend returns a confirmation message, not the updated flag — update locally.
      setFlags((prev) => prev.map((f) =>
        f.flagKey === flag.flagKey && f.organizationId === flag.organizationId
          ? { ...f, enabled: !flag.enabled }
          : f,
      ));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to toggle flag.');
    } finally { setTogglingKey(null); }
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
      </AnimatePresence>

      <div className="db-content">

        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">
          <motion.div variants={fadeUp} className="db-trend-range-toggle" style={{ margin: '0 0 16px 0', alignSelf: 'flex-start' }}>
            <button
              type="button"
              className={`db-trend-range-btn${scope === 'GLOBAL' ? ' is-active' : ''}`}
              onClick={() => setScope('GLOBAL')}
            >
              <Globe size={13} style={{ marginRight: 6 }} /> Global
            </button>
            <button
              type="button"
              className={`db-trend-range-btn${scope === 'ORG' ? ' is-active' : ''}`}
              onClick={() => setScope('ORG')}
            >
              <Building2 size={13} style={{ marginRight: 6 }} /> Per-org
            </button>
          </motion.div>

          <AnimatePresence mode="wait">
            {scope === 'ORG' && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ width: 300 }}>
                  <input
                    type="text"
                    placeholder="Organization UUID"
                    value={orgIdFilter}
                    onChange={(e) => setOrgIdFilter(e.target.value)}
                    className="ds-input"
                    style={{ width: '100%', height: 36 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showAdd && (
              <motion.form variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="ds-card db-card" onSubmit={handleAdd} style={{ marginBottom: 16 }}>
                <div className="db-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div className="ds-field" style={{ flex: 1, minWidth: 200 }}>
                      <label className="ds-label" htmlFor="ff-key">Flag key</label>
                      <input
                        id="ff-key" type="text" value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="e.g. payments.upi-deeplink"
                        className="ds-input" required
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    <div className="ds-field" style={{ flex: 2, minWidth: 300 }}>
                      <label className="ds-label" htmlFor="ff-desc">Description</label>
                      <input
                        id="ff-desc" type="text" value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="What does this flag control?"
                        className="ds-input"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="checkbox" className="ds-checkbox"
                        checked={newEnabled}
                        onChange={(e) => setNewEnabled(e.target.checked)}
                      />
                      <span>Enabled on create</span>
                    </label>
                    <button type="submit" className="ds-btn is-primary" disabled={saving || !newKey.trim()} style={{ height: 36 }}>
                      {saving ? <Loader2 size={14} className="ds-spin" /> : <Save size={14} />}
                      Create flag
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="db-card-title">Feature Flags</h2>
                {!loading && flags.length > 0 && (
                  <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>
                    / {flags.length} flags configured
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => { setShowAdd(!showAdd); setError(null); }}
                  className={`ds-btn ${showAdd ? 'is-secondary' : 'is-primary'}`}
                  style={{ height: 36 }}
                >
                  {showAdd ? <X size={14} /> : <Plus size={14} />}
                  {showAdd ? 'Cancel' : 'New flag'}
                </button>
              </div>
            </header>

            <div className="ds-table-wrap" style={{ border: 'none' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Key</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Scope</th>
                    <th style={{ padding: '12px 16px' }}>Description</th>
                    <th className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.08, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: '70%', display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 22, width: 64, borderRadius: 999, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 22, width: 64, borderRadius: 999, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: '60%', display: 'block' }} /></td>
                        <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 32, width: 72, borderRadius: 8, marginLeft: 'auto', display: 'block' }} /></td>
                      </tr>
                    ))
                  ) : flags.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                          <Flag size={32} className="ds-empty-icon" />
                          <span className="ds-empty-title">No flags in this scope</span>
                          <span className="ds-empty-sub">Create a new flag with the button above.</span>
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {flags.map((f, idx) => (
                        <motion.tr
                          key={`${f.organizationId ?? 'global'}-${f.flagKey}`}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.28, delay: idx * 0.02 }}
                          style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                          <td style={{ padding: '12px 16px', paddingLeft: 24, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink-primary)' }}>
                            {f.flagKey}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className={`ds-pill ${f.enabled ? 'is-success' : 'is-neutral'}`}>
                              {f.enabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className="ds-pill is-info" style={{ gap: 4 }}>
                              {f.organizationId
                                ? <><Building2 size={11} /> {f.organizationId.slice(0, 8)}…</>
                                : <><Globe size={11} /> Global</>}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--ink-secondary)' }}>
                            {f.description || '—'}
                          </td>
                          <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>
                            <button
                              type="button"
                              className={`ds-btn ${f.enabled ? 'is-secondary' : 'is-primary'} is-sm`}
                              onClick={() => handleToggle(f)}
                              disabled={togglingKey === f.flagKey}
                              style={{ width: 80, height: 32 }}
                            >
                              {togglingKey === f.flagKey ? <Loader2 size={14} className="ds-spin" /> : f.enabled ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}