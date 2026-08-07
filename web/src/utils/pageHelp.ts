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
      { label: 'Today\'s Visits',    to: '/app/today' },
      { label: 'My Cases',           to: '/app/my-cases' },
      { label: 'Attendance',         to: '/app/my-attendance' },
      { label: 'Audit Logs',         to: '/app/audit' },
      { label: 'Upload Data',        to: '/app/uploads' },
    ],
  },

  '/app/today': {
    title: "Today's visits",
    description: 'The cases assigned to you for today, sorted by visit priority and proximity to your last check-in.',
    tips: [
      'Tap a case to open the visit form — geolocation is captured automatically.',
      'Long-press a row to reschedule or hand off to another field officer.',
    ],
    links: [
      { label: 'All Visit Logs', to: '/app/visits' },
      { label: 'My Active Cases', to: '/app/my-cases' },
      { label: 'My Attendance',   to: '/app/my-attendance' },
      { label: 'Start New Visit', to: '/app/start-visit' },
    ],
  },

  '/app/dispatch': {
    title: 'Daily dispatch',
    description: 'Assign cases to field officers, callers, and tracers for the day. Bulk-assign by drag-selecting rows or by uploading a CSV.',
    tips: [
      'Unassigned cases bubble to the top automatically.',
      'Hover an agent to see their current load + last-seen timestamp.',
    ],
    links: [
      { label: 'Field Agents list', to: '/app/agents' },
      { label: 'Live Tracking Map', to: '/app/live-track' },
      { label: 'Field Operations',  to: '/app/field-ops' },
      { label: 'Agent Attendance',  to: '/app/attendance' },
      { label: 'Holiday Calendar',  to: '/app/calendar' },
    ],
  },

  '/app/uploads': {
    title: 'File uploads',
    description: 'Bring in loan books, supporting documents, and reconciliations. Mappings are auto-detected from column headers.',
    tips: [
      'Use the Column Schemas page to define recurring mappings for each lender.',
      'Failed rows are queued for manual review under "Errors".',
    ],
    links: [
      { label: 'Column Schemas', to: '/app/settings/schema' },
      { label: 'Reconciliation', to: '/app/reconciliation' },
    ],
  },

  '/app/allocations': {
    title: 'Loans',
    description: 'Every loan case allocated to your org. Filter by status, lender, bucket, or assigned officer.',
    tips: [
      'Apply URL filters like ?status=active and they\'ll surface as breadcrumb chips.',
      'Right-click any row for quick actions (assign, snooze, add PTP).',
    ],
    links: [
      { label: 'Assignments',          to: '/app/assignments' },
      { label: 'Unassigned Cases',     to: '/app/cases/unassigned' },
      { label: 'Borrowers Directory',  to: '/app/borrowers' },
      { label: 'Fraud cases tracker',  to: '/app/fraud-cases' },
      { label: 'Promise to Pay (PTP)', to: '/app/ptps' },
      { label: 'All Collections',      to: '/app/collections' },
      { label: 'Collection Trend',     to: '/app/collections/trend' },
      { label: 'Grievance Cases',      to: '/app/grievances' },
      { label: 'Restructure Proposals',to: '/app/restructure-proposals' },
      { label: 'Settlement Offers',    to: '/app/settlement-offers' },
      { label: 'Non-Contactables',     to: '/app/non-contactables' },
    ],
  },

  '/app/audit': {
    title: 'Audit logs',
    description: 'A tamper-evident timeline of every privileged action — who did what, when, and from where.',
    tips: [
      'Impersonation start/stop events show up as a distinct row type.',
    ],
    links: [
      { label: 'Operational Dashboard', to: '/app/dashboard' },
      { label: 'User Setup profile',    to: '/app/users' },
      { label: 'Role Permissions',      to: '/app/settings/roles' },
      { label: 'Workspace settings',    to: '/app/settings/organization' },
    ],
  },

  '/app/lucien': {
    title: 'Lucien AI',
    description: 'Conversational insights over your portfolio. Ask follow-ups in plain English; Lucien cites the underlying data.',
    tips: [
      'Lucien only answers from your org\'s data — nothing is shared cross-tenant.',
      'Pin useful queries; they become saved searches in the command palette.',
    ],
    links: [
      { label: 'Return to Dashboard', to: '/app/dashboard' },
      { label: 'Generated Reports',   to: '/app/reports' },
      { label: 'Column Configuration', to: '/app/settings/schema' },
    ],
  },

  '/app/settings/organization': {
    title: 'Organization settings',
    description: 'Branding, regional defaults, and the per-org accent colour that tints the entire UI.',
    tips: [
      'Setting a workspace accent overrides per-route colours.',
      'Changes apply immediately — no reload required.',
    ],
    links: [
      { label: 'Role Management',     to: '/app/settings/roles' },
      { label: 'Column Schemas',      to: '/app/settings/schema' },
      { label: 'User Profiles list',  to: '/app/users' },
      { label: 'Grievance Officer',   to: '/app/settings/grievance-officer' },
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
