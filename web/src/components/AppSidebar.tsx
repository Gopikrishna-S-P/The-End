import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, MouseEvent as RMouseEvent } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Lock, LogOut, X as XIcon, ChevronRight, PanelLeft } from 'lucide-react';
import { Logo } from './Logo';
import { prefetchRoute } from '../utils/routePrefetch';
import { useT } from '../utils/i18n';
import {
  type AppSidebarProps,
} from './AppSidebarHelpers';
import './AppSidebar.css';

export type { SidebarNavItem, SidebarSection, AppSidebarProps } from './AppSidebarHelpers';

interface TipState { label: string; x: number; y: number }

function useRipple<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const fire = useCallback((e: React.MouseEvent) => {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const span = document.createElement('span');
    span.className = 'popup-ripple';
    span.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
    el.appendChild(span);
    span.addEventListener('animationend', () => span.remove(), { once: true });
  }, []);
  return { ref, fire };
}

function initials(user?: { firstName?: string; lastName?: string; email?: string } | null) {
  if (user?.firstName && user?.lastName) return (user.firstName[0] + user.lastName[0]).toUpperCase();
  if (user?.firstName) return user.firstName.slice(0, 2).toUpperCase();
  if (user?.email) return user.email[0].toUpperCase();
  return '?';
}

