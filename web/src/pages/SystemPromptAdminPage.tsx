import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Sparkles, Save, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { systemPromptApi } from '../api/systemPromptApi';
import type { SystemPromptResponse } from '../api/systemPromptApi';
import '../styles/AppPage.css';
import './Dashboard.css';

const SUGGESTED_KEYS = ['lucien.system', 'lucien.coach', 'lucien.summarise', 'lucien.classify'];

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

const MIN_PROMPT_LEN = 50;
const MAX_PROMPT_LEN = 10000;
const MAX_DESC_LEN = 500;

export default function SystemPromptAdminPage() {
  const [key, setKey]                     = useState('lucien.system');
  const [prompt, setPrompt]               = useState<SystemPromptResponse | null>(null);
  const [promptTemplate, setPromptTemplate] = useState('');
  const [description, setDescription]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [warn, setWarn]                   = useState<string | null>(null);
  const [saved, setSaved]                 = useState(false);

  const load = async (k: string) => {
    setLoading(true); setError(null); setWarn(null); setSaved(false);
    try {
      const data = await systemPromptApi.get(k);
      setPrompt(data); setPromptTemplate(data.promptTemplate || ''); setDescription(data.description || '');
    } catch (e: any) {
      setPrompt(null); setPromptTemplate(''); setDescription('');
      const status = e?.response?.status;
      if (status === 404) setWarn(`No prompt seeded under "${k}" yet — saving will create it.`);
      else setError(e?.response?.data?.message || 'Failed to load prompt.');
    } finally { setLoading(false); }
  };

  const save = async () => {
    const trimmed = promptTemplate.trim();
    if (trimmed.length < MIN_PROMPT_LEN) { setError(`Prompt text must be at least ${MIN_PROMPT_LEN} characters.`); return; }
    if (trimmed.length > MAX_PROMPT_LEN) { setError(`Prompt text must be under ${MAX_PROMPT_LEN} characters.`); return; }
    setSaving(true); setError(null); setWarn(null); setSaved(false);
    try {
      const updated = await systemPromptApi.update(key.trim(), {
        promptTemplate: trimmed, description: description.trim() || undefined,
      });
      setPrompt(updated); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save prompt.');
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
        {warn && (
          <motion.div key="toast-warn" className="db-att-row is-warn" style={{ marginBottom: 24, borderRadius: 8, padding: '12px 16px' }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
            <AlertCircle size={14} style={{ color: 'var(--warning)', marginRight: 8 }} />
            <span style={{ fontSize: 13, color: 'var(--ink-primary)' }}>{warn}</span>
            <button className="db-error-retry" onClick={() => setWarn(null)} style={{ marginLeft: 'auto', background: 'transparent' }}>
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
            <span>Saved successfully (v{prompt?.version})</span>
            <X size={13} className="ds-toast-x" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ maxWidth: 800 }}>
          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginBottom: 24 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="db-att-chip" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-subtle)', color: 'var(--ink-solid)' }}>
                  <Sparkles size={18} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h2 className="db-card-title">System Prompts</h2>
                  <span className="db-kpi2-foot-meta">Edit the instructions Lucien loads at runtime</span>
                </div>
              </div>
            </header>

            <div className="db-card-body" style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input
                  type="text" value={key} onChange={(e) => setKey(e.target.value)}
                  placeholder="prompt key (e.g. lucien.system)"
                  className="ds-input"
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13, height: 36 }}
                />
                <button
                  type="button" className="ds-btn is-secondary"
                  onClick={() => load(key.trim())}
                  disabled={!key.trim() || loading}
                  style={{ height: 36, width: 80 }}
                >
                  {loading ? <Loader2 size={14} className="ds-spin" /> : null}
                  Load
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-tertiary)', display: 'flex', alignItems: 'center' }}>Suggested:</span>
                {SUGGESTED_KEYS.map((k) => (
                  <button
                    key={k} type="button"
                    className="ds-pill is-neutral"
                    style={{ background: 'var(--bg-subtle)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                    onClick={() => { setKey(k); load(k); }}
                  >
                    {k}
                  </button>
                ))}
              </div>

              <div className="ds-field" style={{ marginBottom: 24 }}>
                <label className="ds-label is-required" htmlFor="prompt-text" style={{ marginBottom: 8, display: 'block' }}>Prompt text</label>
                <textarea
                  id="prompt-text" value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value.slice(0, MAX_PROMPT_LEN))}
                  placeholder="You are Lucien, the recovery-ops assistant. …"
                  rows={14}
                  className="ds-textarea"
                  style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.5, padding: '12px 16px', resize: 'vertical' }}
                />
                <span style={{ fontSize: 11, color: promptTemplate.trim().length > 0 && promptTemplate.trim().length < MIN_PROMPT_LEN ? 'var(--warning)' : 'var(--ink-tertiary)', display: 'block', marginTop: 4 }}>
                  {promptTemplate.length}/{MAX_PROMPT_LEN} · minimum {MIN_PROMPT_LEN} characters
                </span>
              </div>

              <div className="ds-field" style={{ marginBottom: 24 }}>
                <label className="ds-label" htmlFor="prompt-context" style={{ marginBottom: 8, display: 'block' }}>Description (optional)</label>
                <textarea
                  id="prompt-context" value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC_LEN))}
                  placeholder="Notes for the next reviewer — what this prompt is for, when to revisit, etc."
                  rows={3}
                  className="ds-textarea"
                  style={{ width: '100%', fontSize: 13, padding: '10px 14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                {prompt ? (
                  <span className="db-kpi2-foot-meta">
                    Version {prompt.version} · {prompt.isActive ? 'Active' : 'Inactive'} · Last updated {new Date(prompt.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </span>
                ) : <span />}
                <button
                  type="button" className="ds-btn is-primary"
                  onClick={save} disabled={saving || promptTemplate.trim().length < MIN_PROMPT_LEN}
                  style={{ height: 36 }}
                >
                  {saving ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <Save size={14} style={{ marginRight: 6 }} />}
                  Save prompt
                </button>
              </div>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
}
