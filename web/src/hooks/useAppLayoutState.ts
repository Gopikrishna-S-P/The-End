import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useNavigationType, NavigationType } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import type { Role } from '../types';
import { ROLE_LABEL, LUCIEN_ROLES, ROUTE_LABELS, NAV_SECTIONS, hashColor } from '../utils/navConfig';
import { sounds, type SoundName } from '../utils/sounds';
import { useDisplayPrefs } from '../utils/displayPrefs';
import { useTopbarPrefs } from '../utils/topbarPrefs';
import { useNotifications } from '../utils/notifications';
import { useT } from '../utils/i18n';
import { setFaviconUnreadBadge } from '../utils/faviconBadge';
import { workspace } from '../utils/workspace';
import { getRouteAccent, makeAccentFromHex, applyAccent } from '../utils/routeAccent';
import { keymap, matchEvent } from '../utils/keymap';
import { tour, hasCompletedTour } from '../utils/tour';
import { apiClient } from '../client';
import { activityLog } from '../utils/activityLog';
import { useFocusTrap } from './useFocusTrap';
import { usePullToRefresh } from './usePullToRefresh';
import type { CrumbCtx } from '../components/TopBar';

export function useAppLayoutState() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const navType   = useNavigationType();

  const [isLoggingOut,     setIsLoggingOut]     = useState(false);
  const [themeMode,        setThemeMode]        = useState<'light'|'dark'|'system'>(() => { const v = localStorage.getItem('rp-theme'); return (v === 'dark' || v === 'system') ? v as 'dark'|'system' : 'light'; });
  const [sysDark,          setSysDark]          = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [isFullscreen,     setIsFullscreen]     = useState(false);
  const [highContrast,     setHighContrast]     = useState(() => localStorage.getItem('rp-theme-hc') === 'true');
  const [scrolledDown,     setScrolledDown]     = useState(false);
  const [lucienOpen,       setLucienOpen]       = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isPhone,          setIsPhone]          = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const [soundEnabled,     setSoundEnabled]     = useState(() => sounds.isEnabled());
  const [breadcrumbDrop,   setBreadcrumbDrop]   = useState(false);
  const [routeAnnounce,    setRouteAnnounce]    = useState('');
  const [historyStack,     setHistoryStack]     = useState<string[]>(() => [location.pathname]);
  const [currentIndex,     setCurrentIndex]     = useState(0);
  const [routeTransition,  setRouteTransition]  = useState<'fade'|'slide-left'|'slide-right'>('fade');
  const [paletteOpen,      setPaletteOpen]      = useState(false);
  const [activityOpen,     setActivityOpen]     = useState(false);
  const [pageHelpOpen,     setPageHelpOpen]     = useState(false);
  const [shortcutsOpen,    setShortcutsOpen]    = useState(false);
  const [topbarCustOpen,   setTopbarCustOpen]   = useState(false);
  const [crumbCtx,         setCrumbCtx]         = useState<CrumbCtx | null>(null);
  const [userDropOpen,     setUserDropOpen]     = useState(false);
  const [helpOpen,         setHelpOpen]         = useState(false);
  const [notifOpen,        setNotifOpen]        = useState(false);

  const notifRef          = useRef<HTMLDivElement>(null);
  const breadcrumbDropRef = useRef<HTMLDivElement>(null);
  const mainRef           = useRef<HTMLElement>(null);
  const layoutRef         = useRef<HTMLDivElement>(null);
  const lastPathRef       = useRef(location.pathname);
  const lastSyncedThemeRef = useRef<string | null>(null);
  const helpModalRef      = useRef<HTMLDivElement>(null);

  useFocusTrap(helpModalRef, helpOpen);

  const darkMode = themeMode === 'dark' || (themeMode === 'system' && sysDark);

  useEffect(() => {
    const serverTheme = user?.themePreference;
    if (!serverTheme) return;
    lastSyncedThemeRef.current = serverTheme;
    if (serverTheme !== themeMode) setThemeMode(serverTheme as 'light'|'dark'|'system');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.themePreference]);

  useEffect(() => {
    localStorage.setItem('rp-theme', themeMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [themeMode, darkMode]);

  useEffect(() => {
    if (!user?.id) return;
    if (lastSyncedThemeRef.current === themeMode) return;
    lastSyncedThemeRef.current = themeMode;
    apiClient.patch('/api/v1/users/me/preferences', { theme: themeMode }).catch(() => { lastSyncedThemeRef.current = null; });
  }, [themeMode, user?.id]);

  useEffect(() => {
    if (themeMode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSysDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);

  useEffect(() => { localStorage.setItem('rp-theme-hc', highContrast ? 'true' : 'false'); }, [highContrast]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsPhone(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let ticking = false;
    const update = () => { setScrolledDown(el.scrollTop > 120); ticking = false; };
    const handler = () => { if (!ticking) { window.requestAnimationFrame(update); ticking = true; } };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (historyStack[currentIndex] === location.pathname) return;
    if (navType === NavigationType.Push) {
      setHistoryStack(prev => [...prev.slice(0, currentIndex + 1), location.pathname]);
      setCurrentIndex(i => i + 1);
      return;
    }
    if (navType === NavigationType.Replace) {
      setHistoryStack(prev => { const next = prev.slice(); next[currentIndex] = location.pathname; return next; });
      return;
    }
    if (historyStack[currentIndex - 1] === location.pathname) setCurrentIndex(i => i - 1);
    else if (historyStack[currentIndex + 1] === location.pathname) setCurrentIndex(i => i + 1);
    else { setHistoryStack([location.pathname]); setCurrentIndex(0); }
  }, [location.pathname, navType, historyStack, currentIndex]);

  useEffect(() => {
    const label = ROUTE_LABELS[location.pathname];
    setRouteAnnounce(label ? `${label} page loaded` : '');
  }, [location.pathname]);

  useEffect(() => {
    const prevPath = lastPathRef.current;
    if (prevPath === location.pathname) return;
    const findInfo = (p: string) => { for (const sec of NAV_SECTIONS) { const idx = sec.items.findIndex(i => i.to === p); if (idx >= 0) return { section: sec.label, idx }; } return null; };
    const prev = findInfo(prevPath);
    const curr = findInfo(location.pathname);
    if (prev && curr && prev.section === curr.section) setRouteTransition(curr.idx > prev.idx ? 'slide-left' : 'slide-right');
    else setRouteTransition('fade');
    lastPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => { if (hasCompletedTour()) return; const t = window.setTimeout(() => tour.start(), 800); return () => window.clearTimeout(t); }, []);

  useEffect(() => {
    const path = location.pathname;
    const label = ROUTE_LABELS[path];
    if (label) activityLog.log({ kind: 'visit', label, path });
  }, [location.pathname]);

  useEffect(() => { sounds.setEnabled(soundEnabled); }, [soundEnabled]);

  useEffect(() => {
    workspace.setCurrent({ id: 'rp-default', name: 'Recoverpro', short: 'RP' });
    workspace.setList([{ id: 'rp-default', name: 'Recoverpro', short: 'RP' }]);
  }, []);

  const play = useCallback((name: SoundName = 'click') => { sounds.play(name); }, []);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true); setUserDropOpen(false);
    await new Promise(r => setTimeout(r, 200));
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if (!isTyping && e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); setIsFullscreen(o => !o); return; }
      if (!isTyping && e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); setThemeMode(m => m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'); play('toggle'); return; }
      if (matchEvent(e, keymap.getBinding('palette.open'))) { e.preventDefault(); setPaletteOpen(o => !o); return; }
      if (!isTyping && matchEvent(e, keymap.getBinding('help.open'))) { e.preventDefault(); setHelpOpen(o => !o); return; }
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '9') { e.preventDefault(); const items = NAV_SECTIONS.flatMap(s => s.items); const t = items[parseInt(e.key, 10) - 1]; if (t) navigate(t.to); }
      if (e.key === 'Escape') {
        if (isFullscreen) { setIsFullscreen(false); return; }
        setUserDropOpen(false); setHelpOpen(false); setLucienOpen(false); setSidebarCollapsed(false);
        setBreadcrumbDrop(false); setPaletteOpen(false); setActivityOpen(false);
        setPageHelpOpen(false); setShortcutsOpen(false); setTopbarCustOpen(false); setCrumbCtx(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, isFullscreen, play]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (breadcrumbDropRef.current && !breadcrumbDropRef.current.contains(e.target as Node)) setBreadcrumbDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const notifList = useNotifications();
  const unreadCount = useMemo(() => {
    const now = Date.now();
    return notifList.filter(n => !n.read && (!n.snoozedUntil || new Date(n.snoozedUntil).getTime() <= now)).length;
  }, [notifList]);

  useEffect(() => { setFaviconUnreadBadge(unreadCount); }, [unreadCount]);

  useEffect(() => {
    const label = ROUTE_LABELS[location.pathname];
    const prefix = unreadCount > 0 ? `(${unreadCount}) ` : '';
    document.title = label ? `${prefix}${label} — Recoverpro` : 'Recoverpro';
  }, [location.pathname, unreadCount]);

  const display = useDisplayPrefs();
  const topbarHidden = useTopbarPrefs();
  const t = useT();

  useEffect(() => {
    const el = layoutRef.current;
    if (!el) return;
    if (display.cvdSafe) { applyAccent(el, { accent: '#2563eb', accentHover: '#1d4ed8', accentSubtle: 'rgba(37,99,235,.12)', label: 'cvd-blue' }); return; }
    if (display.customAccent) { const custom = makeAccentFromHex(display.customAccent); if (custom) { applyAccent(el, custom); return; } }
    applyAccent(el, getRouteAccent(location.pathname));
  }, [location.pathname, display.cvdSafe, display.customAccent]);

  const ptr = usePullToRefresh({ ref: mainRef, onRefresh: () => new Promise<void>(resolve => { play('pop'); window.setTimeout(resolve, 600); }) });

  const rawRole = user?.roles?.[0]?.name?.replace('ROLE_', '').trim() as Role;
  const role: Role = rawRole || 'FO';
  const roleLabel = ROLE_LABEL[role] || ROLE_LABEL.FO;
  const avatarColor = hashColor((user?.firstName ?? '') + (user?.lastName ?? '') + (user?.email ?? ''));

  const onLucienPage = location.pathname.startsWith('/app/lucien') || location.pathname.startsWith('/bank/lucien');
  const showLucien = !onLucienPage && (user?.roles ?? []).some(r => LUCIEN_ROLES.has(r.name.replace('ROLE_', '')));

  const layoutCls = [
    'app-layout',
    darkMode       ? 'dark'              : '',
    highContrast   ? 'high-contrast'     : '',
    display.cvdSafe ? 'cvd-safe'         : '',
    `text-scale-${display.textScale}`,
    `density-${display.density}`,
    isLoggingOut   ? 'is-logging-out'    : '',
    isFullscreen   ? 'is-app-fullscreen' : '',
  ].filter(Boolean).join(' ');

  return {
    user, role, roleLabel, avatarColor,
    themeMode, setThemeMode, darkMode, soundEnabled, setSoundEnabled,
    isFullscreen, highContrast, scrolledDown, isPhone,
    lucienOpen, setLucienOpen, sidebarCollapsed, setSidebarCollapsed,
    breadcrumbDrop, setBreadcrumbDrop,
    paletteOpen, setPaletteOpen, activityOpen, setActivityOpen,
    pageHelpOpen, setPageHelpOpen, shortcutsOpen, setShortcutsOpen,
    topbarCustOpen, setTopbarCustOpen, crumbCtx, setCrumbCtx,
    userDropOpen, setUserDropOpen, helpOpen, setHelpOpen,
    notifOpen, setNotifOpen,
    historyStack, currentIndex, routeTransition, routeAnnounce, isLoggingOut,
    notifRef, breadcrumbDropRef, mainRef, layoutRef, helpModalRef,
    handleLogout, play,
    unreadCount, topbarHidden, display, t,
    showLucien, layoutCls, ptr,
  };
}