export default function AppSidebar({
  sections = [],
  collapsed = false,
  onToggleCollapse,
  onProfileSettings,
  onLogout,
  user,
  roleLabel,
  avatarColor = '#0AA550',
}: AppSidebarProps) {
  const location = useLocation();
  const t = useT();
  const expanded = !collapsed;

  const [confirmLogout,       setConfirmLogout]       = useState(false);
  const [pendingTo,           setPendingTo]           = useState<string | null>(null);
  const [scrollMap,           setScrollMap]           = useState({ visible: false, top: 0, height: 0 });
  const [tip,                 setTip]                 = useState<TipState | null>(null);

  const rippleConfirm = useRipple<HTMLButtonElement>();
  const rippleCancel  = useRipple<HTMLButtonElement>();

  const navRef          = useRef<HTMLElement>(null);

  useEffect(() => {
    if (pendingTo === null) return;
    if (location.pathname === pendingTo || (pendingTo !== '/' && location.pathname.startsWith(pendingTo + '/'))) setPendingTo(null);
  }, [location.pathname, pendingTo]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const update = () => {
      const { scrollTop, scrollHeight, clientHeight, offsetTop } = nav;
      if (scrollHeight <= clientHeight + 4) { setScrollMap({ visible: false, top: 0, height: 0 }); return; }
      // Compact indicator: use a smaller multiplier and lower min-height
      const heightPx = Math.max(12, (clientHeight / scrollHeight) * (clientHeight * 0.4));
      const range = clientHeight - heightPx;
      const topPx = offsetTop + (scrollTop / (scrollHeight - clientHeight)) * range;
      setScrollMap({ visible: true, top: topPx, height: heightPx });
    };
    update();
    nav.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    return () => { nav.removeEventListener('scroll', update); ro.disconnect(); };
  }, []);

  const activePath = useMemo<string | null>(() => {
    let best: string | null = null;
    for (const section of sections)
      for (const item of section.items) {
        const to = item.to;
        if (to.includes('?')) continue;
        if (location.pathname === to || (to !== '/' && location.pathname.startsWith(to + '/')))
          if (best === null || to.length > best.length) best = to;
      }
    return best;
  }, [sections, location.pathname]);

  const computeActive = (to: string) => pendingTo !== null ? pendingTo === to : to === activePath;

  const showTip = useCallback((e: RMouseEvent<HTMLElement>, label: string) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, x: r.right + 10, y: r.top + r.height / 2 });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);
  useEffect(() => { if (expanded) setTip(null); }, [expanded]);

  // Running counter for Alt+N keyboard hints (1–9)
  let kbIndex = 0;

  return (
    <aside
      className={`asb-root${collapsed ? ' is-collapsed' : ''}`}
      aria-label="Main sidebar"
    >
      <div className="asb-header">
        {expanded ? (
          <>
            <Link to="/app/dashboard" className="asb-header-logo--btn" aria-label="Recoverpro — Dashboard">
              <Logo height={34} />
            </Link>
            {onToggleCollapse && (
              <button
                type="button"
                className="asb-collapse-toggle"
                onClick={onToggleCollapse}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeft size={16} aria-hidden="true" />
              </button>
            )}
          </>
        ) : (
          onToggleCollapse && (
            <button
              type="button"
              className="asb-collapse-toggle"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeft size={16} aria-hidden="true" />
            </button>
          )
        )}
      </div>
      {/* ── Org workspace anchor (Notion / Shopify pattern) ── */}
      {expanded && user?.organizationName && (
        <button type="button" className="asb-org-anchor" onClick={onProfileSettings} title="Organization settings">
          <span className="asb-org-anchor-dot" aria-hidden="true" />
          <span className="asb-org-anchor-name">{user.organizationName}</span>
        </button>
      )}

      {expanded && scrollMap.visible && (
        <span className="asb-scroll-map" aria-hidden="true"
          style={{ top: `${scrollMap.top}px`, height: `${scrollMap.height}px` }}
        />
      )}

      {/* ── Nav ── */}
      <nav className="asb-nav" aria-label="Primary navigation" ref={navRef}>
        {sections.map(section => {
          return (
            <div key={section.label} className="asb-section">

              {/* Section header — static label per spec. "Main" is the sidebar's
                  only-usually section, so it stays unlabeled; other sections
                  (e.g. Saved Views) still get their label for contrast. */}
              {expanded ? (
                section.label !== 'Main' && (
                  <div className="asb-section-header">
                    <span className="asb-section-label">{t(section.label)}</span>
                  </div>
                )
              ) : (
                <div className="asb-section-divider" aria-hidden="true" />
              )}

              {/* Collapsible items wrapper (no longer collapses via click, but DOM remains) */}
              <div className="asb-section-wrap">
                <ul role="list">
                  {section.items.map(item => {
                    const isActive = computeActive(item.to);
                    const label = t(item.label);
                    kbIndex++;
                    const kbN = kbIndex <= 9 ? kbIndex : null;
                    const showKbHint = expanded && !!kbN && !isActive && !item.count && !item.locked;

                    return (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          className={`asb-nav-item${isActive ? ' is-active' : ''}`}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={collapsed ? label : undefined}
                          onClick={() => setPendingTo(item.to)}
                          onMouseEnter={(e) => { prefetchRoute(item.to); if (collapsed) showTip(e, label); }}
                          onMouseLeave={hideTip}
                          onFocus={() => prefetchRoute(item.to)}
                        >
                          <span className="asb-nav-icon">
                            <item.icon size={14} aria-hidden="true" />
                            {!!item.badge && item.badge > 0 && (
                              <span className="asb-badge" aria-label={`${item.badge} new`}>{item.badge}</span>
                            )}
                          </span>
                          {expanded && (
                            <>
                              <span className="asb-nav-label">{label}</span>
                              {!!item.count && item.count > 0 && (
                                <span className="asb-nav-count" aria-label={`${item.count} pending`}>
                                  {item.count > 99 ? '99+' : item.count}
                                </span>
                              )}
                              {item.locked && (
                                <Lock size={10} style={{ marginLeft: 'auto', color: 'var(--text-tertiary)', opacity: 0.7 }} aria-label="Feature locked" />
                              )}
                              {showKbHint && (
                                <span className="asb-kb-hint" aria-hidden="true">Alt+{kbN}</span>
                              )}
                              {isActive && (
                                <div className="asb-action-icon">
                                  <ChevronRight size={12} aria-hidden="true" />
                                </div>
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Identity footer ── */}
      <div className="asb-footer" aria-label="Account">
        {collapsed ? (
          <button type="button" className="asb-footer-rail-btn" onClick={onProfileSettings}
            aria-label="Profile settings"
            onMouseEnter={e => showTip(e, [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Account')}
            onMouseLeave={hideTip}
          >
            <span className="asb-avatar" style={{ background: avatarColor }}>{initials(user)}</span>
          </button>
        ) : (
          <div className="asb-footer-pill" role="button" tabIndex={0}
            onClick={onProfileSettings}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onProfileSettings?.()}
          >
            <span className="asb-avatar-wrap">
              <span className="asb-avatar" style={{ background: avatarColor }}>{initials(user)}</span>
            </span>
            <div className="asb-footer-identity">
              <span className="asb-footer-name" title={[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || ''}>
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Account'}
              </span>
              <div className="asb-footer-meta-row">
                {roleLabel && <span className="asb-footer-role">{roleLabel}</span>}
                {roleLabel && user?.organizationName && <span className="asb-footer-sep" aria-hidden="true">·</span>}
                {user?.organizationName && (
                  <span className="asb-footer-org" title={user.organizationName}>{user.organizationName}</span>
                )}
              </div>
            </div>
            {onLogout && (
              <button type="button" className="asb-footer-logout-icon"
                onClick={e => { e.stopPropagation(); setConfirmLogout(true); }}
                aria-label="Sign out" title="Sign out"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Sign-out confirm popup ── */}
      {confirmLogout && createPortal(
        <div className="asb-signout-overlay" role="dialog" aria-modal="true" aria-labelledby="asb-signout-title"
          onClick={e => { if (e.target === e.currentTarget) setConfirmLogout(false); }}>
          <div className="asb-signout-window">
            <div className="asb-signout-titlebar">
              <LogOut size={13} className="asb-signout-titlebar-icon" aria-hidden="true" />
              <span className="asb-signout-titlebar-text">Sign out</span>
              <button type="button" className="asb-signout-close" onClick={() => setConfirmLogout(false)} aria-label="Cancel">
                <XIcon size={14} />
              </button>
            </div>
            <div className="asb-signout-body">
              <p className="asb-signout-msg" id="asb-signout-title">Are you sure you want to sign out?</p>
              <div className="asb-signout-actions">
                <button ref={rippleCancel.ref} type="button" className="asb-signout-cancel"
                  onClick={e => { rippleCancel.fire(e); setConfirmLogout(false); }}>Cancel</button>
                <button ref={rippleConfirm.ref} type="button" className="asb-signout-confirm"
                  onClick={e => { rippleConfirm.fire(e); setConfirmLogout(false); onLogout?.(); }} autoFocus>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {tip && (
        <div className="asb-tip" role="tooltip" style={{ left: `${tip.x}px`, top: `${tip.y}px` }}>
          {tip.label}
        </div>
      )}
    </aside>
  );
}
