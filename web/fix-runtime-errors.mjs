import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC = 'F:/DevelopmentZone/recoverpro/web/src';

function walk(dir, exts) {
  const results = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full, exts));
    } else if (exts.includes(extname(f))) {
      results.push(full);
    }
  }
  return results;
}

function fix(path, ...transforms) {
  let content = readFileSync(path, 'utf8');
  let original = content;
  for (const fn of transforms) content = fn(content);
  if (content !== original) {
    writeFileSync(path, content, 'utf8');
    console.log('FIXED:', path.replace(SRC, ''));
  }
}

// ── 1. components/ files ─────────────────────────────────────────────────────
// Remove incorrect ./pages/ prefix added by the import-fix script
// Fix ../styles/X.css → ./X.css for component-local CSS

const componentCssNames = [
  'ActingAsBanner','ActivityPanel','AppSidebar','BackgroundSyncIndicator',
  'BrandedLoader','BreadcrumbContextMenu','CaseTimeline','CommandPalette',
  'ConfettiHost','FeedbackDialog','Footer','LoadingSplash','LucienPanel',
  'MfaNudge','NoiseOverlay','NotificationPanel','NotificationPrefsDialog',
  'NotificationToasts','OfflineChip','PageHelpDrawer','PullToRefreshIndicator',
  'RouteProgressBar','SessionExpiryChip','ShortcutsDialog','Skeleton',
  'SlashMenu','SplitPaneDrawer','TabBar','TopbarCustomizeDialog','TourOverlay',
  'UserMenu','WhatsNewModal','WorkspaceSwitcher',
];

