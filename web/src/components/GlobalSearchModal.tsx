import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, User, Loader2 } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { allocationsApi } from '../api/allocationsApi';
import type { AllocationResponse } from '../types';
import './TopbarCustomizeDialog.css';

const RECENT_KEY = 'rp-global-search-recent';
const RECENT_MAX = 5;
const DEBOUNCE_MS = 250;

interface RecentEntry { id: string; title: string; desc: string }

function readRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function writeRecent(list: RecentEntry[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX))); } catch {}
}

function fmtINR(n?: number) {
  if (n == null) return null;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default function GlobalSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AllocationResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<RecentEntry[]>([]);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setRecent(readRecent());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) { setResults([]); setLoading(false); abortRef.current?.abort(); return; }
    setLoading(true);
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const t = setTimeout(async () => {
      try {
        const data = await allocationsApi.listAllocations(
          { searchTerm: term, page: 0, size: 8 } as any,
          controller.signal,
        );
        setResults(data.content ?? []);
      } catch (e: any) {
        if (e?.name !== 'CanceledError' && e?.name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query, open]);

  const goToAllocation = (a: AllocationResponse) => {
    const entry: RecentEntry = {
      id: a.id,
      title: a.borrowerName || a.loanNumber,
      desc: [a.loanNumber, fmtINR(a.outstandingAmount)].filter(Boolean).join(' • '),
    };
    const next = [entry, ...readRecent().filter(r => r.id !== entry.id)].slice(0, RECENT_MAX);
    writeRecent(next);
    onClose();
    navigate(`/app/allocations/${a.id}`);
  };

  const goToRecent = (r: RecentEntry) => {
    onClose();
    navigate(`/app/allocations/${r.id}`);
  };

  if (!open) return null;

  const showResults = query.trim().length >= 2;
  const itemsToRender = showResults ? results : [];

  return createPortal(
    <div className="app-topbar-custom-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="app-topbar-custom-dialog" ref={dialogRef} tabIndex={-1} style={{ outline: 'none', padding: '0', overflow: 'hidden' }}>

        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          {loading
            ? <Loader2 size={18} className="ds-spin" style={{ color: 'rgba(0,0,0,0.4)', marginRight: '12px', flexShrink: 0 }} />
            : <Search size={18} style={{ color: 'rgba(0,0,0,0.4)', marginRight: '12px', flexShrink: 0 }} />}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search borrowers or loan accounts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '15px',
              color: '#111',
              fontWeight: 500
            }}
          />
          <button type="button" className="app-topbar-custom-close" onClick={onClose} aria-label="Close" style={{ marginLeft: '12px' }}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="app-topbar-custom-list" style={{ padding: '8px', maxHeight: '400px', overflowY: 'auto' }}>
          {showResults ? (
            <>
              <div className="app-topbar-custom-row-desc" style={{ padding: '8px 12px 4px', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>
                Results
              </div>
              {itemsToRender.map((a) => (
                <button key={a.id} className="app-topbar-custom-row" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => goToAllocation(a)}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '12px' }}>
                    <User size={14} style={{ color: 'rgba(0,0,0,0.6)' }} />
                  </div>
                  <div className="app-topbar-custom-row-body">
                    <span className="app-topbar-custom-row-label">{a.borrowerName || 'Unknown borrower'}</span>
                    <span className="app-topbar-custom-row-desc">
                      {[a.loanNumber, fmtINR(a.outstandingAmount)].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                </button>
              ))}
              {!loading && itemsToRender.length === 0 && (
                <div style={{ padding: '20px 12px', fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center' }}>
                  No borrowers or loans match "{query.trim()}".
                </div>
              )}
            </>
          ) : (
            <>
              <div className="app-topbar-custom-row-desc" style={{ padding: '8px 12px 4px', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>
                Recent Searches
              </div>
              {recent.length === 0 && (
                <div style={{ padding: '20px 12px', fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center' }}>
                  Search by borrower name or loan account number.
                </div>
              )}
              {recent.map((r) => (
                <button key={r.id} className="app-topbar-custom-row" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={() => goToRecent(r)}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '12px' }}>
                    <User size={14} style={{ color: 'rgba(0,0,0,0.6)' }} />
                  </div>
                  <div className="app-topbar-custom-row-body">
                    <span className="app-topbar-custom-row-label">{r.title}</span>
                    <span className="app-topbar-custom-row-desc">{r.desc}</span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
