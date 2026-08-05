import { useEffect, useRef, useState } from 'react';
import { grievancesApi } from '../api/grievancesApi';
import { allocationsApi } from '../api/allocationsApi';
import { useAuth } from '../AuthContext';
import type { AllocationResponse } from '../types';
import type { GrievanceCategory } from '../types/grievances';
import { GRIEVANCE_CATEGORIES } from './GrievancesPage';
import { X, Loader2, AlertCircle, Search, CheckCircle2, Unlink } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-selected allocation, e.g. when launched from a loan's context. */
  initialAllocation?: AllocationResponse;
}

export function GrievanceCreateModal({ onClose, onSuccess, initialAllocation }: Props) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const [allocation, setAllocation]   = useState<AllocationResponse | null>(initialAllocation || null);
  const [skipAllocation, setSkip]     = useState(false);
  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState<AllocationResponse[]>([]);
  const [searching, setSearching]     = useState(false);

  const [category, setCategory]       = useState<GrievanceCategory>('OTHER');
  const [subject, setSubject]         = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [borrowerName, setBorrowerName]   = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (allocation || skipAllocation || !query.trim() || !organizationId) { setResults([]); return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const data = await allocationsApi.listAllocations({ organizationId, searchTerm: query.trim(), page: 0, size: 8 });
        setResults(data.content);
      } catch { setResults([]); } finally { setSearching(false); }
    }, 300);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, allocation, skipAllocation, organizationId]);

  const canSubmit = category && subject.trim() && description.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError(null);
    try {
      await grievancesApi.raise({
        allocationId: allocation ? allocation.id : undefined,
        borrowerName: borrowerName.trim() || undefined,
        borrowerEmail: borrowerEmail.trim() || undefined,
        borrowerPhone: borrowerPhone.trim() || undefined,
        category,
        subject: subject.trim(),
        description: description.trim(),
        evidenceUrl: evidenceUrl.trim() || undefined,
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to raise grievance.');
      setLoading(false);
    }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: 560, maxWidth: '92vw' }}>
        <div className="ds-modal-header">
          <span className="ds-modal-title">Raise grievance</span>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          <div className="ds-field">
            <span className="ds-label">Loan (optional)</span>
            {allocation ? (
              <div className="ds-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{allocation.loanNumber}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>{allocation.borrowerName}</div>
                </div>
                <button type="button" className="ds-btn is-secondary is-sm" onClick={() => { setAllocation(null); setQuery(''); }}>Change</button>
              </div>
            ) : skipAllocation ? (
              <div className="ds-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12.5, color: 'var(--ink-tertiary)' }}>Not linked to a specific loan</div>
                <button type="button" className="ds-btn is-secondary is-sm" onClick={() => setSkip(false)}>Link a loan</button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--ink-tertiary)' }} />
                  <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search loan number or borrower…" className="ds-input" style={{ paddingLeft: 32 }} autoFocus />
                </div>
                {searching && <span className="ptp-loading" style={{ marginTop: 6 }}><Loader2 size={12} className="ds-spin" /> Searching…</span>}
                {results.length > 0 && (
                  <div className="ds-card" style={{ marginTop: 6, maxHeight: 180, overflowY: 'auto', padding: 4 }}>
                    {results.map(a => (
                      <button key={a.id} type="button" onClick={() => { setAllocation(a); setResults([]); }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                        className="is-hoverable">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{a.loanNumber}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>{a.borrowerName}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => { setSkip(true); setQuery(''); setResults([]); }}
                  className="ds-btn is-ghost is-sm" style={{ marginTop: 6 }}>
                  <Unlink size={12} /> Not linked to a specific loan
                </button>
              </>
            )}
          </div>

          <div className="ds-field">
            <span className="ds-label is-required">Category</span>
            <select className="ds-select" value={category} onChange={(e) => setCategory(e.target.value as GrievanceCategory)}>
              {GRIEVANCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="ds-field">
            <span className="ds-label is-required">Subject</span>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={500}
              placeholder="Short summary of the complaint" className="ds-input" />
          </div>

          <div className="ds-field">
            <span className="ds-label is-required">Description</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              placeholder="What the borrower reported, in their own words where possible" className="ds-textarea" />
          </div>

          <div className="ds-field">
            <span className="ds-label">Evidence URL</span>
            <input type="text" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} maxLength={1024}
              placeholder="Link to recording / document, if any" className="ds-input" />
          </div>

          <div style={{ marginTop: 4, marginBottom: -4 }}>
            <span className="db-att-label" style={{ color: 'var(--ink-tertiary)', fontSize: 11 }}>
              Borrower contact (optional — useful when not linked to a loan, or contact differs from the loan record)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="ds-field">
              <span className="ds-label">Name</span>
              <input type="text" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} maxLength={200}
                placeholder="Borrower name" className="ds-input" />
            </div>
            <div className="ds-field">
              <span className="ds-label">Email</span>
              <input type="email" value={borrowerEmail} onChange={(e) => setBorrowerEmail(e.target.value)} maxLength={255}
                placeholder="Email" className="ds-input" />
            </div>
            <div className="ds-field">
              <span className="ds-label">Phone</span>
              <input type="text" value={borrowerPhone} onChange={(e) => setBorrowerPhone(e.target.value)} maxLength={30}
                placeholder="Phone" className="ds-input" />
            </div>
          </div>

          {error && (
            <div className="ptp-modal-error" role="alert">
              <AlertCircle size={14} /><span>{error}</span>
            </div>
          )}
        </div>

        <div className="ds-modal-actions">
          <button type="button" onClick={onClose} className="ds-btn is-secondary">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit || loading} className="ds-btn is-primary">
            {loading ? <Loader2 size={14} className="ds-spin" /> : <CheckCircle2 size={14} />}
            {loading ? 'Raising…' : 'Raise grievance'}
          </button>
        </div>
      </div>
    </div>
  );
}
