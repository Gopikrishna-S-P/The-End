import React from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft, ChevronRight, ChevronDown, X,
  Search, Bell, HelpCircle, Settings, ArrowRight,
  Keyboard, BookOpen, Compass, MessageSquare, ExternalLink,
} from 'lucide-react';
import { tour } from '../utils/tour';
import { profileSettings } from '../utils/profileSettings';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

function getInitials(user?: { firstName?: string; lastName?: string; email?: string } | null) {
  if (user?.firstName && user?.lastName) return (user.firstName[0] + user.lastName[0]).toUpperCase();
  if (user?.firstName) return user.firstName.slice(0, 2).toUpperCase();
  if (user?.email) return user.email[0].toUpperCase();
  return '?';
}
import lucienLogo from '../assets/images/lucien-logo.png';
import BackgroundSyncIndicator from './BackgroundSyncIndicator';
import OfflineChip from './OfflineChip';
import SessionExpiryChip from './SessionExpiryChip';
import { NAV_SECTIONS } from '../utils/navConfig';
import { getPageHelp } from '../utils/pageHelp';
import { useT } from '../utils/i18n';

export interface CrumbCtx { x: number; y: number; url: string; label: string }
interface Breadcrumb { label: string; to: string | null }
interface FilterChip { key: string; value: string; label: string }

export interface TopBarProps {
  scrolledDown: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  previousPathLabel: string | null;
  onGoBack: () => void;
  onGoForward: () => void;
  breadcrumbs: Breadcrumb[] | null;
  locationPathname: string;
  locationSearch: string;
  breadcrumbDrop: boolean;
  setBreadcrumbDrop: React.Dispatch<React.SetStateAction<boolean>>;
  breadcrumbDropRef: React.RefObject<HTMLDivElement | null>;
  onCrumbCtx: (ctx: CrumbCtx) => void;
  onOpenPageHelp: () => void;
  filterChips: FilterChip[];
  removeFilter: (key: string) => void;
  clearFilters: () => void;
  currentSection: string;
  onOpenPalette: () => void;
  onOpenSearch?: () => void;
  showLucien: boolean;
  lucienOpen: boolean;
  onToggleLucien: () => void;
  notifRef: React.RefObject<HTMLDivElement | null>;
  unreadCount: number;
  notifOpen: boolean;
  onBellClick: () => void;
  topbarHidden: Set<string>;
  onOpenShortcuts: () => void;
  onLogout: () => void;
  onExtend?: () => void;
  user: { firstName?: string; lastName?: string; email?: string } | null | undefined;
  roleLabel: string;
  userDropOpen: boolean;
  onToggleUserDrop: () => void;
  onCloseUserDrop: () => void;
  avatarColor: string;
}

