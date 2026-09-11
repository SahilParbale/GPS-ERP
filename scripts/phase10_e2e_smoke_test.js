import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const migrationEnv = fs.readFileSync('.env.migration', 'utf8');
const envFile = fs.readFileSync('.env', 'utf8');

const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — PHASE 10 COMPREHENSIVE END-TO-END SMOKE TESTS');
console.log('='.repeat(80));

async function authenticate(email, password) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  return { client, user: data.user };
}

async function runE2ESmokeTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, flowName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${flowName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${flowName} ${details ? '--> ' + details : ''}`);
      failed++;
    }
  }

  // 1. ADMIN SMOKE TEST
  console.log('\n--- 1. ADMIN FLOW (rahul.patil@gpspindles.com) ---');
  const { client: adminClientUser } = await authenticate('rahul.patil@gpspindles.com', 'Password123!');
  const { data: adminProfiles, error: apErr } = await adminClientUser.from('profiles').select('id, first_name, last_name').limit(5);
  assert(!apErr && adminProfiles?.length > 0, 'ADMIN: Dashboard user directory access');
  const { data: adminAudits, error: aaErr } = await adminClientUser.from('audit_logs').select('id, action').limit(5);
  assert(!aaErr && adminAudits?.length > 0, 'ADMIN: Security audit trail access');
  const { data: adminCompanies, error: acErr } = await adminClientUser.from('companies').select('id, name').limit(5);
  assert(!acErr && adminCompanies?.length > 0, 'ADMIN: Company multi-tenant configuration access');

  // 2. SALES SMOKE TEST
  console.log('\n--- 2. SALES FLOW (shreyas.nair@gpspindles.com) ---');
  const { client: salesClient } = await authenticate('shreyas.nair@gpspindles.com', 'Password123!');
  const { data: customers, error: cErr } = await salesClient.from('customers').select('id, company_name').limit(5);
  assert(!cErr && customers?.length > 0, 'SALES: Customer registry query');
  const { data: quotations, error: qErr } = await salesClient.from('quotations').select('id, quotation_number').limit(5);
  assert(!qErr && quotations?.length > 0, 'SALES: Quotation pipeline access');
  const { data: pis, error: piErr } = await salesClient.from('proforma_invoices').select('id, pi_number').limit(5);
  assert(!piErr && pis?.length > 0, 'SALES: Proforma invoices access');
  const { data: invoices, error: iErr } = await salesClient.from('invoices').select('id, invoice_number').limit(5);
  assert(!iErr && invoices?.length > 0, 'SALES: Tax Invoices & billing access');
  const { data: ewbs, error: ewbErr } = await salesClient.from('eway_bills').select('id, ewb_number').limit(5);
  assert(!ewbErr && ewbs?.length > 0, 'SALES: E-Way Bill documentation access');

  // 3. PURCHASE SMOKE TEST
  console.log('\n--- 3. PURCHASE FLOW (purchase.controller@gpspindles.com) ---');
  const { client: purchClient } = await authenticate('purchase.controller@gpspindles.com', 'Password123!');
  const { data: prs, error: prErr } = await purchClient.from('purchase_requisitions').select('id, requisition_no').limit(5);
  assert(!prErr && prs?.length > 0, 'PURCHASE: Purchase requisitions access');
  const { data: pos, error: poErr } = await purchClient.from('purchase_orders').select('id, po_number').limit(5);
  assert(!poErr && pos?.length > 0, 'PURCHASE: Purchase orders access');
  const { data: suppliers, error: sErr } = await purchClient.from('suppliers').select('id, name').limit(5);
  assert(!sErr && suppliers?.length > 0, 'PURCHASE: Supplier directory access');

  // 4. STORES SMOKE TEST
  console.log('\n--- 4. STORES FLOW (dinesh.more@gpspindles.com) ---');
  const { client: storesClient } = await authenticate('dinesh.more@gpspindles.com', 'Password123!');
  const { data: stockItems, error: stErr } = await storesClient.from('stock').select('id, quantity_on_hand').limit(5);
  assert(!stErr && stockItems?.length > 0, 'STORES: Live stock inventory balances');
  const { data: movements, error: mErr } = await storesClient.from('stock_movements').select('id, movement_number').limit(5);
  assert(!mErr && movements?.length > 0, 'STORES: Stock movements ledger access');
  const { data: dispatches, error: dErr } = await storesClient.from('dispatches').select('id, dispatch_number').limit(5);
  assert(!dErr && dispatches?.length > 0, 'STORES: Outward logistics dispatch pipeline');

  // 5. PROD_MGR SMOKE TEST
  console.log('\n--- 5. PROD_MGR FLOW (suresh.sawant@gpspindles.com) ---');
  const { client: prodClient } = await authenticate('suresh.sawant@gpspindles.com', 'Password123!');
  const { data: wos, error: woErr } = await prodClient.from('work_orders').select('id, work_order_no').limit(5);
  assert(!woErr && wos?.length > 0, 'PROD_MGR: Manufacturing work orders overview');
  const { data: ops, error: opErr } = await prodClient.from('production_operations').select('id, code, name').limit(5);
  assert(!opErr && ops?.length > 0, 'PROD_MGR: Shopfloor operations routing');
  const { data: bays, error: bErr } = await prodClient.from('production_bays').select('id, name').limit(5);
  assert(!bErr && bays?.length > 0, 'PROD_MGR: Assembly bay allocation & management');

  // 6. QA_MGR SMOKE TEST
  console.log('\n--- 6. QA_MGR FLOW (milind.joshi@gpspindles.com) ---');
  const { client: qaClient } = await authenticate('milind.joshi@gpspindles.com', 'Password123!');
  const { data: inspections, error: qiErr } = await qaClient.from('inspections').select('id, inspection_type').limit(5);
  assert(!qiErr && inspections?.length > 0, 'QA_MGR: Quality inspection records access');
  const { data: certs, error: certErr } = await qaClient.from('quality_certificates').select('id').limit(5);
  assert(!certErr && Array.isArray(certs), 'QA_MGR: Calibration & compliance certificates query');

  // 7. SERVICE SMOKE TEST
  console.log('\n--- 7. SERVICE FLOW (service.lead@gpspindles.com) ---');
  const { client: srvClient } = await authenticate('service.lead@gpspindles.com', 'Password123!');
  const { data: sReqs, error: srErr } = await srvClient.from('service_requests').select('id, sr_number').limit(5);
  assert(!srErr && sReqs?.length > 0, 'SERVICE: Customer spindle service requests');
  const { data: sJobs, error: sjErr } = await srvClient.from('service_jobs').select('id, job_number').limit(5);
  assert(!sjErr && sJobs?.length > 0, 'SERVICE: Spindle teardown & rebuild jobs');
  const { data: spindles, error: spErr } = await srvClient.from('spindles').select('id, serial_number').limit(5);
  assert(!spErr && spindles?.length > 0, 'SERVICE: Spindle digital twin registry');

  // 8. EMPLOYEE SMOKE TEST
  console.log('\n--- 8. EMPLOYEE FLOW (vikram.shinde@gpspindles.com) ---');
  const { client: empClient, user: empUser } = await authenticate('vikram.shinde@gpspindles.com', 'Password123!');
  const { data: selfProf, error: spProfErr } = await empClient.from('profiles').select('id, first_name, last_name').eq('id', empUser.id).single();
  assert(!spProfErr && selfProf, 'EMPLOYEE: Workforce self-profile verification');
  const { data: attList, error: attErr } = await empClient.from('attendance').select('id, date, status').limit(5);
  assert(!attErr && Array.isArray(attList), 'EMPLOYEE: Attendance log access');
  const { data: leaveList, error: levErr } = await empClient.from('leave_requests').select('id, leave_type, status').limit(5);
  assert(!levErr && Array.isArray(leaveList), 'EMPLOYEE: Leave balance & requests access');

  console.log('\n' + '='.repeat(80));
  console.log(`END-TO-END SMOKE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2ESmokeTests().catch(err => {
  console.error('Fatal E2E smoke test error:', err);
  process.exit(1);
});
