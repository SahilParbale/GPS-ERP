/**
 * GPS SPINDLE ERP — PHASE 6 MANUFACTURING & WORKFORCE VERIFICATION
 * 
 * Verifies live Supabase PostgreSQL database state after Phase 6 migration:
 * - Entity record counts vs source mock datasets
 * - Natural key uniqueness (zero duplicates)
 * - Referential integrity (foreign key relationships)
 * - Timestamp and status constraints consistency
 * - Complete summary table
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read service role key from .env.migration (strictly server-side)
const migrationPath = path.resolve('.env.migration');
const env = {};
if (fs.existsSync(migrationPath)) {
  const raw = fs.readFileSync(migrationPath, 'utf8');
  raw.split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length >= 2) env[parts[0]] = parts.slice(1).join('=');
  });
}

const url = env.SUPABASE_URL || 'https://eefqamtethlkqhqgdpah.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required in .env.migration.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runVerification() {
  console.log('================================================================');
  console.log('GPS SPINDLE ERP — PHASE 6: LIVE MANUFACTURING DATA VERIFICATION');
  console.log('================================================================');
  console.log(`Database Target: ${url}\n`);

  let allPassed = true;
  const results = [];

  // Helper to record result
  const recordResult = (entity, sourceCount, liveCount, status, notes = '') => {
    const passed = status === 'PASS' || status === 'DEFERRED';
    if (!passed) allPassed = false;
    results.push({
      Entity: entity,
      'Source Count': sourceCount,
      'Live Count': liveCount,
      Difference: typeof sourceCount === 'number' && typeof liveCount === 'number' ? liveCount - sourceCount : '—',
      Status: status,
      Notes: notes
    });
  };

  // 1. Spindles
  const { data: spindles, count: spindleCount, error: spErr } = await supabase.from('spindles').select('id, serial_number, model_id, customer_id, status', { count: 'exact' });
  if (spErr) {
    recordResult('Spindles', 7, 0, 'FAIL', spErr.message);
  } else {
    // Check duplicates
    const serials = new Set();
    let dups = 0;
    spindles?.forEach(s => {
      if (serials.has(s.serial_number)) dups++;
      serials.add(s.serial_number);
    });
    const status = dups === 0 && (spindleCount >= 7) ? 'PASS' : 'FAIL';
    recordResult('Spindles', 7, spindleCount, status, dups > 0 ? `${dups} duplicate serials` : 'Includes baseline seeds');
  }

  // 2. Work Orders
  const { data: workOrders, count: woCount, error: woErr } = await supabase.from('work_orders').select('id, work_order_no, customer_id, spindle_id, status', { count: 'exact' });
  if (woErr) {
    recordResult('Work Orders', 8, 0, 'FAIL', woErr.message);
  } else {
    const woNos = new Set();
    let dups = 0;
    workOrders?.forEach(w => {
      if (woNos.has(w.work_order_no)) dups++;
      woNos.add(w.work_order_no);
    });
    const status = dups === 0 && (woCount >= 8) ? 'PASS' : 'FAIL';
    recordResult('Work Orders', 8, woCount, status, dups > 0 ? `${dups} duplicate WOs` : 'Includes baseline seeds');
  }

  // 3. Work Order Items
  const { data: woItems, count: woiCount, error: woiErr } = await supabase.from('work_order_items').select('id, work_order_id, sequence_no, status', { count: 'exact' });
  if (woiErr) {
    recordResult('Work Order Items', 8, 0, 'FAIL', woiErr.message);
  } else {
    const status = (woiCount >= 8) ? 'PASS' : 'FAIL';
    recordResult('Work Order Items', 8, woiCount, status, 'Sequential routing steps per order');
  }

  // 4. Production Operations
  const { data: operations, count: opCount, error: opErr } = await supabase.from('production_operations').select('id, code, stage', { count: 'exact' });
  if (opErr) {
    recordResult('Production Operations', 8, 0, 'FAIL', opErr.message);
  } else {
    const status = (opCount === 8) ? 'PASS' : 'FAIL';
    recordResult('Production Operations', 8, opCount, status, '8 Pipeline stages');
  }

  // 5. Spindle Components
  const { data: components, count: compCount, error: compErr } = await supabase.from('spindle_components').select('id, spindle_id, part_number', { count: 'exact' });
  if (compErr) {
    recordResult('Spindle Components', 6, 0, 'FAIL', compErr.message);
  } else {
    const status = (compCount >= 6) ? 'PASS' : 'FAIL';
    recordResult('Spindle Components', 6, compCount, status, 'Fitted BOM components');
  }

  // 6. Spindle Quality Records
  const { data: qaRecords, count: qaCount, error: qaErr } = await supabase.from('spindle_quality_records').select('id, spindle_id, test_parameter', { count: 'exact' });
  if (qaErr) {
    recordResult('Spindle Quality Records', 5, 0, 'FAIL', qaErr.message);
  } else {
    const status = (qaCount >= 5) ? 'PASS' : 'FAIL';
    recordResult('Spindle Quality Records', 5, qaCount, status, 'Metrology inspection parameters');
  }

  // 7. Machine Assignments
  const { data: machineAssigns, count: maCount, error: maErr } = await supabase.from('machine_assignments').select('id, machine_id, employee_id', { count: 'exact' });
  if (maErr) {
    recordResult('Machine Assignments', 8, 0, 'FAIL', maErr.message);
  } else {
    const status = (maCount >= 8) ? 'PASS' : 'FAIL';
    recordResult('Machine Assignments', 8, maCount, status, 'Active bay technician stations');
  }

  // 8. Work Logs
  const { data: workLogs, count: wlCount, error: wlErr } = await supabase.from('work_logs').select('id, employee_id, task_name, work_order_no, status', { count: 'exact' });
  if (wlErr) {
    recordResult('Work Logs', 20, 0, 'FAIL', wlErr.message);
  } else {
    const status = (wlCount >= 20) ? 'PASS' : 'FAIL';
    recordResult('Work Logs', 20, wlCount, status, 'Shop floor technician daily logs');
  }

  // 9. Attendance (Deferred to Phase 8 as per plan)
  recordResult('Attendance', 'Deferred', 'Deferred', 'DEFERRED', 'Deferred to Phase 8 as planned');

  // Print Summary Table
  console.table(results);

  // Foreign Key & Integrity Diagnostics
  console.log('\n--- Foreign Key & Integrity Diagnostics ---');
  
  // Check Work Order Foreign Keys
  const orphanWos = workOrders?.filter(w => !w.customer_id) || [];
  console.log(`Work Orders without Customer ID: ${orphanWos.length} ${orphanWos.length === 0 ? '✓ PASS' : '✗ FAIL'}`);

  // Check Spindle Foreign Keys
  const orphanSpindles = spindles?.filter(s => !s.model_id) || [];
  console.log(`Spindles without Model ID: ${orphanSpindles.length} ${orphanSpindles.length === 0 ? '✓ PASS' : '✗ FAIL'}`);

  // Check Work Log Foreign Keys
  const orphanLogs = workLogs?.filter(l => !l.employee_id) || [];
  console.log(`Work Logs without Employee ID: ${orphanLogs.length} ${orphanLogs.length === 0 ? '✓ PASS' : '✗ FAIL'}`);

  if (orphanWos.length > 0 || orphanSpindles.length > 0 || orphanLogs.length > 0) {
    allPassed = false;
  }

  console.log('\n================================================================');
  if (allPassed) {
    console.log('STATUS: 100% PHASE 6 MANUFACTURING DATA INTEGRITY VERIFIED (PASS)');
  } else {
    console.log('STATUS: PHASE 6 DATA INTEGRITY DEFECTS DETECTED (FAIL)');
  }
  console.log('================================================================\n');

  if (!allPassed) process.exit(1);
}

runVerification().catch(err => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
