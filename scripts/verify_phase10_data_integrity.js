import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const migrationEnv = fs.readFileSync('.env.migration', 'utf8');
const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = migrationEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — PHASE 10 DATABASE DATA INTEGRITY AUDIT');
console.log('='.repeat(80));

async function runDataIntegrityAudit() {
  let passedChecks = 0;
  let failedChecks = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedChecks++;
    } else {
      console.error(`  [FAIL] ${message} ${details ? '--> ' + JSON.stringify(details) : ''}`);
      failedChecks++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. INVENTORY & STOCK INTEGRITY (No negative quantities)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. INVENTORY & STOCK QUANTITY INTEGRITY ---');
  const { data: negativeStock, error: stockErr } = await adminClient
    .from('stock')
    .select('id, product_id, quantity_on_hand, quantity_available')
    .or('quantity_on_hand.lt.0,quantity_available.lt.0');

  assert(!stockErr && negativeStock.length === 0, 'No negative stock balances in stock table', negativeStock);

  // --------------------------------------------------------------------------
  // 2. ATTENDANCE INTEGRITY (No duplicate punches for same employee & date)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. ATTENDANCE INTEGRITY (No duplicate employee/date) ---');
  const { data: allAttendance, error: attErr } = await adminClient
    .from('attendance')
    .select('id, employee_id, date');

  let duplicateAttendance = [];
  if (allAttendance) {
    const seen = new Set();
    for (const a of allAttendance) {
      const key = `${a.employee_id}_${a.date}`;
      if (seen.has(key)) {
        duplicateAttendance.push(a);
      }
      seen.add(key);
    }
  }
  assert(!attErr && duplicateAttendance.length === 0, 'Zero duplicate attendance records per employee per day', duplicateAttendance);

  // --------------------------------------------------------------------------
  // 3. NATURAL KEY UNIQUENESS AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 3. NATURAL KEY UNIQUENESS AUDIT ---');

  // Spindle serial numbers
  const { data: spindles, error: spErr } = await adminClient.from('spindles').select('id, serial_number');
  const duplicateSerials = [];
  if (spindles) {
    const sSeen = new Set();
    spindles.forEach(s => {
      if (sSeen.has(s.serial_number)) duplicateSerials.push(s.serial_number);
      sSeen.add(s.serial_number);
    });
  }
  assert(!spErr && duplicateSerials.length === 0, 'Zero duplicate spindle serial numbers', duplicateSerials);

  // Work order numbers
  const { data: wos, error: woErr } = await adminClient.from('work_orders').select('id, work_order_no');
  const duplicateWOs = [];
  if (wos) {
    const wSeen = new Set();
    wos.forEach(w => {
      if (wSeen.has(w.work_order_no)) duplicateWOs.push(w.work_order_no);
      wSeen.add(w.work_order_no);
    });
  }
  assert(!woErr && duplicateWOs.length === 0, 'Zero duplicate work order numbers', duplicateWOs);

  // Invoice numbers
  const { data: invs, error: invErr } = await adminClient.from('invoices').select('id, invoice_number');
  const duplicateInvoices = [];
  if (invs) {
    const iSeen = new Set();
    invs.forEach(i => {
      if (iSeen.has(i.invoice_number)) duplicateInvoices.push(i.invoice_number);
      iSeen.add(i.invoice_number);
    });
  }
  assert(!invErr && duplicateInvoices.length === 0, 'Zero duplicate invoice numbers', duplicateInvoices);

  // Purchase Order numbers
  const { data: pos, error: poErr } = await adminClient.from('purchase_orders').select('id, po_number');
  const duplicatePOs = [];
  if (pos) {
    const pSeen = new Set();
    pos.forEach(p => {
      if (pSeen.has(p.po_number)) duplicatePOs.push(p.po_number);
      pSeen.add(p.po_number);
    });
  }
  assert(!poErr && duplicatePOs.length === 0, 'Zero duplicate purchase order numbers', duplicatePOs);

  // --------------------------------------------------------------------------
  // 4. FOREIGN KEY & ORPHAN RECORD AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 4. FOREIGN KEY & ORPHAN RECORD AUDIT ---');

  // Invoice items orphan check
  const { data: invItems, error: iiErr } = await adminClient.from('invoice_items').select('id, invoice_id');
  const invoiceIds = new Set(invs.map(i => i.id));
  const orphanInvoiceItems = (invItems || []).filter(item => !invoiceIds.has(item.invoice_id));
  assert(!iiErr && orphanInvoiceItems.length === 0, 'Zero orphan invoice_items', orphanInvoiceItems);

  // Work order items orphan check
  const { data: woItems, error: woiErr } = await adminClient.from('work_order_items').select('id, work_order_id');
  const woIds = new Set(wos.map(w => w.id));
  const orphanWoItems = (woItems || []).filter(item => !woIds.has(item.work_order_id));
  assert(!woiErr && orphanWoItems.length === 0, 'Zero orphan work_order_items', orphanWoItems);

  // Dispatch items orphan check
  const { data: dispatches, error: dspErr } = await adminClient.from('dispatches').select('id');
  const { data: dspItems, error: dspiErr } = await adminClient.from('dispatch_items').select('id, dispatch_id');
  const dspIds = new Set((dispatches || []).map(d => d.id));
  const orphanDispatchItems = (dspItems || []).filter(item => !dspIds.has(item.dispatch_id));
  assert(!dspErr && !dspiErr && orphanDispatchItems.length === 0, 'Zero orphan dispatch_items', orphanDispatchItems);

  // Document versions orphan check
  const { data: docs, error: docErr } = await adminClient.from('documents').select('id');
  const { data: docVersions, error: dverErr } = await adminClient.from('document_versions').select('id, document_id');
  const docIds = new Set((docs || []).map(d => d.id));
  const orphanDocVersions = (docVersions || []).filter(v => !docIds.has(v.document_id));
  assert(!docErr && !dverErr && orphanDocVersions.length === 0, 'Zero orphan document_versions', orphanDocVersions);

  // --------------------------------------------------------------------------
  // 5. LEAVE REQUEST INTEGRITY AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- 5. LEAVE REQUEST LOGICAL INTEGRITY ---');
  const { data: leaves, error: leaveErr } = await adminClient
    .from('leave_requests')
    .select('id, employee_id, start_date, end_date, total_days, status');

  const invalidLeaves = (leaves || []).filter(l => {
    const invalidDays = Number(l.total_days) <= 0;
    const invalidDates = new Date(l.end_date) < new Date(l.start_date);
    return invalidDays || invalidDates;
  });
  assert(!leaveErr && invalidLeaves.length === 0, 'Zero invalid leave requests (dates & days logical)', invalidLeaves);

  // --------------------------------------------------------------------------
  // 6. RELATIONSHIP INTEGRITY: WORK ORDERS TO SPINDLES
  // --------------------------------------------------------------------------
  console.log('\n--- 6. SPINDLE & WORK ORDER RELATIONSHIPS ---');
  const { data: wosWithSpindles, error: wospErr } = await adminClient
    .from('work_orders')
    .select('id, work_order_no, spindle_id')
    .not('spindle_id', 'is', null);

  const spindleIds = new Set((spindles || []).map(s => s.id));
  const brokenWoSpindles = (wosWithSpindles || []).filter(w => !spindleIds.has(w.spindle_id));
  assert(!wospErr && brokenWoSpindles.length === 0, 'Zero broken spindle foreign keys on work_orders', brokenWoSpindles);

  console.log('\n' + '='.repeat(80));
  console.log(`DATA INTEGRITY AUDIT COMPLETE: ${passedChecks} PASSED, ${failedChecks} FAILED`);
  console.log('='.repeat(80));

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDataIntegrityAudit().catch(err => {
  console.error('Data integrity audit error:', err);
  process.exit(1);
});
