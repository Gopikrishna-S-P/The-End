import type React from 'react';
import type { Role } from '../types';
import {
  BarChart2, Layers, MapPin, Upload, Send,
  CalendarDays, LineChart, Settings2, LayoutDashboard,
  ClipboardCheck, Play, Receipt, Building2, Flag, Bookmark,
  Sparkles, CreditCard,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  permissions?: string[];
  alwaysFor?: Role[];
  count?: number;
  locked?: boolean;
}
export interface NavSection { label: string; items: NavItem[] }

// Sidebar is deliberately capped at 5-6 items per role — only the daily-driver
// destination for that role's job. Every other page in the app still exists and
// still has a working route; it's reached by navigating INTO it from one of these
// hubs (e.g. a case's Assignments/Visit Logs/PTPs live inside the Loans detail
// view), not by piling more entries into the sidebar.
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      // Field roles (FO / CALLER / TRACER) — their whole job in 6 links.
      { label: "Today's Visits", to: '/app/today',        icon: CalendarDays,   alwaysFor: ['FO','CALLER','TRACER'] },
      { label: 'My Cases',       to: '/app/my-cases',      icon: Layers,         alwaysFor: ['FO','CALLER','TRACER'] },
      // Ground truth: VisitLogController.java SUBMITTERS = hasAnyRole('FO') only
      // (physical field visits), and VisitSubmitPage.tsx already hides its own
      // Submit button unless hasPermission('VISIT_SUBMIT'), which only FO holds.
      // CALLER/TRACER are phone-based roles with no visit-submit permission —
      // showing them this link led to a dead-end (case picker, no submit button).
      { label: 'Start Visit',    to: '/app/start-visit',   icon: Play,           alwaysFor: ['FO'] },
      { label: 'My Attendance',  to: '/app/my-attendance', icon: ClipboardCheck, alwaysFor: ['FO','CALLER','TRACER'] },

      // Shared daily driver — everyone who touches money sees this.
      { label: 'Dashboard',   to: '/app/dashboard',   icon: BarChart2, alwaysFor: ['ORG_ADMIN','MANAGER','TL','FO','CALLER','TRACER'] },
      { label: 'Collections', to: '/app/collections', icon: Receipt,   alwaysFor: ['MANAGER','TL','FO','CALLER','TRACER'] },

      // Leads (MANAGER / TL) — oversee the day's work. File Uploads dropped from
      // these two roles to stay within the 5-6 cap; it's a periodic data-setup
      // task, not a daily one, and stays on the sidebar for ORG_ADMIN below.
      { label: 'Daily Dispatch', to: '/app/dispatch',   icon: Send,      alwaysFor: ['MANAGER','TL'], permissions: ['DAILY_DISPATCH_CREATE'] },
      { label: 'Loans',          to: '/app/allocations', icon: Layers,    alwaysFor: ['ORG_ADMIN','MANAGER','TL'] },
      { label: 'Visit Logs',     to: '/app/visits',      icon: MapPin,    alwaysFor: ['MANAGER','TL'] },
      { label: 'Reports',        to: '/app/reports',     icon: LineChart, alwaysFor: ['ORG_ADMIN','MANAGER','TL'] },
      // Ground truth: UploadsPage.tsx self-gates on UPLOAD_READER_ROLES =
      // [PLATFORM_ADMIN, ORG_ADMIN, MANAGER, TL], and ORG_ADMIN's seeded
      // permission set (V017__bootstrap_data.sql) includes FILE_UPLOAD/FILE_VIEW/FILE_DELETE
      // outright — the page was fully built for these roles but had no sidebar
      // link, so only PLATFORM_ADMIN could ever discover it.
      { label: 'File Uploads',  to: '/app/uploads',     icon: Upload,    alwaysFor: ['ORG_ADMIN'] },

      // Org admin — same operational hubs, plus team setup instead of field-day tools.
      // Daily Dispatch dropped for this role to stay within the cap — it's a
      // MANAGER/TL day-of-work tool, not an org-admin one.
      { label: 'User Setup', to: '/app/users', icon: Settings2, alwaysFor: ['ORG_ADMIN'] },

      // Platform admin — a distinct console, not the org workspace at all.
      // Revenue Trend dropped to stay within the cap — it's a drill-down still
      // reachable from Billing/Overview. File Uploads was dropped for the same
      // reason, but merging Lucien Prompts/RAG into one entry freed a slot, and
      // UploadsPage.tsx already self-gates PLATFORM_ADMIN into UPLOAD_READER_ROLES
      // with its own cross-org picker, so it was fully built for this role and
      // just missing the link — same gap ORG_ADMIN had below before that fix.
      { label: 'Overview',       to: '/platform/dashboard',     icon: LayoutDashboard, alwaysFor: ['PLATFORM_ADMIN'] },
      { label: 'Platform Setup', to: '/platform/setup',         icon: Building2,       alwaysFor: ['PLATFORM_ADMIN'] },
      { label: 'Feature Flags',  to: '/platform/feature-flags', icon: Flag,            alwaysFor: ['PLATFORM_ADMIN'] },
      { label: 'Lucien',         to: '/app/lucien/admin',       icon: Sparkles,        alwaysFor: ['PLATFORM_ADMIN'] },
      { label: 'Billing',        to: '/platform/subscriptions', icon: CreditCard,      alwaysFor: ['PLATFORM_ADMIN'] },
      { label: 'File Uploads',   to: '/app/uploads',            icon: Upload,          alwaysFor: ['PLATFORM_ADMIN'] },
    ],
  },
];

