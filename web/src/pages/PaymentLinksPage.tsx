import { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Link2, Loader2, AlertCircle, CheckCircle2, Copy, Search,
  IndianRupee, ExternalLink, Send, X, Check,
} from 'lucide-react';
import { paymentApi } from '../api/paymentApi';
import { useAuth } from '../AuthContext';
import type {
  PaymentIntentResponse, PaymentLinkResponse, PaymentIntentStatus,
  PaymentRail, PaymentLinkChannel,
} from '../types';
import '../styles/AppPage.css';
import './Dashboard.css';

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] } },
};

const RAILS: { value: PaymentRail; label: string }[] = [
  { value: 'UPI',         label: 'UPI' },
  { value: 'UPI_AUTOPAY', label: 'UPI Autopay' },
  { value: 'NACH',        label: 'NACH' },
  { value: 'EMANDATE',    label: 'e-Mandate' },
  { value: 'NEFT',        label: 'NEFT' },
  { value: 'RTGS',        label: 'RTGS' },
  { value: 'CHEQUE',      label: 'Cheque' },
  { value: 'CASH',        label: 'Cash' },
];

const CHANNELS: { value: PaymentLinkChannel; label: string }[] = [
  { value: 'SMS',          label: 'SMS' },
  { value: 'WHATSAPP',     label: 'WhatsApp' },
  { value: 'RCS',          label: 'RCS' },
  { value: 'EMAIL',        label: 'Email' },
  { value: 'VOICE_IVR',    label: 'Voice IVR' },
  { value: 'VOICE_AGENT',  label: 'Voice agent' },
];

const STATUS_CLASS: Record<PaymentIntentStatus, string> = {
  CREATED:    'is-info',
  AUTHORIZED: 'is-info',
  CAPTURED:   'is-success',
  RECONCILED: 'is-success',
  REFUNDED:   'is-neutral',
  DISPUTED:   'is-warn',
  FAILED:     'is-danger',
  EXPIRED:    'is-neutral',
  CANCELLED:  'is-neutral',
};

function fmtCurrency(v?: number | null, currency = 'INR') {
  if (v == null) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v);
}

