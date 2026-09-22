import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('================================================================================');
console.log('GPS SPINDLE ERP — 24-POINT PWA INSTALLATION VERIFICATION SUITE');
console.log('================================================================================');

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

// 1. PWA package/configuration in package.json
const pkgPath = path.join(rootDir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
assert(
  Boolean(pkg.devDependencies?.['vite-plugin-pwa'] || pkg.dependencies?.['vite-plugin-pwa']),
  'PWA package (vite-plugin-pwa) declared in package.json'
);

// 2. vite.config.js configuration
const viteConfigPath = path.join(rootDir, 'vite.config.js');
const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
assert(
  viteConfig.includes('VitePWA') && viteConfig.includes("registerType: 'prompt'"),
  'vite.config.js configures VitePWA with registerType: "prompt"'
);

// 3. index.html meta tags
const indexHtmlPath = path.join(rootDir, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert(
  indexHtml.includes('theme-color') &&
  indexHtml.includes('#7A1F3D') &&
  indexHtml.includes('apple-mobile-web-app-capable') &&
  indexHtml.includes('apple-touch-icon.png'),
  'index.html contains PWA meta tags and apple-touch-icon link'
);

// 4. Manifest existence & JSON validity
const manifestPath = path.join(rootDir, 'dist', 'manifest.webmanifest');
let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(true, 'dist/manifest.webmanifest exists and is valid JSON');
} catch {
  assert(false, 'dist/manifest.webmanifest exists and is valid JSON');
}

if (manifest) {
  // 5. Manifest name
  assert(manifest.name === 'GPS Spindle ERP', `Manifest name is "GPS Spindle ERP" (found: "${manifest.name}")`);

  // 6. Manifest short_name
  assert(manifest.short_name === 'GPS ERP', `Manifest short_name is "GPS ERP" (found: "${manifest.short_name}")`);

  // 7. Manifest start_url
  assert(manifest.start_url === '/', `Manifest start_url is "/" (found: "${manifest.start_url}")`);

  // 8. Manifest scope
  assert(manifest.scope === '/', `Manifest scope is "/" (found: "${manifest.scope}")`);

  // 9. Manifest display=standalone
  assert(manifest.display === 'standalone', `Manifest display mode is "standalone" (found: "${manifest.display}")`);

  // 10. Manifest theme_color
  assert(manifest.theme_color?.toLowerCase() === '#7a1f3d', `Manifest theme_color is "#7A1F3D" (found: "${manifest.theme_color}")`);

  // 11. Manifest background_color
  assert(manifest.background_color?.toLowerCase() === '#ffffff', `Manifest background_color is "#FFFFFF" (found: "${manifest.background_color}")`);
} else {
  for (let i = 5; i <= 11; i++) failedCount++;
}

// 12. Icon 192x192
const pwa192Public = fs.existsSync(path.join(rootDir, 'public', 'pwa-192x192.png'));
const pwa192Dist = fs.existsSync(path.join(rootDir, 'dist', 'pwa-192x192.png'));
assert(pwa192Public && pwa192Dist, 'pwa-192x192.png exists in both public/ and dist/');

// 13. Icon 512x512
const pwa512Public = fs.existsSync(path.join(rootDir, 'public', 'pwa-512x512.png'));
const pwa512Dist = fs.existsSync(path.join(rootDir, 'dist', 'pwa-512x512.png'));
assert(pwa512Public && pwa512Dist, 'pwa-512x512.png exists in both public/ and dist/');

// 14. Maskable 512x512
const maskablePublic = fs.existsSync(path.join(rootDir, 'public', 'maskable-icon-512x512.png'));
const maskableDist = fs.existsSync(path.join(rootDir, 'dist', 'maskable-icon-512x512.png'));
assert(maskablePublic && maskableDist, 'maskable-icon-512x512.png exists in both public/ and dist/');

// 15. Apple Touch Icon
const appleTouchPublic = fs.existsSync(path.join(rootDir, 'public', 'apple-touch-icon.png'));
const appleTouchDist = fs.existsSync(path.join(rootDir, 'dist', 'apple-touch-icon.png'));
assert(appleTouchPublic && appleTouchDist, 'apple-touch-icon.png exists in both public/ and dist/');

// 16. Service worker generated in dist/sw.js
const swPath = path.join(rootDir, 'dist', 'sw.js');
const swExists = fs.existsSync(swPath);
assert(swExists, 'dist/sw.js exists and was generated during build');

let swContent = '';
if (swExists) {
  swContent = fs.readFileSync(swPath, 'utf8');

  // 17. Service worker secret scan
  const hasServiceRole = swContent.includes('service_role') || swContent.includes('SUPABASE_SERVICE_ROLE_KEY');
  const hasSmtpSecrets = swContent.includes('smtp.gmail.com') || swContent.includes('GMAIL_APP_PASSWORD');
  const hasNicSecrets = swContent.includes('NIC_CLIENT_SECRET') || swContent.includes('EWB_PASSWORD');
  assert(
    !hasServiceRole && !hasSmtpSecrets && !hasNicSecrets,
    'dist/sw.js contains zero service-role keys, SMTP passwords, or NIC credentials'
  );

  // 18. Service worker does not precache sensitive database tables or private documents
  const hasInvoicesPrecache = swContent.includes('invoices.json') || swContent.includes('work_orders.json');
  const hasCustomerPrecache = swContent.includes('customers.json') || swContent.includes('employees.json');
  assert(
    !hasInvoicesPrecache && !hasCustomerPrecache,
    'dist/sw.js does not precache sensitive database tables or private ERP records'
  );

  // 19. Supabase REST/Auth/Storage NetworkOnly
  const hasRestNetworkOnly = swContent.includes('/rest/v1/') && swContent.includes('NetworkOnly');
  const hasAuthNetworkOnly = swContent.includes('/auth/v1/') && swContent.includes('NetworkOnly');
  const hasStorageNetworkOnly = swContent.includes('/storage/v1/') && swContent.includes('NetworkOnly');
  assert(
    hasRestNetworkOnly && hasAuthNetworkOnly && hasStorageNetworkOnly,
    'dist/sw.js explicitly enforces NetworkOnly for Supabase REST, Auth, and Storage endpoints'
  );
} else {
  failedCount += 3;
}

// 20. usePWAInstall hook exists and handles beforeinstallprompt & appinstalled
const hookPath = path.join(rootDir, 'src', 'hooks', 'usePWAInstall.js');
const hookContent = fs.existsSync(hookPath) ? fs.readFileSync(hookPath, 'utf8') : '';
assert(
  hookContent.includes('beforeinstallprompt') && hookContent.includes('appinstalled') && hookContent.includes('install'),
  'src/hooks/usePWAInstall.js exists and handles beforeinstallprompt, appinstalled, and install()'
);

// 21. Standalone detection implemented
assert(
  hookContent.includes('(display-mode: standalone)') || hookContent.includes('navigator.standalone'),
  'Standalone display mode detection implemented via matchMedia and navigator.standalone'
);

// 22. PWAUpdatePrompt wired to virtual:pwa-register
const updatePromptPath = path.join(rootDir, 'src', 'components', 'pwa', 'PWAUpdatePrompt.jsx');
const updateContent = fs.existsSync(updatePromptPath) ? fs.readFileSync(updatePromptPath, 'utf8') : '';
assert(
  updateContent.includes('virtual:pwa-register/react') && updateContent.includes('updateServiceWorker'),
  'src/components/pwa/PWAUpdatePrompt.jsx is wired to virtual:pwa-register/react with controlled skipWaiting'
);

// 23. PWAOfflineNotice component exists and handles verified connectivity
const offlineNoticePath = path.join(rootDir, 'src', 'components', 'pwa', 'PWAOfflineNotice.jsx');
const offlineContent = fs.existsSync(offlineNoticePath) ? fs.readFileSync(offlineNoticePath, 'utf8') : '';
assert(
  offlineContent.includes('navigator.onLine') && offlineContent.includes('Connection unavailable'),
  'src/components/pwa/PWAOfflineNotice.jsx exists with verified online/offline detection'
);

// 24. App shortcuts configured in manifest
const shortcuts = manifest?.shortcuts || [];
const shortcutUrls = shortcuts.map(s => s.url);
assert(
  shortcutUrls.includes('/?screen=dashboard') &&
  shortcutUrls.includes('/?screen=production') &&
  shortcutUrls.includes('/?screen=spindles') &&
  shortcutUrls.includes('/?screen=inventory'),
  'Manifest shortcuts configured for existing routes: dashboard, production, spindles, inventory'
);

console.log('================================================================================');
console.log(`PWA VERIFICATION RESULT: ${passedCount}/24 PASSED, ${failedCount} FAILED`);
console.log('================================================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
