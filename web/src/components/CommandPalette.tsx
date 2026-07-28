import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight, X, Settings, Search, CornerDownLeft
} from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  type PaletteItem, type CommandPaletteProps, type ScopeMode,
  parseQuery, scoreItem, passesFilters, passesScope, findTypoSuggestion,
  readStringArray, writeStringArray, RECENT_KEY_DEFAULT,
} from './CommandPaletteHelpers';
import './TopbarCustomizeDialog.css';

export type { PaletteItem };

const RECENT_MAX_DEFAULT = 6;

export default function CommandPalette({
  open, onClose, items, recentMax = RECENT_MAX_DEFAULT, recentKey = RECENT_KEY_DEFAULT, scope
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [scopeMode, setScopeMode] = useState<ScopeMode>('all');
  const [activeIdx, setActiveIdx] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useFocusTrap(dialogRef, open);

  useEffect(() => {
    if (!open) { const prev = returnFocusRef.current; if (prev instanceof HTMLElement) prev.focus(); return; }
    returnFocusRef.current = document.activeElement;
    setQuery('');
    setScopeMode('all');
    setActiveIdx(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const scoped = useMemo(
    () => items.filter(item => passesScope(item, scopeMode, scope)),
    [items, scopeMode, scope],
  );

  const parsed = useMemo(() => parseQuery(query), [query]);

  const filtered = useMemo(
    () => scoped.filter(item => passesFilters(item, parsed.filters)),
    [scoped, parsed.filters],
  );

  const recentItems = useMemo(() => {
    if (parsed.text || Object.keys(parsed.filters).length > 0) return null;
    const ids = readStringArray(recentKey);
    const byId = new Map(filtered.map(i => [i.id, i]));
    const resolved = ids.map(id => byId.get(id)).filter((i): i is PaletteItem => !!i);
    return resolved.length > 0 ? resolved.slice(0, recentMax) : null;
  }, [filtered, parsed.text, parsed.filters, recentKey, recentMax]);

  const scored = useMemo(() => {
    if (!parsed.text) return filtered.map(item => ({ item, match: { score: 0 } }));
    return filtered
      .map(item => ({ item, match: scoreItem(item, parsed.text) }))
      .filter(({ match }) => match.score > 0)
      .sort((a, b) => b.match.score - a.match.score);
  }, [filtered, parsed.text]);

  const flat = recentItems ?? scored.map(s => s.item);

  const typoSuggestion = useMemo(() => {
    if (!parsed.text || flat.length > 0) return null;
    return findTypoSuggestion(scoped, parsed.text);
  }, [parsed.text, flat.length, scoped]);

  useEffect(() => { if (activeIdx >= flat.length) setActiveIdx(Math.max(0, flat.length - 1)); }, [flat.length, activeIdx]);
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-idx='${activeIdx}']`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const remember = useCallback((item: PaletteItem) => {
    const ids = readStringArray(recentKey).filter(id => id !== item.id);
    ids.unshift(item.id);
    writeStringArray(recentKey, ids.slice(0, Math.max(recentMax, 12)));
  }, [recentKey, recentMax]);

  const activate = useCallback((item: PaletteItem) => {
    remember(item);
    onClose(); requestAnimationFrame(() => item.run());
  }, [onClose, remember]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => flat.length === 0 ? 0 : (i + 1) % flat.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length); }
    else if (e.key === 'Home') { e.preventDefault(); setActiveIdx(0); }
    else if (e.key === 'End') { e.preventDefault(); setActiveIdx(Math.max(0, flat.length - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const entry = flat[activeIdx];
      if (entry) activate(entry);
      else if (typoSuggestion) activate(typoSuggestion);
    }
    else if (e.key === 'Tab' && scope) { e.preventDefault(); setScopeMode(m => m === 'all' ? 'page' : 'all'); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  }, [flat, activeIdx, activate, onClose, typoSuggestion, scope]);

  if (!open) return null;

  return createPortal(
    <div className="app-topbar-custom-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="app-topbar-custom-dialog" ref={dialogRef} tabIndex={-1} style={{ outline: 'none' }}>

        <div className="app-topbar-custom-header">
          <div className="app-topbar-custom-title">
            <Settings size={14} aria-hidden="true" />
            <span id="rp-topbar-custom-title">{scope ? 'Search & commands' : 'Settings'}</span>
          </div>
          <button type="button" className="app-topbar-custom-close" onClick={onClose} aria-label="Close">
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {scope ? (
          <div style={{ padding: '0 24px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', height: 38, border: '1px solid var(--border, rgba(0,0,0,0.12))', borderRadius: 8 }}>
              <Search size={14} aria-hidden="true" style={{ color: 'var(--ink-tertiary, rgba(0,0,0,0.4))', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                onKeyDown={onKeyDown}
                placeholder="Search pages and commands…"
                aria-label="Search pages and commands"
                aria-controls="rp-palette-list"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', font: 'inherit', fontSize: 13, color: 'inherit' }}
              />
              <button type="button" onClick={() => setScopeMode(m => m === 'all' ? 'page' : 'all')}
                title="Toggle search scope (Tab)"
                style={{ flexShrink: 0, border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', color: 'inherit' }}>
                {scopeMode === 'all' ? 'Everywhere' : 'This page'}
              </button>
            </div>
          </div>
        ) : (
          <p className="app-topbar-custom-intro">
            Manage your account preferences, configure billing, or update your application theme.
            Select an option below to continue.
          </p>
        )}

        <div
          id="rp-palette-list"
          className="app-topbar-custom-list"
          role="listbox"
          ref={listRef}
          tabIndex={scope ? -1 : 0}
          onKeyDown={scope ? undefined : onKeyDown}
        >
          {recentItems && (
            <div style={{ padding: '4px 6px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-tertiary, rgba(0,0,0,0.4))' }}>
              Recent
            </div>
          )}
          {flat.map((item, idx) => {
            const isActive = idx === activeIdx;
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" id={`rp-palette-item-${idx}`} data-idx={idx}
                className={`app-topbar-custom-row${isActive ? ' is-active' : ''}`}
                style={{ width: '100%', textAlign: 'left', border: 'none', background: isActive ? 'rgba(0,0,0,0.05)' : 'transparent', cursor: 'pointer', alignItems: 'center' }}
                role="option" aria-selected={isActive}
                onMouseEnter={() => setActiveIdx(idx)} onClick={() => activate(item)}>

                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                  <Icon size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                </div>

                <div className="app-topbar-custom-row-body">
                  <span className="app-topbar-custom-row-label">{item.label}</span>
                  <span className="app-topbar-custom-row-desc">{item.category}</span>
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: isActive ? '#0AA550' : 'transparent', color: isActive ? '#fff' : 'rgba(0,0,0,0.2)', transition: 'all 0.2s', flexShrink: 0 }}>
                  <ArrowRight size={12} aria-hidden="true" />
                </div>
              </button>
            );
          })}

          {flat.length === 0 && typoSuggestion && (
            <button type="button" className="app-topbar-custom-row" onClick={() => activate(typoSuggestion)}
              style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', alignItems: 'center' }}>
              <div className="app-topbar-custom-row-body">
                <span className="app-topbar-custom-row-label">Did you mean "{typoSuggestion.label}"?</span>
                <span className="app-topbar-custom-row-desc">Press <CornerDownLeft size={9} style={{ verticalAlign: 'middle' }} /> to go</span>
              </div>
            </button>
          )}

          {flat.length === 0 && !typoSuggestion && (
            <div style={{ padding: '24px 6px', textAlign: 'center', fontSize: 12.5, color: 'var(--ink-tertiary, rgba(0,0,0,0.4))' }}>
              No matches{parsed.text ? ` for "${parsed.text}"` : ''}.
            </div>
          )}
        </div>

      </div>
    </div>,
    document.body,
  );
}
