import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Loader2, AlertCircle, ShieldCheck, UserPlus, Trash2, FileWarning,
  Gauge, Layers, Plus,
} from 'lucide-react';
import { borrowersApi } from '../api/borrowersApi';
import { riskApi } from '../api/riskApi';
import { allocationsApi } from '../api/allocationsApi';
import { usePermissions } from '../hooks/usePermissions';
import type {
  BorrowerResponse, ConsentArtifactResponse, ConsentPurpose, ConsentScope,
  DataErasureRequestResponse, ErasureRequestStatus, NomineeResponse, BorrowerRiskScoreResponse, AllocationResponse,
} from '../types';
import { fmtDate, fmtDT } from './LoanDetailHelpers';
import {
  CONSENT_PILL, ERASURE_PILL, SEGMENT_LABEL, SEGMENT_TONE, LEVEL_TONE, fmtPct, borrowerFullName,
} from './BorrowersHelpers';
import '../styles/AppPage.css';
// Not globally loaded elsewhere (pre-existing gap) — imported directly so the
// .ptp-stat / .ptp-drawer-* primitives this drawer reuses actually apply.
import '../styles/PtpsPage.css';

type Tab = 'profile' | 'consents' | 'nominee' | 'erasure' | 'risk' | 'loans';

const CONSENT_PURPOSES: ConsentPurpose[] = [
  'LOAN_RECOVERY_CONTACT', 'FIELD_VISIT', 'CALL_RECORDING', 'DATA_SHARING_WITH_AGENCY',
  'CREDIT_BUREAU_REPORTING', 'AUTOMATED_DECISIONING', 'MARKETING_COMMUNICATIONS',
];
const CONSENT_SCOPES: ConsentScope[] = ['ANY', 'SMS', 'WHATSAPP', 'EMAIL', 'VOICE_CALL', 'RCS', 'IN_PERSON'];

export interface BorrowerDetailDrawerProps {
  borrower: BorrowerResponse;
  onClose: () => void;
  onChanged: () => void;
}

export default function BorrowerDetailDrawer({ borrower: b, onClose, onChanged }: BorrowerDetailDrawerProps) {
  const { hasRole } = usePermissions();
  const isAdmin = hasRole('ORG_ADMIN') || hasRole('PLATFORM_ADMIN');
  const [tab, setTab] = useState<Tab>('profile');

  return (
    <>
      <div className="ds-drawer-overlay" onClick={onClose} />
      <div className="ds-drawer" role="dialog" aria-modal="true">
        <div className="ds-drawer-header">
          <div className="ptp-drawer-title-col">
            <div className="ptp-drawer-title">{borrowerFullName(b)}</div>
            <div className="ptp-drawer-sub-meta">{b.ckycId ? `CKYC ${b.ckycId}` : 'No CKYC on file'}</div>
            <div className="ptp-drawer-sub">Registered {fmtDate(b.createdAt)}</div>
          </div>
          <button type="button" onClick={onClose} className="ds-drawer-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-tabs" style={{ padding: '0 24px' }}>
          <button type="button" className={`ds-tab${tab === 'profile' ? ' is-active' : ''}`} onClick={() => setTab('profile')}>Profile</button>
          <button type="button" className={`ds-tab${tab === 'consents' ? ' is-active' : ''}`} onClick={() => setTab('consents')}>Consents</button>
          <button type="button" className={`ds-tab${tab === 'nominee' ? ' is-active' : ''}`} onClick={() => setTab('nominee')}>Nominee</button>
          {isAdmin && (
            <button type="button" className={`ds-tab${tab === 'erasure' ? ' is-active' : ''}`} onClick={() => setTab('erasure')}>Erasure</button>
          )}
          <button type="button" className={`ds-tab${tab === 'risk' ? ' is-active' : ''}`} onClick={() => setTab('risk')}>Risk</button>
          <button type="button" className={`ds-tab${tab === 'loans' ? ' is-active' : ''}`} onClick={() => setTab('loans')}>Loans</button>
        </div>

        <div className="ds-drawer-body">
          {tab === 'profile' && <ProfileTab b={b} />}
          {tab === 'consents' && <ConsentsTab borrowerId={b.id} onChanged={onChanged} />}
          {tab === 'nominee' && <NomineeTab borrowerId={b.id} />}
          {tab === 'erasure' && isAdmin && <ErasureTab borrower={b} onChanged={onChanged} />}
          {tab === 'risk' && <RiskTab borrowerId={b.id} canScore={isAdmin} />}
          {tab === 'loans' && <LoansTab borrowerId={b.id} />}
        </div>
      </div>
    </>
  );
}

