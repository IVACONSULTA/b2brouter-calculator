/**
 * Extracts <style> from pages into src/styles/pages/*.css with .page-* scope wrappers.
 * Run from repo root: node scripts/extract-all-page-styles.mjs
 */
import fs from 'fs';
import path from 'path';

const root = process.cwd();

function indentBlock(text, prefix = '  ') {
  return text
    .split('\n')
    .map((line) => (line.trim() === '' ? line : prefix + line))
    .join('\n');
}

function wrapCss(scopeClass, body) {
  const trimmed = body.trimEnd();
  return `/* ${scopeClass} — scoped shell for one route */\n.${scopeClass} {\n${indentBlock(trimmed)}\n}\n`;
}

function relImport(fromAstro, toCss) {
  let rel = path.relative(path.dirname(fromAstro), toCss);
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.replace(/\\/g, '/');
}

function stripStyle(astro) {
  return astro.replace(/<style>\s*[\s\S]*?\s*<\/style>\s*\n?/m, '');
}

function ensureImport(astro, importLine) {
  const importPath = importLine.match(/'([^']+)'/)?.[1] ?? '';
  if (importPath && astro.includes(importPath)) return astro;
  const end = astro.indexOf('\n---\n', 3);
  if (end === -1) return astro;
  const front = astro.slice(0, end);
  const after = astro.slice(end);
  const lines = front.split('\n');
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i;
  }
  if (lastImport === -1) lines.splice(1, 0, importLine.trim());
  else lines.splice(lastImport + 1, 0, importLine.trimEnd());
  return lines.join('\n') + after;
}

function run(job) {
  const astroPath = path.join(root, job.astro);
  let astro = fs.readFileSync(astroPath, 'utf8');
  const m = astro.match(/<style>\s*([\s\S]*?)\s*<\/style>/);
  if (!m) {
    console.warn('skip (no style):', job.astro);
    return;
  }
  const cssPath = path.join(root, job.css);
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  fs.writeFileSync(cssPath, wrapCss(job.scope, m[1]), 'utf8');

  astro = stripStyle(astro);
  const imp = `import '${relImport(astroPath, cssPath)}';`;
  astro = ensureImport(astro, imp);
  astro = job.patch(astro);
  fs.writeFileSync(astroPath, astro, 'utf8');
  console.log('ok', job.astro, '→', job.css);
}

