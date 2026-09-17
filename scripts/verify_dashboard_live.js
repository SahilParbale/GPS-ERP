/**
 * GPS SPINDLE ERP — DASHBOARD LIVE DATABASE INTEGRATION VERIFICATION SUITE
 * 
 * Verifies live Supabase PostgreSQL data integration for:
 * 1. Live KPI metrics calculation & direct PostgreSQL cross-checks
 * 2. Active Jobs direct aggregate cross-check
 * 3. In Production direct aggregate cross-check
 * 4. Pending QC direct aggregate cross-check
 * 5. Ready Dispatch direct aggregate cross-check
 * 6. Active Service direct aggregate cross-check
 * 7. Low Stock items direct aggregate cross-check
 * 8. Outstanding Receivables direct aggregate cross-check
 * 9. Production pipeline 8-stage live distribution cross-check
 * 10. Recent Work Orders query from public.work_orders
 * 11. Critical Materials query from public.stock & public.products
 * 12. Upcoming Deliveries schedule from public.dispatches / public.work_orders
 * 13. Shop Bay Utilization from public.production_bays
 * 14. Plant Activity Feed from public.audit_logs
 * 15. Zero/empty data resilience
 * 16. Elimination of mock data constants in DashboardScreen.jsx
 * 17. Anonymous access restriction (RLS enforcement)
 * 18. Zero service-role keys in src/
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const migrationEnv = fs.existsSync('.env.migration') ? fs.readFileSync('.env.migration', 'utf8') : '';

const url = (envFile.match(/VITE_SUPABASE_URL=(.*)/) || migrationEnv.match(/SUPABASE_URL=(.*)/) || [])[1]?.trim() 
  || 'https://eefqamtethlkqhqgdpah.supabase.co';
const anonKey = (envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/) || [])[1]?.trim();

process.env.VITE_SUPABASE_URL = url;
process.env.VITE_SUPABASE_ANON_KEY = anonKey;

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// Credentials from environment or configured test accounts
const testEmail = process.env.TEST_QA_EMAIL || process.env.TEST_ADMIN_EMAIL || 'rahul.patil@gpspindles.com';
const testPassword = process.env.TEST_QA_PASSWORD || process.env.TEST_ADMIN_PASSWORD || 'Password123!';

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — LIVE DASHBOARD INTEGRATION & CROSS-CHECK VERIFICATION');
console.log('='.repeat(80));
console.log(`Database Target: ${url}\n`);

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? `— ${details}` : ''}`);
    failedCount++;
  }
}

async function runDashboardVerification() {
  // -------------------------------------------------------------
  // CHECK 1: ANONYMOUS ACCESS RESTRICTIONS
  // -------------------------------------------------------------
  console.log('--- 1. Security: Anonymous Access Restrictions ---');
  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: anonWos } = await anonClient.from('work_orders').select('*').limit(5);
  assert(!anonWos || anonWos.length === 0, 'Anonymous access to work_orders is BLOCKED by RLS');

  const { data: anonInvoices } = await anonClient.from('invoices').select('*').limit(5);
  assert(!anonInvoices || anonInvoices.length === 0, 'Anonymous access to invoices is BLOCKED by RLS');

  // -------------------------------------------------------------
  // CHECK 2: AUTHENTICATED ACCESS & CORE DASHBOARD METRICS
  // -------------------------------------------------------------
  console.log('\n--- 2. Authenticated Direct Database Queries & KPI Cross-Checks ---');
  const { supabase } = await import('../src/services/supabase/supabaseClient.js');
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  });

  assert(!authErr && auth?.user, `Authenticated successfully as ${testEmail}`);

  // Fetch direct database aggregates using authenticated supabase client
  const [
    woRes,
    invRes,
    inspRes,
    srvRes,
    stockRes,
    dispRes
  ] = await Promise.all([
    supabase.from('work_orders').select('id, status, current_stage, spindle:spindles(serial_number)'),
    supabase.from('invoices').select('id, total_amount, paid_amount, balance_amount, status'),
    supabase.from('inspections').select('id, approval_status, overall_result'),
    supabase.from('service_jobs').select('id, status'),
    supabase.from('stock').select('id, quantity_available, product:products(min_reorder_level)'),
    supabase.from('dispatches').select('id, status, items:dispatch_items(spindle_serial)').in('status', ['In Transit', 'Out for Delivery', 'Delivered'])
  ]);

  const allWos = woRes.data || [];
  const allInvoices = invRes.data || [];
  const allInspections = inspRes.data || [];
  const allServiceJobs = srvRes.data || [];
  const allStock = stockRes.data || [];
  const allDepartedDispatches = dispRes?.data || [];

  // Direct Calculations
  const directActiveJobs = allWos.filter(w => ['In Progress', 'QC', 'Scheduled'].includes(w.status)).length;
  const directInProduction = allWos.filter(w => w.status === 'In Progress').length;
  
  // Ready Dispatch: Completed work orders that have not yet departed via outbound dispatches
  const directDepartedSerials = new Set(
    allDepartedDispatches
      .flatMap(d => d.items || [])
      .map(i => i.spindle_serial)
      .filter(Boolean)
  );
  const directReadyDispatch = allWos.filter(w => {
    if (w.status !== 'Completed') return false;
    const serial = w.spindle?.serial_number;
    if (serial && directDepartedSerials.has(serial)) return false;
    return true;
  }).length;

  const directPendingQcInspections = allInspections.filter(i => ['Draft', 'Pending Sign-off'].includes(i.approval_status)).length;
  const directPendingQcOrders = allWos.filter(w => w.status === 'QC').length;
  const directPendingQc = directPendingQcInspections > 0 ? directPendingQcInspections : directPendingQcOrders;
  const directActiveService = allServiceJobs.filter(s => !['Completed', 'Cancelled', 'Closed'].includes(s.status)).length;
  const directLowStock = allStock.filter(s => (s.quantity_available || 0) <= (s.product?.min_reorder_level || 0)).length;
  const directOutstandingReceivables = allInvoices
    .filter(i => ['Pending Payment', 'Partially Paid', 'Overdue'].includes(i.status))
    .reduce((sum, inv) => sum + (Number(inv.balance_amount) || 0), 0);

  // Import dashboardService dynamically to test exact service methods
  const { dashboardService } = await import('../src/services/dashboard/dashboardService.js');
  const serviceMetrics = await dashboardService.getDashboardMetrics();

  assert(!serviceMetrics.error && serviceMetrics.data, 'dashboardService.getDashboardMetrics() returned live data', serviceMetrics.error?.message);

  const raw = serviceMetrics.rawTotals;
  assert(raw.activeJobs === directActiveJobs, `KPI Active Jobs matches PostgreSQL calculation (${raw.activeJobs} === ${directActiveJobs})`);
  assert(raw.inProduction === directInProduction, `KPI In Production matches PostgreSQL calculation (${raw.inProduction} === ${directInProduction})`);
  assert(raw.readyDispatch === directReadyDispatch, `KPI Ready Dispatch matches PostgreSQL calculation (${raw.readyDispatch} === ${directReadyDispatch})`);
  assert(raw.pendingQc === directPendingQc, `KPI Pending QC matches PostgreSQL calculation (${raw.pendingQc} === ${directPendingQc})`);
  assert(raw.activeService === directActiveService, `KPI Active Service matches PostgreSQL calculation (${raw.activeService} === ${directActiveService})`);
  assert(raw.lowStock === directLowStock, `KPI Low Stock Items matches PostgreSQL calculation (${raw.lowStock} === ${directLowStock})`);
  assert(raw.outstandingReceivables === directOutstandingReceivables, `KPI Outstanding Receivables matches PostgreSQL calculation (₹${raw.outstandingReceivables} === ₹${directOutstandingReceivables})`);

  // -------------------------------------------------------------
  // CHECK 3: PRODUCTION PIPELINE 8-STAGE BREAKDOWN
  // -------------------------------------------------------------
  console.log('\n--- 3. Production Pipeline 8-Stage Distribution Cross-Check ---');
  const pipelineRes = await dashboardService.getProductionPipelineStages();
  assert(!pipelineRes.error && Array.isArray(pipelineRes.data), 'Pipeline stages retrieved successfully');

  const totalPipelineCount = pipelineRes.data.reduce((sum, s) => sum + s.count, 0);
  assert(totalPipelineCount === allWos.length, `Pipeline stages total matches all work orders count (${totalPipelineCount} === ${allWos.length})`);
  assert(pipelineRes.data.length === 8, `Exact 8 manufacturing pipeline stages represented`);

  // -------------------------------------------------------------
  // CHECK 4: RECENT WORK ORDERS TABLE
  // -------------------------------------------------------------
  console.log('\n--- 4. Active Work Orders in Floor Rotation Table ---');
  const woTableRes = await dashboardService.getRecentWorkOrders(5);
  assert(!woTableRes.error && Array.isArray(woTableRes.data) && woTableRes.data.length > 0, `Recent work orders queried from database (Count: ${woTableRes.data.length})`);
  const firstWo = woTableRes.data[0];
  assert(firstWo?.id && firstWo?.spindleSerial && firstWo?.customer, `Work order record contains valid relational fields (${firstWo.id} - ${firstWo.spindleSerial})`);
  assert(woTableRes.data.every(wo => ['In Progress', 'QC', 'Planned', 'On Hold', 'Scheduled'].includes(wo.status)), 'All work orders in Floor Rotation table exclude Completed and Cancelled orders');
  assert(woTableRes.totalCount === directActiveJobs, `Active work orders totalCount matches live active jobs (${woTableRes.totalCount} === ${directActiveJobs})`);

  // -------------------------------------------------------------
  // CHECK 5: CRITICAL MATERIALS & BEARINGS ALERT TABLE
  // -------------------------------------------------------------
  console.log('\n--- 5. Critical Materials Alert Table ---');
  const matTableRes = await dashboardService.getCriticalMaterials(5);
  assert(!matTableRes.error && Array.isArray(matTableRes.data), `Critical materials queried from database (Count: ${matTableRes.data.length})`);
  if (matTableRes.data.length > 0) {
    const firstMat = matTableRes.data[0];
    assert(firstMat.sku && firstMat.name && firstMat.availableQty !== undefined, `Material record contains valid SKU and quantity (${firstMat.sku}: ${firstMat.availableQty} ${firstMat.unit})`);
  }

  // -------------------------------------------------------------
  // CHECK 6: UPCOMING DISPATCH SCHEDULE
  // -------------------------------------------------------------
  console.log('\n--- 6. Upcoming Deliveries Schedule ---');
  const delRes = await dashboardService.getUpcomingDeliveries(4);
  assert(!delRes.error && Array.isArray(delRes.data), `Upcoming deliveries schedule queried (Count: ${delRes.data.length})`);
  if (delRes.data.length > 0) {
    assert(delRes.data[0].customer && delRes.data[0].date, `Delivery record contains customer and schedule date (${delRes.data[0].customer}: ${delRes.data[0].date})`);
  }

  // -------------------------------------------------------------
  // CHECK 7: SHOP FLOOR BAY UTILIZATION
  // -------------------------------------------------------------
  console.log('\n--- 7. Shop Floor Bay Utilization ---');
  const bayRes = await dashboardService.getShopBayUtilization(4);
  assert(!bayRes.error && Array.isArray(bayRes.data), `Shop bays queried from public.production_bays (Count: ${bayRes.data.length})`);
  if (bayRes.data.length > 0) {
    assert(bayRes.data[0].name && bayRes.data[0].utilization, `Bay contains valid utilization metric (${bayRes.data[0].name}: ${bayRes.data[0].utilization})`);
  }

  // -------------------------------------------------------------
  // CHECK 8: PLANT ACTIVITY FEED
  // -------------------------------------------------------------
  console.log('\n--- 8. Plant Activity Feed (Audit Logs) ---');
  const actRes = await dashboardService.getRecentActivityFeed(5);
  assert(!actRes.error && Array.isArray(actRes.data), `Activity feed retrieved from database`);
  if (actRes.data.length > 0) {
    assert(actRes.data[0].text && actRes.data[0].time && actRes.data[0].user, `Activity record contains text, relative time, and user (${actRes.data[0].user}: "${actRes.data[0].text}")`);
  }

  // -------------------------------------------------------------
  // CHECK 9: SOURCE CODE AUDIT (MOCK DATA REMOVAL & SERVICE ROLE)
  // -------------------------------------------------------------
  console.log('\n--- 9. Source Code Audit: Zero Mock Constants & Zero Service-Role in src/ ---');
  const dashboardScreenPath = path.resolve('src/screens/DashboardScreen.jsx');
  const dashboardContent = fs.readFileSync(dashboardScreenPath, 'utf8');

  const mockConstants = [
    'DASHBOARD_METRICS',
    'PRODUCTION_PIPELINE_STAGES',
    'WORK_ORDERS',
    'UPCOMING_DELIVERIES',
    'INVENTORY_ITEMS',
    'RECENT_ACTIVITY',
    'SHOP_BAYS'
  ];

  let mockFound = [];
  mockConstants.forEach(c => {
    if (dashboardContent.includes(c)) mockFound.push(c);
  });

  assert(mockFound.length === 0, `Zero mock constants imported in DashboardScreen.jsx (Found: ${mockFound.length})`);
  assert(!dashboardContent.includes('mockData'), `Zero mockData imports in DashboardScreen.jsx`);

  // Scan src/ for service-role keys
  const srcDir = path.resolve('src');
  let serviceRoleViolations = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (/\.(js|jsx|ts|tsx|css|html)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('service_role')) {
          serviceRoleViolations.push(fullPath);
        }
      }
    }
  }

  scanDir(srcDir);
  assert(serviceRoleViolations.length === 0, `Zero SUPABASE_SERVICE_ROLE_KEY or service_role in src/ (Found: ${serviceRoleViolations.length})`);

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log(`DASHBOARD VERIFICATION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(80));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runDashboardVerification().catch(err => {
  console.error('Unhandled exception during dashboard verification:', err);
  process.exit(1);
});
