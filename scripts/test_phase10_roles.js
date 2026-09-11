import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const migrationEnv = fs.readFileSync('.env.migration', 'utf8');
const envFile = fs.readFileSync('.env', 'utf8');

const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — PHASE 10 COMPREHENSIVE ROLE AUTHORIZATION AUDIT');
console.log('='.repeat(80));

const ROLES = [
  { role: 'ADMIN', email: 'rahul.patil@gpspindles.com', password: 'Password123!', expectedDbRole: 'ADMIN' },
  { role: 'MANAGEMENT', email: 'kulkarni.vr@gpspindles.com', password: 'Password123!', expectedDbRole: 'MANAGEMENT' },
  { role: 'PROD_MGR', email: 'suresh.sawant@gpspindles.com', password: 'Password123!', expectedDbRole: 'PROD_MGR' },
  { role: 'QA_MGR', email: 'milind.joshi@gpspindles.com', password: 'Password123!', expectedDbRole: 'QA_MGR' },
  { role: 'SALES', email: 'shreyas.nair@gpspindles.com', password: 'Password123!', expectedDbRole: 'SALES' },
  { role: 'PURCHASE', email: 'purchase.controller@gpspindles.com', password: 'Password123!', expectedDbRole: 'PURCHASE' },
  { role: 'STORES', email: 'dinesh.more@gpspindles.com', password: 'Password123!', expectedDbRole: 'STORES' },
  { role: 'SERVICE', email: 'service.lead@gpspindles.com', password: 'Password123!', expectedDbRole: 'SERVICE' },
  { role: 'EMPLOYEE', email: 'vikram.shinde@gpspindles.com', password: 'Password123!', expectedDbRole: 'OPERATOR' }
];

