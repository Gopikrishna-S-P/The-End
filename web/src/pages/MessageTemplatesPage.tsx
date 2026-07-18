import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  FileText, Send, CheckCircle2, Archive, AlertCircle, X, Loader2, Info,
  MessageSquareText, Clock,
} from 'lucide-react';
import { messageTemplatesApi } from '../api/messageTemplatesApi';
import { extractApiError } from '../utils/extractApiError';
import type { MessageTemplate } from '../types';
import '../styles/AppPage.css';
import './Dashboard.css';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.40, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ActionKey = 'submit-for-dlt' | 'activate' | 'retire';

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'is-success', DRAFT: 'is-neutral', PENDING_DLT: 'is-warn', RETIRED: 'is-danger', INACTIVE: 'is-neutral',
};

interface HistoryEntry {
  action: ActionKey;
  at: string;
  template: MessageTemplate;
}

export default function MessageTemplatesPage() {
  const [templateId, setTemplateId] = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [pending, setPending]       = useState<ActionKey | null>(null);
  const [result, setResult]         = useState<MessageTemplate | null>(null);
  const [history, setHistory]       = useState<HistoryEntry[]>([]);

  const validId = UUID_RE.test(templateId.trim());

  const runAction = async (action: ActionKey) => {
    if (!validId) return;
    setPending(action); setError(null);
    try {
      const id = templateId.trim();
      const tpl = action === 'submit-for-dlt' ? await messageTemplatesApi.submitForDlt(id)
        : action === 'activate' ? await messageTemplatesApi.activate(id)
        : await messageTemplatesApi.retire(id);
      setResult(tpl);
      setHistory(h => [{ action, at: new Date().toISOString(), template: tpl }, ...h].slice(0, 20));
    } catch (e) {
      setError(extractApiError(e, 'Action failed.'));
    } finally { setPending(null); }
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
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ maxWidth: 860, margin: '0 auto' }}>

          <motion.div variants={fadeUp} className="db-error-banner" style={{ marginBottom: 16, background: 'var(--info-subtle, var(--bg-subtle))', borderColor: 'var(--border-subtle)' }}>
            <Info size={16} aria-hidden="true" className="db-error-icon" style={{ color: 'var(--info)' }} />
            <div className="db-error-body">
              <span className="db-error-title">Template lookup isn't available from the API yet</span>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-secondary)' }}>
                The backend only exposes maker-checker action endpoints (submit for DLT / activate / retire) —
                there is no endpoint to list or fetch templates by key. Paste a template ID you already have
                (from the DB, a log line, or the approver's Slack message) to act on it. See BCR-3 in
                BACKEND-REQUESTS.md for the requested list/get endpoints.
              </p>
            </div>
          </motion.div>

          <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0, marginBottom: 16 }}>
            <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={15} style={{ color: 'var(--ink-tertiary)' }} />
              <h2 className="db-card-title">Message Template Review</h2>
            </header>
            <div className="db-card-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="ds-field">
                <label className="ds-label" htmlFor="mt-id">Template ID (UUID)</label>
                <input
                  id="mt-id" type="text" value={templateId}
                  onChange={(e) => { setTemplateId(e.target.value); setResult(null); }}
                  placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                  className="ds-input" style={{ fontFamily: 'var(--font-mono)' }}
                  autoComplete="off" spellCheck={false}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="ds-btn is-secondary" disabled={!validId || pending !== null}
                  onClick={() => runAction('submit-for-dlt')} style={{ height: 36 }}>
                  {pending === 'submit-for-dlt' ? <Loader2 size={14} className="ds-spin" /> : <Send size={14} />}
                  Submit for DLT
                </button>
                <button type="button" className="ds-btn is-primary" disabled={!validId || pending !== null}
                  onClick={() => runAction('activate')} style={{ height: 36 }}>
                  {pending === 'activate' ? <Loader2 size={14} className="ds-spin" /> : <CheckCircle2 size={14} />}
                  Activate
                </button>
                <button type="button" className="ds-btn is-secondary" disabled={!validId || pending !== null}
                  onClick={() => runAction('retire')} style={{ height: 36, color: 'var(--danger)' }}>
                  {pending === 'retire' ? <Loader2 size={14} className="ds-spin" /> : <Archive size={14} />}
                  Retire
                </button>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-tertiary)' }}>
                Submit for DLT: DRAFT → PENDING_DLT. Activate: DRAFT/PENDING_DLT → ACTIVE (requires a different
                user than the template's creator, and channel-specific fields — DLT id for SMS, WhatsApp
                namespace, or subject for EMAIL — plus a no-harassment content lint). Retire: any status →
                RETIRED, idempotent.
              </p>
            </div>
          </motion.section>

          <AnimatePresence>
            {result && (
              <motion.section variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }}
                className="ds-card db-card" style={{ marginBottom: 16 }}>
                <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquareText size={15} style={{ color: 'var(--ink-tertiary)' }} />
                  <h2 className="db-card-title">Result</h2>
                  <span className={`ds-pill ${STATUS_TONE[result.status] ?? 'is-neutral'}`} style={{ marginLeft: 'auto' }}>{result.status}</span>
                </header>
                <div className="db-card-body" style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, fontSize: 13 }}>
                  <Field label="Template key" value={result.templateKey} mono />
                  <Field label="Version" value={result.version} mono />
                  <Field label="Channel" value={result.channel} />
                  <Field label="Language" value={result.language} />
                  {result.category && <Field label="Category" value={result.category} />}
                  {result.dltTemplateId && <Field label="DLT template ID" value={result.dltTemplateId} mono />}
                  {result.whatsappNamespace && <Field label="WhatsApp namespace" value={result.whatsappNamespace} mono />}
                  {result.approvedByUserId && <Field label="Approved by" value={result.approvedByUserId} mono />}
                  {result.approvedAt && <Field label="Approved at" value={new Date(result.approvedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} />}
                  {result.subject && <Field label="Subject" value={result.subject} span2 />}
                  <Field label="Body" value={result.body} span2 />
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {history.length > 0 && (
            <motion.section variants={fadeUp} className="ds-card db-card" style={{ marginTop: 0 }}>
              <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={15} style={{ color: 'var(--ink-tertiary)' }} />
                <h2 className="db-card-title">This session's actions</h2>
              </header>
              <div className="ds-table-wrap" style={{ border: 'none' }}>
                <table className="ds-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '12px 16px', paddingLeft: 24 }}>When</th>
                      <th style={{ padding: '12px 16px' }}>Action</th>
                      <th style={{ padding: '12px 16px' }}>Template key</th>
                      <th style={{ padding: '12px 16px' }}>Resulting status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', paddingLeft: 24, color: 'var(--ink-tertiary)', fontSize: 12 }}>{new Date(h.at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                        <td style={{ padding: '12px 16px' }}>{h.action}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{h.template.templateKey}</td>
                        <td style={{ padding: '12px 16px' }}><span className={`ds-pill ${STATUS_TONE[h.template.status] ?? 'is-neutral'}`}>{h.template.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.section>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function Field({ label, value, mono, span2 }: { label: string; value: string; mono?: boolean; span2?: boolean }) {
  return (
    <div style={{ gridColumn: span2 ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--ink-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}