// ── Profile ──────────────────────────────────────────────────────────────────

function ProfileTab({ b }: { b: BorrowerResponse }) {
  return (
    <>
      {b.erasurePending && (
        <div className="ptp-drawer-pills" style={{ marginBottom: 16 }}>
          <span className="ds-pill is-warn"><FileWarning size={11} /> Erasure pending</span>
        </div>
      )}
      <div className="ptp-stat-grid">
        <div className="ptp-stat">
          <div className="ptp-stat-label">Email</div>
          <div className="ptp-stat-value is-text">{b.email || '—'}</div>
        </div>
        <div className="ptp-stat">
          <div className="ptp-stat-label">Phone</div>
          <div className="ptp-stat-value is-text">{b.phone || '—'}</div>
        </div>
        <div className="ptp-stat">
          <div className="ptp-stat-label">CKYC ID</div>
          <div className="ptp-stat-value is-mono">{b.ckycId || '—'}</div>
        </div>
        <div className="ptp-stat">
          <div className="ptp-stat-label">Last updated</div>
          <div className="ptp-stat-value is-text">{fmtDate(b.updatedAt)}</div>
        </div>
      </div>
      {b.address && (
        <div style={{ marginTop: 16 }}>
          <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Address</span>
          <p style={{ fontSize: 13, color: 'var(--ink-primary)', marginTop: 4 }}>{b.address}</p>
        </div>
      )}
    </>
  );
}

// ── Consents ─────────────────────────────────────────────────────────────────