const jobs = [
  {
    astro: 'src/pages/index.astro',
    css: 'src/styles/pages/home.css',
    scope: 'page-home',
    patch: (s) => s.replace('<main class="landing">', '<main class="page-home landing">'),
  },
  {
    astro: 'src/pages/login.astro',
    css: 'src/styles/pages/login.css',
    scope: 'page-login',
    patch: (s) => s.replace('<main class="login-page">', '<main class="page-login login-page">'),
  },
  {
    astro: 'src/pages/dashboard.astro',
    css: 'src/styles/pages/dashboard.css',
    scope: 'page-dashboard',
    patch: (s) =>
      s
        .replace(
          '<UserLayout title="Dashboard" paViewer={paViewer} paNotice={paNotice}>\n',
          '<UserLayout title="Dashboard" paViewer={paViewer} paNotice={paNotice}>\n  <div class="page-dashboard">\n',
        )
        .replace('</UserLayout>\n', '  </div>\n</UserLayout>\n'),
  },
  {
    astro: 'src/pages/countries/index.astro',
    css: 'src/styles/pages/countries.css',
    scope: 'page-countries',
    patch: (s) =>
      s
        .replace(
          'notice={adminNotice}\n  >\n    <!-- Filter strip -->',
          'notice={adminNotice}\n  >\n    <div class="page-countries">\n    <!-- Filter strip -->',
        )
        .replace(
          '      </table>\n    </div>\n  </AdminLayout>',
          '      </table>\n    </div>\n    </div>\n  </AdminLayout>',
        )
        .replace(
          '    paNotice={paNotice}\n  >\n    <div class="u-header">',
          '    paNotice={paNotice}\n  >\n    <div class="page-countries">\n    <div class="u-header">',
        )
        .replace(
          '    )}\n  </UserLayout>\n)}\n\n<script>',
          '    )}\n    </div>\n  </UserLayout>\n)}\n\n<script>',
        ),
  },
  {
    astro: 'src/pages/customer/login.astro',
    css: 'src/styles/pages/customer-login.css',
    scope: 'page-customer-login',
    patch: (s) =>
      s.replace('<main class="login-page">', '<main class="page-customer-login login-page">'),
  },
  {
    astro: 'src/pages/customer/dashboard.astro',
    css: 'src/styles/pages/customer-dashboard.css',
    scope: 'page-customer-dashboard',
    patch: (s) => s.replace('<div class="app">', '<div class="page-customer-dashboard app">'),
  },
  {
    astro: 'src/pages/admin/login.astro',
    css: 'src/styles/pages/admin-login.css',
    scope: 'page-admin-login',
    patch: (s) =>
      s.replace('<main class="login-page">', '<main class="page-admin-login login-page">'),
  },
  {
    astro: 'src/pages/admin/dashboard.astro',
    css: 'src/styles/pages/admin-dashboard.css',
    scope: 'page-admin-dashboard',
    patch: (s) =>
      s.replace(
        '<AdminLayout title="Dashboard">\n  <!-- KPI row -->\n  <div class="kpi-grid">',
        '<AdminLayout title="Dashboard">\n  <!-- KPI row -->\n  <div class="page-admin-dashboard kpi-grid">',
      ),
  },
  {
    astro: 'src/pages/admin/settings.astro',
    css: 'src/styles/pages/admin-settings.css',
    scope: 'page-admin-settings',
    patch: (s) =>
      s.replace('<div class="settings-layout">', '<div class="page-admin-settings settings-layout">'),
  },
  {
    astro: 'src/pages/admin/analyses/index.astro',
    css: 'src/styles/pages/admin-analyses-index.css',
    scope: 'page-admin-analyses-index',
    patch: (s) =>
      s.replace(
        '<AdminLayout\n  title="AI Analyses"\n  breadcrumbs={[{ label: \'Admin\' }, { label: \'AI Analyses\' }]}\n>\n  <div class="panel">',
        '<AdminLayout\n  title="AI Analyses"\n  breadcrumbs={[{ label: \'Admin\' }, { label: \'AI Analyses\' }]}\n>\n  <div class="page-admin-analyses-index panel">',
      ),
  },
  {
    astro: 'src/pages/admin/analyses/[id].astro',
    css: 'src/styles/pages/admin-analysis-detail.css',
    scope: 'page-admin-analysis-detail',
    patch: (s) =>
      s.replace('<div class="guardrail-row">', '<div class="page-admin-analysis-detail guardrail-row">'),
  },
  {
    astro: 'src/pages/admin/countries/new.astro',
    css: 'src/styles/pages/admin-countries-new.css',
    scope: 'page-admin-countries-new',
    patch: (s) =>
      s.replace('<div class="form-layout">', '<div class="page-admin-countries-new form-layout">'),
  },
  {
    astro: 'src/pages/admin/countries/[id]/documents.astro',
    css: 'src/styles/pages/admin-country-documents.css',
    scope: 'page-admin-country-documents',
    patch: (s) =>
      s.replace(
        '<!-- Step bar -->\n  <div class="step-bar">',
        '<!-- Step bar -->\n  <div class="page-admin-country-documents step-bar">',
      ),
  },
  {
    astro: 'src/pages/admin/countries/[id]/setup.astro',
    css: 'src/styles/pages/admin-country-setup.css',
    scope: 'page-admin-country-setup',
    patch: (s) =>
      s.replace(
        '<!-- Step tabs -->\n  <div class="step-bar">',
        '<!-- Step tabs -->\n  <div class="page-admin-country-setup step-bar">',
      ),
  },
  {
    astro: 'src/pages/admin/profiles/[id].astro',
    css: 'src/styles/pages/admin-profile-detail.css',
    scope: 'page-admin-profile-detail',
    patch: (s) =>
      s.replace(
        '<!-- Profile header card -->\n  <div class="profile-header">',
        '<!-- Profile header card -->\n  <div class="page-admin-profile-detail profile-header">',
      ),
  },
  {
    astro: 'src/pages/scenarios/index.astro',
    css: 'src/styles/pages/scenarios-index.css',
    scope: 'page-scenarios-index',
    patch: (s) =>
      s
        .replace(
          '  paNotice={paNotice}\n>\n  <!-- Header row -->\n  <div class="page-header">',
          '  paNotice={paNotice}\n>\n  <div class="page-scenarios-index">\n  <!-- Header row -->\n  <div class="page-header">',
        )
        .replace('</UserLayout>\n\n<script>', '  </div>\n</UserLayout>\n\n<script>'),
  },
  {
    astro: 'src/pages/scenarios/[id].astro',
    css: 'src/styles/pages/scenario-detail.css',
    scope: 'page-scenario-detail',
    patch: (s) =>
      s.replace(
        '<!-- Scenario header -->\n  <div class="scenario-header">',
        '<!-- Scenario header -->\n  <div class="page-scenario-detail scenario-header">',
      ),
  },
];

for (const job of jobs) {
  run(job);
}

console.log('done.');
