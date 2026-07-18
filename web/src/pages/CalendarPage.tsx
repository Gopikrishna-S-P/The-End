import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  CalendarOff, Plus, Loader2, AlertCircle, X, Save, Trash2,
  ChevronLeft, ChevronRight, Settings2, Search, CheckCircle2, XCircle,
} from 'lucide-react';
import { calendarApi } from '../api/calendarApi';
import { useAuth } from '../AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { extractApiError } from '../utils/extractApiError';
import type { HolidayCalendar, AgentCapacityConfig } from '../types';
import '../styles/AppPage.css';
import './Dashboard.css';

const PAGE_SIZE = 20;

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

function fmtDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  } catch { return iso; }
}

export default function CalendarPage() {
  const { user } = useAuth();
  const { hasRole } = usePermissions();
  const isAdmin = hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN');

  // Platform admins may have no home org — let them type one, like FeatureFlagsPage does.
  const [orgIdInput, setOrgIdInput] = useState('');
  const orgId = user?.organizationId || orgIdInput.trim();
  const needsOrgInput = !user?.organizationId;

  const [holidays, setHolidays]       = useState<HolidayCalendar[]>([]);
  const [page, setPage]               = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const [config, setConfig]           = useState<AgentCapacityConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configForm, setConfigForm]   = useState({ maxCasesPerAgentPerDay: 50, allowWeekendAssignments: false, allowHolidayAssignments: false });
  const [configSaving, setConfigSaving] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);

  const [showAdd, setShowAdd]         = useState(false);
  const [newDate, setNewDate]         = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving]           = useState(false);
  const [removingId, setRemovingId]   = useState<string | null>(null);

  const [checkDate, setCheckDate]     = useState('');
  const [checkResult, setCheckResult] = useState<boolean | null>(null);
  const [checking, setChecking]       = useState(false);

  const loadHolidays = useCallback(async () => {
    if (!orgId) { setHolidays([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await calendarApi.getHolidays(orgId, page, PAGE_SIZE);
      setHolidays(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (e) {
      setError(extractApiError(e, 'Failed to load holidays.'));
      setHolidays([]);
    } finally { setLoading(false); }
  }, [orgId, page]);

  const loadConfig = useCallback(async () => {
    if (!orgId) { setConfig(null); setConfigLoading(false); return; }
    setConfigLoading(true);
    try {
      const cfg = await calendarApi.getCapacityConfig(orgId);
      setConfig(cfg);
      setConfigForm({
        maxCasesPerAgentPerDay: cfg.maxCasesPerAgentPerDay,
        allowWeekendAssignments: cfg.allowWeekendAssignments,
        allowHolidayAssignments: cfg.allowHolidayAssignments,
      });
      setConfigDirty(false);
    } catch (e) {
      setError(extractApiError(e, 'Failed to load capacity config.'));
    } finally { setConfigLoading(false); }
  }, [orgId]);

  useEffect(() => { loadHolidays(); }, [loadHolidays]);
  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !newDate) return;
    setSaving(true); setError(null);
    try {
      await calendarApi.addHoliday({ organizationId: orgId, holidayDate: newDate, description: newDescription.trim() || undefined });
      setNewDate(''); setNewDescription(''); setShowAdd(false);
      setPage(0);
      await loadHolidays();
    } catch (e) {
      setError(extractApiError(e, 'Failed to add holiday.'));
    } finally { setSaving(false); }
  };

  const handleRemoveHoliday = async (id: string) => {
    setRemovingId(id); setError(null);
    try {
      await calendarApi.removeHoliday(id);
      await loadHolidays();
    } catch (e) {
      setError(extractApiError(e, 'Failed to remove holiday.'));
    } finally { setRemovingId(null); }
  };

  const handleSaveConfig = async () => {
    if (!orgId) return;
    setConfigSaving(true); setError(null);
    try {
      const updated = await calendarApi.upsertCapacityConfig({ organizationId: orgId, ...configForm });
      setConfig(updated);
      setConfigDirty(false);
    } catch (e) {
      setError(extractApiError(e, 'Failed to save capacity config.'));
    } finally { setConfigSaving(false); }
  };

  const handleCheckDate = async () => {
    if (!orgId || !checkDate) return;
    setChecking(true); setCheckResult(null); setError(null);
    try {
      const assignable = await calendarApi.checkAssignableDate(checkDate, orgId);
      setCheckResult(assignable);
    } catch (e) {
      setError(extractApiError(e, 'Failed to check date.'));
    } finally { setChecking(false); }
  };

  return (
    <div className="db-root">
      <AnimatePresence>
        {error && (
          <motion.div key="toast-err" className="db-error-banner" role="alert" style={{ marginBottom: 24 }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={16} aria-hidden="true" className="db-error-icon" />
            <div className="db-error-body"><span className="db-error-title">{error}</span></div>
            <button className="db-error-retry" onClick={() => setError(null)} aria-label="Dismiss"><X size={14} aria-hidden="true" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show">

          {needsOrgInput && (
            <motion.div variants={fadeUp} style={{ marginBottom: 16, width: 300 }}>
              <label className="ds-label" htmlFor="cal-org-id" style={{ display: 'block', marginBottom: 6 }}>Organization UUID</label>
              <input
                id="cal-org-id" type="text" placeholder="Organization UUID" value={orgIdInput}
                onChange={(e) => { setOrgIdInput(e.target.value); setPage(0); }}
                className="ds-input" style={{ width: '100%', height: 36 }}
              />
            </motion.div>
          )}

          {/* ── Capacity config ── */}
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, marginBottom: 16 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings2 size={15} style={{ color: 'var(--ink-tertiary)' }} />
              <h2 className="db-card-title">Agent Capacity Config</h2>
            </header>
            <div className="db-card-body" style={{ padding: 20 }}>
              {configLoading ? (
                <span className="ds-skel" style={{ height: 60, width: '100%', display: 'block', borderRadius: 8 }} />
              ) : !orgId ? (
                <span style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>Enter an organization UUID to view its capacity config.</span>
              ) : (
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="ds-field" style={{ width: 220 }}>
                    <label className="ds-label" htmlFor="cal-max-cases">Max cases / agent / day</label>
                    <input
                      id="cal-max-cases" type="number" min={1} max={500}
                      value={configForm.maxCasesPerAgentPerDay}
                      disabled={!isAdmin}
                      onChange={(e) => { setConfigForm(f => ({ ...f, maxCasesPerAgentPerDay: Number(e.target.value) })); setConfigDirty(true); }}
                      className="ds-input"
                    />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default', fontSize: 13 }}>
                    <input type="checkbox" className="ds-checkbox" disabled={!isAdmin}
                      checked={configForm.allowWeekendAssignments}
                      onChange={(e) => { setConfigForm(f => ({ ...f, allowWeekendAssignments: e.target.checked })); setConfigDirty(true); }} />
                    <span>Allow weekend assignments</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isAdmin ? 'pointer' : 'default', fontSize: 13 }}>
                    <input type="checkbox" className="ds-checkbox" disabled={!isAdmin}
                      checked={configForm.allowHolidayAssignments}
                      onChange={(e) => { setConfigForm(f => ({ ...f, allowHolidayAssignments: e.target.checked })); setConfigDirty(true); }} />
                    <span>Allow holiday assignments</span>
                  </label>
                  {isAdmin && (
                    <button type="button" className="ds-btn is-primary" disabled={!configDirty || configSaving} onClick={handleSaveConfig} style={{ height: 36, marginLeft: 'auto' }}>
                      {configSaving ? <Loader2 size={14} className="ds-spin" /> : <Save size={14} />}
                      Save config
                    </button>
                  )}
                  {!config?.id && !configLoading && (
                    <span className="ds-pill is-neutral" style={{ fontSize: 10 }}>Using platform defaults — nothing saved yet</span>
                  )}
                </div>
              )}
            </div>
          </motion.section>

          {/* ── Assignable-date checker ── */}
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, marginBottom: 16 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={15} style={{ color: 'var(--ink-tertiary)' }} />
              <h2 className="db-card-title">Check assignable date</h2>
            </header>
            <div className="db-card-body" style={{ padding: 20, display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
              <div className="ds-field" style={{ width: 200 }}>
                <label className="ds-label" htmlFor="cal-check-date">Date</label>
                <input id="cal-check-date" type="date" value={checkDate} onChange={(e) => { setCheckDate(e.target.value); setCheckResult(null); }} className="ds-input" />
              </div>
              <button type="button" className="ds-btn is-secondary" disabled={!orgId || !checkDate || checking} onClick={handleCheckDate} style={{ height: 36 }}>
                {checking ? <Loader2 size={14} className="ds-spin" /> : 'Check'}
              </button>
              {checkResult !== null && (
                <span className={`ds-pill ${checkResult ? 'is-success' : 'is-danger'}`} style={{ gap: 6 }}>
                  {checkResult ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {checkResult ? 'Assignable' : 'Not assignable'}
                </span>
              )}
            </div>
          </motion.section>

          {/* ── Add holiday form ── */}
          <AnimatePresence>
            {showAdd && isAdmin && (
              <motion.form variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="ds-card db-card" onSubmit={handleAddHoliday} style={{ marginBottom: 16 }}>
                <div className="db-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <div className="ds-field" style={{ width: 200 }}>
                      <label className="ds-label" htmlFor="cal-new-date">Holiday date</label>
                      <input id="cal-new-date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="ds-input" required />
                    </div>
                    <div className="ds-field" style={{ flex: 1, minWidth: 240 }}>
                      <label className="ds-label" htmlFor="cal-new-desc">Description</label>
                      <input id="cal-new-desc" type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="e.g. Independence Day" className="ds-input" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="ds-btn is-primary" disabled={saving || !newDate} style={{ height: 36 }}>
                      {saving ? <Loader2 size={14} className="ds-spin" /> : <Save size={14} />}
                      Add holiday
                    </button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* ── Holidays table ── */}
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 className="db-card-title">Holiday Calendar</h2>
                {!loading && totalElements > 0 && (
                  <span className="db-section-label" style={{ padding: 0, color: 'var(--ink-tertiary)' }}>/ {totalElements.toLocaleString('en-IN')} holidays</span>
                )}
              </div>
              {isAdmin && (
                <button type="button" onClick={() => { setShowAdd(v => !v); setError(null); }} className={`ds-btn ${showAdd ? 'is-secondary' : 'is-primary'}`} style={{ height: 36 }}>
                  {showAdd ? <X size={14} /> : <Plus size={14} />}
                  {showAdd ? 'Cancel' : 'Add holiday'}
                </button>
              )}
            </header>

            <div className="ds-table-wrap" style={{ border: 'none' }}>
              <table className="ds-table">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: '12px 16px', paddingLeft: 24 }}>Date</th>
                    <th style={{ padding: '12px 16px' }}>Description</th>
                    {isAdmin && <th className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} style={{ opacity: 1 - i * 0.08, borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24 }}><span className="ds-skel" style={{ height: 14, width: 90, display: 'block' }} /></td>
                        <td style={{ padding: '12px 16px' }}><span className="ds-skel" style={{ height: 14, width: '50%', display: 'block' }} /></td>
                        {isAdmin && <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}><span className="ds-skel" style={{ height: 28, width: 28, borderRadius: 6, marginLeft: 'auto', display: 'block' }} /></td>}
                      </tr>
                    ))
                  ) : !orgId ? (
                    <tr><td colSpan={isAdmin ? 3 : 2}>
                      <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                        <CalendarOff size={32} className="ds-empty-icon" />
                        <span className="ds-empty-title">No organization selected</span>
                        <span className="ds-empty-sub">Enter an organization UUID above to view its holiday calendar.</span>
                      </motion.div>
                    </td></tr>
                  ) : holidays.length === 0 ? (
                    <tr><td colSpan={isAdmin ? 3 : 2}>
                      <motion.div className="ds-empty" variants={fadeIn} initial="hidden" animate="show" style={{ padding: '80px 0' }}>
                        <CalendarOff size={32} className="ds-empty-icon" />
                        <span className="ds-empty-title">No holidays configured</span>
                        <span className="ds-empty-sub">{isAdmin ? 'Add one with the button above.' : 'No holidays have been added for this organization yet.'}</span>
                      </motion.div>
                    </td></tr>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {holidays.map((h, idx) => (
                        <motion.tr key={h.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.28, delay: idx * 0.02 }} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px', paddingLeft: 24, fontWeight: 600, color: 'var(--ink-primary)' }}>{fmtDate(h.holidayDate)}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--ink-secondary)' }}>{h.description || '—'}</td>
                          {isAdmin && (
                            <td className="is-right" style={{ padding: '12px 16px', paddingRight: 24 }}>
                              <button type="button" className="ds-btn is-secondary is-sm" disabled={removingId === h.id}
                                onClick={() => handleRemoveHoliday(h.id)} aria-label={`Remove ${h.holidayDate}`}
                                style={{ width: 32, height: 32, color: 'var(--danger)' }}>
                                {removingId === h.id ? <Loader2 size={14} className="ds-spin" /> : <Trash2 size={14} />}
                              </button>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && !loading && (
              <div className="up-pagination" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                <span className="up-page-meta">Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong> · <strong>{totalElements.toLocaleString('en-IN')}</strong> holidays</span>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  <button type="button" className="up-page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page"><ChevronLeft size={14} /></button>
                  <button type="button" className="up-page-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page + 1 >= totalPages} aria-label="Next page"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
