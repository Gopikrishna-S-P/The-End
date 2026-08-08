import React from 'react';
import {
  ChevronLeft, ChevronRight, ChevronDown, X,
  Search, Bell, Settings, User,
} from 'lucide-react';
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
        <SessionExpiryChip onLogout={onLogout} onExtend={onExtend} />
        <button
          type="button"
          className="app-search-trigger"
          aria-label="Search"
          onClick={onOpenSearch || onOpenPalette}
        >
          <Search size={16} aria-hidden="true" className="app-search-trigger-icon" />
          <span className="app-search-trigger-text">{t('Search anything ...')}</span>
        </button>

        <button
          type="button"
          className="app-icon-btn"
          onClick={onBellClick}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          aria-expanded={notifOpen}
          data-tooltip="Notifications"
          style={{ position: 'relative' }}
        >
          <Bell size={18} aria-hidden="true" />
          {unreadCount > 0 && (
            <span aria-hidden="true" style={{
              position: 'absolute', top: 6, right: 6, width: 7, height: 7,
              borderRadius: '50%', background: 'var(--danger)',
            }} />
          )}
        </button>

        <button
          type="button"
          className="app-icon-btn"
          onClick={() => profileSettings.show()}
          aria-label="Profile Settings"
          data-tooltip="Profile Settings"
        >
          <User size={18} aria-hidden="true" />
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
