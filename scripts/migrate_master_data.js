/**
 * GPS SPINDLE ERP — PHASE 5 MASTER DATA MIGRATION
 * 
 * Migrates existing frontend mock/static master data into Supabase PostgreSQL.
 * Server-side execution only with service-role administrative privileges.
 * 
 * Strict Idempotency: Uses natural business keys and deterministic upsert
 * to guarantee that multiple executions produce zero duplicate records.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Import frontend mock datasets
import { 
  PLANT_INFO, 
  CUSTOMERS as MOCK_CUSTOMERS, 
  SUPPLIERS as MOCK_SUPPLIERS,
  INVENTORY_ITEMS as MOCK_INVENTORY,
  SPINDLES as MOCK_SPINDLES,
  SHOP_BAYS as MOCK_BAYS
} from '../src/data/mockData.js';

import { MASTER_CONTACTS } from '../src/data/contactsData.js';
import { INITIAL_WORKFORCE_STAFF } from '../src/data/workforceData.js';

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
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required in .env.migration for master data migration.');
  process.exit(1);
}

const envFile = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const anonKey = (envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/) || [])[1]?.trim() || '';

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const adminAuthClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — PHASE 5 MASTER DATA MIGRATION');
console.log('='.repeat(80));
console.log(`Connected to Supabase Project: ${url}\n`);

async function runMigration() {
  const summary = {};

  // Authenticate admin session for operations requiring is_admin() privilege check
  console.log('Authenticating administrative session for workforce updates...');
  const { error: adminLoginErr } = await adminAuthClient.auth.signInWithPassword({
    email: 'rahul.patil@gpspindles.com',
    password: 'Password123!'
  });
  if (adminLoginErr) throw new Error(`Admin authentication failed: ${adminLoginErr.message}`);
  console.log('  Administrative session active (Role: ADMIN).\n');

  // --------------------------------------------------------------------------
  // 1. COMPANIES MASTER
  // --------------------------------------------------------------------------
  console.log('[1/18] Migrating Companies...');
  const companyPayload = {
    id: 'c0000000-0000-0000-0000-000000000001',
    code: 'GPS-CORP',
    name: PLANT_INFO.name || 'General Precision Spindles',
    legal_name: 'General Precision Spindles Private Limited',
    gstin: '27AABCG1492K1Z8',
    email: 'info@gpspindles.com',
    phone: '+91 20 6791 4200',
    website: 'https://gpspindles.com',
    address: PLANT_INFO.address || 'Plot B-12, Nanded City Industrial Complex, Sinhagad Road',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    postal_code: '411041',
    currency: 'INR',
    is_active: true
  };

  const { data: compData, error: compErr } = await supabase
    .from('companies')
    .upsert(companyPayload, { onConflict: 'id' })
    .select()
    .single();

  if (compErr) throw new Error(`Companies migration failed: ${compErr.message}`);
  const companyId = compData.id;
  summary.companies = 1;
  console.log(`  Companies migrated: 1 (ID: ${companyId})`);

  // --------------------------------------------------------------------------
  // 2. BRANCHES MASTER
  // --------------------------------------------------------------------------
  console.log('\n[2/18] Migrating Branches...');
  const branchPayload = {
    id: 'b0000000-0000-0000-0000-000000000001',
    company_id: companyId,
    code: 'PLANT-1',
    name: 'Nanded City Plant 1 (HQ)',
    branch_type: 'Manufacturing Plant',
    gstin: '27AABCG1492K1Z8',
    address: 'Plot B-12, Nanded City Industrial Complex, Pune - 411041',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    postal_code: '411041',
    phone: '+91 20 6791 4200',
    email: 'plant1@gpspindles.com',
    is_active: true
  };

  const { data: branchData, error: branchErr } = await supabase
    .from('branches')
    .upsert(branchPayload, { onConflict: 'id' })
    .select()
    .single();

  if (branchErr) throw new Error(`Branches migration failed: ${branchErr.message}`);
  const branchId = branchData.id;
  summary.branches = 1;
  console.log(`  Branches migrated: 1 (ID: ${branchId})`);

  // --------------------------------------------------------------------------
  // 3. DEPARTMENTS MASTER
  // --------------------------------------------------------------------------
  console.log('\n[3/18] Migrating Departments...');
  const departmentsData = [
    { code: 'DEPT-PROD', name: 'Production Machining', description: 'CNC Milling, Turning, and Spindle Core Machining' },
    { code: 'DEPT-ASSY', name: 'Cleanroom Assembly', description: 'ISO Class 6 Cleanroom Spindle Bearing & Stator Fitting' },
    { code: 'DEPT-QA', name: 'Metrology & QA', description: 'Sub-Micron Runout Verification & Vibration Analysis' },
    { code: 'DEPT-SRV', name: 'Service & Rebuild', description: 'Spindle Diagnostics, Repair & Re-balancing' },
    { code: 'DEPT-COMM', name: 'Sales & Commercial', description: 'Quotations, Client Contracts & Order Fulfillment' },
    { code: 'DEPT-SCM', name: 'Procurement & Stores', description: 'Raw Material Inward & Bearing Stock Management' }
  ];

  const deptMap = {};
  for (const d of departmentsData) {
    const { data: dept, error: deptErr } = await supabase
      .from('departments')
      .upsert({
        branch_id: branchId,
        code: d.code,
        name: d.name,
        description: d.description,
        is_active: true
      }, { onConflict: 'code' })
      .select()
      .single();

    if (deptErr) throw new Error(`Department ${d.code} failed: ${deptErr.message}`);
    deptMap[d.code] = dept.id;
    deptMap[d.name] = dept.id;
  }
  summary.departments = departmentsData.length;
  console.log(`  Departments migrated: ${departmentsData.length}`);

  // --------------------------------------------------------------------------
  // 4. LOCATIONS MASTER (6 Canonical Shop Locations)
  // --------------------------------------------------------------------------
  console.log('\n[4/18] Migrating Physical Plant Locations...');
  const locationsData = [
    { code: 'LOC-BAY1', name: 'Bay 1 Machining Floor', location_type: 'Shop Floor Bay', description: 'CNC Lathe and Boring Station' },
    { code: 'LOC-BAY2', name: 'Bay 2 Grinding Cell', location_type: 'Shop Floor Bay', description: 'Studer S33 Precision Grinding' },
    { code: 'LOC-BAY3', name: 'Bay 3 Cleanroom ISO-6', location_type: 'Cleanroom', description: 'Bearing pack assembly station' },
    { code: 'LOC-BAY4', name: 'Bay 4 Dynamic Balancing', location_type: 'Shop Floor Bay', description: 'Schenck SmartBalancing Rig' },
    { code: 'LOC-BAY5', name: 'Bay 5 Dynamic Run-in Test', location_type: 'Test Cell', description: 'Motorized spindle burn-in test bench' },
    { code: 'LOC-BAY6', name: 'Bay 6 Metrology Lab', location_type: 'Inspection Metrology Lab', description: 'Zeiss CMM and Air Gauging metrology' }
  ];

  for (const loc of locationsData) {
    const { error: locErr } = await supabase
      .from('locations')
      .upsert({
        branch_id: branchId,
        code: loc.code,
        name: loc.name,
        location_type: loc.location_type,
        description: loc.description,
        is_active: true
      }, { onConflict: 'code' });

    if (locErr) throw new Error(`Location ${loc.code} failed: ${locErr.message}`);
  }
  // Remove temporary hyphenated codes if present
  await supabase.from('locations').delete().in('code', ['LOC-BAY-1', 'LOC-BAY-2', 'LOC-BAY-3', 'LOC-BAY-4', 'LOC-BAY-5', 'LOC-BAY-6']);
  summary.locations = locationsData.length;
  console.log(`  Locations migrated: ${locationsData.length}`);

  // --------------------------------------------------------------------------
  // 5. ROLES REFERENCE
  // --------------------------------------------------------------------------
  console.log('\n[5/18] Verifying Roles Reference...');
  const { data: rolesList, error: rolesErr } = await supabase.from('roles').select('id, code');
  if (rolesErr) throw new Error(`Failed to load roles: ${rolesErr.message}`);
  const roleMap = {};
  rolesList.forEach(r => { roleMap[r.code] = r.id; });
  summary.roles = rolesList.length;
  console.log(`  Roles verified: ${rolesList.length}`);

  // --------------------------------------------------------------------------
  // 6. SHIFTS REFERENCE
  // --------------------------------------------------------------------------
  console.log('\n[6/18] Migrating Shifts Reference...');
  const shiftsData = [
    { shift_code: 'SHIFT-A', name: 'First Shift (Morning)', start_time: '06:00:00', end_time: '14:30:00', grace_period_mins: 15 },
    { shift_code: 'SHIFT-B', name: 'Second Shift (Evening)', start_time: '14:30:00', end_time: '23:00:00', grace_period_mins: 15 },
    { shift_code: 'SHIFT-C', name: 'Night Shift', start_time: '23:00:00', end_time: '06:00:00', grace_period_mins: 15 }
  ];

  const shiftMap = {};
  for (const sh of shiftsData) {
    const { data: shiftRec, error: shErr } = await supabase
      .from('shifts')
      .upsert({
        branch_id: branchId,
        shift_code: sh.shift_code,
        name: sh.name,
        start_time: sh.start_time,
        end_time: sh.end_time,
        grace_period_mins: sh.grace_period_mins,
        is_active: true
      }, { onConflict: 'shift_code' })
      .select()
      .single();

    if (shErr) throw new Error(`Shift ${sh.shift_code} failed: ${shErr.message}`);
    shiftMap[sh.shift_code] = shiftRec.id;
    shiftMap[sh.name] = shiftRec.id;
  }
  summary.shifts = shiftsData.length;
  console.log(`  Shifts migrated: ${shiftsData.length}`);

  // --------------------------------------------------------------------------
  // 7. EMPLOYEES MASTER (15 Staff Records)
  // --------------------------------------------------------------------------
  console.log('\n[7/18] Migrating Employees Master (Workforce Staff)...');
  const employeeMap = {};

  // Fetch existing employees to preserve existing auth/dev identities and ensure uniqueness
  const { data: existingEmps, error: existingEmpsErr } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, email');
  if (existingEmpsErr) throw new Error(`Failed to load existing employees: ${existingEmpsErr.message}`);

  const existingCodeMap = new Map();
  const takenEmails = new Set();
  (existingEmps || []).forEach(e => {
    existingCodeMap.set(e.employee_code, e);
    takenEmails.add(e.email.toLowerCase());
  });

  for (const staff of INITIAL_WORKFORCE_STAFF) {
    const existing = existingCodeMap.get(staff.id);
    let firstName, lastName, email;

    if (existing) {
      // Preserve existing authenticated identity
      firstName = existing.first_name;
      lastName = existing.last_name;
      email = existing.email;
    } else {
      const nameParts = staff.name.split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ') || '';
      const lastNameClean = lastName.toLowerCase().replace(/[^a-z]/g, '') || 'staff';
      const baseEmail = `${firstName.toLowerCase()}.${lastNameClean}@gpspindles.com`;
      
      if (takenEmails.has(baseEmail.toLowerCase())) {
        const empNum = staff.id.replace(/[^0-9]/g, '') || '0';
        email = `${firstName.toLowerCase()}.${lastNameClean}.${empNum}@gpspindles.com`;
      } else {
        email = baseEmail;
      }
      takenEmails.add(email.toLowerCase());
    }

    // Map department
    let targetDeptId = deptMap['DEPT-PROD'];
    if (staff.department.toLowerCase().includes('assembly')) targetDeptId = deptMap['DEPT-ASSY'];
    else if (staff.department.toLowerCase().includes('quality') || staff.department.toLowerCase().includes('testing')) targetDeptId = deptMap['DEPT-QA'];
    else if (staff.department.toLowerCase().includes('service')) targetDeptId = deptMap['DEPT-SRV'];
    else if (staff.department.toLowerCase().includes('commercial') || staff.department.toLowerCase().includes('sales')) targetDeptId = deptMap['DEPT-COMM'];
    else if (staff.department.toLowerCase().includes('procurement') || staff.department.toLowerCase().includes('stores')) targetDeptId = deptMap['DEPT-SCM'];

    // Map role
    let targetRoleId = roleMap['OPERATOR'];
    if (staff.role.toLowerCase().includes('admin') || staff.designation.toLowerCase().includes('admin')) targetRoleId = roleMap['ADMIN'];
    else if (staff.role.toLowerCase().includes('lead') || staff.designation.toLowerCase().includes('manager')) {
      if (staff.department.toLowerCase().includes('quality')) targetRoleId = roleMap['QA_MGR'];
      else if (staff.department.toLowerCase().includes('service')) targetRoleId = roleMap['SERVICE'];
      else targetRoleId = roleMap['PROD_MGR'];
    }

    // Map shift
    let targetShiftId = shiftMap['SHIFT-A'];
    if (staff.shift && staff.shift.toLowerCase().includes('second')) targetShiftId = shiftMap['SHIFT-B'];

    const employeePayload = {
      employee_code: staff.id, // e.g. 'GPS-EMP-104'
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: '+91 98220 14900',
      department_id: targetDeptId,
      designation: staff.designation || staff.role || 'Precision Technician',
      role_id: targetRoleId,
      current_shift_id: targetShiftId,
      current_status: staff.status === 'Working' ? 'Working' : (staff.status === 'Break' ? 'Break' : 'Available'),
      avatar_color: staff.avatarColor || '#7A1F3D',
      skills: staff.skills || (staff.qualifications ? staff.qualifications.slice(0, 3) : ['Precision Machining']),
      qualifications: staff.qualifications || ['ISO 9001 Quality Standard Certification'],
      is_active: true
    };

    const { data: empRec, error: empErr } = await adminAuthClient
      .from('employees')
      .upsert(employeePayload, { onConflict: 'employee_code' })
      .select()
      .single();

    if (empErr) throw new Error(`Employee ${staff.id} (${staff.name}) failed: ${empErr.message}`);
    employeeMap[staff.id] = empRec.id;

    // ------------------------------------------------------------------------
    // 8. EMPLOYEE_ROLES JUNCTION
    // ------------------------------------------------------------------------
    await adminAuthClient
      .from('employee_roles')
      .upsert({
        employee_id: empRec.id,
        role_id: targetRoleId,
        is_primary: true
      }, { onConflict: 'employee_id,role_id' });
  }
  summary.employees = INITIAL_WORKFORCE_STAFF.length;
  console.log(`  Employees migrated: ${INITIAL_WORKFORCE_STAFF.length}`);

  // --------------------------------------------------------------------------
  // 9. CUSTOMERS MASTER (10 Accounts from Mock & Contacts)
  // --------------------------------------------------------------------------
  console.log('\n[8/18] Migrating Customers Master...');
  const customerMap = {};

  const allCustomerEntries = [...MOCK_CUSTOMERS];
  MASTER_CONTACTS.filter(c => c.category === 'Customer').forEach(mc => {
    if (!allCustomerEntries.some(c => c.id === mc.companyId)) {
      allCustomerEntries.push({
        id: mc.companyId,
        name: mc.companyName,
        gstin: mc.gstin,
        location: mc.location,
        contactName: mc.primaryContact?.name,
        contactEmail: mc.primaryContact?.email,
        contactPhone: mc.primaryContact?.phone,
        industry: mc.tier ? (mc.tier.split('-')[1]?.trim() || 'Precision Engineering') : 'Industrial Manufacturing',
        creditTerms: 'Net 30 Days',
        rating: 'Tier 1 Enterprise'
      });
    }
  });

  for (const c of allCustomerEntries) {
    const customerPayload = {
      customer_code: c.id, // e.g. 'CUST-01'
      company_name: c.name,
      gstin: c.gstin,
      billing_address: `${c.location}, India`,
      shipping_address: `${c.location}, India`,
      city: c.location.split(',')[0].trim(),
      state: 'Maharashtra',
      country: 'India',
      primary_contact_name: c.contactName,
      primary_email: c.contactEmail,
      primary_phone: c.contactPhone,
      industry_segment: c.industry,
      payment_terms: c.creditTerms || 'Net 30 Days',
      rating: c.rating && c.rating.includes('Tier 1') ? 5.0 : 4.5,
      is_active: true
    };

    const { data: custRec, error: custErr } = await supabase
      .from('customers')
      .upsert(customerPayload, { onConflict: 'customer_code' })
      .select()
      .single();

    if (custErr) throw new Error(`Customer ${c.id} (${c.name}) failed: ${custErr.message}`);
    customerMap[c.id] = custRec.id;
    customerMap[c.name] = custRec.id;
  }
  summary.customers = allCustomerEntries.length;
  console.log(`  Customers migrated: ${allCustomerEntries.length}`);

  // --------------------------------------------------------------------------
  // 10. CUSTOMER CONTACTS (10+ Contacts from MASTER_CONTACTS)
  // --------------------------------------------------------------------------
  console.log('\n[9/18] Migrating Customer Contacts Directory...');
  let contactCount = 0;

  for (const entry of MASTER_CONTACTS) {
    if (entry.category === 'Customer') {
      const custId = customerMap[entry.companyId] || customerMap[entry.companyName];
      if (!custId) continue;

      // Helper to upsert contact deterministically
      const upsertContact = async (cData, isPrimary, isDefaultCc) => {
        const { data: existing } = await supabase
          .from('customer_contacts')
          .select('id')
          .eq('customer_id', custId)
          .eq('email', cData.email)
          .maybeSingle();

        const payload = {
          customer_id: custId,
          name: cData.name,
          email: cData.email,
          phone: cData.phone,
          designation: cData.designation,
          department: cData.department || 'Procurement',
          is_primary: isPrimary,
          is_default_cc: isDefaultCc
        };

        if (existing) {
          await supabase.from('customer_contacts').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('customer_contacts').insert(payload);
        }
        contactCount++;
      };

      // 1. Primary Contact
      if (entry.primaryContact) {
        await upsertContact(entry.primaryContact, true, false);
      }

      // 2. Secondary Contact
      if (entry.secondaryContact) {
        await upsertContact(entry.secondaryContact, false, true);
      }
    }
  }
  summary.customer_contacts = contactCount;
  console.log(`  Customer contacts migrated: ${contactCount}`);

  // --------------------------------------------------------------------------
  // 11. SUPPLIERS MASTER (4 Approved Vendors)
  // --------------------------------------------------------------------------
  console.log('\n[10/18] Migrating Approved Suppliers Master...');
  const supplierMap = {};

  for (const s of MOCK_SUPPLIERS) {
    const contactParts = (s.contact || '').split('(');
    const contactPerson = contactParts[0].trim();
    const phone = contactParts[1] ? contactParts[1].replace(')', '').trim() : '+91 20 6608 4000';
    const emailName = contactPerson.toLowerCase().replace(/[^a-z]/g, '') || 'orders';
    const email = `${emailName}@${s.name.toLowerCase().includes('schaeffler') ? 'schaeffler.com' : 'supplier.com'}`;

    let ratingNum = 4.9;
    const match = (s.rating || '').match(/([0-9.]+)%/);
    if (match) {
      ratingNum = Math.min(5.0, Math.round((parseFloat(match[1]) / 20) * 100) / 100);
    }

    const supplierPayload = {
      supplier_code: s.id, // e.g. 'SUPP-01'
      name: s.name,
      contact_person: contactPerson,
      email: email,
      phone: phone,
      address: s.location,
      city: s.location.split('/')[0].trim(),
      state: 'Maharashtra',
      country: s.location.includes('Germany') ? 'Germany' : 'India',
      payment_terms: 'Net 30 Days',
      rating: ratingNum,
      categories_supplied: [s.category],
      is_active: true
    };

    const { data: supRec, error: supErr } = await supabase
      .from('suppliers')
      .upsert(supplierPayload, { onConflict: 'supplier_code' })
      .select()
      .single();

    if (supErr) throw new Error(`Supplier ${s.id} (${s.name}) failed: ${supErr.message}`);
    supplierMap[s.id] = supRec.id;
    supplierMap[s.name] = supRec.id;
  }
  summary.suppliers = MOCK_SUPPLIERS.length;
  console.log(`  Suppliers migrated: ${MOCK_SUPPLIERS.length}`);

  // --------------------------------------------------------------------------
  // 12. PRODUCT CATEGORIES (6 Categories)
  // --------------------------------------------------------------------------
  console.log('\n[11/18] Migrating Product Categories...');
  const categoriesData = [
    { code: 'RAW_STEEL', name: 'Raw Alloy Steel', description: 'Forged 18CrNiMo7-6 and 42CrMo4 Round Bars' },
    { code: 'BEARINGS', name: 'Precision Bearings', description: 'Ceramic Hybrid and Angular Contact Spindle Bearing Packs' },
    { code: 'TOOL_CLAMP', name: 'Tool Clamping', description: 'HSK / BT Power Drawbar Collets and Grippers' },
    { code: 'ENCODERS', name: 'Electronics & Sensors', description: 'Rotary Encoders and Sub-Micron Hall Effect Sensors' },
    { code: 'MOTORS', name: 'Motor Components', description: 'High-Speed Synchronous Stators and Rotors' },
    { code: 'SEALS', name: 'Seals & Gaskets', description: 'High-Temp Viton Fluroelastomer Rotary O-Ring Kits' }
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const { data: catRec, error: catErr } = await supabase
      .from('product_categories')
      .upsert({
        code: cat.code,
        name: cat.name,
        description: cat.description
      }, { onConflict: 'code' })
      .select()
      .single();

    if (catErr) throw new Error(`Product category ${cat.code} failed: ${catErr.message}`);
    categoryMap[cat.code] = catRec.id;
    categoryMap[cat.name] = catRec.id;
  }
  summary.product_categories = categoriesData.length;
  console.log(`  Product categories migrated: ${categoriesData.length}`);

  // --------------------------------------------------------------------------
  // 13. INVENTORY PRODUCTS (8 Items from INVENTORY_ITEMS)
  // --------------------------------------------------------------------------
  console.log('\n[12/18] Migrating Inventory Products Master...');
  const productMap = {};

  const uomMap = {
    'Meters': 'METERS',
    'Pairs': 'SETS',
    'Sets': 'SETS',
    'Pcs': 'PCS',
    'Units': 'PCS',
    'Packs': 'BOXES'
  };

  for (const item of MOCK_INVENTORY) {
    const catId = categoryMap[item.category] || categoryMap['RAW_STEEL'];
    const uom = uomMap[item.unit] || 'PCS';
    const costNum = parseFloat((item.unitCost || '0').replace(/[^0-9.]/g, '')) || 5000;

    let prefSupId = null;
    if (item.supplier) {
      if (item.supplier.includes('Schaeffler')) prefSupId = supplierMap['SUPP-01'];
      else if (item.supplier.includes('Bharat Special')) prefSupId = supplierMap['SUPP-02'];
      else if (item.supplier.includes('OTT-Jakob')) prefSupId = supplierMap['SUPP-03'];
      else if (item.supplier.includes('Heidenhain')) prefSupId = supplierMap['SUPP-04'];
    }

    const productPayload = {
      part_number: item.sku,
      sku: item.sku,
      name: item.name,
      category_id: catId,
      description: `${item.name} (${item.category})`,
      hsn_sac_code: '84669390',
      unit_of_measure: uom,
      min_reorder_level: item.minStock || 10,
      safety_stock: Math.round((item.minStock || 10) * 0.5),
      unit_cost_inr: costNum,
      preferred_supplier_id: prefSupId,
      is_active: true
    };

    const { data: prodRec, error: prodErr } = await supabase
      .from('products')
      .upsert(productPayload, { onConflict: 'sku' })
      .select()
      .single();

    if (prodErr) throw new Error(`Product ${item.sku} failed: ${prodErr.message}`);
    productMap[item.sku] = prodRec.id;
  }
  summary.products = MOCK_INVENTORY.length;
  console.log(`  Inventory products migrated: ${MOCK_INVENTORY.length}`);

  // --------------------------------------------------------------------------
  // 14. WAREHOUSES MASTER
  // --------------------------------------------------------------------------
  console.log('\n[13/18] Migrating Warehouses...');
  const warehousesData = [
    { code: 'WH-MAIN', name: 'General Stores (Pune HQ)', warehouse_type: 'General Stores', address: 'Bay 1 Inward Receiving' },
    { code: 'WH-CLEAN', name: 'Cleanroom Kitting Store', warehouse_type: 'Cleanroom Kitting', address: 'Bay 3 Cleanroom Buffer' },
    { code: 'WH-YARD', name: 'Raw Material Heavy Yard', warehouse_type: 'Raw Material Yard', address: 'Rear Steel Storage Dock' }
  ];

  const warehouseMap = {};
  for (const wh of warehousesData) {
    const { data: whRec, error: whErr } = await supabase
      .from('warehouses')
      .upsert({
        branch_id: branchId,
        code: wh.code,
        name: wh.name,
        warehouse_type: wh.warehouse_type,
        address: wh.address,
        is_active: true
      }, { onConflict: 'code' })
      .select()
      .single();

    if (whErr) throw new Error(`Warehouse ${wh.code} failed: ${whErr.message}`);
    warehouseMap[wh.code] = whRec.id;
  }
  summary.warehouses = warehousesData.length;
  console.log(`  Warehouses migrated: ${warehousesData.length}`);

  // --------------------------------------------------------------------------
  // 15. INITIAL STOCK BALANCES (8 Stock Records)
  // --------------------------------------------------------------------------
  console.log('\n[14/18] Migrating Initial Stock Balances...');
  let stockCount = 0;

  for (const item of MOCK_INVENTORY) {
    const prodId = productMap[item.sku];
    let whId = warehouseMap['WH-MAIN'];
    if (item.category.includes('Bearings') || item.category.includes('Cleanroom')) whId = warehouseMap['WH-CLEAN'];
    else if (item.category.includes('Steel')) whId = warehouseMap['WH-YARD'];

    const bin = item.location.split('(')[0].trim() || 'RACK-01';
    const onHand = (item.availableQty || 0) + (item.reservedQty || 0);

    const { error: stockErr } = await supabase
      .from('stock')
      .upsert({
        product_id: prodId,
        warehouse_id: whId,
        bin_location: bin,
        quantity_on_hand: onHand,
        quantity_reserved: item.reservedQty || 0
      }, { onConflict: 'product_id,warehouse_id,bin_location' });

    if (!stockErr) stockCount++;
  }
  summary.stock = stockCount;
  console.log(`  Stock records migrated: ${stockCount}`);

  // --------------------------------------------------------------------------
  // 16. SPINDLE MODELS CATALOG (6 Models)
  // --------------------------------------------------------------------------
  console.log('\n[15/18] Migrating Spindle Models Catalog...');
  const spindleModelsData = [
    {
      model_code: 'GPS-HSK-A63-24K',
      model_name: 'GPS Motorized High-Speed Milling Spindle HSK-A63',
      spindle_type: 'Motorized Built-in',
      taper_standard: 'HSK-A63',
      max_rpm: 24000,
      rated_power_kw: 15.0,
      nominal_torque_nm: 35.0,
      bearing_type: 'Ceramic Hybrid Angular Contact',
      cooling_type: 'Deionized Water Glycol Chilled',
      lubrication_type: 'Air-Oil Micro Droplet',
      clamping_retention_force_kn: 18.0,
      runout_taper_microns: 0.8
    },
    {
      model_code: 'GPS-BT40-15K',
      model_name: 'GPS Heavy Duty Belt Driven Milling Spindle BT40',
      spindle_type: 'Belt Driven',
      taper_standard: 'BT40',
      max_rpm: 15000,
      rated_power_kw: 11.0,
      nominal_torque_nm: 70.0,
      bearing_type: 'Matched Angular Contact Steel',
      cooling_type: 'Jacket Chilled Coolant',
      lubrication_type: 'Precision High-Speed Grease',
      clamping_retention_force_kn: 11.0,
      runout_taper_microns: 1.0
    },
    {
      model_code: 'GPS-HF-60K',
      model_name: 'GPS Ultra High Frequency Direct Drive Spindle',
      spindle_type: 'High Frequency',
      taper_standard: 'HSK-E25',
      max_rpm: 60000,
      rated_power_kw: 5.5,
      nominal_torque_nm: 4.5,
      bearing_type: 'Hybrid Ceramic Super-Precision',
      cooling_type: 'Closed Loop Closed Chiller',
      lubrication_type: 'Air-Oil Micro Mist',
      clamping_retention_force_kn: 4.5,
      runout_taper_microns: 0.5
    },
    {
      model_code: 'GPS-BT50-10K',
      model_name: 'GPS Heavy Duty High Torque Geared Milling Spindle',
      spindle_type: 'Direct Drive',
      taper_standard: 'BT50',
      max_rpm: 10000,
      rated_power_kw: 22.0,
      nominal_torque_nm: 160.0,
      bearing_type: 'Heavy Quad Angular Contact Pack',
      cooling_type: 'Continuous External Chilled Fluid',
      lubrication_type: 'Continuous Micro Oil Droplet',
      clamping_retention_force_kn: 25.0,
      runout_taper_microns: 1.2
    },
    {
      model_code: 'GPS-GR-18K',
      model_name: 'GPS Sub-Micron Internal Grinding Spindle',
      spindle_type: 'Direct Drive',
      taper_standard: 'Straight Grinding Arbor',
      max_rpm: 18000,
      rated_power_kw: 7.5,
      nominal_torque_nm: 18.0,
      bearing_type: 'Tandem Ceramic Pair Front/Rear',
      cooling_type: 'External Forced Air Chiller',
      lubrication_type: 'Sealed Kluber High-Speed Grease',
      clamping_retention_force_kn: 8.0,
      runout_taper_microns: 0.4
    },
    {
      model_code: 'GPS-HSK-E25-42K',
      model_name: 'GPS High Speed Micro-Milling Spindle',
      spindle_type: 'Motorized Built-in',
      taper_standard: 'HSK-E25',
      max_rpm: 42000,
      rated_power_kw: 3.7,
      nominal_torque_nm: 3.2,
      bearing_type: 'Ceramic Micro Bearings',
      cooling_type: 'Water Glycol Chilled',
      lubrication_type: 'Air-Oil Micro Mist',
      clamping_retention_force_kn: 3.8,
      runout_taper_microns: 0.6
    }
  ];

  for (const sm of spindleModelsData) {
    const { error: smErr } = await supabase
      .from('spindle_models')
      .upsert(sm, { onConflict: 'model_code' });

    if (smErr) throw new Error(`Spindle model ${sm.model_code} failed: ${smErr.message}`);
  }
  summary.spindle_models = spindleModelsData.length;
  console.log(`  Spindle models migrated: ${spindleModelsData.length}`);

  // --------------------------------------------------------------------------
  // 17. PRODUCTION BAYS MASTER (6 Bays)
  // --------------------------------------------------------------------------
  console.log('\n[16/18] Migrating Production Bays Master...');
  const bayMap = {};

  const bayTypeMap = {
    'bay-1': 'Machining',
    'bay-2': 'Machining',
    'bay-3': 'Cleanroom Assembly',
    'bay-4': 'Balancing Rig',
    'bay-5': 'Test Cell',
    'bay-6': 'Metrology QC'
  };

  for (const b of MOCK_BAYS) {
    const bayNum = b.id.replace('bay-', '');
    const bayCode = `BAY-${bayNum}`;

    const bayPayload = {
      branch_id: branchId,
      code: bayCode,
      name: b.name,
      bay_type: bayTypeMap[b.id] || 'Machining',
      cleanliness_class: b.id === 'bay-3' ? 'ISO Class 6' : 'Standard',
      status: 'Active'
    };

    const { data: bayRec, error: bayErr } = await supabase
      .from('production_bays')
      .upsert(bayPayload, { onConflict: 'code' })
      .select()
      .single();

    if (bayErr) throw new Error(`Production Bay ${bayCode} failed: ${bayErr.message}`);
    bayMap[b.id] = bayRec.id;
    bayMap[bayCode] = bayRec.id;
    bayMap[`Bay ${bayNum}`] = bayRec.id;
  }
  summary.production_bays = MOCK_BAYS.length;
  console.log(`  Production bays migrated: ${MOCK_BAYS.length}`);

  // --------------------------------------------------------------------------
  // 18. MACHINES MASTER (6 Equipment Units)
  // --------------------------------------------------------------------------
  console.log('\n[17/18] Migrating Shop Floor Machines Master...');
  const machinesData = [
    { code: 'CNC-03', name: 'Okuma LB3000 Space Turn', bayId: bayMap['BAY-1'], machine_type: 'CNC Lathe', precision_tolerance_microns: 0.8 },
    { code: 'Studer S33', name: 'Studer S33 Cylindrical Grinder', bayId: bayMap['BAY-2'], machine_type: 'CNC Cylindrical Grinder', precision_tolerance_microns: 0.4 },
    { code: 'CR-Station-02', name: 'Clean Room Class 1000 Station', bayId: bayMap['BAY-3'], machine_type: 'Cleanroom Assembly Station', precision_tolerance_microns: 0.2 },
    { code: 'Schenck Rig-01', name: 'Schenck SmartBalancing Rig', bayId: bayMap['BAY-4'], machine_type: 'Dynamic Balancing Stand', precision_tolerance_microns: 0.2 },
    { code: 'Bench-05', name: 'Dual Channel Motor Test Bench', bayId: bayMap['BAY-5'], machine_type: 'Spindle Test Cell', precision_tolerance_microns: 0.5 },
    { code: 'Zeiss CMM', name: 'Zeiss CMM & Mahr Air Gauges', bayId: bayMap['BAY-6'], machine_type: 'Metrology Lab CMM', precision_tolerance_microns: 0.1 }
  ];

  for (const m of machinesData) {
    const { error: mErr } = await supabase
      .from('machines')
      .upsert({
        bay_id: m.bayId,
        code: m.code,
        name: m.name,
        machine_type: m.machine_type,
        precision_tolerance_microns: m.precision_tolerance_microns,
        status: 'Operating',
        is_active: true
      }, { onConflict: 'code' });

    if (mErr) throw new Error(`Machine ${m.code} failed: ${mErr.message}`);
  }

  // Remove temporary non-canonical bay rows if present
  await supabase.from('production_bays').delete().in('code', ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5', 'Bay 6']);

  summary.machines = machinesData.length;
  console.log(`  Machines migrated: ${machinesData.length}`);

  console.log('\n' + '='.repeat(80));
  console.log('PHASE 5 MASTER DATA MIGRATION COMPLETE');
  console.log('='.repeat(80));
  console.log(JSON.stringify(summary, null, 2));

  return summary;
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
