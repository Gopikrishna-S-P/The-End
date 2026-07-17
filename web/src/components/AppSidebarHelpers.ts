import type { ElementType } from 'react';

export interface SidebarNavItem {
  label: string;
  to: string;
  icon: ElementType;
  badge?: number;
  count?: number;
  locked?: boolean;
}

export interface SidebarSection {
  label: string;
  items: SidebarNavItem[];
}

export interface SidebarUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  organizationName?: string;
}

export interface AppSidebarProps {
  sections: SidebarSection[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onProfileSettings?: () => void;
  onLogout?: () => void;
  user?: SidebarUser | null;
  roleLabel?: string;
  avatarColor?: string;
}

export const WIDTH_KEY     = 'rp-sidebar-width';
export const WIDTH_MIN     = 200;
export const WIDTH_MAX     = 380;
export const WIDTH_SNAPS   = [220, 280, 340];
export const WIDTH_DEFAULT = 256;
export const WIDTH_STEP    = 16;

export function readPersistedWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (!raw) return WIDTH_DEFAULT;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return WIDTH_DEFAULT;
    return Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, n));
  } catch { return WIDTH_DEFAULT; }
}

export function snapWidth(w: number): number {
  return WIDTH_SNAPS.reduce(
    (best, s) => Math.abs(s - w) < Math.abs(best - w) ? s : best,
    WIDTH_SNAPS[0],
  );
}
