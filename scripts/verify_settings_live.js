import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
const envPath = path.join(rootDir, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

process.env.VITE_SUPABASE_URL = SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Dynamically import supabase client and settingsService after process.env is set
const { supabase } = await import('../src/services/supabase/supabaseClient.js');
const { settingsService } = await import('../src/services/settings/settingsService.js');

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'rahul.patil@gpspindles.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Password123!';
const OPERATOR_EMAIL = process.env.TEST_USER_EMAIL || 'suresh.sawant@gpspindles.com';
const OPERATOR_PASSWORD = process.env.TEST_USER_PASSWORD || 'Password123!';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

async function runVerification() {
  console.log('\n=============================================================');
  console.log('  GPS SPINDLE ERP — SETTINGS LIVE DATABASE VERIFICATION');
  console.log('=============================================================\n');

  const supabaseAdmin = supabase;
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseOperator = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  let originalCompany = null;
  let originalBranch = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Authentication
    // -------------------------------------------------------------
    console.log('1. Authentication Verification:');
    const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    assert(!authErr && authData?.session, `Admin login as ${ADMIN_EMAIL}`);

    const { data: opAuthData, error: opAuthErr } = await supabaseOperator.auth.signInWithPassword({
      email: OPERATOR_EMAIL,
      password: OPERATOR_PASSWORD
    });
    assert(!opAuthErr && opAuthData?.session, `Operator login as ${OPERATOR_EMAIL}`);

    // -------------------------------------------------------------
    // Test 2: Authoritative source records exist
    // -------------------------------------------------------------
    console.log('\n2. Authoritative Source Records Existence:');
    const { data: companyRecord, error: cErr } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('code', 'GPS-CORP')
      .single();
    assert(!cErr && companyRecord && companyRecord.id, 'Company record exists (GPS-CORP)');
    originalCompany = companyRecord;

    const { data: branchRecord, error: bErr } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('code', 'PLANT-1')
      .single();
    assert(!bErr && branchRecord && branchRecord.id, 'Branch record exists (PLANT-1)');
    originalBranch = branchRecord;

    const { data: shiftsRecord, error: sErr } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .eq('branch_id', branchRecord.id);
    assert(!sErr && shiftsRecord && shiftsRecord.length >= 2, `Active shifts exist for plant (${shiftsRecord?.length} shifts)`);

    // -------------------------------------------------------------
    // Test 3: Live Settings data retrieval via SettingsService logic
    // -------------------------------------------------------------
    console.log('\n3. Live Settings Retrieval & Service Logic:');
    
    // We can test using our authenticated client
    const { data: liveSettings, error: servErr } = await settingsService.getSettings();
    assert(!servErr && liveSettings, 'settingsService.getSettings() returned live data successfully');
    assert(liveSettings?.name === companyRecord.name, `Service corporate name matches DB: "${liveSettings?.name}"`);
    assert(liveSettings?.facility === branchRecord.name, `Service facility matches DB: "${liveSettings?.facility}"`);
    assert(liveSettings?.gstin === companyRecord.gstin, `Service GSTIN matches DB: "${liveSettings?.gstin}"`);

    // -------------------------------------------------------------
    // Test 4: Users and Calibrations retrieval
    // -------------------------------------------------------------
    console.log('\n4. Live Workforce & Calibration Lists:');
    const { data: users, error: uErr } = await settingsService.getAuthorizedUsers();
    assert(!uErr && users && users.length > 0, `Authorized users loaded (${users?.length} employees)`);

    const { data: cals, error: calErr } = await settingsService.getMachineCalibrations();
    assert(!calErr && cals && cals.length > 0, `Machine calibrations loaded (${cals?.length} machines)`);

    // -------------------------------------------------------------
    // Test 5: Update by Authorized Role & Persistence
    // -------------------------------------------------------------
    console.log('\n5. Authorized Role Update & Persistence Test:');
    const testName = 'GPS Spindle Pvt. Ltd. [Verified Test]';
    const originalName = companyRecord.name;

    const { data: updRes, error: updErr } = await settingsService.updateSettings({
      companyId: companyRecord.id,
      branchId: branchRecord.id,
      name: testName,
      facility: branchRecord.name,
      address: companyRecord.address,
      gstin: companyRecord.gstin,
      iso: 'ISO 9001:2015 & AS9100D Aerospace Certified',
      shiftMode: 'Continuous 3-Shift 24x7 Operation',
      alertPreferences: {
        bearingLowStock: true,
        noseTaperExceeded: true,
        serviceDelayed: true,
        customerPoApproval: true
      }
    });

    assert(!updErr, 'settingsService.updateSettings() executed without error');
    assert(updRes?.name === testName, 'Returned updated settings reflect new company name');

    // -------------------------------------------------------------
    // Test 6 & 7: Direct DB query to verify persistence & re-read
    // -------------------------------------------------------------
    console.log('\n6 & 7. Direct DB Verification of Persistence:');
    const { data: verifiedCompany, error: vcErr } = await supabaseAdmin
      .from('companies')
      .select('name, updated_at, logo_url')
      .eq('id', companyRecord.id)
      .single();

    const { data: verifiedBranch, error: vbErr } = await supabaseAdmin
      .from('branches')
      .select('name, address, updated_at')
      .eq('id', branchRecord.id)
      .single();

    assert(!vcErr && verifiedCompany?.name === testName, `Direct PostgreSQL query confirmed name is "${verifiedCompany?.name}"`);
    assert(!vbErr && verifiedBranch?.address, `Direct PostgreSQL query confirmed branch address is "${verifiedBranch?.address}"`);

    // Re-read via service
    const { data: rereadSettings } = await settingsService.getSettings();
    assert(rereadSettings?.name === testName, 'Re-reading via service returned persisted value');

    // -------------------------------------------------------------
    // Test 8: Anonymous Access Blocked
    // -------------------------------------------------------------
    console.log('\n8. Anonymous Access Restriction:');
    // Anonymous user attempting update on companies
    const { data: anonUpd, error: anonErr } = await supabaseAnon
      .from('companies')
      .update({ name: 'Anonymous Exploit' })
      .eq('id', companyRecord.id)
      .select();
    assert(!anonUpd || anonUpd.length === 0, 'Anonymous write on public.companies was blocked by RLS');

    // -------------------------------------------------------------
    // Test 9: Unauthorized Role Write Blocked
    // -------------------------------------------------------------
    console.log('\n9. Unauthorized Role Mutation Blocked:');
    const { data: opUpd, error: opErr } = await supabaseOperator
      .from('companies')
      .update({ name: 'Unauthorized Operator Edit' })
      .eq('id', companyRecord.id)
      .select();
    assert(!opUpd || opUpd.length === 0, 'Operational role write on public.companies was blocked by RLS');

    // -------------------------------------------------------------
    // Test 10: Audit Log Event Verification
    // -------------------------------------------------------------
    console.log('\n10. Audit Logging Verification:');
    const { data: auditLogs, error: alErr } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'companies')
      .eq('record_id', companyRecord.id)
      .order('created_at', { ascending: false })
      .limit(3);

    assert(!alErr && auditLogs && auditLogs.length > 0, `Audit log entry created for settings update (Count: ${auditLogs?.length})`);
    if (auditLogs && auditLogs.length > 0) {
      assert(auditLogs[0].action === 'UPDATE', `Audit action is "${auditLogs[0].action}"`);
      assert(auditLogs[0].user_email === ADMIN_EMAIL, `Audit actor email is "${auditLogs[0].user_email}"`);
    }

    // -------------------------------------------------------------
    // Test 11: No duplicate company or settings records created
    // -------------------------------------------------------------
    console.log('\n11. Single Authoritative Source Verification:');
    const { data: allCompanies, count: compCount } = await supabaseAdmin
      .from('companies')
      .select('*', { count: 'exact' });
    assert(compCount === 1, `Exact single authoritative company record maintained (Total: ${compCount})`);

    const { data: allBranches, count: branchCount } = await supabaseAdmin
      .from('branches')
      .select('*', { count: 'exact' });
    assert(branchCount === 1, `Exact single authoritative branch record maintained (Total: ${branchCount})`);

    // -------------------------------------------------------------
    // Test 12: Invalid data rejection
    // -------------------------------------------------------------
    console.log('\n12. Input & Constraint Validation:');
    const { data: invRes, error: invErr } = await settingsService.updateSettings({
      companyId: null // Missing ID
    });
    assert(invErr !== null, 'settingsService rejects update without authoritative company ID');

    // -------------------------------------------------------------
    // Test 13: Service-Role Key Audit in src/
    // -------------------------------------------------------------
    console.log('\n13. Security Credential Audit:');
    const srcDir = path.join(rootDir, 'src');
    let foundServiceRole = false;
    function scanFiles(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanFiles(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('service_role') || content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
            console.error(`  [WARN] Service role key pattern found in: ${fullPath}`);
            foundServiceRole = true;
          }
        }
      }
    }
    scanFiles(srcDir);
    assert(!foundServiceRole, '0 occurrences of service_role credentials in src/ code');

    // -------------------------------------------------------------
    // Test 14: PLANT_INFO / Mock Fallback Audit in SettingsScreen
    // -------------------------------------------------------------
    console.log('\n14. Mock Fallback Audit:');
    const settingsScreenPath = path.join(srcDir, 'screens', 'SettingsScreen.jsx');
    const settingsContent = fs.readFileSync(settingsScreenPath, 'utf8');
    const hasPlantInfo = settingsContent.includes('PLANT_INFO');
    const hasMockData = settingsContent.includes('../data/mockData');
    assert(!hasPlantInfo && !hasMockData, '0 dependencies on PLANT_INFO or mockData in SettingsScreen.jsx');

    // -------------------------------------------------------------
    // Step 13: Direct Database Cross-Check Table
    // -------------------------------------------------------------
    console.log('\n=============================================================');
    console.log('  STEP 13: DIRECT DATABASE CROSS-CHECK TABLE');
    console.log('=============================================================');
    
    const crossCheckTable = [
      {
        field: 'Corporate Entity Name',
        table: 'companies',
        column: 'name',
        serviceVal: rereadSettings.name,
        directVal: verifiedCompany.name,
        match: rereadSettings.name === verifiedCompany.name
      },
      {
        field: 'Manufacturing Facility',
        table: 'branches',
        column: 'name',
        serviceVal: rereadSettings.facility,
        directVal: verifiedBranch.name,
        match: rereadSettings.facility === verifiedBranch.name
      },
      {
        field: 'Factory Address',
        table: 'branches',
        column: 'address',
        serviceVal: rereadSettings.address,
        directVal: verifiedBranch.address,
        match: rereadSettings.address === verifiedBranch.address
      },
      {
        field: 'GSTIN Number',
        table: 'companies',
        column: 'gstin',
        serviceVal: rereadSettings.gstin,
        directVal: originalCompany.gstin,
        match: rereadSettings.gstin === originalCompany.gstin
      },
      {
        field: 'Default Currency',
        table: 'companies',
        column: 'currency',
        serviceVal: rereadSettings.currency,
        directVal: originalCompany.currency,
        match: rereadSettings.currency === originalCompany.currency
      }
    ];

    console.table(crossCheckTable.map(row => ({
      'UI Field': row.field,
      'Table': row.table,
      'Column': row.column,
      'Service Value': row.serviceVal,
      'Direct DB Value': row.directVal,
      'Result': row.match ? 'PASS' : 'FAIL'
    })));

  } catch (err) {
    console.error('Fatal test runner error:', err);
    failedTests++;
  } finally {
    // Revert changes safely
    if (originalCompany) {
      console.log('\n[Cleanup] Reverting company and branch to original values...');
      await supabaseAdmin
        .from('companies')
        .update({
          name: originalCompany.name,
          address: originalCompany.address,
          gstin: originalCompany.gstin,
          logo_url: originalCompany.logo_url
        })
        .eq('id', originalCompany.id);

      if (originalBranch) {
        await supabaseAdmin
          .from('branches')
          .update({
            name: originalBranch.name,
            address: originalBranch.address,
            gstin: originalBranch.gstin
          })
          .eq('id', originalBranch.id);
      }
      console.log('  Restored original company and branch state successfully.');
    }
  }

  console.log('\n=============================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} failed)`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerification();