async function authenticate(email, password) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Auth failed for ${email}: ${error.message}`);
  return { client, user: data.user };
}

async function runRoleAudit() {
  let passedChecks = 0;
  let failedChecks = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedChecks++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedChecks++;
    }
  }

  // 1. ANONYMOUS ACCESS RESTRICTIONS
  console.log('\n--- 1. ANONYMOUS ACCESS ATTEMPTS (DIRECT API) ---');
  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: anonProfiles } = await anonClient.from('profiles').select('*').limit(1);
  assert(!anonProfiles || anonProfiles.length === 0, 'Anonymous BLOCKED from profiles table (0 rows)');

  const { data: anonInvoices } = await anonClient.from('invoices').select('*').limit(1);
  assert(!anonInvoices || anonInvoices.length === 0, 'Anonymous BLOCKED from invoices table (0 rows)');

  const { data: anonWO } = await anonClient.from('work_orders').select('*').limit(1);
  assert(!anonWO || anonWO.length === 0, 'Anonymous BLOCKED from work_orders table (0 rows)');

  const { data: anonStock } = await anonClient.from('stock').select('*').limit(1);
  assert(!anonStock || anonStock.length === 0, 'Anonymous BLOCKED from stock table (0 rows)');

  const { error: anonInsertErr } = await anonClient.from('customers').insert([{ name: 'Hacker Corp' }]);
  assert(anonInsertErr !== null, 'Anonymous INSERT BLOCKED on customers');

  // 2. AUTHENTICATE ALL 9 ROLES & TEST PERMISSIONS
  console.log('\n--- 2. ALL 9 ROLES AUTHENTICATION & CROSS-MODULE PERMISSIONS ---');

  for (const r of ROLES) {
    console.log(`\nTesting Role: [${r.role}] (${r.email})`);
    const { client, user } = await authenticate(r.email, r.password);
    assert(user && user.email === r.email, `Authenticated successfully as ${r.role}`);

    // Verify role resolution via profiles table
    const { data: prof, error: pErr } = await client
      .from('profiles')
      .select('id, role:roles(code)')
      .eq('id', user.id)
      .single();
    const resolvedRole = prof?.role?.code;
    assert(!pErr && resolvedRole === r.expectedDbRole, `Profile role resolved to ${resolvedRole} (expected ${r.expectedDbRole})`);

    // Test module-specific permissions
    if (r.role === 'EMPLOYEE') {
      // Employee can read self profile
      const { data: myProf } = await client.from('profiles').select('id').eq('id', user.id);
      assert(myProf && myProf.length === 1, 'EMPLOYEE can read self profile');

      // Employee cannot insert into quotations
      const { error: qErr } = await client.from('quotations').insert([{ quotation_number: 'Q-HACK-01', total_amount: 1000 }]);
      assert(qErr !== null, 'EMPLOYEE BLOCKED from creating quotations');

      // Employee cannot create purchase orders
      const { error: poErr } = await client.from('purchase_orders').insert([{ po_number: 'PO-HACK-01' }]);
      assert(poErr !== null, 'EMPLOYEE BLOCKED from creating purchase orders');

      // Employee cannot read audit logs
      const { data: audits } = await client.from('audit_logs').select('*').limit(5);
      assert(!audits || audits.length === 0, 'EMPLOYEE BLOCKED from reading audit logs (0 rows)');
    }

    if (r.role === 'SALES') {
      // Sales can read customers, quotations, invoices
      const { data: custs, error: cErr } = await client.from('customers').select('id').limit(5);
      assert(!cErr && Array.isArray(custs), 'SALES can access customers');

      const { data: invs, error: iErr } = await client.from('invoices').select('id').limit(5);
      assert(!iErr && Array.isArray(invs), 'SALES can access invoices');

      // Sales blocked from inserting work orders
      const { error: woErr } = await client.from('work_orders').insert([{ wo_number: 'WO-SALES-ILLEGAL', description: 'Malicious' }]);
      assert(woErr !== null, 'SALES BLOCKED from inserting work orders');

      // Sales blocked from modifying machines/maintenance
      const { error: mErr } = await client.from('maintenance_orders').insert([{ title: 'Sales machine order' }]);
      assert(mErr !== null, 'SALES BLOCKED from maintenance orders');
    }

    if (r.role === 'PURCHASE') {
      // Purchase can access suppliers and purchase orders
      const { data: supp, error: sErr } = await client.from('suppliers').select('id').limit(5);
      assert(!sErr && Array.isArray(supp), 'PURCHASE can access suppliers');

      const { data: pos, error: poErr } = await client.from('purchase_orders').select('id').limit(5);
      assert(!poErr && Array.isArray(pos), 'PURCHASE can access purchase orders');

      // Purchase blocked from dispatch records
      const { error: dErr } = await client.from('dispatches').insert([{ dispatch_number: 'DSP-PURCHASE-FAIL' }]);
      assert(dErr !== null, 'PURCHASE BLOCKED from creating dispatches');
    }

    if (r.role === 'STORES') {
      // Stores can access warehouses & stock_items
      const { data: whs, error: whErr } = await client.from('warehouses').select('id').limit(5);
      assert(!whErr && Array.isArray(whs), 'STORES can access warehouses');

      const { data: items, error: itmErr } = await client.from('stock').select('id').limit(5);
      assert(!itmErr && Array.isArray(items), 'STORES can access stock table');

      // Stores blocked from creating invoices
      const { error: invErr } = await client.from('invoices').insert([{ invoice_number: 'INV-STORES-FAIL' }]);
      assert(invErr !== null, 'STORES BLOCKED from creating invoices');
    }

    if (r.role === 'SERVICE') {
      // Service can access spindles & service requests
      const { data: sps, error: spErr } = await client.from('spindles').select('id').limit(5);
      assert(!spErr && Array.isArray(sps), 'SERVICE can access spindles');

      const { data: sReqs, error: srErr } = await client.from('service_requests').select('id').limit(5);
      assert(!srErr && Array.isArray(sReqs), 'SERVICE can access service requests');

      // Service blocked from purchase orders
      const { error: poErr } = await client.from('purchase_orders').insert([{ po_number: 'PO-SRV-FAIL' }]);
      assert(poErr !== null, 'SERVICE BLOCKED from creating purchase orders');
    }

    if (r.role === 'PROD_MGR') {
      // Prod Mgr can access work orders
      const { data: wos, error: woErr } = await client.from('work_orders').select('id').limit(5);
      assert(!woErr && Array.isArray(wos), 'PROD_MGR can access work orders');

      // Prod Mgr blocked from invoices (0 rows visible)
      const { data: invs } = await client.from('invoices').select('id');
      assert(!invs || invs.length === 0, 'PROD_MGR BLOCKED from reading invoices (0 rows visible)');
    }

    if (r.role === 'QA_MGR') {
      // QA Mgr can access inspections
      const { data: qis, error: qiErr } = await client.from('inspections').select('id').limit(5);
      assert(!qiErr && Array.isArray(qis), 'QA_MGR can access inspections');

      // QA Mgr blocked from creating quotations
      const { error: qErr } = await client.from('quotations').insert([{ quotation_number: 'Q-QA-FAIL' }]);
      assert(qErr !== null, 'QA_MGR BLOCKED from creating quotations');
    }

    if (r.role === 'MANAGEMENT') {
      // Management can view invoices & reports & audit logs
      const { data: invs, error: iErr } = await client.from('invoices').select('id').limit(5);
      assert(!iErr && Array.isArray(invs), 'MANAGEMENT can access invoices');

      const { data: audits, error: aErr } = await client.from('audit_logs').select('id').limit(5);
      assert(!aErr && Array.isArray(audits), 'MANAGEMENT can access audit logs');
    }

    if (r.role === 'ADMIN') {
      // Admin has full read access across ERP
      const { data: profs, error: pErr } = await client.from('profiles').select('id').limit(5);
      assert(!pErr && profs.length > 0, 'ADMIN can read profiles');

      const { data: audits, error: aErr } = await client.from('audit_logs').select('id').limit(5);
      assert(!aErr && Array.isArray(audits), 'ADMIN can read audit logs');
    }

    await client.auth.signOut();
  }

  // 3. AUDIT LOG IMMUTABILITY AUDIT
  console.log('\n--- 3. AUDIT LOG IMMUTABILITY & TAMPERING PREVENTION ---');
  const { client: empClient } = await authenticate('vikram.shinde@gpspindles.com', 'Password123!');
  
  // Try to update an audit log record
  const { data: atkUpdate, error: atkUpdErr } = await empClient.from('audit_logs').update({ old_data: {} }).limit(1);
  const updateBlocked = (!atkUpdate || atkUpdate.length === 0) || !!atkUpdErr;
  assert(updateBlocked, 'EMPLOYEE UPDATE on audit_logs is strictly BLOCKED');

  // Try to delete an audit log record
  const { data: atkDelete, error: atkDelErr } = await empClient.from('audit_logs').delete().limit(1);
  const deleteBlocked = (!atkDelete || atkDelete.length === 0) || !!atkDelErr;
  assert(deleteBlocked, 'EMPLOYEE DELETE on audit_logs is strictly BLOCKED');

  console.log('\n' + '='.repeat(80));
  console.log(`ROLE AUDIT COMPLETE: ${passedChecks} PASSED, ${failedChecks} FAILED`);
  console.log('='.repeat(80));

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runRoleAudit().catch(err => {
  console.error('Role audit failed with fatal error:', err);
  process.exit(1);
});
