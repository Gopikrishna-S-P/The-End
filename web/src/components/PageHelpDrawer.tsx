import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import {
  X, HelpCircle, Lightbulb, ArrowRight, BookOpen, Command,
} from 'lucide-react';
import { getPageHelp } from '../utils/pageHelp';
import { useFocusTrap } from '../hooks/useFocusTrap';
import './TopbarCustomizeDialog.css';

interface PageHelpDrawerProps {
  open: boolean;
  onClose: () => void;
  pathname: string;
}

export default function PageHelpDrawer({ open, onClose, pathname }: PageHelpDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  useFocusTrap(drawerRef, open);

  useEffect(() => {
    if (!open) {
      setHoveredLink(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const help = getPageHelp(pathname);

  return createPortal(
    <div
      className="app-topbar-custom-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Page help"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="app-topbar-custom-dialog" ref={drawerRef} tabIndex={-1} style={{ outline: 'none' }}>
        <header className="app-topbar-custom-header">
          <div className="app-topbar-custom-title">
            <HelpCircle size={14} aria-hidden="true" />
            <span>{help?.title ?? 'About this page'}</span>
          </div>
          <button
            type="button"
            className="app-topbar-custom-close"
            onClick={onClose}
            aria-label="Close help"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </header>

        {help ? (
          <>
            <p className="app-topbar-custom-intro">
              {help.description}
            </p>

            <div className="app-topbar-custom-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              
              {help.tips && help.tips.length > 0 && (
                <>
                  <div className="app-topbar-custom-row-desc" style={{ padding: '8px 12px 0', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>Tips</div>
                  {help.tips.map((t, i) => (
                    <div key={i} className="app-topbar-custom-row" style={{ alignItems: 'flex-start', background: 'transparent', cursor: 'default' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                        <Lightbulb size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                      </div>
                      <div className="app-topbar-custom-row-body">
                        <span className="app-topbar-custom-row-label">{t}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {help.shortcuts && help.shortcuts.length > 0 && (
                <>
                  <div className="app-topbar-custom-row-desc" style={{ padding: '16px 12px 0', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>Shortcuts</div>
                  {help.shortcuts.map((s, i) => (
                    <div key={i} className="app-topbar-custom-row" style={{ background: 'transparent', cursor: 'default' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                        <Command size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                      </div>
                      <div className="app-topbar-custom-row-body">
                        <span className="app-topbar-custom-row-label">{s.desc}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {s.keys.map((k, j) => (
                          <React.Fragment key={j}>
                            {j > 0 && <span style={{ fontSize: '9px', color: 'rgba(0,0,0,0.4)' }}>+</span>}
                            <span style={{ fontSize: '10px', fontWeight: 600, background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#111', fontFamily: 'monospace' }}>
                              {k}
                            </span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {help.links && help.links.length > 0 && (
                <>
                  <div className="app-topbar-custom-row-desc" style={{ padding: '16px 12px 0', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>Related Resources</div>
                  {help.links.map(l => {
                    const isHovered = hoveredLink === l.to;
                    return (
                      <NavLink 
                        key={l.to} 
                        to={l.to} 
                        className={`app-topbar-custom-row${isHovered ? ' is-active' : ''}`} 
                        onClick={onClose} 
                        style={{ textDecoration: 'none', color: 'inherit', background: isHovered ? 'rgba(0,0,0,0.05)' : 'transparent' }}
                        onMouseEnter={() => setHoveredLink(l.to)}
                        onMouseLeave={() => setHoveredLink(null)}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                          <BookOpen size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                        </div>
                        <div className="app-topbar-custom-row-body">
                          <span className="app-topbar-custom-row-label">{l.label}</span>
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: isHovered ? '#0AA550' : 'transparent', color: isHovered ? '#fff' : 'rgba(0,0,0,0.2)', transition: 'all 0.2s', flexShrink: 0 }}>
                          <ArrowRight size={12} aria-hidden="true" />
                        </div>
                      </NavLink>
                    );
                  })}
                </>
              )}

            </div>
          </>
        ) : (
          <div className="app-topbar-custom-list">
            <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#666' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                  <HelpCircle size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                </div>
                <span className="app-topbar-custom-row-label">No tips for this page yet</span>
              </div>
              <div className="app-topbar-custom-row-desc">
                Press <span style={{ fontSize: '10px', fontWeight: 600, background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#111', fontFamily: 'monospace' }}>⌘K</span> to open the settings menu.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
