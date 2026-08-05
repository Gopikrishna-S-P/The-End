import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, BookmarkPlus, RefreshCcw } from 'lucide-react';
import './BreadcrumbContextMenu.css';

interface BreadcrumbContextMenuProps {
  open: boolean;
  /** Viewport coords where the menu should anchor (cursor position). */
  x: number;
  y: number;
  /** The URL the menu acts on (path + search). */
  url: string;
  /** Display label of the breadcrumb segment. */
  label: string;
  bookmarked: boolean;
  onClose: () => void;
  onCopyUrl: () => void;
  onOpenNewTab: () => void;
  onToggleBookmark: () => void;
  onReload: () => void;
}

export default function BreadcrumbContextMenu(props: BreadcrumbContextMenuProps) {
  const {
    open, x, y, label, bookmarked,
    onClose, onCopyUrl, onOpenNewTab, onToggleBookmark, onReload,
  } = props;

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const padding = 8;
  const w = 220;
  const h = 224;
  const safeX = Math.min(x, window.innerWidth  - w - padding);
  const safeY = Math.min(y, window.innerHeight - h - padding);

  return createPortal(
    <div
      className="app-bc-ctx"
      ref={menuRef}
      role="menu"
      aria-label={`Actions for ${label}`}
      style={{ left: `${safeX}px`, top: `${safeY}px` }}
    >
      <button type="button" role="menuitem" className="app-bc-ctx-item" onClick={onCopyUrl}>
        <Copy size={11} aria-hidden="true" /><span>Copy URL</span>
      </button>
      <button type="button" role="menuitem" className="app-bc-ctx-item" onClick={onOpenNewTab}>
        <ExternalLink size={11} aria-hidden="true" /><span>Open in new tab</span>
      </button>
      <button type="button" role="menuitem" className="app-bc-ctx-item" onClick={onReload}>
        <RefreshCcw size={11} aria-hidden="true" /><span>Reload</span>
      </button>
      <div className="app-bc-ctx-sep" role="separator" />
      <button type="button" role="menuitem" className="app-bc-ctx-item" onClick={onToggleBookmark}>
        <BookmarkPlus size={11} aria-hidden="true" />
        <span>{bookmarked ? 'Remove bookmark' : 'Bookmark this view'}</span>
      </button>
    </div>,
    document.body,
  );
}
