import { useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePermissions } from './usePermissions';
import { useBookmarks, bookmarks } from '../utils/bookmarks';
import { useNavCounts, refreshNavCounts } from '../utils/navCounts';
import { NAV_SECTIONS, ROUTE_LABELS, Bookmark, type NavItem, type NavSection } from '../utils/navConfig';
import { useFeatureFlags } from './useFeatureFlags';
import type { Role } from '../types';

interface Params {
  role: Role;
  historyStack: string[];
  currentIndex: number;
}

export function useAppNavState({ role, historyStack, currentIndex }: Params) {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasAnyPermission } = usePermissions();
  const navCountMap = useNavCounts();
  const savedViews = useBookmarks();
  const { isEnabled } = useFeatureFlags();

  const lucienEnabled   = isEnabled('LUCIEN_AI');
  const reportsEnabled  = isEnabled('ADVANCED_REPORTS');

  const LUCIEN_PATHS = new Set(['/app/lucien/prompts', '/app/lucien/rag']);

  const sections = useMemo(() => {
    const filterItems = (items: NavItem[]) => items
      .filter(item => {
        // alwaysFor is an authoritative role gate when present — a role it excludes
        // never sees the item, even if that role happens to hold the permission too
        // (e.g. PLATFORM_ADMIN holds every permission but isn't an operational role).
        if (item.alwaysFor?.length) return item.alwaysFor.includes(role);
        if (item.permissions?.length) return hasAnyPermission(...item.permissions);
        return false;
      })
      .filter(item => {
        if (LUCIEN_PATHS.has(item.to)) return lucienEnabled;
        return true;
      })
      .map(item =>
        item.to === '/app/reports' && !reportsEnabled
          ? { ...item, locked: true }
          : item
      );
    return NAV_SECTIONS.map(s => ({ ...s, items: filterItems(s.items) })).filter(s => s.items.length > 0);
  }, [role, hasAnyPermission, lucienEnabled, reportsEnabled]);

  const canSeeAllocations = useMemo(
    () => sections.some(s => s.items.some(i => i.to === '/app/allocations')),
    [sections],
  );

  useEffect(() => {
    if (!canSeeAllocations) return;
    refreshNavCounts();
    const id = window.setInterval(refreshNavCounts, 90_000);
    return () => window.clearInterval(id);
  }, [canSeeAllocations]);

  const sidebarSections = useMemo<NavSection[]>(() => {
    const decorate = (items: NavItem[]): NavItem[] =>
      items.map(it => { const c = navCountMap[it.to]; return c && c > 0 ? { ...it, count: c } : it; });
    const decorated = sections.map(s => ({ ...s, items: decorate(s.items) }));
    if (savedViews.length === 0) return decorated;
    const savedSection: NavSection = {
      label: 'Saved Views',
      items: savedViews.slice(0, 6).map(bm => ({ label: bm.label, to: bm.url, icon: Bookmark })),
    };
    return [savedSection, ...decorated];
  }, [sections, navCountMap, savedViews]);

  const currentSection = useMemo(
    () => NAV_SECTIONS.find(s => s.items.some(i => i.to === location.pathname))?.label,
    [location.pathname],
  );

  const breadcrumbs = useMemo(() => {
    const label = ROUTE_LABELS[location.pathname];
    if (!label) return null;
    // exact match first, then parent-path match (e.g. /app/collections/trend → /app/collections)
    const section = NAV_SECTIONS.find(s => s.items.some(i => i.to === location.pathname))
      ?? NAV_SECTIONS.find(s => s.items.some(i => location.pathname.startsWith(i.to + '/')));
    return section
      ? [{ label: section.label, to: null as string | null }, { label, to: location.pathname as string | null }]
      : [{ label, to: location.pathname as string | null }];
  }, [location.pathname]);

  const filterChips = useMemo(() => {
    const HIDDEN_PARAMS = new Set(['agent', 'agentId', 'userId', 'id', 'orgId', 'organizationId']);
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const params = new URLSearchParams(location.search);
    const out: Array<{ key: string; value: string; label: string }> = [];
    for (const [key, value] of params.entries()) {
      if (!value || HIDDEN_PARAMS.has(key) || UUID_RE.test(value)) continue;
      const niceKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/[_-]/g, ' ');
      const niceVal = value.charAt(0).toUpperCase() + value.slice(1).replace(/[_-]/g, ' ');
      out.push({ key, value, label: `${niceKey}: ${niceVal}` });
    }
    return out;
  }, [location.search]);

  const removeFilter = useCallback((key: string) => {
    const chip = document.querySelector<HTMLElement>(`.app-breadcrumb-filter[data-key="${key}"]`);
    const doRemove = () => {
      const params = new URLSearchParams(location.search);
      params.delete(key);
      const next = params.toString();
      navigate(`${location.pathname}${next ? '?' + next : ''}`, { replace: true });
    };
    if (chip) {
      chip.setAttribute('data-removing', '');
      const tid = window.setTimeout(doRemove, 180);
      chip.addEventListener('animationend', () => window.clearTimeout(tid), { once: true });
    } else {
      doRemove();
    }
  }, [location.pathname, location.search, navigate]);

  const clearFilters = useCallback(() => {
    navigate(location.pathname, { replace: true });
  }, [location.pathname, navigate]);

  const canGoBack    = currentIndex > 0;
  const canGoForward = currentIndex < historyStack.length - 1;

  const previousPathLabel = useMemo(() => {
    if (!canGoBack) return null;
    return ROUTE_LABELS[historyStack[currentIndex - 1]] ?? null;
  }, [historyStack, currentIndex, canGoBack]);

  const bookmarkActions = useMemo(() => ({
    isBookmarked: (url: string) => bookmarks.isBookmarked(url),
    toggle: (url: string, label: string) => {
      if (bookmarks.isBookmarked(url)) bookmarks.removeByUrl(url);
      else bookmarks.add(url, label + (url.includes('?') ? ' (filtered)' : ''));
    },
  }), []);

  return {
    sections, sidebarSections, currentSection,
    breadcrumbs, filterChips, removeFilter, clearFilters,
    canGoBack, canGoForward, previousPathLabel,
    bookmarkActions,
    locationPathname: location.pathname,
    locationSearch: location.search,
  };
}