const compDir = join(SRC, 'components');
for (const f of walk(compDir, ['.ts', '.tsx'])) {
  fix(f,
    // Remove ./pages/ prefix on component-to-component or component-to-util imports
    c => c.replace(/from\s+(['"])\.\/pages\//g, "from $1./"),
    // Fix ../styles/X.css → ./X.css for co-located CSS
    c => componentCssNames.reduce((s, name) =>
      s.replace(new RegExp(`\\.\\./styles/${name}\\.css`, 'g'), `./${name}.css`), c),
    // Fix any remaining ../styles/ that point to component-local CSS
    c => c.replace(/from\s+(['"])\.\.\/(styles)\/([\w-]+\.css)(['"])/g,
      (m, q1, _styles, file, q2) =>
        componentCssNames.some(n => file === n + '.css') ? `from ${q1}./${file}${q2}` : m),
  );
}

// ── 2. pages/ files ──────────────────────────────────────────────────────────
// Fix bare ./components and ./api (barrel imports) → ../components, ../api
// Fix ./hooks → ../hooks, ./utils → ../utils, ./types → ../types

const pagesDir = join(SRC, 'pages');
for (const f of walk(pagesDir, ['.ts', '.tsx'])) {
  fix(f,
    c => c.replace(/from\s+(['"])\.\/components(['"/])/g, "from $1../components$2"),
    c => c.replace(/from\s+(['"])\.\/api(['"/])/g, "from $1../api$2"),
    c => c.replace(/from\s+(['"])\.\/hooks(['"/])/g, "from $1../hooks$2"),
    c => c.replace(/from\s+(['"])\.\/utils(['"/])/g, "from $1../utils$2"),
    c => c.replace(/from\s+(['"])\.\/types(['"/])/g, "from $1../types$2"),
    // Fix ./components/ (with slash) → ../components/
    c => c.replace(/from\s+(['"])\.\/components\//g, "from $1../components/"),
    c => c.replace(/from\s+(['"])\.\/api\//g, "from $1../api/"),
    c => c.replace(/from\s+(['"])\.\/hooks\//g, "from $1../hooks/"),
    c => c.replace(/from\s+(['"])\.\/utils\//g, "from $1../utils/"),
    c => c.replace(/from\s+(['"])\.\/types\//g, "from $1../types/"),
  );
}

// ── 3. Root-level files ───────────────────────────────────────────────────────

// AuthContext.tsx: ./pages/api → ./api
fix(join(SRC, 'AuthContext.tsx'),
  c => c.replace(/from\s+(['"])\.\/pages\/api/g, "from $1./api"),
  c => c.replace(/from\s+(['"])\.\/pages\/components/g, "from $1./components"),
  c => c.replace(/from\s+(['"])\.\/pages\/hooks/g, "from $1./hooks"),
  c => c.replace(/from\s+(['"])\.\/pages\/utils/g, "from $1./utils"),
  c => c.replace(/from\s+(['"])\.\/pages\/types/g, "from $1./types"),
);

// ProtectedRoute.tsx
fix(join(SRC, 'ProtectedRoute.tsx'),
  c => c.replace(/from\s+(['"])\.\/pages\/api/g, "from $1./api"),
  c => c.replace(/from\s+(['"])\.\/pages\/components/g, "from $1./components"),
  c => c.replace(/from\s+(['"])\.\/pages\/hooks/g, "from $1./hooks"),
  c => c.replace(/from\s+(['"])\.\/pages\/utils/g, "from $1./utils"),
  c => c.replace(/from\s+(['"])\.\/pages\/types/g, "from $1./types"),
);

// AppLayout.tsx
fix(join(SRC, 'AppLayout.tsx'),
  c => c.replace(/from\s+(['"])\.\/pages\/api/g, "from $1./api"),
  c => c.replace(/from\s+(['"])\.\/pages\/components/g, "from $1./components"),
  c => c.replace(/from\s+(['"])\.\/pages\/hooks/g, "from $1./hooks"),
  c => c.replace(/from\s+(['"])\.\/pages\/utils/g, "from $1./utils"),
  c => c.replace(/from\s+(['"])\.\/pages\/types/g, "from $1./types"),
);

// LandingPage.tsx — critical bug fix only (./pages/X → ./X)
fix(join(SRC, 'LandingPage.tsx'),
  c => c.replace(/from\s+(['"])\.\/pages\/components/g, "from $1./components"),
  c => c.replace(/from\s+(['"])\.\/pages\/api/g, "from $1./api"),
  c => c.replace(/from\s+(['"])\.\/pages\/hooks/g, "from $1./hooks"),
  c => c.replace(/from\s+(['"])\.\/pages\/utils/g, "from $1./utils"),
  c => c.replace(/from\s+(['"])\.\/pages\/types/g, "from $1./types"),
);

// ── 4. utils/ files ───────────────────────────────────────────────────────────
// notificationDispatch.ts: ./utils/X → ./X (double-prefix)

const utilsDir = join(SRC, 'utils');
for (const f of walk(utilsDir, ['.ts', '.tsx'])) {
  fix(f,
    c => c.replace(/from\s+(['"])\.\/utils\//g, "from $1./"),
    c => c.replace(/from\s+(['"])\.\.\/pages\/utils\//g, "from $1./"),
  );
}

// ── 5. hooks/ files ───────────────────────────────────────────────────────────
const hooksDir = join(SRC, 'hooks');
for (const f of walk(hooksDir, ['.ts', '.tsx'])) {
  fix(f,
    c => c.replace(/from\s+(['"])\.\/hooks\//g, "from $1./"),
    c => c.replace(/from\s+(['"])\.\.\/pages\/hooks\//g, "from $1./"),
  );
}

// ── 6. Specific file fixes ────────────────────────────────────────────────────

// AllocationDetailPage: ../styles/components/CaseTimeline.css → ../components/CaseTimeline.css
fix(join(SRC, 'pages', 'AllocationDetailPage.tsx'),
  c => c.replace(/\.\.\/styles\/components\/CaseTimeline\.css/g, '../components/CaseTimeline.css'),
);

console.log('\nDone. All import paths fixed.');
