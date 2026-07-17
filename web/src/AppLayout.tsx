import React, { useMemo, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, HelpCircle, Settings, LogOut, Volume2, VolumeX, X, LayoutGrid } from 'lucide-react';
import AppSidebar from './components/AppSidebar';
import RouteProgressBar from './components/RouteProgressBar';
import CommandPalette, { type PaletteItem } from './components/CommandPalette';
import ActivityPanel from './components/ActivityPanel';
import NotificationPanel from './components/NotificationPanel';
import PageHelpDrawer from './components/PageHelpDrawer';
import ShortcutsDialog from './components/ShortcutsDialog';
import TopbarCustomizeDialog from './components/TopbarCustomizeDialog';
import BreadcrumbContextMenu from './components/BreadcrumbContextMenu';
import LucienPanel from './components/LucienPanel';
import GlobalSearchModal from './components/GlobalSearchModal';
import ActingAsBanner from './components/ActingAsBanner';
import MfaGate from './components/MfaGate';
import SubscriptionBanner from './components/SubscriptionBanner';
import PullToRefreshIndicator from './components/PullToRefreshIndicator';
import TopBar from './components/TopBar';
import { bookmarks } from './utils/bookmarks';
import { tour } from './utils/tour';
import { SHORTCUTS, NAV_SECTIONS } from './utils/navConfig';
import { useAppLayoutState } from './hooks/useAppLayoutState';
import { proactiveRefresh } from './api/axiosInstance';
import { useAppNavState } from './hooks/useAppNavState';
import './styles/AppLayout.css';
import { FeatureFlagsProvider } from './contexts/FeatureFlagsContext';
import { loadingSplash } from './utils/loadingSplash';

