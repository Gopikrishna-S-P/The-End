import React, { useMemo, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, HelpCircle, Settings, LogOut, Volume2, VolumeX, X, LayoutGrid } from 'lucide-react';
import AppSidebar from './components/AppSidebar';
import RouteProgressBar from './components/RouteProgressBar';
import CommandPalette, { type PaletteItem } from './components/CommandPalette';
import ActivityPanel from './components/ActivityPanel';
import NotificationsDialog from './components/NotificationsDialog';
import PageHelpDrawer from './components/PageHelpDrawer';
import ShortcutsDialog from './components/ShortcutsDialog';
import TopbarCustomizeDialog from './components/TopbarCustomizeDialog';
import ProfileSettingsDialog from './components/ProfileSettingsDialog';
import BreadcrumbContextMenu from './components/BreadcrumbContextMenu';
import LucienPanel from './components/LucienPanel';
import GlobalSearchModal from './components/GlobalSearchModal';
import ActingAsBanner from './components/ActingAsBanner';
import MfaGate from './components/MfaGate';
import SubscriptionBanner from './components/SubscriptionBanner';
import PullToRefreshIndicator from './components/PullToRefreshIndicator';
import TopBar from './components/TopBar';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import { bookmarks } from './utils/bookmarks';
import { tour } from './utils/tour';
import { SHORTCUTS, NAV_SECTIONS } from './utils/navConfig';
import { useAppLayoutState } from './hooks/useAppLayoutState';
import { proactiveRefresh } from './api/axiosInstance';
import { useAppNavState } from './hooks/useAppNavState';
import './styles/AppLayout.css';
import { loadingSplash } from './utils/loadingSplash';
import { profileSettings } from './utils/profileSettings';
import { notificationsDialog, useNotificationsDialogOpen } from './utils/notificationsDialog';

export default function AppLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Hide the login-flow splash (shown by LoginPage) once the app shell mounts.
  useEffect(() => { loadingSplash.hideAfterMin(2000); }, []);

  const s = useAppLayoutState();
  const notifDialogOpen = useNotificationsDialogOpen();


  const nav = useAppNavState({
    role: s.role,
    historyStack: s.historyStack,
    currentIndex: s.currentIndex,
  });

  const paletteItems = useMemo<PaletteItem[]>(() => {
    const out: PaletteItem[] = [];
    for (const section of nav.sections) {
      for (const item of section.items) {
        out.push({
          id: `page:${item.to}`,
          label: item.label,
          category: section.label,
          icon: item.icon,
          hint: item.to,
          keywords: [section.label],
          run: () => navigate(item.to),
        });
      }
    }
    out.push({ id: 'action:toggle-dark', label: s.darkMode ? 'Switch to light mode' : 'Switch to dark mode', category: 'Theme', icon: s.darkMode ? Sun : Moon, keywords: ['theme', 'appearance', 'dark', 'light'], run: () => s.setThemeMode(m => m === 'dark' ? 'light' : 'dark') });
    out.push({ id: 'action:sound', label: s.soundEnabled ? 'Mute interaction sounds' : 'Enable interaction sounds', category: 'Theme', icon: s.soundEnabled ? Volume2 : VolumeX, keywords: ['audio', 'mute'], run: () => s.setSoundEnabled(o => !o) });
    out.push({ id: 'action:topbar-cust', label: 'Customize topbar', category: 'Theme', icon: LayoutGrid, keywords: ['topbar', 'customize', 'header', 'buttons'], run: () => s.setTopbarCustOpen(true) });

    out.push({ id: 'action:help', label: 'Keyboard shortcuts', category: 'Help', icon: HelpCircle, hint: '?', keywords: ['shortcuts', 'keys'], run: () => s.setHelpOpen(true) });
    out.push({ id: 'action:tour', label: 'Restart product tour', category: 'Help', icon: HelpCircle, keywords: ['tour', 'onboarding'], run: () => tour.start() });

    out.push({ id: 'action:billing', label: 'Billing settings', category: 'Billing', icon: Settings, hint: '/app/subscription', keywords: ['billing', 'payment', 'subscription', 'plan'], run: () => navigate('/app/subscription') });

    if (s.user) {
      out.push({ id: 'action:profile', label: 'Profile settings', category: 'Account', icon: Settings, keywords: ['account', 'preferences'], run: () => profileSettings.show() });
      out.push({ id: 'action:logout', label: 'Sign out', category: 'Account', icon: LogOut, keywords: ['logout', 'signout'], run: () => s.handleLogout() });
    }
    return out;
  }, [nav.sections, navigate, s.darkMode, s.soundEnabled, s.user, s.setThemeMode, s.setSoundEnabled, s.setHelpOpen, s.setTopbarCustOpen, s.handleLogout]);

  return (
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

      <PageHelpDrawer open={s.pageHelpOpen} onClose={() => s.setPageHelpOpen(false)} pathname={location.pathname} />
      <ShortcutsDialog open={s.shortcutsOpen} onClose={() => s.setShortcutsOpen(false)} />
      <TopbarCustomizeDialog open={s.topbarCustOpen} onClose={() => s.setTopbarCustOpen(false)} />
      <ProfileSettingsDialog />
      <NotificationsDialog />

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
        onProfileSettings={() => profileSettings.show()}
        onNotificationsClick={() => { notificationsDialog.show(); s.play(); }}
        unreadCount={s.unreadCount}
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
          notifOpen={notifDialogOpen}
          onBellClick={() => { notificationsDialog.show(); s.play(); }}
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
              <RouteErrorBoundary>
                <Outlet />
              </RouteErrorBoundary>
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
  );
}