export const ROLE_LABEL: Record<Role, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  ORG_ADMIN:      'Org Admin',
  MANAGER:        'Manager',
  TL:             'Team Lead',
  FO:             'Field Officer',
  CALLER:         'Caller',
  TRACER:         'Tracer',
  FIELD_AGENT:    'Field Agent',
  AGENCY_ADMIN:   'Agency Admin',
  BANK_ADMIN:     'Bank Admin',
};

export const ROUTE_LABELS: Record<string, string> = {
  ...NAV_SECTIONS
    .flatMap(s => s.items)
    .reduce((acc, item) => ({ ...acc, [item.to]: item.label }), {} as Record<string, string>),
  '/app/collections/trend': 'Collection Trend',
  '/app/assignments': 'Assignments',
  '/app/ptps': 'PTPs',
  '/app/audit': 'Audit Logs',
  '/app/agents': 'Field Agents',
  '/app/live-track': 'Live Map',
  '/app/settings/schema': 'Column Schemas',
  '/app/settings/roles': 'Roles',
  '/app/settings/organization': 'Organization',
  '/app/settings/message-templates': 'Message Templates',
  '/app/attendance': 'Attendance',
  '/app/non-contactables': 'Non-Contactables',
  '/app/calendar': 'Holiday Calendar',
  '/app/field-ops': 'Field Ops',
  '/app/portfolio-risk': 'Portfolio Risk',
  '/app/payments/links': 'Payment Links',
  '/app/borrowers': 'Borrowers',
  '/app/fraud-cases': 'Fraud Cases',
  '/app/reconciliation': 'Reconciliation',
  '/app/restructure-proposals': 'Restructure Proposals',
  '/app/settlement-offers': 'Settlement Offers',
  '/app/grievances': 'Grievances',
  '/app/settings/grievance-officer': 'Grievance Officer',
  '/app/lucien/admin': 'Lucien',
  '/platform/revenue-trend': 'Revenue Trend',
};

// Detail/child routes (e.g. /app/allocations/:id) have no exact ROUTE_LABELS
// entry, since that map is keyed by literal paths. Without a fallback, every
// such page loses its topbar breadcrumb and document title entirely (nav
// renders nothing rather than a wrong label). This resolves to the nearest
// matched ancestor's label instead, so a loan detail page still reads "Loans"
// in the breadcrumb/title, same as every other page having a real label.
export function resolveRouteLabel(pathname: string): string | undefined {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  let best: string | undefined;
  let bestLen = 0;
  for (const route of Object.keys(ROUTE_LABELS)) {
    if (pathname.startsWith(route + '/') && route.length > bestLen) {
      best = ROUTE_LABELS[route];
      bestLen = route.length;
    }
  }
  return best;
}

export const SHORTCUTS = [
  { desc: 'Open command palette',               keys: ['⌘', 'K'] },
  { desc: 'Toggle fullscreen zen mode',         keys: ['⌘', '⇧', 'F'] },
  { desc: 'Toggle dark / light / system theme', keys: ['⌘', '⇧', 'L'] },
  { desc: 'Jump to nav item 1–9',               keys: ['Alt', '1–9'] },
  { desc: 'Back / forward',                     keys: ['Alt', '← / →'] },
  { desc: 'Close overlays / exit fullscreen',   keys: ['Esc'] },
  { desc: 'Open this dialog  (Shift+/ on non-US keyboards)', keys: ['?'] },
];

export const LUCIEN_ROLES = new Set(['FO', 'TL', 'MANAGER', 'CALLER', 'TRACER', 'ORG_ADMIN', 'PLATFORM_ADMIN']);

export const IS_APPLE = typeof navigator !== 'undefined'
  && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
export const PALETTE_HINT = IS_APPLE ? '⌘K' : 'Ctrl K';

export function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 55%, 42%)`;
}

export { Bookmark };