export default function AppLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Hide the login-flow splash (shown by LoginPage) once the app shell mounts.
  useEffect(() => { loadingSplash.hideAfterMin(2000); }, []);

  const s = useAppLayoutState();
  const nav = useAppNavState({
    role: s.role,
    historyStack: s.historyStack,
    currentIndex: s.currentIndex,
  });

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const out: PaletteItem[] = [];
    out.push({ id: 'action:toggle-dark', label: s.darkMode ? 'Switch to light mode' : 'Switch to dark mode', category: 'Theme', icon: s.darkMode ? Sun : Moon, keywords: ['theme', 'appearance', 'dark', 'light'], run: () => s.setThemeMode(m => m === 'dark' ? 'light' : 'dark') });
    out.push({ id: 'action:sound', label: s.soundEnabled ? 'Mute interaction sounds' : 'Enable interaction sounds', category: 'Theme', icon: s.soundEnabled ? Volume2 : VolumeX, keywords: ['audio', 'mute'], run: () => s.setSoundEnabled(o => !o) });
    out.push({ id: 'action:topbar-cust', label: 'Customize topbar', category: 'Theme', icon: LayoutGrid, keywords: ['topbar', 'customize', 'header', 'buttons'], run: () => s.setTopbarCustOpen(true) });

    out.push({ id: 'action:help', label: 'Keyboard shortcuts', category: 'Help', icon: HelpCircle, hint: '?', keywords: ['shortcuts', 'keys'], run: () => s.setHelpOpen(true) });
    out.push({ id: 'action:tour', label: 'Restart product tour', category: 'Help', icon: HelpCircle, keywords: ['tour', 'onboarding'], run: () => tour.start() });

    out.push({ id: 'action:privacy', label: 'Privacy settings', category: 'Privacy', icon: Settings, hint: '/settings/privacy', keywords: ['privacy', 'security'], run: () => navigate('/settings/privacy') });
    out.push({ id: 'action:billing', label: 'Billing settings', category: 'Billing', icon: Settings, hint: '/settings/billing', keywords: ['billing', 'payment', 'subscription'], run: () => navigate('/settings/billing') });

    if (s.user) {
      out.push({ id: 'action:profile', label: 'Profile settings', category: 'Account', icon: Settings, hint: '/settings/profile', keywords: ['account', 'preferences'], run: () => navigate('/settings/profile') });
      out.push({ id: 'action:logout', label: 'Sign out', category: 'Account', icon: LogOut, keywords: ['logout', 'signout'], run: () => s.handleLogout() });
    }
    return out;
  }, [nav.sections, navigate, s.darkMode, s.soundEnabled, s.user, s.setThemeMode, s.setSoundEnabled, s.setHelpOpen, s.setTopbarCustOpen, s.handleLogout]);

  return (
    <FeatureFlagsProvider>
    <div className={s.layoutCls} ref={s.layoutRef}>
      <a href="#main-content" className="app-skip-link">Skip to main content</a>
      <RouteProgressBar />

      <CommandPalette
        open={s.paletteOpen}
        onClose={() => s.setPaletteOpen(false)}
        items={paletteItems}
        scope={{ currentPath: location.pathname, currentSection: nav.currentSection }}
      />
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ActivityPanel open={s.activityOpen} onClose={() => s.setActivityOpen(false)} onNavigate={p => navigate(p)} />
      {s.notifOpen && <NotificationPanel onClose={() => s.setNotifOpen(false)} onNavigate={p => { s.setNotifOpen(false); navigate(p); }} />}

      <PageHelpDrawer open={s.pageHelpOpen} onClose={() => s.setPageHelpOpen(false)} pathname={location.pathname} />
      <ShortcutsDialog open={s.shortcutsOpen} onClose={() => s.setShortcutsOpen(false)} />
      <TopbarCustomizeDialog open={s.topbarCustOpen} onClose={() => s.setTopbarCustOpen(false)} />

      <BreadcrumbContextMenu
        open={!!s.crumbCtx}
        x={s.crumbCtx?.x ?? 0}
        y={s.crumbCtx?.y ?? 0}
        url={s.crumbCtx?.url ?? ''}
        label={s.crumbCtx?.label ?? ''}
        bookmarked={s.crumbCtx ? bookmarks.isBookmarked(s.crumbCtx.url) : false}
        onClose={() => s.setCrumbCtx(null)}
        onCopyUrl={() => { if (!s.crumbCtx) return; navigator.clipboard?.writeText(window.location.origin + s.crumbCtx.url).catch(() => {}); s.play('pop'); s.setCrumbCtx(null); }}
        onOpenNewTab={() => { if (!s.crumbCtx) return; window.open(s.crumbCtx.url, '_blank'); s.setCrumbCtx(null); }}
        onToggleBookmark={() => { if (!s.crumbCtx) return; nav.bookmarkActions.toggle(s.crumbCtx.url, s.crumbCtx.label); s.play('toggle'); s.setCrumbCtx(null); }}
        onReload={() => window.location.reload()}
      />

      <AppSidebar
        sections={nav.sidebarSections}
        collapsed={s.isPhone || s.sidebarCollapsed}
        onToggleCollapse={() => {
          s.setSidebarCollapsed(v => { const next = !v; localStorage.setItem('rp-sidebar-collapsed', String(next)); return next; });
          s.play();
        }}
        onProfileSettings={() => navigate('/settings/profile')}
        onLogout={s.handleLogout}
        user={s.user}
        roleLabel={s.roleLabel}
        avatarColor={s.avatarColor}
      />

      <div className="app-right">
        <PullToRefreshIndicator pull={s.ptr.pull} refreshing={s.ptr.refreshing} />
        <ActingAsBanner />

        <TopBar
          scrolledDown={s.scrolledDown}
          canGoBack={nav.canGoBack}
          canGoForward={nav.canGoForward}
          previousPathLabel={nav.previousPathLabel}
          onGoBack={() => { if (nav.canGoBack) { navigate(-1); s.play(); } }}
          onGoForward={() => { if (nav.canGoForward) { navigate(1); s.play(); } }}
          breadcrumbs={nav.breadcrumbs}
          locationPathname={nav.locationPathname}
          locationSearch={nav.locationSearch}
          breadcrumbDrop={s.breadcrumbDrop}
          setBreadcrumbDrop={s.setBreadcrumbDrop}
          breadcrumbDropRef={s.breadcrumbDropRef}
          onCrumbCtx={s.setCrumbCtx}
          onOpenPageHelp={() => { s.setPageHelpOpen(true); s.play('open'); }}
          filterChips={nav.filterChips}
          removeFilter={nav.removeFilter}
          clearFilters={nav.clearFilters}
          currentSection={nav.currentSection || ''}
          onOpenPalette={() => { s.setPaletteOpen(true); s.play('open'); }}
          onOpenSearch={() => { setSearchOpen(true); s.play('open'); }}
          showLucien={s.showLucien}
          lucienOpen={s.lucienOpen}
          onToggleLucien={() => { s.setLucienOpen(o => !o); s.play(); }}
          notifRef={s.notifRef}
          unreadCount={s.unreadCount}
          notifOpen={s.notifOpen}
          onBellClick={() => { s.setNotifOpen(o => !o); s.play(); }}
          topbarHidden={s.topbarHidden}
          onOpenShortcuts={() => { s.setHelpOpen(true); s.play(); }}
          onLogout={s.handleLogout}
          onExtend={() => { proactiveRefresh().catch(() => {}); }}
          user={s.user}
          roleLabel={s.roleLabel}
          userDropOpen={s.userDropOpen}
          onToggleUserDrop={() => { s.setUserDropOpen(o => !o); s.play(); }}
          onCloseUserDrop={() => s.setUserDropOpen(false)}
          avatarColor={s.avatarColor}
        />


        <MfaGate mfaEnabled={s.user?.mfaEnabled} />

        <SubscriptionBanner />
        <div className="app-body">
          <main className="app-main" id="main-content" tabIndex={-1} ref={s.mainRef}>
            <div key={location.pathname} className={`app-route-view tx-${s.routeTransition}`}>
              <Outlet />
            </div>
          </main>
          <LucienPanel open={s.lucienOpen} onClose={() => s.setLucienOpen(false)} />
        </div>

        <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
          {s.routeAnnounce}
        </div>

        {s.helpOpen && (
          <div className="app-help-backdrop" role="dialog" aria-modal aria-label="Keyboard shortcuts"
            onClick={e => { if (e.target === e.currentTarget) s.setHelpOpen(false); }}>
            <div className="app-help-modal" ref={s.helpModalRef} tabIndex={-1}>
              <div className="app-help-modal-header">
                <span className="app-help-modal-title">Keyboard shortcuts</span>
                <button type="button" className="app-help-close-btn" onClick={() => s.setHelpOpen(false)} aria-label="Close">
                  <X size={15} />
                </button>
              </div>
              <div className="app-help-modal-body">
                {SHORTCUTS.map(sc => (
                  <div key={sc.desc} className="app-help-row">
                    <span className="app-help-desc">{sc.desc}</span>
                    <span className="app-help-keys">
                      {sc.keys.map((k, i) => (
                        <React.Fragment key={k}>
                          {i > 0 && <span className="app-help-sep">+</span>}
                          <kbd className="app-help-kbd">{k}</kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="app-help-modal-footer">
                <button type="button" className="app-help-customize"
                  onClick={() => { s.setHelpOpen(false); s.setShortcutsOpen(true); s.play('open'); }}>
                  Customize shortcuts →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </FeatureFlagsProvider>
  );
}
