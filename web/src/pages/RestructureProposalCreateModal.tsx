import { useEffect, useRef, useState } from 'react';
import { restructureProposalsApi } from '../api/restructureProposalsApi';
import { allocationsApi } from '../api/allocationsApi';
import { useAuth } from '../AuthContext';
import type { AllocationResponse } from '../types';
import { X, Loader2, AlertCircle, Search, CheckCircle2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-selected allocation, e.g. when launched from a loan's context. */
  initialAllocation?: AllocationResponse;
}

export function RestructureProposalCreateModal({ onClose, onSuccess, initialAllocation }: Props) {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  const [allocation, setAllocation] = useState<AllocationResponse | null>(initialAllocation || null);
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<AllocationResponse[]>([]);
  const [searching, setSearching]   = useState(false);

  const [originalEmiCount, setOriginalEmiCount]   = useState('');
  const [originalEmiAmount, setOriginalEmiAmount] = useState('');
  const [originalApr, setOriginalApr]             = useState('');
  const [newEmiCount, setNewEmiCount]             = useState('');
  const [newEmiAmount, setNewEmiAmount]           = useState('');
  const [newApr, setNewApr]                       = useState('');
  const [rationale, setRationale]                 = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (allocation || !query.trim() || !organizationId) { setResults([]); return; }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const data = await allocationsApi.listAllocations({ organizationId, searchTerm: query.trim(), page: 0, size: 8 });
        setResults(data.content);
      } catch { setResults([]); } finally { setSearching(false); }
    }, 300);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, allocation, organizationId]);

  const canSubmit = allocation
    && originalEmiCount && originalEmiAmount && originalApr !== ''
    && newEmiCount && newEmiAmount && newApr !== '';

  const handleSubmit = async () => {
    if (!canSubmit || !allocation) return;
    setLoading(true); setError(null);
    try {
      await restructureProposalsApi.draft({
        allocationId: allocation.id,
        originalEmiCount: Number(originalEmiCount),
        originalEmiAmount: Number(originalEmiAmount),
        originalApr: Number(originalApr),
        newEmiCount: Number(newEmiCount),
        newEmiAmount: Number(newEmiAmount),
        newApr: Number(newApr),
        rationale: rationale.trim() || undefined,
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to draft restructure proposal.');
      setLoading(false);
    }
  };

  return (
    <div className="ds-modal-overlay" onClick={onClose}>
      <div className="ds-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: 560, maxWidth: '92vw' }}>
        <div className="ds-modal-header">
          <span className="ds-modal-title">Draft restructure proposal</span>
          <button type="button" onClick={onClose} className="ds-modal-close" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ds-modal-body">
          <div className="ds-field">
            <span className="ds-label is-required">Loan</span>
            {allocation ? (
              <div className="ds-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>{allocation.loanNumber}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-tertiary)' }}>{allocation.borrowerName}</div>
                </div>
                <button type="button" className="ds-btn is-secondary is-sm" onClick={() => { setAllocation(null); setQuery(''); }}>Change</button>
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
              </>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="ds-field">
              <span className="ds-label is-required">Original EMI count</span>
              <input type="number" min="1" value={originalEmiCount} onChange={(e) => setOriginalEmiCount(e.target.value)} className="ds-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="ds-field">
              <span className="ds-label is-required">Original EMI amount</span>
              <input type="number" min="0.01" step="0.01" value={originalEmiAmount} onChange={(e) => setOriginalEmiAmount(e.target.value)} className="ds-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="ds-field">
              <span className="ds-label is-required">Original APR %</span>
              <input type="number" min="0" step="0.01" value={originalApr} onChange={(e) => setOriginalApr(e.target.value)} className="ds-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="ds-field">
              <span className="ds-label is-required">New EMI count</span>
              <input type="number" min="1" value={newEmiCount} onChange={(e) => setNewEmiCount(e.target.value)} className="ds-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="ds-field">
              <span className="ds-label is-required">New EMI amount</span>
              <input type="number" min="0.01" step="0.01" value={newEmiAmount} onChange={(e) => setNewEmiAmount(e.target.value)} className="ds-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="ds-field">
              <span className="ds-label is-required">New APR %</span>
              <input type="number" min="0" step="0.01" value={newApr} onChange={(e) => setNewApr(e.target.value)} className="ds-input" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
          </div>

          <div className="ds-field">
            <span className="ds-label">Rationale</span>
            <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2}
              placeholder="Why this restructure is being proposed" className="ds-textarea" />
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
            {loading ? 'Drafting…' : 'Draft proposal'}
          </button>
        </div>
      </div>
    </div>
  );
}
