import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, User, Phone, Briefcase, FileText, ArrowRight } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './TopbarCustomizeDialog.css';

export default function GlobalSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const mockResults = query.length > 0 ? [
    { icon: User, title: 'John Doe', desc: 'Acct #8912 • $14,500 Past Due' },
    { icon: Phone, title: 'Log Promise to Pay (PTP)', desc: 'Quick Action' },
    { icon: Briefcase, title: '30-59 Days Bucket', desc: 'Jump to Queue' },
  ] : [];

  const recentSearches = [
    { icon: User, title: 'Sarah Jenkins', desc: 'Acct #4419 • $2,300 Past Due' },
    { icon: FileText, title: 'Settlement Agreement - Smith', desc: 'Recent Document' },
  ];

  const itemsToRender = query.length > 0 ? mockResults : recentSearches;

  return createPortal(
    <div className="app-topbar-custom-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="app-topbar-custom-dialog" ref={dialogRef} tabIndex={-1} style={{ outline: 'none', padding: '0', overflow: 'hidden' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Search size={18} style={{ color: 'rgba(0,0,0,0.4)', marginRight: '12px' }} />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search borrowers, accounts, or quick actions..."
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
          <div className="app-topbar-custom-row-desc" style={{ padding: '8px 12px 4px', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>
            {query.length > 0 ? 'Results' : 'Recent Searches'}
          </div>
          
          {itemsToRender.map((item, i) => (
            <button key={i} className="app-topbar-custom-row" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }} onClick={onClose}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '12px' }}>
                <item.icon size={14} style={{ color: 'rgba(0,0,0,0.6)' }} />
              </div>
              <div className="app-topbar-custom-row-body">
                <span className="app-topbar-custom-row-label">{item.title}</span>
                <span className="app-topbar-custom-row-desc">{item.desc}</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'transparent', color: 'rgba(0,0,0,0.2)', transition: 'all 0.2s', flexShrink: 0 }} className="app-topbar-action-icon">
                <ArrowRight size={12} aria-hidden="true" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
