export interface PageHelpShortcut {
  keys: string[];
  desc: string;
}

export interface PageHelp {
  /** Page title. */
  title: string;
  /** One-paragraph description of what this page is for. */
  description: string;
  /** Short list of "things to know". */
  tips?: string[];
  /** Related routes/pages the user might also want. */
  links?: Array<{ label: string; to: string }>;
  /** Keyboard shortcuts that only matter on this page. */
  shortcuts?: PageHelpShortcut[];
}

const REGISTRY: Record<string, PageHelp> = {
  '/app/dashboard': {
    title: 'Dashboard',
    description: 'A live snapshot of recovery performance — collections, dispatch coverage, PTP health, and the cases currently demanding attention.',
    tips: [
      'Stat cards reflect live numbers from your org\'s active books.',
      'Click any chart legend to filter the visualization without leaving the page.',
      'Use the date picker (top-right of each chart) to compare against last week / month.',
    ],
    links: [
      { label: 'Lucien AI insights', to: '/app/lucien' },
      { label: 'Reports',            to: '/app/reports' },
    ],
  },

  '/app/today': {
    title: "Today's visits",
    description: 'The cases assigned to you for today, sorted by visit priority and proximity to your last check-in.',
    tips: [
      'Tap a case to open the visit form — geolocation is captured automatically.',
      'Long-press a row to reschedule or hand off to another field officer.',
    ],
    links: [{ label: 'All visit logs', to: '/app/visits' }],
  },

  '/app/dispatch': {
    title: 'Daily dispatch',
    description: 'Assign cases to field officers, callers, and tracers for the day. Bulk-assign by drag-selecting rows or by uploading a CSV.',
    tips: [
      'Unassigned cases bubble to the top automatically.',
      'Hover an agent to see their current load + last-seen timestamp.',
    ],
    shortcuts: [
      { keys: ['Ctrl', 'A'],   desc: 'Select all visible cases' },
      { keys: ['Shift', '↑↓'], desc: 'Extend the row selection' },
    ],
  },

  '/app/uploads': {
    title: 'File uploads',
    description: 'Bring in loan books, supporting documents, and reconciliations. Mappings are auto-detected from column headers.',
    tips: [
      'Use the Column Schemas page to define recurring mappings for each lender.',
      'Failed rows are queued for manual review under "Errors".',
    ],
    links: [{ label: 'Column schemas', to: '/app/settings/schema' }],
  },

  '/app/allocations': {
    title: 'Loans',
    description: 'Every loan case allocated to your org. Filter by status, lender, bucket, or assigned officer.',
    tips: [
      'Apply URL filters like ?status=active and they\'ll surface as breadcrumb chips.',
      'Right-click any row for quick actions (assign, snooze, add PTP).',
    ],
    links: [
      { label: 'Assignments', to: '/app/assignments' },
      { label: 'Unassigned',  to: '/app/cases/unassigned' },
    ],
  },

  '/app/audit': {
    title: 'Audit logs',
    description: 'A tamper-evident timeline of every privileged action — who did what, when, and from where.',
    tips: [
      'Impersonation start/stop events show up as a distinct row type.',
    ],
  },

  '/app/lucien': {
    title: 'Lucien AI',
    description: 'Conversational insights over your portfolio. Ask follow-ups in plain English; Lucien cites the underlying data.',
    tips: [
      'Lucien only answers from your org\'s data — nothing is shared cross-tenant.',
      'Pin useful queries; they become saved searches in the command palette.',
    ],
  },

  '/app/settings/organization': {
    title: 'Organization settings',
    description: 'Branding, regional defaults, and the per-org accent colour that tints the entire UI.',
    tips: [
      'Setting a workspace accent overrides per-route colours.',
      'Changes apply immediately — no reload required.',
    ],
  },
};

export function getPageHelp(pathname: string): PageHelp | null {
  if (REGISTRY[pathname]) return REGISTRY[pathname];
  /* Fallback: try the parent path for detail-style routes (e.g. /app/allocations/:id) */
  const parent = pathname.replace(/\/[^/]+$/, '');
  if (parent && REGISTRY[parent]) return REGISTRY[parent];
  return null;
}
