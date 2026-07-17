import type React from 'react';
import type { Role } from '../types';
import {
  BarChart2, Home, Layers, Users, Shuffle, IndianRupee,
  MapPin, TrendingUp, Upload, History,
  Building2, Receipt, Bot, Database, ShieldCheck, Send, CalendarDays,
  Library, Flag, UserPlus, Bookmark, CreditCard, Briefcase,
  LineChart, Navigation2, Settings2, LayoutDashboard, ClipboardCheck, Play, Radio,
} from 'lucide-react';
import LucienIcon from '../components/LucienIcon';

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

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard',      to: '/app/dashboard', icon: BarChart2,            alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL','FO','CALLER','TRACER'] },
      { label: "Today's Visits", to: '/app/today',     icon: CalendarDays,    alwaysFor: ['FO','CALLER','TRACER'] },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Daily Dispatch', to: '/app/dispatch',      icon: Send,            alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL'], permissions: ['DAILY_DISPATCH_CREATE'] },
      { label: 'My Cases',       to: '/app/my-cases',      icon: Briefcase,       alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL','FO','CALLER','TRACER'] },
      { label: 'Attendance',     to: '/app/attendance',    icon: ClipboardCheck,  alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL'] },
      { label: 'My Attendance',  to: '/app/my-attendance', icon: ClipboardCheck,  alwaysFor: ['FO','CALLER','TRACER'] },
      { label: 'Start Visit',    to: '/app/start-visit',   icon: Play,            alwaysFor: ['FO','CALLER','TRACER'] },
      { label: 'File Uploads',   to: '/app/uploads',       icon: Upload,          alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL'], permissions: ['FILE_UPLOAD'] },
    ],
  },
  {
    label: 'Cases',
    items: [
      { label: 'Loans',       to: '/app/allocations',      icon: Layers,      alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL','FO','CALLER','TRACER'] },
      { label: 'Assignments', to: '/app/assignments',      icon: Shuffle,     alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL'] },
      { label: 'Visit Logs',  to: '/app/visits',           icon: MapPin,      alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL','FO'] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports',    to: '/app/reports', icon: LineChart,  alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL'] },
      { label: 'Audit Logs', to: '/app/audit',   icon: History,    alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER'] },
    ],
  },
  {
    label: 'Team',
    items: [
      { label: 'User Setup',    to: '/app/users',          icon: Settings2, alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER'] },
      { label: 'User Requests', to: '/app/users/requests', icon: UserPlus,  alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER'] },
      { label: 'Field Agents',  to: '/app/agents',     icon: Users,  alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL'] },
      { label: 'Live Map',      to: '/app/live-track', icon: Radio,  alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Column Schemas', to: '/app/settings/schema',  icon: Database,  alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN'], permissions: ['COLUMN_CREATE'] },
      { label: 'Roles',          to: '/app/settings/roles',   icon: ShieldCheck,     alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN'], permissions: ['ROLE_ASSIGN'] },
      // { label: 'Subscription',   to: '/app/subscription',     icon: CreditCard,      alwaysFor: ['ORG_ADMIN'] },
      { label: 'Lucien Prompts', to: '/app/lucien/prompts',   icon: LucienIcon,      alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN'] },
      { label: 'Knowledge Base', to: '/app/lucien/rag',       icon: Library,         alwaysFor: ['PLATFORM_ADMIN','ORG_ADMIN'] },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Overview',       to: '/platform/dashboard',     icon: LayoutDashboard, alwaysFor: ['PLATFORM_ADMIN'] },
      { label: 'Billing',        to: '/platform/subscriptions', icon: CreditCard,      alwaysFor: ['PLATFORM_ADMIN'] },
      { label: 'Platform Setup', to: '/platform/setup',         icon: Building2,       alwaysFor: ['PLATFORM_ADMIN'] },
      { label: 'Feature Flags',  to: '/platform/feature-flags', icon: Flag,            alwaysFor: ['PLATFORM_ADMIN'] },
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
};

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
