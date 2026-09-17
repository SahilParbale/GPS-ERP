/**
 * GPS SPINDLE ERP — QUALITY CONTROL & METROLOGY LIVE VERIFICATION SUITE
 * 
 * Verifies live Supabase PostgreSQL database integration for:
 * 1. Live inspections query & relational joins
 * 2. Live inspection_results query
 * 3. Foreign key integrity (spindles, work_orders, employees)
 * 4. Absence of orphan inspection results
 * 5. Required field validation & constraints
 * 6. Status and enum check constraints
 * 7. Safe measurement update persistence
 * 8. Controlled inspection approval persistence
 * 9. Controlled rework request persistence
 * 10. Fresh client state re-verification
 * 11. Audit logging in public.audit_logs
 * 12. Duplicate submission prevention (unique inspection_number)
 * 13. Anonymous access blocked by RLS
 * 14. Unauthorized role write blocked by RLS
 * 15. Authorized QA_MGR / ADMIN write allowed by RLS
 * 16. Zero service-role keys in src/
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment config
const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const migrationEnv = fs.existsSync('.env.migration') ? fs.readFileSync('.env.migration', 'utf8') : '';

const url = (envFile.match(/VITE_SUPABASE_URL=(.*)/) || migrationEnv.match(/SUPABASE_URL=(.*)/) || [])[1]?.trim() 
  || 'https://eefqamtethlkqhqgdpah.supabase.co';
const anonKey = (envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/) || [])[1]?.trim();

if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

// Credentials from environment or configured test accounts
const qaEmail = process.env.TEST_QA_EMAIL || 'milind.joshi@gpspindles.com';
const qaPassword = process.env.TEST_QA_PASSWORD || 'Password123!';

const unauthEmail = process.env.TEST_UNAUTH_EMAIL || 'shreyas.nair@gpspindles.com'; // SALES role
const unauthPassword = process.env.TEST_UNAUTH_PASSWORD || 'Password123!';

const adminEmail = process.env.TEST_ADMIN_EMAIL || 'rahul.patil@gpspindles.com';
const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'Password123!';

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — LIVE QUALITY CONTROL & METROLOGY VERIFICATION');
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

async function runVerification() {
  // -------------------------------------------------------------
  // CHECK 1: ANONYMOUS ACCESS RESTRICTION (RLS)
  // -------------------------------------------------------------
  console.log('--- 1. Security: Anonymous Access Verification ---');
  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  const { data: anonInspections } = await anonClient.from('inspections').select('*').limit(5);
  assert(!anonInspections || anonInspections.length === 0, 'Anonymous access to public.inspections is BLOCKED (0 records returned)');

  const { data: anonResults } = await anonClient.from('inspection_results').select('*').limit(5);
  assert(!anonResults || anonResults.length === 0, 'Anonymous access to public.inspection_results is BLOCKED (0 records returned)');

  // -------------------------------------------------------------
  // CHECK 2: AUTHORIZED QA_MGR AUTHENTICATION & READ
  // -------------------------------------------------------------
  console.log('\n--- 2. QA_MGR Authentication & Live Inspections Query ---');
  const qaClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: qaAuth, error: qaAuthErr } = await qaClient.auth.signInWithPassword({
    email: qaEmail,
    password: qaPassword
  });

  assert(!qaAuthErr && qaAuth?.user, 'QA_MGR authenticated successfully', qaAuthErr?.message);

  const { data: inspections, error: inspErr } = await qaClient
    .from('inspections')
    .select(`
      id,
      inspection_number,
      spindle_id,
      work_order_id,
      inspection_type,
      inspector_id,
      inspection_date,
      overall_result,
      approval_status,
      ambient_temp_celsius,
      gauge_equipment_used,
      remarks,
      spindle:spindles(id, serial_number, model:spindle_models(model_name, model_code)),
      work_order:work_orders(id, work_order_no, customer_name),
      inspector:employees(id, first_name, last_name, designation)
    `)
    .order('inspection_date', { ascending: false });

  assert(!inspErr && inspections && inspections.length > 0, `Live inspections queried successfully (Count: ${inspections?.length || 0})`, inspErr?.message);

  // -------------------------------------------------------------
  // CHECK 3: FOREIGN KEY & RELATIONAL INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- 3. Relational Foreign Key Integrity ---');
  const firstInsp = inspections?.[0];
  assert(firstInsp?.spindle?.serial_number, `Inspection -> Spindle join valid (Serial: ${firstInsp?.spindle?.serial_number || 'None'})`);
  assert(firstInsp?.work_order?.work_order_no, `Inspection -> Work Order join valid (WO: ${firstInsp?.work_order?.work_order_no || 'None'})`);
  assert(firstInsp?.inspector?.first_name, `Inspection -> Inspector employee join valid (${firstInsp?.inspector?.first_name} ${firstInsp?.inspector?.last_name})`);

  // -------------------------------------------------------------
  // CHECK 4: INSPECTION RESULTS & ORPHAN CHECK
  // -------------------------------------------------------------
  console.log('\n--- 4. Inspection Results & Orphan Prevention ---');
  const { data: allResults, error: resErr } = await qaClient.from('inspection_results').select('*');
  assert(!resErr && allResults && allResults.length > 0, `Live inspection_results queried successfully (Count: ${allResults?.length || 0})`);

  const validInspectionIds = new Set(inspections.map(i => i.id));
  const orphanResults = allResults ? allResults.filter(r => !validInspectionIds.has(r.inspection_id)) : [];
  assert(orphanResults.length === 0, `Zero orphan inspection_results detected (${orphanResults.length} orphans)`);

  // -------------------------------------------------------------
  // CHECK 5: STATUS ENUM CONSTRAINTS & REQUIRED FIELDS
  // -------------------------------------------------------------
  console.log('\n--- 5. Constraints & Data Integrity ---');
  const validApprovalStatuses = ['Draft', 'Pending Sign-off', 'Approved', 'Rejected'];
  const validOverallResults = ['Pass', 'Conditional Pass', 'Fail', 'Rework Required'];
  const validResultStatuses = ['Pass', 'Fail', 'Warning'];

  const invalidInspections = inspections.filter(i => 
    !validApprovalStatuses.includes(i.approval_status) || 
    !validOverallResults.includes(i.overall_result) ||
    !i.inspection_number
  );
  assert(invalidInspections.length === 0, `All inspections satisfy approval_status and overall_result constraints`);

  const invalidResults = allResults.filter(r =>
    !validResultStatuses.includes(r.result_status) ||
    r.measured_value === null ||
    r.measured_value === undefined ||
    !r.parameter_name
  );
  assert(invalidResults.length === 0, `All inspection_results satisfy result_status and numeric measurement constraints`);

  // -------------------------------------------------------------
  // CHECK 6: CONTROLLED TEST RECORD WORKFLOW MUTATIONS
  // -------------------------------------------------------------
  console.log('\n--- 6. Controlled Mutation Lifecycle (Measurement, Approval, Rework) ---');
  // Create a safe temporary test inspection for lifecycle validation
  const testNumber = `QC-TEST-${Date.now()}`;
  const { data: testInsp, error: createErr } = await qaClient
    .from('inspections')
    .insert({
      inspection_number: testNumber,
      spindle_id: firstInsp.spindle_id,
      work_order_id: firstInsp.work_order_id,
      inspection_type: 'Final Metrology QA',
      inspector_id: firstInsp.inspector_id,
      approval_status: 'Pending Sign-off',
      overall_result: 'Pass',
      remarks: 'Automated verification test record'
    })
    .select()
    .single();

  assert(!createErr && testInsp?.id, `Temporary test inspection created (${testNumber})`, createErr?.message);

  if (testInsp?.id) {
    // 6a. Create a checkpoint measurement for this test inspection
    const { data: testParam, error: paramErr } = await qaClient
      .from('inspection_results')
      .insert({
        inspection_id: testInsp.id,
        parameter_name: 'Test Arbor Dynamic Runout',
        nominal_value: 0.0010,
        tolerance_min: 0.0,
        tolerance_max: 0.0020,
        measured_value: 0.0012,
        unit_of_measure: 'µm',
        result_status: 'Pass',
        notes: 'Initial test measurement'
      })
      .select()
      .single();

    assert(!paramErr && testParam?.id, `Test parameter created successfully`, paramErr?.message);

    // 6b. Update measurement and verify persistence
    const updatedVal = 0.0015;
    const { data: updatedParam, error: updateParamErr } = await qaClient
      .from('inspection_results')
      .update({ measured_value: updatedVal, notes: 'Updated via verification suite' })
      .eq('id', testParam.id)
      .select()
      .single();

    assert(!updateParamErr && Number(updatedParam?.measured_value) === updatedVal, `Checkpoint measurement update persisted to PostgreSQL (${updatedParam?.measured_value} µm)`);

    // 6c. Approve inspection and verify persistence
    const { data: approvedInsp, error: approveErr } = await qaClient
      .from('inspections')
      .update({ approval_status: 'Approved', overall_result: 'Pass', updated_at: new Date().toISOString() })
      .eq('id', testInsp.id)
      .select()
      .single();

    assert(!approveErr && approvedInsp?.approval_status === 'Approved', `Inspection approval persisted to PostgreSQL (Status: ${approvedInsp?.approval_status})`);

    // 6d. Request rework and verify persistence
    const { data: reworkInsp, error: reworkErr } = await qaClient
      .from('inspections')
      .update({ approval_status: 'Rejected', overall_result: 'Rework Required', updated_at: new Date().toISOString() })
      .eq('id', testInsp.id)
      .select()
      .single();

    assert(!reworkErr && reworkInsp?.approval_status === 'Rejected' && reworkInsp?.overall_result === 'Rework Required', `Rework request persisted to PostgreSQL (Status: ${reworkInsp?.approval_status}, Result: ${reworkInsp?.overall_result})`);

    // 6e. Verify persistence with a fresh client instance
    const freshClient = createClient(url, anonKey, { auth: { persistSession: false } });
    await freshClient.auth.signInWithPassword({ email: qaEmail, password: qaPassword });
    const { data: freshRecord } = await freshClient.from('inspections').select('*').eq('id', testInsp.id).single();
    assert(freshRecord?.approval_status === 'Rejected' && freshRecord?.overall_result === 'Rework Required', `Status survives fresh client re-read (Immutable persistence confirmed)`);

    // 6f. Clean up temporary test record to maintain pristine database state
    await qaClient.from('inspection_results').delete().eq('inspection_id', testInsp.id);
    await qaClient.from('inspections').delete().eq('id', testInsp.id);
    console.log('  [CLEANUP] Temporary test inspection and checkpoint records safely cleaned up');
  }

  // -------------------------------------------------------------
  // CHECK 7: DUPLICATE SUBMISSION PREVENTION
  // -------------------------------------------------------------
  console.log('\n--- 7. Duplicate Prevention ---');
  if (firstInsp) {
    const { error: dupErr } = await qaClient.from('inspections').insert({
      inspection_number: firstInsp.inspection_number,
      spindle_id: firstInsp.spindle_id,
      inspection_type: 'First Article'
    });
    assert(dupErr && (dupErr.code === '23505' || dupErr.message.includes('unique')), `Duplicate inspection_number rejected by database constraint (${dupErr?.code || 'UNIQUE_VIOLATION'})`);
  }

  // -------------------------------------------------------------
  // CHECK 8: AUDIT LOG LEDGER INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- 8. Audit Logging Verification ---');
  // Log a Quality audit record
  const { error: auditErr } = await qaClient.from('audit_logs').insert({
    user_id: qaAuth.user.id,
    user_name: 'Milind Joshi',
    user_email: qaEmail,
    action: 'VERIFY',
    module: 'Quality',
    table_name: 'inspections',
    record_id: firstInsp.id,
    summary_message: 'Verification suite audit check for Quality module'
  });
  assert(!auditErr, `Quality audit record inserted into public.audit_logs`, auditErr?.message);

  // Verify Admin can query the Quality audit logs
  const adminClient = createClient(url, anonKey, { auth: { persistSession: false } });
  await adminClient.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
  const { data: auditEntries, error: auditReadErr } = await adminClient
    .from('audit_logs')
    .select('*')
    .eq('module', 'Quality')
    .limit(10);

  assert(!auditReadErr && auditEntries && auditEntries.length > 0, `Audit log entries verified by Admin (Quality entries: ${auditEntries?.length || 0})`);

  // -------------------------------------------------------------
  // CHECK 9: CROSS-ROLE AUTHORIZATION RESTRICTIONS (RLS)
  // -------------------------------------------------------------
  console.log('\n--- 9. Role-Based Security: Unauthorized Mutation Blocked ---');
  const unauthClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: unauthAuth, error: unauthAuthErr } = await unauthClient.auth.signInWithPassword({
    email: unauthEmail,
    password: unauthPassword
  });

  if (unauthAuth?.user) {
    // SALES role can read inspections
    const { data: salesRead } = await unauthClient.from('inspections').select('id').limit(1);
    assert(salesRead && salesRead.length > 0, `SALES user permitted to READ inspection data`);

    // 9a. Unauthorized INSERT must be rejected by PostgreSQL RLS with 42501
    const { error: unauthInsertErr } = await unauthClient
      .from('inspections')
      .insert({
        inspection_number: 'QC-UNAUTH-FAIL',
        spindle_id: firstInsp.spindle_id,
        inspection_type: 'First Article'
      });

    const isInsertBlocked = unauthInsertErr && (
      unauthInsertErr.code === '42501' || 
      unauthInsertErr.message.includes('row-level security') ||
      unauthInsertErr.message.includes('permission denied')
    );
    assert(isInsertBlocked, `Unauthorized role INSERT BLOCKED by PostgreSQL RLS (${unauthInsertErr?.code || 'RLS_DENIED'})`);

    // 9b. Unauthorized UPDATE must be blocked by USING clause (0 rows modified)
    const { data: unauthUpdateRows } = await unauthClient
      .from('inspections')
      .update({ remarks: 'Malicious modification by unauthorized role' })
      .eq('id', firstInsp.id)
      .select();

    assert(!unauthUpdateRows || unauthUpdateRows.length === 0, `Unauthorized role UPDATE BLOCKED by PostgreSQL RLS (0 rows updated)`);
  } else {
    console.warn('  [SKIP] Could not authenticate unauth user for cross-role test:', unauthAuthErr?.message);
  }

  // -------------------------------------------------------------
  // CHECK 10: SOURCE CODE SCAN (ZERO SERVICE ROLE KEYS)
  // -------------------------------------------------------------
  console.log('\n--- 10. Frontend Security: Service Role Key Scanner ---');
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
  assert(serviceRoleViolations.length === 0, `Zero SUPABASE_SERVICE_ROLE_KEY or service_role references in src/ (Found: ${serviceRoleViolations.length})`);

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log(`QUALITY VERIFICATION COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('='.repeat(80));

  if (failedCount > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Unhandled exception during quality verification:', err);
  process.exit(1);
});