function ConsentsTab({ borrowerId, onChanged }: { borrowerId: string; onChanged: () => void }) {
  const [consents, setConsents] = useState<ConsentArtifactResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [busyKey, setBusyKey]   = useState<string | null>(null);

  const [purpose, setPurpose]   = useState<ConsentPurpose>('LOAN_RECOVERY_CONTACT');
  const [scope, setScope]       = useState<ConsentScope>('ANY');
  const [termsText, setTermsText] = useState('');
  const [termsVersion, setTermsVersion] = useState('v1');
  const [evidenceRef, setEvidenceRef]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    borrowersApi.listConsents(borrowerId)
      .then(setConsents)
      .catch(() => setConsents([]))
      .finally(() => setLoading(false));
  }, [borrowerId]);

  useEffect(() => { load(); }, [load]);

  const submitConsent = async () => {
    if (!termsText.trim() || !termsVersion.trim()) return;
    setSubmitting(true); setError(null);
    try {
      await borrowersApi.grantConsent(borrowerId, {
        purpose, scope, termsText: termsText.trim(), termsVersion: termsVersion.trim(),
        evidenceRef: evidenceRef.trim() || undefined,
      });
      setShowForm(false); setTermsText(''); setEvidenceRef('');
      load(); onChanged();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to record consent.');
    } finally { setSubmitting(false); }
  };

  const revoke = async (c: ConsentArtifactResponse) => {
    const key = `${c.purpose}:${c.scope}`;
    setBusyKey(key);
    try {
      await borrowersApi.revokeConsent(borrowerId, c.purpose, c.scope, 'Revoked from borrower profile');
      load(); onChanged();
    } catch { /* surfaced via reload not finding change */ } finally { setBusyKey(null); }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="db-section-label" style={{ padding: 0 }}>Consent artifacts</span>
        <button type="button" className="ds-btn is-secondary is-sm" onClick={() => setShowForm(v => !v)}>
          <Plus size={13} /> Record consent
        </button>
      </div>

      {showForm && (
        <div className="ds-card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-field">
              <span className="ds-label">Purpose</span>
              <select className="ds-select" value={purpose} onChange={e => setPurpose(e.target.value as ConsentPurpose)}>
                {CONSENT_PURPOSES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div className="ds-field">
              <span className="ds-label">Scope</span>
              <select className="ds-select" value={scope} onChange={e => setScope(e.target.value as ConsentScope)}>
                {CONSENT_SCOPES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="ds-field">
            <span className="ds-label is-required">Terms text</span>
            <textarea className="ds-textarea" rows={2} value={termsText} onChange={e => setTermsText(e.target.value)}
              placeholder="Consent language shown / read to the borrower" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="ds-field">
              <span className="ds-label is-required">Terms version</span>
              <input className="ds-input" value={termsVersion} onChange={e => setTermsVersion(e.target.value)} placeholder="v1" />
            </div>
            <div className="ds-field">
              <span className="ds-label">Evidence reference</span>
              <input className="ds-input" value={evidenceRef} onChange={e => setEvidenceRef(e.target.value)} placeholder="Recording / doc URL" />
            </div>
          </div>
          {error && <div className="ptp-modal-error" role="alert"><AlertCircle size={14} /><span>{error}</span></div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="ds-btn is-secondary is-sm" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="button" className="ds-btn is-primary is-sm" disabled={submitting || !termsText.trim()} onClick={submitConsent}>
              {submitting ? <Loader2 size={13} className="ds-spin" /> : <ShieldCheck size={13} />} Record
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <span className="ptp-loading"><Loader2 size={12} className="ds-spin" /> Loading…</span>
      ) : consents.length === 0 ? (
        <p className="ptp-no-history">No consent artifacts recorded.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {consents.map(c => (
            <div key={c.id} className="ds-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.purpose.replace(/_/g, ' ')} · {c.scope.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>Granted {fmtDT(c.grantedAt)} · v{c.termsVersion}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`ds-pill ${CONSENT_PILL[c.status]}`}>{c.status}</span>
                {c.status === 'ACTIVE' && (
                  <button type="button" className="ds-btn is-secondary is-sm" disabled={busyKey === `${c.purpose}:${c.scope}`} onClick={() => revoke(c)}>
                    {busyKey === `${c.purpose}:${c.scope}` ? <Loader2 size={12} className="ds-spin" /> : <Trash2 size={12} />} Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Nominee ──────────────────────────────────────────────────────────────────

function NomineeTab({ borrowerId }: { borrowerId: string }) {
  const [nominee, setNominee] = useState<NomineeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [name, setName]         = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    borrowersApi.getNominee(borrowerId)
      .then(n => {
        setNominee(n);
        if (n) { setName(n.nomineeName); setRelation(n.nomineeRelation); setPhone(n.nomineePhone || ''); setEmail(n.nomineeEmail || ''); }
      })
      .catch(() => setNominee(null))
      .finally(() => setLoading(false));
  }, [borrowerId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!name.trim() || !relation.trim()) return;
    setSubmitting(true); setError(null);
    try {
      await borrowersApi.upsertNominee(borrowerId, {
        nomineeName: name.trim(), nomineeRelation: relation.trim(),
        nomineePhone: phone.trim() || undefined, nomineeEmail: email.trim() || undefined,
      });
      setEditing(false); load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to save nominee.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <span className="ptp-loading"><Loader2 size={12} className="ds-spin" /> Loading…</span>;

  if (!editing && nominee) {
    return (
      <>
        <div className="ptp-stat-grid">
          <div className="ptp-stat">
            <div className="ptp-stat-label">Name</div>
            <div className="ptp-stat-value is-text">{nominee.nomineeName}</div>
          </div>
          <div className="ptp-stat">
            <div className="ptp-stat-label">Relation</div>
            <div className="ptp-stat-value is-text">{nominee.nomineeRelation}</div>
          </div>
          <div className="ptp-stat">
            <div className="ptp-stat-label">Phone</div>
            <div className="ptp-stat-value is-text">{nominee.nomineePhone || '—'}</div>
          </div>
          <div className="ptp-stat">
            <div className="ptp-stat-label">Recorded</div>
            <div className="ptp-stat-value is-text">{fmtDate(nominee.recordedAt)}</div>
          </div>
        </div>
        <button type="button" className="ds-btn is-secondary is-sm" style={{ marginTop: 16 }} onClick={() => setEditing(true)}>
          <UserPlus size={13} /> Update nominee
        </button>
      </>
    );
  }

  return (
    <>
      {!nominee && <p className="ptp-no-history" style={{ marginBottom: 12 }}>No nominee recorded for this borrower yet.</p>}
      <div className="ds-field">
        <span className="ds-label is-required">Nominee name</span>
        <input className="ds-input" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="ds-field">
          <span className="ds-label is-required">Relation</span>
          <input className="ds-input" value={relation} onChange={e => setRelation(e.target.value)} placeholder="e.g. Spouse" />
        </div>
        <div className="ds-field">
          <span className="ds-label">Phone</span>
          <input className="ds-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91…" />
        </div>
      </div>
      <div className="ds-field">
        <span className="ds-label">Email</span>
        <input className="ds-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
      </div>
      {error && <div className="ptp-modal-error" role="alert"><AlertCircle size={14} /><span>{error}</span></div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {nominee && <button type="button" className="ds-btn is-secondary is-sm" onClick={() => setEditing(false)}>Cancel</button>}
        <button type="button" className="ds-btn is-primary is-sm" disabled={submitting || !name.trim() || !relation.trim()} onClick={submit}>
          {submitting ? <Loader2 size={13} className="ds-spin" /> : <UserPlus size={13} />} Save nominee
        </button>
      </div>
    </>
  );
}

// ── Erasure (DPDP right-to-erasure requests; org-admin visible) ─────────────

const ERASURE_TERMINAL: ErasureRequestStatus[] = ['EXECUTED', 'PARTIALLY_EXECUTED', 'REJECTED'];

function ErasureTab({ borrower, onChanged }: { borrower: BorrowerResponse; onChanged: () => void }) {
  const [requests, setRequests] = useState<DataErasureRequestResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [reason, setReason]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    borrowersApi.listErasureRequests(borrower.id)
      .then(setRequests).catch(() => setRequests([])).finally(() => setLoading(false));
  }, [borrower.id]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true); setError(null);
    try {
      await borrowersApi.requestErasure(borrower.id, { reason: reason.trim() });
      setReason(''); load(); onChanged();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to file erasure request.');
    } finally { setSubmitting(false); }
  };

  const execute = async (requestId: string) => {
    setExecutingId(requestId); setError(null);
    try {
      await borrowersApi.executeErasure(borrower.id, requestId);
      setConfirmingId(null); load(); onChanged();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to execute erasure request.');
    } finally { setExecutingId(null); }
  };

  return (
    <>
      <div className="ds-card" style={{ padding: 16, marginBottom: 16 }}>
        <span className="db-section-label" style={{ padding: 0, marginBottom: 8, display: 'block' }}>File a data-erasure request</span>
        <textarea className="ds-textarea" rows={2} value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Reason — e.g. borrower exercised their right to erasure under DPDP" />
        {error && <div className="ptp-modal-error" role="alert" style={{ marginTop: 8 }}><AlertCircle size={14} /><span>{error}</span></div>}
        <button type="button" className="ds-btn is-primary is-sm" style={{ marginTop: 10 }} disabled={submitting || !reason.trim()} onClick={submit}>
          {submitting ? <Loader2 size={13} className="ds-spin" /> : <FileWarning size={13} />} Submit request
        </button>
      </div>

      <span className="db-section-label" style={{ padding: 0, marginBottom: 8, display: 'block' }}>Request history</span>
      {loading ? (
        <span className="ptp-loading"><Loader2 size={12} className="ds-spin" /> Loading…</span>
      ) : requests.length === 0 ? (
        <p className="ptp-no-history">No erasure requests filed for this borrower.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {requests.map(r => (
            <div key={r.id} className="ds-card" style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`ds-pill ${ERASURE_PILL[r.status]}`}>{r.status.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{fmtDT(r.createdAt)}</span>
              </div>
              {r.reason && <p style={{ fontSize: 12.5, color: 'var(--ink-secondary)', marginTop: 6 }}>{r.reason}</p>}
              {r.complianceNotes && <p style={{ fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 4 }}>Compliance note: {r.complianceNotes}</p>}
              {!ERASURE_TERMINAL.includes(r.status) && (
                confirmingId === r.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--danger)' }}>Permanently erase this borrower's PII?</span>
                    <button type="button" className="ds-btn is-danger is-sm" disabled={executingId === r.id} onClick={() => execute(r.id)}>
                      {executingId === r.id ? <Loader2 size={12} className="ds-spin" /> : <FileWarning size={12} />} Yes, execute
                    </button>
                    <button type="button" className="ds-btn is-secondary is-sm" disabled={executingId === r.id} onClick={() => setConfirmingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <button type="button" className="ds-btn is-secondary is-sm" style={{ marginTop: 8 }} onClick={() => setConfirmingId(r.id)}>
                    <FileWarning size={12} /> Execute
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Risk ─────────────────────────────────────────────────────────────────────

function RiskTab({ borrowerId, canScore }: { borrowerId: string; canScore: boolean }) {
  const [score, setScore]     = useState<BorrowerRiskScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [featuresJson, setFeaturesJson] = useState('{\n  \n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setForbidden(false);
    riskApi.getLatest(borrowerId)
      .then(setScore)
      .catch((e: any) => {
        setScore(null);
        if (e?.response?.status === 403) setForbidden(true);
      })
      .finally(() => setLoading(false));
  }, [borrowerId]);

  useEffect(() => { load(); }, [load]);

  const recompute = async () => {
    setScoring(true); setError(null);
    try {
      const s = await riskApi.score(borrowerId);
      setScore(s);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to compute risk score.');
    } finally { setScoring(false); }
  };

  const recomputeWithFeatures = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(featuresJson || '{}');
    } catch {
      setJsonError('Not valid JSON.');
      return;
    }
    setJsonError(null);
    setScoring(true); setError(null);
    try {
      const s = await riskApi.scoreWithFeatures(borrowerId, parsed);
      setScore(s);
      setShowAdvanced(false);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to compute risk score with supplied features.');
    } finally { setScoring(false); }
  };

  if (loading) return <span className="ptp-loading"><Loader2 size={12} className="ds-spin" /> Loading…</span>;

  return (
    <>
      {canScore && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button type="button" className="ds-btn is-secondary is-sm" onClick={recompute} disabled={scoring}>
            {scoring ? <Loader2 size={13} className="ds-spin" /> : <Gauge size={13} />} {score ? 'Recompute score' : 'Compute score'}
          </button>
          <button type="button" className="ds-btn is-secondary is-sm" onClick={() => setShowAdvanced(v => !v)} disabled={scoring}>
            {showAdvanced ? 'Hide advanced' : 'Score with custom features…'}
          </button>
        </div>
      )}
      {showAdvanced && canScore && (
        <div className="ds-card" style={{ padding: 14, marginBottom: 16 }}>
          <span className="ds-label" style={{ display: 'block', marginBottom: 6 }}>Feature overrides (JSON)</span>
          <textarea className="ds-textarea" rows={4} value={featuresJson} onChange={(e) => setFeaturesJson(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }} spellCheck={false}
            placeholder='{ "monthsSinceLastPayment": 2, "ptpBreakRate": 0.3 }' />
          {jsonError && <div className="ptp-modal-error" role="alert" style={{ marginTop: 8 }}><AlertCircle size={14} /><span>{jsonError}</span></div>}
          <button type="button" className="ds-btn is-primary is-sm" style={{ marginTop: 10 }} disabled={scoring} onClick={recomputeWithFeatures}>
            {scoring ? <Loader2 size={13} className="ds-spin" /> : <Gauge size={13} />} Score with these features
          </button>
        </div>
      )}
      {error && <div className="ptp-modal-error" role="alert" style={{ marginBottom: 12 }}><AlertCircle size={14} /><span>{error}</span></div>}

      {!score ? (
        <div className="ds-empty" style={{ padding: '48px 0' }}>
          <Gauge size={28} className="ds-empty-icon" />
          <span className="ds-empty-title">{forbidden ? "You don't have permission" : 'Not scored yet'}</span>
          <span className="ds-empty-sub">
            {forbidden
              ? "You don't have permission to view this borrower's risk score."
              : canScore ? 'Compute a risk score to see intent, ability and segment.' : 'This borrower has not been risk-scored yet.'}
          </span>
        </div>
      ) : (
        <>
          <div className="ptp-stat-grid">
            <div className="ptp-stat is-accent">
              <div className="ptp-stat-label">Default propensity</div>
              <div className="ptp-stat-value is-mono">{fmtPct(score.defaultPropensity)}</div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Intent</div>
              <div className="ptp-stat-value"><span className={`ds-pill ${LEVEL_TONE[score.intent]}`}>{score.intent}</span></div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Ability</div>
              <div className="ptp-stat-value"><span className={`ds-pill ${LEVEL_TONE[score.ability]}`}>{score.ability}</span></div>
            </div>
            <div className="ptp-stat">
              <div className="ptp-stat-label">Scored</div>
              <div className="ptp-stat-value is-text">{fmtDT(score.scoredAt)}</div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 12 }}>Segment</span>
            <div style={{ marginTop: 6 }}>
              <span className={`ds-pill ${SEGMENT_TONE[score.segment]}`} style={{ fontSize: 12 }}>{SEGMENT_LABEL[score.segment]}</span>
            </div>
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-tertiary)' }}>Model {score.modelVersion}</div>
        </>
      )}
    </>
  );
}

// ── Linked loans ─────────────────────────────────────────────────────────────

function LoansTab({ borrowerId }: { borrowerId: string }) {
  const [loans, setLoans]     = useState<AllocationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    allocationsApi.listForBorrower(borrowerId).then(setLoans).catch(() => setLoans([])).finally(() => setLoading(false));
  }, [borrowerId]);

  if (loading) return <span className="ptp-loading"><Loader2 size={12} className="ds-spin" /> Loading…</span>;

  if (loans.length === 0) {
    return (
      <div className="ds-empty" style={{ padding: '48px 0' }}>
        <Layers size={28} className="ds-empty-icon" />
        <span className="ds-empty-title">No linked loans</span>
        <span className="ds-empty-sub">No loan accounts reference this borrower record yet.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {loans.map(l => (
        <Link key={l.id} to={`/app/allocations?q=${encodeURIComponent(l.loanNumber)}`}
          className="ds-card" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{l.loanNumber}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>{l.status}</span>
          </div>
          {typeof l.outstandingAmount === 'number' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(l.outstandingAmount)}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

