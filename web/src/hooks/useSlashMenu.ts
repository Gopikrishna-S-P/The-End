import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface SlashItem {
  id: string;
  label: string;
  snippet: string;
  category?: string;
  keywords?: string[];
}

export interface SlashAnchor {
  triggerIndex: number;
  queryLength: number;
}

export interface SlashMenuState {
  open: boolean;
  query: string;
  filteredItems: SlashItem[];
  activeIndex: number;
  position: { left: number; top: number } | null;
  commit(): void;
  commitId(id: string): void;
  close(): void;
  move(delta: number): void;
  setActiveIndex(i: number): void;
}

interface Options {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  items: SlashItem[];
  trigger?: string;
}

function indexOfTrigger(value: string, caret: number, trigger: string): number {
  for (let i = caret - 1; i >= 0; i--) {
    const ch = value[i];
    if (ch === trigger) {
      const prev = i > 0 ? value[i - 1] : '';
      if (i === 0 || prev === ' ' || prev === '\n' || prev === '\t') return i;
      return -1;
    }
    if (ch === ' ' || ch === '\n' || ch === '\t') return -1;
  }
  return -1;
}

function scoreItem(item: SlashItem, q: string): number {
  if (!q) return 1; // any item shows when query empty
  const label = item.label.toLowerCase();
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.includes(q)) return 50;
  if (item.keywords?.some(k => k.toLowerCase().includes(q))) return 25;
  if (item.category?.toLowerCase().includes(q)) return 12;
  return 0;
}

export function useSlashMenu({ inputRef, items, trigger = '/' }: Options): SlashMenuState {
  const [anchor, setAnchor]         = useState<SlashAnchor | null>(null);
  const [query, setQuery]           = useState('');
  const [activeIndex, setActiveIdx] = useState(0);
  const [position, setPosition]     = useState<{ left: number; top: number } | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const filteredItems = useMemo(() => {
    if (!anchor) return [];
    const q = query.toLowerCase();
    const ranked = items
      .map(it => ({ it, score: scoreItem(it, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.it);
    return ranked.slice(0, 8);
  }, [anchor, query, items]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const close = () => {
    setAnchor(null);
    setQuery('');
    setPosition(null);
  };

  const commitId = (id: string) => {
    const el = inputRef.current;
    if (!el || !anchor) return;
    const item = itemsRef.current.find(i => i.id === id);
    if (!item) { close(); return; }
    const value = el.value;
    const before = value.slice(0, anchor.triggerIndex);
    const after  = value.slice(anchor.triggerIndex + 1 + anchor.queryLength);
    const next = `${before}${item.snippet}${after}`;
    /* native setter so React notices the change */
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const cursorPos = before.length + item.snippet.length;
    requestAnimationFrame(() => {
      el.setSelectionRange?.(cursorPos, cursorPos);
      el.focus();
    });
    close();
  };

  const commit = () => {
    const item = filteredItems[activeIndex];
    if (item) commitId(item.id);
    else close();
  };

  const move = (delta: number) => {
    if (filteredItems.length === 0) return;
    setActiveIdx(i => (i + delta + filteredItems.length) % filteredItems.length);
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const refreshAnchor = () => {
      const caret = (el as HTMLInputElement).selectionStart ?? el.value.length;
      const idx = indexOfTrigger(el.value, caret, trigger);
      if (idx < 0) {
        if (anchor) close();
        return;
      }
      const q = el.value.slice(idx + 1, caret);
      setAnchor({ triggerIndex: idx, queryLength: q.length });
      setQuery(q);
      const rect = el.getBoundingClientRect();
      setPosition({ left: rect.left, top: rect.bottom + 4 });
    };

    const onInput  = () => refreshAnchor();
    const onClick  = () => refreshAnchor();
    const onKeyUp  = (e: KeyboardEvent) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) {
        refreshAnchor();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!anchor) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter')     { e.preventDefault(); commit(); }
      else if (e.key === 'Escape')    { e.preventDefault(); close(); }
      else if (e.key === 'Tab')       { e.preventDefault(); commit(); }
    };

    el.addEventListener('input',   onInput);
    el.addEventListener('click',   onClick);
    el.addEventListener('keyup',   onKeyUp);
    el.addEventListener('keydown', onKeyDown);
    return () => {
      el.removeEventListener('input',   onInput);
      el.removeEventListener('click',   onClick);
      el.removeEventListener('keyup',   onKeyUp);
      el.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputRef, trigger]);

  return {
    open: !!anchor && filteredItems.length > 0,
    query,
    filteredItems,
    activeIndex,
    position,
    commit,
    commitId,
    close,
    move,
    setActiveIndex: setActiveIdx,
  };
}