function fmtDT(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusPill({ status }: { status: PaymentIntentStatus }) {
  return <span className={`ds-pill ${STATUS_CLASS[status] ?? 'is-neutral'}`}>{status}</span>;
}

export default function PaymentLinksPage() {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? '';

  // ── Create-intent form ──
  const [allocationId, setAllocationId] = useState('');
  const [borrowerId, setBorrowerId] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [intentExpiresAt, setIntentExpiresAt] = useState('');
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  // ── Lookup-by-id form ──
  const [lookupId, setLookupId] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // ── Active intent + issued link ──
  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null);
  const [rail, setRail] = useState<PaymentRail>('UPI');
  const [channel, setChannel] = useState<PaymentLinkChannel | ''>('');
  const [linkExpiresAt, setLinkExpiresAt] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [link, setLink] = useState<PaymentLinkResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const canSubmitIntent = allocationId.trim().length > 0 && Number(amount) >= 1 && orgId.length > 0;

  async function handleCreateIntent() {
    if (!canSubmitIntent) return;
    setCreatingIntent(true);
    setIntentError(null);
    setLink(null);
    try {
      const created = await paymentApi.createIntent({
        organizationId: orgId,
        allocationId: allocationId.trim(),
        borrowerId: borrowerId.trim() || undefined,
        amount: Number(amount),
        purpose: purpose.trim() || undefined,
        expiresAt: intentExpiresAt ? new Date(intentExpiresAt).toISOString() : undefined,
      });
      setIntent(created);
    } catch (e: any) {
      setIntentError(e?.response?.data?.message || 'Failed to create payment intent.');
    } finally {
      setCreatingIntent(false);
    }
  }

  async function handleLookup() {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    setLookupError(null);
    setLink(null);
    try {
      const found = await paymentApi.getIntent(lookupId.trim());
      setIntent(found);
    } catch (e: any) {
      setLookupError(e?.response?.data?.message || 'Intent not found, or it belongs to another organization.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleCreateLink() {
    if (!intent) return;
    setCreatingLink(true);
    setLinkError(null);
    try {
      const created = await paymentApi.createLink({
        intentId: intent.id,
        rail,
        issuedViaChannel: channel || undefined,
        expiresAt: linkExpiresAt ? new Date(linkExpiresAt).toISOString() : undefined,
      });
      setLink(created);
    } catch (e: any) {
      setLinkError(e?.response?.data?.message || 'Failed to issue payment link.');
    } finally {
      setCreatingLink(false);
    }
  }

  function resolvedUrl(l: PaymentLinkResponse): string {
    return l.shortUrl || `${window.location.origin}/p/${l.token}`;
  }

  function copyLink() {
    if (!link) return;
    const value = resolvedUrl(link);
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  }

  return (
    <div className="db-root">
      <div className="db-content">
        <motion.div className="db-inner" variants={stagger} initial="hidden" animate="show" style={{ maxWidth: 960 }}>
          <header className="db-card-head" style={{ marginBottom: 20, padding: 0, background: 'transparent', border: 'none' }}>
            <h2 className="db-card-title" style={{ fontSize: 20 }}>Payment Links</h2>
            <p className="db-kpi2-foot-meta" style={{ marginTop: 4 }}>
              Create a payment intent against a loan allocation, then issue a shareable UPI / NACH / e-Mandate link.
            </p>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24, alignItems: 'start' }}>

            {/* ── Left: create / lookup intent ── */}
            <motion.section variants={fadeUp} className="ds-card db-card">
              <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <h2 className="db-card-title"><IndianRupee size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} />New payment intent</h2>
              </header>
              <div className="db-card-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="ds-field">
                  <span className="ds-label is-required">Allocation ID</span>
                  <input
                    type="text"
                    value={allocationId}
                    onChange={e => setAllocationId(e.target.value)}
                    placeholder="UUID — from the Allocations list"
                    className="ds-input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                  />
                </div>
                <div className="ds-field">
                  <span className="ds-label">Borrower ID</span>
                  <input
                    type="text"
                    value={borrowerId}
                    onChange={e => setBorrowerId(e.target.value)}
                    placeholder="Optional — UUID"
                    className="ds-input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="ds-field">
                    <span className="ds-label is-required">Amount (₹)</span>
                    <input
                      type="number" min="1" step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="ds-input"
                    />
                  </div>
                  <div className="ds-field">
                    <span className="ds-label">Expires at</span>
                    <input
                      type="datetime-local"
                      value={intentExpiresAt}
                      onChange={e => setIntentExpiresAt(e.target.value)}
                      className="ds-input"
                    />
                  </div>
                </div>
                <div className="ds-field">
                  <span className="ds-label">Purpose</span>
                  <input
                    type="text" maxLength={200}
                    value={purpose}
                    onChange={e => setPurpose(e.target.value)}
                    placeholder="e.g. EMI collection — July"
                    className="ds-input"
                  />
                </div>

                {!orgId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--warning-subtle, var(--danger-subtle))', color: 'var(--warning, var(--danger))', fontSize: 12 }}>
                    <AlertCircle size={14} /><span>No organization found on your account — cannot create an intent.</span>
                  </div>
                )}
                {intentError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-subtle)', color: 'var(--danger)', fontSize: 12.5 }}>
                    <AlertCircle size={14} /><span>{intentError}</span>
                  </div>
                )}

                <button
                  type="button"
                  className="ds-btn is-primary"
                  onClick={handleCreateIntent}
                  disabled={!canSubmitIntent || creatingIntent}
                  style={{ height: 38 }}
                >
                  {creatingIntent ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <IndianRupee size={14} style={{ marginRight: 6 }} />}
                  {creatingIntent ? 'Creating…' : 'Create intent'}
                </button>
              </div>

              {/* Lookup existing */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="ds-label">Look up an existing intent</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={lookupId}
                    onChange={e => setLookupId(e.target.value)}
                    placeholder="Intent ID (UUID)"
                    className="ds-input"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 12, flex: 1 }}
                    onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
                  />
                  <button type="button" className="ds-btn is-secondary" onClick={handleLookup} disabled={!lookupId.trim() || lookupLoading} style={{ height: 36, flexShrink: 0 }}>
                    {lookupLoading ? <Loader2 size={14} className="ds-spin" /> : <Search size={14} />}
                  </button>
                </div>
                {lookupError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--danger)' }}>
                    <AlertCircle size={13} /><span>{lookupError}</span>
                  </div>
                )}
              </div>
            </motion.section>

            {/* ── Right: intent detail + issue link ── */}
            <motion.section variants={fadeUp} className="ds-card db-card">
              <header className="db-card-head" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <h2 className="db-card-title"><Link2 size={14} style={{ marginRight: 8, color: 'var(--ink-tertiary)' }} />Intent &amp; link</h2>
              </header>

              {!intent && (
                <div className="db-card-body" style={{ padding: 32, textAlign: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--ink-tertiary)' }}>
                    Create or look up a payment intent to issue a link.
                  </span>
                </div>
              )}

              <AnimatePresence>
                {intent && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="db-card-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-tertiary)' }}>{intent.id}</span>
                        <StatusPill status={intent.status} />
                      </div>
                      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className="db-kpi2-foot-meta">Amount</span>
                          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink-primary)', fontFamily: 'var(--font-mono)' }}>
                            {fmtCurrency(intent.amount, intent.currency)}
                          </span>
                        </div>
                        {intent.purpose && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span className="db-kpi2-foot-meta">Purpose</span>
                            <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{intent.purpose}</span>
                          </div>
                        )}
                        {intent.expiresAt && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span className="db-kpi2-foot-meta">Expires</span>
                            <span style={{ fontSize: 13, color: 'var(--ink-secondary)' }}>{fmtDT(intent.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Issue link */}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <span className="ds-label">Issue a payment link</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="ds-field">
                          <span className="ds-label">Rail</span>
                          <select value={rail} onChange={e => setRail(e.target.value as PaymentRail)} className="ds-input" style={{ height: 34 }}>
                            {RAILS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>
                        <div className="ds-field">
                          <span className="ds-label">Send via</span>
                          <select value={channel} onChange={e => setChannel(e.target.value as PaymentLinkChannel | '')} className="ds-input" style={{ height: 34 }}>
                            <option value="">Not specified</option>
                            {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="ds-field">
                        <span className="ds-label">Link expires at</span>
                        <input type="datetime-local" value={linkExpiresAt} onChange={e => setLinkExpiresAt(e.target.value)} className="ds-input" style={{ height: 34 }} />
                      </div>

                      {linkError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--danger)' }}>
                          <AlertCircle size={13} /><span>{linkError}</span>
                        </div>
                      )}

                      <button type="button" className="ds-btn is-primary" onClick={handleCreateLink} disabled={creatingLink} style={{ height: 36 }}>
                        {creatingLink ? <Loader2 size={14} className="ds-spin" style={{ marginRight: 6 }} /> : <Send size={14} style={{ marginRight: 6 }} />}
                        {creatingLink ? 'Issuing…' : 'Issue link'}
                      </button>

                      {link && (
                        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                          style={{ marginTop: 4, background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle2 size={14} style={{ color: 'var(--success)' }} />
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-primary)' }}>
                              Link issued{link.singleUse ? ' — single use' : ''}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <code style={{ flex: 1, fontSize: 12, padding: '6px 10px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {resolvedUrl(link)}
                            </code>
                            <button type="button" className="ds-btn is-secondary" onClick={copyLink} style={{ height: 30, padding: '0 10px', flexShrink: 0 }} title="Copy link">
                              {copied ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                            <a href={resolvedUrl(link)} target="_blank" rel="noreferrer" className="ds-btn is-secondary" style={{ height: 30, padding: '0 10px', flexShrink: 0, textDecoration: 'none' }} title="Open link">
                              <ExternalLink size={13} />
                            </a>
                          </div>
                          {link.expiresAt && (
                            <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>Expires {fmtDT(link.expiresAt)}</span>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
