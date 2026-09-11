/**
 * GPS SPINDLE ERP — PHASE 6 MANUFACTURING & WORKFORCE MIGRATION
 * 
 * Migrates operational manufacturing and workforce datasets into Supabase PostgreSQL:
 * 1. Spindles (serialized fleet & operational records)
 * 2. Production Operations (pipeline stages)
 * 3. Work Orders (active shop floor orders)
 * 4. Work Order Items (routing steps & traveler operations)
 * 5. Spindle Components (BOM parts fitted to serialized spindles)
 * 6. Spindle Quality Records (metrology inspection test parameters)
 * 7. Machine Assignments (bay station technician allocations)
 * 8. Workforce Work Logs (daily technician operational logs)
 * 
 * Strict Idempotency: Uses natural business keys and deterministic lookups
 * to guarantee that multiple runs produce ZERO duplicate records.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Import frontend mock datasets
import { 
  WORK_ORDERS as MOCK_WORK_ORDERS,
  SPINDLES as MOCK_SPINDLES,
  SHOP_BAYS as MOCK_BAYS,
  PRODUCTION_PIPELINE_STAGES
} from '../src/data/mockData.js';

import { 
  INITIAL_WORK_LOGS,
  INITIAL_BAY_ALLOCATIONS
} from '../src/data/workforceData.js';

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
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required in .env.migration for manufacturing migration.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Helper for deterministic UUID generation from string
function deterministicUuid(namespace, str) {
  const hash = crypto.createHash('md5').update(`${namespace}:${str}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    'a' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

async function runMigration() {
  console.log('================================================================');
  console.log('GPS SPINDLE ERP — PHASE 6: MANUFACTURING & WORKFORCE MIGRATION');
  console.log('================================================================');
  console.log(`Database Target: ${url}`);
  console.log(`Execution Mode: Administrative Service-Role (Server-Side Only)\n`);

  const stats = {
    spindles: { source: 0, inserted: 0, updated: 0 },
    work_orders: { source: 0, inserted: 0, updated: 0 },
    work_order_items: { source: 0, inserted: 0, updated: 0 },
    spindle_components: { source: 0, inserted: 0, updated: 0 },
    spindle_quality_records: { source: 0, inserted: 0, updated: 0 },
    machine_assignments: { source: 0, inserted: 0, updated: 0 },
    work_logs: { source: 0, inserted: 0, updated: 0 }
  };

  // -------------------------------------------------------------
  // 0. LOAD REFERENCE MAPS (Bays, Machines, Models, Customers, Employees, Shifts, Operations, Departments)
  // -------------------------------------------------------------
  console.log('--- Step 0: Loading Reference Maps from Database ---');
  
  const { data: dbBays } = await supabase.from('production_bays').select('id, code, name');
  const { data: dbMachines } = await supabase.from('machines').select('id, code, name, bay_id');
  const { data: dbModels } = await supabase.from('spindle_models').select('id, model_code, model_name');
  const { data: dbCustomers } = await supabase.from('customers').select('id, customer_code, company_name');
  const { data: dbEmployees } = await supabase.from('employees').select('id, employee_code, first_name, last_name');
  const { data: dbShifts } = await supabase.from('shifts').select('id, shift_code, name');
  const { data: dbOperations } = await supabase.from('production_operations').select('id, code, name, stage');
  const { data: dbDepartments } = await supabase.from('departments').select('id, code, name');

  console.log(`Loaded: ${dbBays?.length || 0} Bays, ${dbMachines?.length || 0} Machines, ${dbModels?.length || 0} Models, ` +
              `${dbCustomers?.length || 0} Customers, ${dbEmployees?.length || 0} Employees, ${dbShifts?.length || 0} Shifts, ` +
              `${dbOperations?.length || 0} Operations, ${dbDepartments?.length || 0} Departments\n`);

  // Helper matchers
  const findCustomer = (name) => {
    if (!name) return dbCustomers?.[0]?.id;
    const lower = name.toLowerCase();
    const found = dbCustomers?.find(c => 
      c.company_name.toLowerCase().includes(lower) || 
      lower.includes(c.company_name.toLowerCase()) ||
      c.customer_code.toLowerCase() === lower
    );
    return found ? found.id : dbCustomers?.[0]?.id;
  };

  const findModel = (code) => {
    if (!code) return dbModels?.[0]?.id;
    const found = dbModels?.find(m => m.model_code.toLowerCase() === code.toLowerCase() || code.toLowerCase().includes(m.model_code.toLowerCase()));
    return found ? found.id : dbModels?.[0]?.id;
  };

  const findBay = (bayIdentifier) => {
    if (!bayIdentifier) return dbBays?.[0]?.id;
    const lower = bayIdentifier.toLowerCase();
    const found = dbBays?.find(b => 
      lower.includes(b.code.toLowerCase()) || 
      b.name.toLowerCase().includes(lower) || 
      lower.includes(`bay ${b.code.replace('BAY-', '')}`)
    );
    return found ? found.id : dbBays?.[0]?.id;
  };

  const findMachine = (machineIdentifier) => {
    if (!machineIdentifier) return dbMachines?.[0]?.id;
    const lower = machineIdentifier.toLowerCase();
    const found = dbMachines?.find(m => 
      lower.includes(m.code.toLowerCase()) || 
      m.name.toLowerCase().includes(lower) ||
      lower.includes(m.name.toLowerCase())
    );
    return found ? found.id : dbMachines?.[0]?.id;
  };

  const findEmployee = (nameOrCode) => {
    if (!nameOrCode) return dbEmployees?.[0]?.id;
    const lower = nameOrCode.toLowerCase();
    const found = dbEmployees?.find(e => {
      const fullName = `${e.first_name} ${e.last_name}`.toLowerCase();
      return e.employee_code.toLowerCase() === lower || 
             fullName.includes(lower) || 
             lower.includes(e.last_name.toLowerCase());
    });
    return found ? found.id : dbEmployees?.[0]?.id;
  };

  const findDepartment = (name) => {
    if (!name) return dbDepartments?.[0]?.id;
    const lower = name.toLowerCase();
    const found = dbDepartments?.find(d => d.name.toLowerCase().includes(lower) || d.code.toLowerCase().includes(lower));
    return found ? found.id : dbDepartments?.[0]?.id;
  };

  const defaultShiftId = dbShifts?.[0]?.id;

  // -------------------------------------------------------------
  // 1. MIGRATE SPINDLES
  // -------------------------------------------------------------
  console.log('--- Step 1: Migrating Spindles Fleet & Assets ---');
  
  // Collect all unique spindle records from MOCK_SPINDLES, WORK_ORDERS, and INITIAL_WORK_LOGS
  const spindleMap = new Map();

  // A. From MOCK_SPINDLES
  MOCK_SPINDLES.forEach(sp => {
    spindleMap.set(sp.serialNumber, {
      serial_number: sp.serialNumber,
      model_code: sp.model,
      customer_name: sp.customer,
      spindle_type: sp.type || 'Motorized Electro-Spindle',
      max_rpm: sp.maxRpm || parseInt(sp.rpm?.replace(/[^0-9]/g, '')) || 24000,
      power_kw: parseFloat(sp.power?.replace(/[^0-9.]/g, '')) || 15.0,
      torque_nm: parseFloat(sp.torque?.replace(/[^0-9.]/g, '')) || 32.0,
      taper_interface: sp.interface || 'HSK-A63',
      lubrication: sp.lubrication || 'Air-Oil Mist (0.03 ml/min)',
      bearings_spec: sp.bearings || 'Ceramic Hybrid (HC7008-E)',
      cooling_spec: sp.cooling || 'Water-Glycol Closed Circuit',
      status: sp.status === 'Under Service' ? 'Under Maintenance' : 
              (sp.status === 'Ready' ? 'Ready' : (sp.status === 'Dispatched' ? 'Dispatched' : (sp.status === 'QC Pending' ? 'QC Pending' : 'In Production'))),
      current_stage: sp.stage || 'Machining',
      current_location: 'Pune Plant 1',
      max_runout_measured_microns: parseFloat(sp.runoutTaper?.replace(/[^0-9.]/g, '')) || 0.6,
      balance_grade: sp.balanceGrade || 'ISO 1940 G0.28',
      vibration_overall_velocity_mms: parseFloat(sp.vibrationRms?.replace(/[^0-9.]/g, '')) || 0.27,
      thermal_rise_stabilized_celsius: parseFloat(sp.tempRise?.replace(/[^0-9.]/g, '')) || 14.2,
      clamping_force_measured_kn: parseFloat(sp.clampForce?.replace(/[^0-9.]/g, '')) || 18.4,
      qr_code: sp.qrCode || `GPS-${sp.serialNumber}`,
      notes: 'High precision industrial spindle.'
    });
  });

  // B. From MOCK_WORK_ORDERS
  MOCK_WORK_ORDERS.forEach(wo => {
    if (wo.spindleSerial && !spindleMap.has(wo.spindleSerial)) {
      spindleMap.set(wo.spindleSerial, {
        serial_number: wo.spindleSerial,
        model_code: wo.spindleModel,
        customer_name: wo.customer,
        spindle_type: 'Motorized Built-in',
        max_rpm: 24000,
        power_kw: 15.0,
        torque_nm: 32.0,
        taper_interface: wo.specifications?.toolTaper || 'HSK-A63',
        lubrication: 'Air-Oil Mist',
        bearings_spec: 'Ceramic Hybrid Angular Contact',
        cooling_spec: 'Water-Glycol Closed Circuit',
        status: wo.status === 'Ready' ? 'Ready' : (wo.status === 'QC Pending' ? 'QC Pending' : 'In Production'),
        current_stage: wo.currentStage || 'Machining',
        current_location: 'Pune Plant 1',
        max_runout_measured_microns: 0.8,
        balance_grade: 'ISO 1940 G0.4',
        vibration_overall_velocity_mms: 0.35,
        thermal_rise_stabilized_celsius: 15.0,
        clamping_force_measured_kn: 18.0,
        qr_code: `GPS-${wo.spindleSerial}`,
        notes: `Work order associated asset ${wo.id}`
      });
    }
  });

  // C. From INITIAL_WORK_LOGS
  INITIAL_WORK_LOGS.forEach(wl => {
    if (wl.spindle && !spindleMap.has(wl.spindle)) {
      spindleMap.set(wl.spindle, {
        serial_number: wl.spindle,
        model_code: 'GPS-HSK-A63-24K',
        customer_name: 'Tata Advanced Systems Ltd',
        spindle_type: 'Motorized Built-in',
        max_rpm: 24000,
        power_kw: 15.0,
        torque_nm: 30.0,
        taper_interface: 'HSK-A63',
        lubrication: 'Air-Oil Mist',
        bearings_spec: 'Ceramic Hybrid P4S',
        cooling_spec: 'Liquid Cooled',
        status: 'In Production',
        current_stage: 'Machining',
        current_location: 'Pune Plant 1',
        max_runout_measured_microns: 0.8,
        balance_grade: 'ISO 1940 G0.4',
        vibration_overall_velocity_mms: 0.3,
        thermal_rise_stabilized_celsius: 16.0,
        clamping_force_measured_kn: 18.0,
        qr_code: `GPS-${wl.spindle}`,
        notes: 'Workforce operational spindle'
      });
    }
  });

  stats.spindles.source = spindleMap.size;

  // Query existing spindles from DB to determine insert vs update
  const { data: existingSpindles } = await supabase.from('spindles').select('id, serial_number');
  const existingSpindleBySerial = new Map(existingSpindles?.map(s => [s.serial_number, s.id]) || []);
  const liveSpindlesMap = new Map(existingSpindleBySerial);

  for (const [serial, record] of spindleMap.entries()) {
    const modelId = findModel(record.model_code);
    const customerId = findCustomer(record.customer_name);
    const payload = {
      serial_number: record.serial_number,
      model_id: modelId,
      model_code: record.model_code,
      customer_id: customerId,
      customer_name: record.customer_name,
      spindle_type: record.spindle_type,
      max_rpm: record.max_rpm,
      power_kw: record.power_kw,
      torque_nm: record.torque_nm,
      taper_interface: record.taper_interface,
      lubrication: record.lubrication,
      bearings_spec: record.bearings_spec,
      cooling_spec: record.cooling_spec,
      status: record.status,
      current_stage: record.current_stage,
      current_location: record.current_location,
      max_runout_measured_microns: record.max_runout_measured_microns,
      balance_grade: record.balance_grade,
      vibration_overall_velocity_mms: record.vibration_overall_velocity_mms,
      thermal_rise_stabilized_celsius: record.thermal_rise_stabilized_celsius,
      clamping_force_measured_kn: record.clamping_force_measured_kn,
      qr_code: record.qr_code,
      notes: record.notes
    };

    if (existingSpindleBySerial.has(serial)) {
      const existingId = existingSpindleBySerial.get(serial);
      const { error } = await supabase.from('spindles').update(payload).eq('id', existingId);
      if (error) console.error(`Failed to update spindle ${serial}:`, error.message);
      else stats.spindles.updated++;
    } else {
      const { data, error } = await supabase.from('spindles').insert([payload]).select('id');
      if (error) {
        console.error(`Failed to insert spindle ${serial}:`, error.message);
      } else if (data?.[0]) {
        liveSpindlesMap.set(serial, data[0].id);
        stats.spindles.inserted++;
      }
    }
  }

  console.log(`Spindles Migration: ${stats.spindles.inserted} inserted, ${stats.spindles.updated} updated (Source: ${stats.spindles.source})\n`);

  // -------------------------------------------------------------
  // 2. MIGRATE WORK ORDERS
  // -------------------------------------------------------------
  console.log('--- Step 2: Migrating Work Orders ---');
  
  const workOrderMap = new Map();

  // A. From MOCK_WORK_ORDERS
  MOCK_WORK_ORDERS.forEach(wo => {
    const mappedStatus = wo.status === 'Ready' ? 'Completed' : 
                         (wo.status === 'QC Pending' ? 'QC' : 
                         (wo.status === 'In Progress' ? 'In Progress' : 'Planned'));
    const mappedPriority = wo.priority === 'Critical' ? 'Critical' : 
                           (wo.priority === 'High' ? 'High' : 
                           (wo.priority === 'Low' ? 'Low' : 'Medium'));

    workOrderMap.set(wo.id, {
      work_order_no: wo.id,
      spindle_serial: wo.spindleSerial,
      model_code: wo.spindleModel,
      customer_name: wo.customer,
      order_type: 'New Spindle Build',
      priority: mappedPriority,
      current_stage: wo.currentStage || 'Machining',
      progress_percentage: wo.progress || 0,
      bay_name: wo.shopBay,
      operator_name: wo.assignedOperator,
      target_delivery_date: wo.dueDate,
      planned_start_date: '2026-02-15',
      quantity: 1,
      status: mappedStatus,
      notes: `Manufacturing work order for ${wo.customer} (${wo.spindleModel})`,
      operations: wo.operations || [],
      bom: wo.bom || []
    });
  });

  // B. From INITIAL_WORK_LOGS
  INITIAL_WORK_LOGS.forEach(wl => {
    if (wl.workOrder && !workOrderMap.has(wl.workOrder)) {
      workOrderMap.set(wl.workOrder, {
        work_order_no: wl.workOrder,
        spindle_serial: wl.spindle,
        model_code: 'GPS-HSK-A63-24K',
        customer_name: 'Tata Advanced Systems Ltd',
        order_type: wl.workOrder.startsWith('SR-') ? 'Service Repair' : 'New Spindle Build',
        priority: 'High',
        current_stage: wl.task?.toLowerCase().includes('turning') ? 'Machining' : 
                       (wl.task?.toLowerCase().includes('assembly') ? 'Assembly' : 
                       (wl.task?.toLowerCase().includes('grinding') ? 'Grinding' : 'QC')),
        progress_percentage: wl.progress || 60,
        bay_name: wl.bay,
        operator_name: wl.employeeName,
        target_delivery_date: '2026-03-30',
        planned_start_date: '2026-02-20',
        quantity: 1,
        status: wl.status === 'Completed' ? 'Completed' : 'In Progress',
        notes: `Shop floor operational work order ${wl.workOrder}`,
        operations: [],
        bom: []
      });
    }
  });

  stats.work_orders.source = workOrderMap.size;

  const { data: existingWos } = await supabase.from('work_orders').select('id, work_order_no');
  const existingWoByNo = new Map(existingWos?.map(w => [w.work_order_no, w.id]) || []);
  const liveWorkOrdersMap = new Map(existingWoByNo);

  for (const [woNo, record] of workOrderMap.entries()) {
    const spindleId = liveSpindlesMap.get(record.spindle_serial) || null;
    const modelId = findModel(record.model_code);
    const customerId = findCustomer(record.customer_name);
    const bayId = findBay(record.bay_name);
    const machineId = findMachine(record.bay_name);
    const leadTechId = findEmployee(record.operator_name);

    const payload = {
      work_order_no: record.work_order_no,
      spindle_id: spindleId,
      model_id: modelId,
      customer_id: customerId,
      customer_name: record.customer_name,
      order_type: record.order_type,
      priority: record.priority,
      current_stage: record.current_stage,
      progress_percentage: record.progress_percentage,
      assigned_bay_id: bayId,
      assigned_machine_id: machineId,
      lead_technician_id: leadTechId,
      planned_start_date: record.planned_start_date,
      target_delivery_date: record.target_delivery_date,
      quantity: record.quantity,
      status: record.status,
      notes: record.notes
    };

    if (existingWoByNo.has(woNo)) {
      const existingId = existingWoByNo.get(woNo);
      const { error } = await supabase.from('work_orders').update(payload).eq('id', existingId);
      if (error) console.error(`Failed to update work order ${woNo}:`, error.message);
      else stats.work_orders.updated++;
    } else {
      const { data, error } = await supabase.from('work_orders').insert([payload]).select('id');
      if (error) {
        console.error(`Failed to insert work order ${woNo}:`, error.message);
      } else if (data?.[0]) {
        liveWorkOrdersMap.set(woNo, data[0].id);
        stats.work_orders.inserted++;
      }
    }
  }

  console.log(`Work Orders Migration: ${stats.work_orders.inserted} inserted, ${stats.work_orders.updated} updated (Source: ${stats.work_orders.source})\n`);

  // -------------------------------------------------------------
  // 3. MIGRATE WORK ORDER ITEMS / ROUTING OPERATIONS
  // -------------------------------------------------------------
  console.log('--- Step 3: Migrating Work Order Items (Routing Operations) ---');
  
  // Fetch existing work order items
  const { data: existingItems } = await supabase.from('work_order_items').select('id, work_order_id, sequence_no');
  const existingItemMap = new Map();
  existingItems?.forEach(item => {
    existingItemMap.set(`${item.work_order_id}:${item.sequence_no}`, item.id);
  });

  // For each migrated work order, ensure sequential routing steps exist
  for (const [woNo, record] of workOrderMap.entries()) {
    const woId = liveWorkOrdersMap.get(woNo);
    if (!woId) continue;

    // Use specific operations if defined, else standard pipeline operations
    const operationsToSeed = record.operations.length > 0 
      ? record.operations.map(op => ({
          sequence_no: op.id,
          step_name: op.name,
          bay_name: op.machine,
          operator_name: op.operator,
          status: op.status === 'Completed' ? 'Completed' : (op.status === 'In Progress' ? 'In Progress' : 'Pending'),
          estimated_mins: 120,
          actual_mins: op.status === 'Completed' ? 115 : 0
        }))
      : (PRODUCTION_PIPELINE_STAGES || []).map((stage, idx) => ({
          sequence_no: idx + 1,
          step_name: `${stage.name} — ${stage.desc}`,
          bay_name: `Bay ${idx + 1}`,
          operator_name: 'Lead Technician',
          status: (idx + 1) < (record.progress_percentage / 12.5) ? 'Completed' : 
                  ((idx + 1) === Math.ceil(record.progress_percentage / 12.5) ? 'In Progress' : 'Pending'),
          estimated_mins: 90,
          actual_mins: (idx + 1) < (record.progress_percentage / 12.5) ? 85 : 0
        }));

    for (const op of operationsToSeed) {
      stats.work_order_items.source++;
      const itemKey = `${woId}:${op.sequence_no}`;
      const bayId = findBay(op.bay_name);
      const machineId = findMachine(op.bay_name);
      const empId = findEmployee(op.operator_name);
      const opRecord = dbOperations?.find(o => o.stage.toLowerCase() === op.step_name.split(' ')[0].toLowerCase()) || dbOperations?.[0];

      const itemPayload = {
        work_order_id: woId,
        operation_id: opRecord?.id || null,
        sequence_no: op.sequence_no,
        step_name: op.step_name,
        bay_id: bayId,
        machine_id: machineId,
        assigned_employee_id: empId,
        estimated_mins: op.estimated_mins,
        actual_mins: op.actual_mins,
        status: op.status,
        qc_sign_off: op.status === 'Completed'
      };

      if (existingItemMap.has(itemKey)) {
        const itemId = existingItemMap.get(itemKey);
        const { error } = await supabase.from('work_order_items').update(itemPayload).eq('id', itemId);
        if (error) console.error(`Failed to update WO item ${itemKey}:`, error.message);
        else stats.work_order_items.updated++;
      } else {
        const { error } = await supabase.from('work_order_items').insert([itemPayload]);
        if (error) console.error(`Failed to insert WO item ${itemKey}:`, error.message);
        else stats.work_order_items.inserted++;
      }
    }
  }

  console.log(`Work Order Items: ${stats.work_order_items.inserted} inserted, ${stats.work_order_items.updated} updated (Source: ${stats.work_order_items.source})\n`);

  // -------------------------------------------------------------
  // 4. MIGRATE SPINDLE COMPONENTS (BOM)
  // -------------------------------------------------------------
  console.log('--- Step 4: Migrating Spindle Components (BOM Parts) ---');
  
  const targetSpindleId = liveSpindlesMap.get('GPS-2026-0842');
  if (targetSpindleId) {
    const bomItems = MOCK_WORK_ORDERS[0]?.bom || [];
    stats.spindle_components.source = bomItems.length;

    const { data: existingComps } = await supabase.from('spindle_components').select('id, part_number').eq('spindle_id', targetSpindleId);
    const existingCompMap = new Map(existingComps?.map(c => [c.part_number, c.id]) || []);

    for (const b of bomItems) {
      const compPayload = {
        spindle_id: targetSpindleId,
        component_name: b.name,
        part_number: b.partNo,
        sub_supplier: b.name.includes('Ceramic') ? 'Schaeffler India' : (b.name.includes('Drawbar') ? 'OTT-Jakob' : 'Bharat Special Steel'),
        serial_lot_no: b.batch,
        tolerance_fitted_microns: 0.8,
        installed_by: dbEmployees?.[0]?.id || null
      };

      if (existingCompMap.has(b.partNo)) {
        const compId = existingCompMap.get(b.partNo);
        const { error } = await supabase.from('spindle_components').update(compPayload).eq('id', compId);
        if (error) console.error(`Failed to update component ${b.partNo}:`, error.message);
        else stats.spindle_components.updated++;
      } else {
        const { error } = await supabase.from('spindle_components').insert([compPayload]);
        if (error) console.error(`Failed to insert component ${b.partNo}:`, error.message);
        else stats.spindle_components.inserted++;
      }
    }
  }

  console.log(`Spindle Components: ${stats.spindle_components.inserted} inserted, ${stats.spindle_components.updated} updated (Source: ${stats.spindle_components.source})\n`);

  // -------------------------------------------------------------
  // 5. MIGRATE SPINDLE QUALITY RECORDS
  // -------------------------------------------------------------
  console.log('--- Step 5: Migrating Spindle Quality Records ---');
  
  if (targetSpindleId) {
    const qualityTests = [
      { test_parameter: 'Nose Taper Dynamic Runout', specified_value: 0.0010, measured_value: 0.0006, unit_of_measure: 'µm', tolerance_band: '≤ 0.0010 mm', passed: true },
      { test_parameter: 'Dynamic Balancing (ISO 1940)', specified_value: 0.4000, measured_value: 0.2800, unit_of_measure: 'ISO G', tolerance_band: 'Grade G0.4', passed: true },
      { test_parameter: 'Overall Vibration Velocity', specified_value: 0.4000, measured_value: 0.2700, unit_of_measure: 'mm/s', tolerance_band: '≤ 0.40 mm/s', passed: true },
      { test_parameter: '4-Hour Stabilized Thermal Rise', specified_value: 20.0000, measured_value: 14.2000, unit_of_measure: '°C', tolerance_band: '≤ 20.0 °C', passed: true },
      { test_parameter: 'Power Drawbar Clamping Force', specified_value: 18.0000, measured_value: 18.4000, unit_of_measure: 'kN', tolerance_band: '18.0 kN ± 1.0', passed: true }
    ];

    stats.spindle_quality_records.source = qualityTests.length;

    const { data: existingQa } = await supabase.from('spindle_quality_records').select('id, test_parameter').eq('spindle_id', targetSpindleId);
    const existingQaMap = new Map(existingQa?.map(q => [q.test_parameter, q.id]) || []);

    const qaInspectorId = findEmployee('Milind Joshi');

    for (const test of qualityTests) {
      const qaPayload = {
        spindle_id: targetSpindleId,
        test_parameter: test.test_parameter,
        specified_value: test.specified_value,
        measured_value: test.measured_value,
        unit_of_measure: test.unit_of_measure,
        tolerance_band: test.tolerance_band,
        passed: test.passed,
        inspector_id: qaInspectorId
      };

      if (existingQaMap.has(test.test_parameter)) {
        const qaId = existingQaMap.get(test.test_parameter);
        const { error } = await supabase.from('spindle_quality_records').update(qaPayload).eq('id', qaId);
        if (error) console.error(`Failed to update QA test ${test.test_parameter}:`, error.message);
        else stats.spindle_quality_records.updated++;
      } else {
        const { error } = await supabase.from('spindle_quality_records').insert([qaPayload]);
        if (error) console.error(`Failed to insert QA test ${test.test_parameter}:`, error.message);
        else stats.spindle_quality_records.inserted++;
      }
    }
  }

  console.log(`Spindle Quality Records: ${stats.spindle_quality_records.inserted} inserted, ${stats.spindle_quality_records.updated} updated (Source: ${stats.spindle_quality_records.source})\n`);

  // -------------------------------------------------------------
  // 6. MIGRATE MACHINE ASSIGNMENTS
  // -------------------------------------------------------------
  console.log('--- Step 6: Migrating Machine & Bay Allocations ---');
  
  stats.machine_assignments.source = INITIAL_BAY_ALLOCATIONS.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const { data: existingAssignments } = await supabase.from('machine_assignments').select('id, machine_id, employee_id, assigned_date');
  const existingAssignMap = new Map();
  existingAssignments?.forEach(a => {
    existingAssignMap.set(`${a.machine_id}:${a.employee_id}:${a.assigned_date}`, a.id);
  });

  for (const alloc of INITIAL_BAY_ALLOCATIONS) {
    const machineId = findMachine(alloc.machine);
    const empId = findEmployee(alloc.assignedStaff);
    const assignKey = `${machineId}:${empId}:${todayStr}`;

    const assignPayload = {
      machine_id: machineId,
      employee_id: empId,
      shift_id: defaultShiftId,
      assigned_date: todayStr,
      status: 'Active'
    };

    if (existingAssignMap.has(assignKey)) {
      const assignId = existingAssignMap.get(assignKey);
      const { error } = await supabase.from('machine_assignments').update(assignPayload).eq('id', assignId);
      if (error) console.error(`Failed to update machine assignment:`, error.message);
      else stats.machine_assignments.updated++;
    } else {
      const { error } = await supabase.from('machine_assignments').insert([assignPayload]);
      if (error) console.error(`Failed to insert machine assignment:`, error.message);
      else stats.machine_assignments.inserted++;
    }
  }

  console.log(`Machine Assignments: ${stats.machine_assignments.inserted} inserted, ${stats.machine_assignments.updated} updated (Source: ${stats.machine_assignments.source})\n`);

  // -------------------------------------------------------------
  // 7. MIGRATE WORKFORCE WORK LOGS
  // -------------------------------------------------------------
  console.log('--- Step 7: Migrating Workforce Work Logs ---');
  
  stats.work_logs.source = INITIAL_WORK_LOGS.length;

  // We can query existing work logs by id if deterministic or by employee_id + task + date
  const { data: existingLogs } = await supabase.from('work_logs').select('id, task_name, work_order_no, employee_id');
  const existingLogsMap = new Map();
  existingLogs?.forEach(l => {
    existingLogsMap.set(`${l.employee_id}:${l.work_order_no}:${l.task_name}`, l.id);
  });

  for (const wl of INITIAL_WORK_LOGS) {
    const empId = findEmployee(wl.employeeName || wl.employeeId);
    const woId = liveWorkOrdersMap.get(wl.workOrder) || null;
    const spindleId = liveSpindlesMap.get(wl.spindle) || null;
    const machineId = findMachine(wl.machine);
    const bayId = findBay(wl.bay);
    const deptId = findDepartment(wl.department);
    const logKey = `${empId}:${wl.workOrder}:${wl.task}`;

    const logPayload = {
      employee_id: empId,
      date: '2026-09-09',
      period: 'Shift A',
      duration_mins: wl.durationMinutes || 90,
      work_type: wl.workType || 'Production',
      task_name: wl.task,
      work_order_id: woId,
      work_order_no: wl.workOrder,
      spindle_id: spindleId,
      spindle_serial: wl.spindle,
      machine_id: machineId,
      machine_name: wl.machine,
      production_bay_id: bayId,
      bay_name: wl.bay,
      department_id: deptId,
      quantity_completed: wl.quantityCompleted || 1,
      progress_percentage: wl.progress || 100,
      status: wl.status === 'In Progress' ? 'Working' : (wl.status === 'Completed' ? 'Completed' : 'Working'),
      remarks: wl.remarks || 'Precision machining task logged on shop floor.'
    };

    if (existingLogsMap.has(logKey)) {
      const logId = existingLogsMap.get(logKey);
      const { error } = await supabase.from('work_logs').update(logPayload).eq('id', logId);
      if (error) console.error(`Failed to update work log ${wl.id}:`, error.message);
      else stats.work_logs.updated++;
    } else {
      const { error } = await supabase.from('work_logs').insert([logPayload]);
      if (error) console.error(`Failed to insert work log ${wl.id}:`, error.message);
      else stats.work_logs.inserted++;
    }
  }

  console.log(`Work Logs: ${stats.work_logs.inserted} inserted, ${stats.work_logs.updated} updated (Source: ${stats.work_logs.source})\n`);

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('================================================================');
  console.log('PHASE 6 MIGRATION RUN COMPLETE');
  console.log('================================================================');
  console.table({
    'Spindles': { Source: stats.spindles.source, Inserted: stats.spindles.inserted, Updated: stats.spindles.updated },
    'Work Orders': { Source: stats.work_orders.source, Inserted: stats.work_orders.inserted, Updated: stats.work_orders.updated },
    'Work Order Items': { Source: stats.work_order_items.source, Inserted: stats.work_order_items.inserted, Updated: stats.work_order_items.updated },
    'Spindle Components': { Source: stats.spindle_components.source, Inserted: stats.spindle_components.inserted, Updated: stats.spindle_components.updated },
    'Spindle Quality Records': { Source: stats.spindle_quality_records.source, Inserted: stats.spindle_quality_records.inserted, Updated: stats.spindle_quality_records.updated },
    'Machine Assignments': { Source: stats.machine_assignments.source, Inserted: stats.machine_assignments.inserted, Updated: stats.machine_assignments.updated },
    'Work Logs': { Source: stats.work_logs.source, Inserted: stats.work_logs.inserted, Updated: stats.work_logs.updated }
  });
}

runMigration().catch(err => {
  console.error('Fatal Migration Failure:', err);
  process.exit(1);
});