export default function TopBar(props: TopBarProps) {
  const {
    scrolledDown, canGoBack, canGoForward, previousPathLabel,
    onGoBack, onGoForward,
    breadcrumbs, locationPathname, locationSearch,
    breadcrumbDrop, setBreadcrumbDrop, breadcrumbDropRef, onCrumbCtx,
    onOpenPageHelp, filterChips, removeFilter, clearFilters, currentSection, onOpenPalette, onOpenSearch, showLucien, lucienOpen, onToggleLucien,
    notifRef, unreadCount, notifOpen, onBellClick,
    topbarHidden, onOpenShortcuts, onLogout, onExtend,
    user, roleLabel, userDropOpen, onToggleUserDrop, onCloseUserDrop, avatarColor,
  } = props;

  const t = useT();
  const topbarCls = ['app-topbar', scrolledDown ? 'is-elevated' : ''].filter(Boolean).join(' ');
  const backTooltip = previousPathLabel ? `Back to ${previousPathLabel} (Alt+←)` : 'Back (Alt+←)';

  const [helpMenuOpen, setHelpMenuOpen] = React.useState(false);
  const helpMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!helpMenuOpen) return;
    function onDown(e: MouseEvent) {
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) setHelpMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setHelpMenuOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [helpMenuOpen]);

  return (
    <header className={topbarCls} aria-label="Main navigation">
      <div className="app-topbar-left">

        <div className="app-history-nav app-hide-mobile" role="group" aria-label="History navigation">
          <button
            type="button"
            className="app-icon-btn app-history-btn"
            onClick={onGoBack}
            disabled={!canGoBack}
            aria-label={previousPathLabel ? `Back to ${previousPathLabel}` : 'Go back'}
            aria-keyshortcuts="Alt+ArrowLeft"
            data-tooltip={backTooltip}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="app-icon-btn app-history-btn"
            onClick={onGoForward}
            disabled={!canGoForward}
            aria-label="Go forward"
            aria-keyshortcuts="Alt+ArrowRight"
            data-tooltip="Forward (Alt+→)"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        {breadcrumbs && (
          <nav className="app-breadcrumb app-breadcrumb--desktop" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <React.Fragment key={`${i}-${crumb.label}`}>
                  {i > 0 && <span className="app-breadcrumb-sep" aria-hidden="true">›</span>}
                  {isLast ? (
                    <span
                      className="app-breadcrumb-current"
                      aria-current="page"
                      onContextMenu={(e) => {
                        if (!crumb.to) return;
                        e.preventDefault();
                        onCrumbCtx({ x: e.clientX, y: e.clientY, url: `${crumb.to}${locationSearch}`, label: crumb.label });
                      }}
                    >
                      <span className="app-breadcrumb-label">{crumb.label}</span>
                    </span>
                  ) : (
                    <span className="app-breadcrumb-segment">{crumb.label}</span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}


        {filterChips.length > 0 && (
          <div className="app-breadcrumb-filters app-hide-mobile" aria-label="Active filters">
            <span className="app-breadcrumb-filters-sep" aria-hidden="true">·</span>
            {filterChips.map(c => (
              <span key={c.key} className="app-breadcrumb-filter" title={c.label} data-key={c.key}>
                <span className="app-breadcrumb-filter-key">{c.key}:</span>
                <span className="app-breadcrumb-filter-val">{c.value}</span>
                <button type="button" className="app-breadcrumb-filter-x" onClick={() => removeFilter(c.key)} aria-label={`Remove filter ${c.label}`}>
                  <X size={9} aria-hidden="true" />
                </button>
              </span>
            ))}
            {filterChips.length > 1 && (
              <button type="button" className="app-breadcrumb-filter-clear" onClick={clearFilters} title="Clear all filters">
                Clear
              </button>
            )}
          </div>
        )}

        {breadcrumbs && (
          <div className="app-breadcrumb app-breadcrumb--mobile" ref={breadcrumbDropRef}>
            <button type="button" className="app-breadcrumb-mobile-btn"
              onClick={() => setBreadcrumbDrop(o => !o)} aria-expanded={breadcrumbDrop} aria-label="Page location">
              <span className="app-breadcrumb-current">{breadcrumbs[breadcrumbs.length - 1].label}</span>
              <ChevronDown size={11} className="app-breadcrumb-mobile-chevron" aria-hidden="true" />
            </button>
            {breadcrumbDrop && (
              <div className="app-breadcrumb-dropdown" role="menu" aria-orientation="vertical">
                {breadcrumbs.map((crumb, i) => {
                  const isLastCrumb = i === breadcrumbs.length - 1;
                  const match = NAV_SECTIONS.flatMap(s => s.items).find(item => item.to === crumb.to);
                  return (
                    <div key={`${i}-${crumb.label}`} className="app-breadcrumb-dropdown-item" role="menuitem">
                      {i > 0 && <span className="app-breadcrumb-sep" aria-hidden="true">›</span>}
                      {match && <match.icon size={11} aria-hidden="true" style={{ flexShrink: 0, marginRight: 4 }} />}
                      <span className={isLastCrumb ? 'app-breadcrumb-current' : 'app-breadcrumb-segment'}>{crumb.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <BackgroundSyncIndicator />
        <OfflineChip />
      </div>

      <div className="app-topbar-right">
        <button
          type="button"
          className="app-search-trigger"
          aria-label="Search"
          onClick={onOpenSearch || onOpenPalette}
        >
          <Search size={16} aria-hidden="true" className="app-search-trigger-icon" />
          <span className="app-search-trigger-text">{t('Search')}</span>
        </button>

        {/* Help menu */}
        <div className="app-help-menu-wrap" ref={helpMenuRef}>
          <button
            type="button"
            className={`app-icon-btn${helpMenuOpen ? ' is-active' : ''}`}
            onClick={() => setHelpMenuOpen(o => !o)}
            aria-label="Help"
            aria-expanded={helpMenuOpen}
            aria-haspopup="menu"
            data-tooltip="Help & resources"
          >
            <HelpCircle size={18} aria-hidden="true" />
          </button>

          {helpMenuOpen && createPortal(
            <div className="app-topbar-custom-backdrop" role="dialog" aria-modal="true" aria-label="Help and resources" onMouseDown={(e) => { if (e.target === e.currentTarget) setHelpMenuOpen(false); }}>
              <div className="app-topbar-custom-dialog" tabIndex={0} style={{ outline: 'none' }}>
                <div className="app-topbar-custom-header">
                  <div className="app-topbar-custom-title">
                    <HelpCircle size={14} aria-hidden="true" />
                    <span>Help &amp; resources</span>
                  </div>
                  <button type="button" className="app-topbar-custom-close" onClick={() => setHelpMenuOpen(false)} aria-label="Close">
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>

                <p className="app-topbar-custom-intro">
                  Access keyboard shortcuts, view the page guide, restart the product tour, or contact our support team.
                </p>

                <div className="app-topbar-custom-list">
                  <button role="menuitem" className="app-topbar-custom-row" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', alignItems: 'center' }} onClick={() => { setHelpMenuOpen(false); onOpenShortcuts(); }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                      <Keyboard size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                    </div>
                    <div className="app-topbar-custom-row-body">
                      <span className="app-topbar-custom-row-label">Keyboard shortcuts</span>
                      <span className="app-topbar-custom-row-desc">View all global hotkeys</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#111', fontFamily: 'monospace' }}>?</span>
                    </div>
                  </button>

                  <button role="menuitem" className="app-topbar-custom-row" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', alignItems: 'center' }} onClick={() => { setHelpMenuOpen(false); onOpenPageHelp(); }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                      <BookOpen size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                    </div>
                    <div className="app-topbar-custom-row-body">
                      <span className="app-topbar-custom-row-label">Page guide</span>
                      <span className="app-topbar-custom-row-desc">Tips &amp; links for this screen</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'transparent', color: 'rgba(0,0,0,0.2)', transition: 'all 0.2s', flexShrink: 0 }} className="app-topbar-action-icon">
                      <ArrowRight size={12} aria-hidden="true" />
                    </div>
                  </button>

                  <button role="menuitem" className="app-topbar-custom-row" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', alignItems: 'center' }} onClick={() => { setHelpMenuOpen(false); tour.start(); }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                      <Compass size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                    </div>
                    <div className="app-topbar-custom-row-body">
                      <span className="app-topbar-custom-row-label">Product tour</span>
                      <span className="app-topbar-custom-row-desc">Restart the onboarding walkthrough</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'transparent', color: 'rgba(0,0,0,0.2)', transition: 'all 0.2s', flexShrink: 0 }} className="app-topbar-action-icon">
                      <ArrowRight size={12} aria-hidden="true" />
                    </div>
                  </button>

                  <div className="app-topbar-custom-row-desc" style={{ padding: '8px 12px 0', textTransform: 'uppercase', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', marginTop: '4px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>Support</div>

                  <button role="menuitem" className="app-topbar-custom-row" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', alignItems: 'center' }} onClick={() => { setHelpMenuOpen(false); window.open('mailto:support@recoverpro.in'); }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', flexShrink: 0, marginRight: '4px' }}>
                      <MessageSquare size={14} aria-hidden="true" style={{ color: 'rgba(0,0,0,0.6)' }} />
                    </div>
                    <div className="app-topbar-custom-row-body">
                      <span className="app-topbar-custom-row-label">Contact support</span>
                      <span className="app-topbar-custom-row-desc">Email the RecoverPro team</span>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'transparent', color: 'rgba(0,0,0,0.2)', transition: 'all 0.2s', flexShrink: 0 }} className="app-topbar-action-icon">
                      <ExternalLink size={12} aria-hidden="true" />
                    </div>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Bell */}
        <span id="sr-bell-desc" className="sr-only">Toggle notification panel</span>
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            type="button"
            className={`app-icon-btn${notifOpen ? ' is-active' : ''}`}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-describedby="sr-bell-desc"
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
            data-tooltip={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Notifications'}
            onClick={onBellClick}
          >
            <Bell size={18} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="app-notif-badge" aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Settings */}
        <button
          type="button"
          className="app-icon-btn"
          aria-label="Settings"
          data-tooltip="Settings"
          onClick={() => profileSettings.show()}
        >
          <Settings size={18} aria-hidden="true" />
        </button>

        {showLucien && (
          <button
            type="button"
            className={`app-icon-btn${lucienOpen ? ' is-active' : ''}`}
            aria-label={lucienOpen ? 'Close Lucien AI' : 'Open Lucien AI'}
            aria-expanded={lucienOpen}
            data-tooltip="Lucien AI"
            onClick={onToggleLucien}
          >
            <img src={lucienLogo} alt="" aria-hidden="true" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </button>
        )}

      </div>
    </header>
  );
}
