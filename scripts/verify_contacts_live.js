import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Load environment variables
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

// Dynamically import contactService and supabase client
const { supabase } = await import('../src/services/supabase/supabaseClient.js');
const { contactService } = await import('../src/services/database/contactService.js');

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'rahul.patil@gpspindles.com';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Password123!';
const SALES_EMAIL = 'shreyas.nair@gpspindles.com';
const SALES_PASSWORD = 'Password123!';
const PURCHASE_EMAIL = 'purchase.controller@gpspindles.com';
const PURCHASE_PASSWORD = 'Password123!';
const OPERATOR_EMAIL = 'vikram.shinde@gpspindles.com';
const OPERATOR_PASSWORD = 'Password123!';

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

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — CONTACTS LIVE DATABASE INTEGRATION VERIFICATION');
console.log('='.repeat(80));
console.log(`Target Supabase URL: ${SUPABASE_URL}\n`);

// Clean-up registry to ensure baseline is preserved
const cleanupActions = [];

try {
  // --------------------------------------------------------------------------
  // SECTION 1: AUTHENTICATION FOR ALL 4 REQUIRED TEST ROLES
  // --------------------------------------------------------------------------
  console.log('[SECTION 1] VERIFYING AUTHENTICATION ACROSS TEST ROLES...');

  const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: adminAuth, error: adminErr } = await adminClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  assert(!adminErr && adminAuth.user, `Admin authentication (${ADMIN_EMAIL})`);

  const salesClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: salesAuth, error: salesErr } = await salesClient.auth.signInWithPassword({
    email: SALES_EMAIL,
    password: SALES_PASSWORD
  });
  assert(!salesErr && salesAuth.user, `Sales authentication (${SALES_EMAIL})`);

  const purchaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: purchAuth, error: purchErr } = await purchaseClient.auth.signInWithPassword({
    email: PURCHASE_EMAIL,
    password: PURCHASE_PASSWORD
  });
  assert(!purchErr && purchAuth.user, `Purchase authentication (${PURCHASE_EMAIL})`);

  const operatorClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: opAuth, error: opErr } = await operatorClient.auth.signInWithPassword({
    email: OPERATOR_EMAIL,
    password: OPERATOR_PASSWORD
  });
  assert(!opErr && opAuth.user, `Operator authentication (${OPERATOR_EMAIL})`);

  // --------------------------------------------------------------------------
  // SECTION 2: LIVE READ FROM AUTHORITATIVE TABLES
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 2] TESTING LIVE READ FROM AUTHORITATIVE TABLES...');

  // Set active session for domain contactService
  await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

  const { data: allCustContacts, error: ccErr } = await contactService.getAllCustomerContacts();
  assert(!ccErr && Array.isArray(allCustContacts) && allCustContacts.length > 0, `contactService.getAllCustomerContacts() returned ${allCustContacts?.length} live records`);

  const { data: allSuppliers, error: suppErr } = await contactService.getAllSupplierContacts();
  assert(!suppErr && Array.isArray(allSuppliers) && allSuppliers.length > 0, `contactService.getAllSupplierContacts() returned ${allSuppliers?.length} live records`);

  const { data: unifiedDir, error: dirErr } = await contactService.getUnifiedDirectory();
  assert(!dirErr && Array.isArray(unifiedDir) && unifiedDir.length > 0, `contactService.getUnifiedDirectory() returned ${unifiedDir?.length} unified companies`);

  // Verify structure of directory items
  const sampleCustomer = unifiedDir.find(c => c.category === 'Customer');
  assert(sampleCustomer && sampleCustomer.primaryContact?.email && sampleCustomer.companyName, 'Unified customer directory format includes primaryContact, email, companyName');
  const sampleSupplier = unifiedDir.find(c => c.category === 'Supplier');
  assert(sampleSupplier && sampleSupplier.primaryContact?.name && sampleSupplier.companyName, 'Unified supplier directory format includes contact_person as primaryContact');

  // --------------------------------------------------------------------------
  // SECTION 3: CUSTOMER CONTACT CREATE, UPDATE, DELETE (SALES ROLE)
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 3] TESTING CUSTOMER CONTACT CRUD VIA AUTHORIZED ROLE (SALES)...');

  // Authenticate domain supabase client as SALES
  await supabase.auth.signInWithPassword({ email: SALES_EMAIL, password: SALES_PASSWORD });

  // Pick existing active customer
  const targetCustomer = sampleCustomer.dbId;
  const testContactName = `Automated Test Lead ${Date.now()}`;
  const testContactEmail = `test.lead.${Date.now()}@tatamotors.com`;
  const testContactPhone = '+91 98230 99887';

  const createRes = await contactService.createCustomerContact(targetCustomer, {
    name: testContactName,
    email: testContactEmail,
    phone: testContactPhone,
    designation: 'Senior Sourcing Officer',
    department: 'Procurement',
    is_primary: false,
    is_default_cc: true
  });

  assert(!createRes.error && createRes.data?.id, `SALES successfully created customer contact: ${createRes.data?.id}`);
  const createdContactId = createRes.data?.id;

  if (createdContactId) {
    cleanupActions.push(async () => {
      // Ensure test contact is removed
      await adminClient.from('customer_contacts').delete().eq('id', createdContactId);
    });

    // UPDATE test
    const updatedPhone = '+91 98230 11223';
    const updateRes = await contactService.updateCustomerContact(createdContactId, {
      phone: updatedPhone,
      designation: 'Lead Quality Specialist'
    });
    assert(!updateRes.error && updateRes.data?.phone === updatedPhone, `SALES successfully updated contact phone to ${updatedPhone}`);

    // DIRECT DATABASE CROSS-CHECK
    console.log('\n[SECTION 4] DIRECT DATABASE CROSS-CHECK (SERVICE vs DIRECT POSTGRESQL)...');
    const { data: dbDirectRow, error: directErr } = await salesClient
      .from('customer_contacts')
      .select('*')
      .eq('id', createdContactId)
      .single();

    assert(!directErr && dbDirectRow, 'Direct PostgreSQL row fetch successful');
    assert(dbDirectRow.name === testContactName, `Name match: Service (${testContactName}) === PostgreSQL (${dbDirectRow.name})`);
    assert(dbDirectRow.email === testContactEmail.toLowerCase(), `Email match: Service (${testContactEmail}) === PostgreSQL (${dbDirectRow.email})`);
    assert(dbDirectRow.phone === updatedPhone, `Phone match: Service (${updatedPhone}) === PostgreSQL (${dbDirectRow.phone})`);
    assert(dbDirectRow.customer_id === targetCustomer, `Customer ID match: ${dbDirectRow.customer_id} === ${targetCustomer}`);

    // PERSISTENCE RE-READ
    const reRead = await contactService.getCustomerContacts(targetCustomer);
    const foundInList = reRead.data?.find(c => c.id === createdContactId);
    assert(foundInList && foundInList.phone === updatedPhone, 'Contact persisted and verified on subsequent query re-read');

    // DELETE test
    const deleteRes = await contactService.deleteCustomerContact(createdContactId);
    assert(!deleteRes.error, `SALES successfully deleted temporary contact (${createdContactId})`);

    // Verify deletion in direct PostgreSQL
    const { data: afterDelete } = await salesClient
      .from('customer_contacts')
      .select('id')
      .eq('id', createdContactId);
    assert(afterDelete?.length === 0, 'Direct PostgreSQL confirmation: contact row is completely removed');
  }

  // --------------------------------------------------------------------------
  // SECTION 5: SUPPLIER CONTACT UPDATE & DEACTIVATION (PURCHASE ROLE)
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 5] TESTING SUPPLIER CONTACT UPDATE VIA AUTHORIZED ROLE (PURCHASE)...');

  // Authenticate domain supabase client as PURCHASE
  await supabase.auth.signInWithPassword({ email: PURCHASE_EMAIL, password: PURCHASE_PASSWORD });

  const targetSupplierId = sampleSupplier.dbId;
  const originalSupplier = sampleSupplier.primaryContact;

  const updatedContactPerson = `Vendor Rep ${Date.now()}`;
  const updatedSuppEmail = `rep.${Date.now()}@vendor.com`;

  const suppUpdateRes = await contactService.updateSupplierContact(targetSupplierId, {
    contact_person: updatedContactPerson,
    email: updatedSuppEmail
  });

  assert(!suppUpdateRes.error && suppUpdateRes.data?.contact_person === updatedContactPerson, `PURCHASE successfully updated supplier contact person to ${updatedContactPerson}`);

  // Revert back to preserve baseline
  cleanupActions.push(async () => {
    await adminClient.from('suppliers').update({
      contact_person: originalSupplier.name,
      email: originalSupplier.email,
      phone: originalSupplier.phone,
      is_active: true
    }).eq('id', targetSupplierId);
  });

  // Test Supplier Deactivation semantics (NEVER physically delete)
  console.log('\n[SECTION 6] TESTING SUPPLIER SOFT-DEACTIVATE SEMANTICS...');
  const deactRes = await contactService.deleteSupplierContact(targetSupplierId);
  assert(!deactRes.error, 'Supplier deactivation completed without error');

  const { data: directSupp } = await adminClient.from('suppliers').select('id, is_active').eq('id', targetSupplierId).single();
  assert(directSupp && directSupp.is_active === false, 'Direct PostgreSQL check confirms supplier is_active = false (NOT physically deleted)');

  // Restore supplier immediately
  await adminClient.from('suppliers').update({ is_active: true, contact_person: originalSupplier.name, email: originalSupplier.email }).eq('id', targetSupplierId);
  console.log('  [CLEANUP] Restored supplier to is_active = true with original contact details');

  // --------------------------------------------------------------------------
  // SECTION 7: PRIMARY CONTACT INTEGRITY (AT MOST ONE PRIMARY PER CUSTOMER)
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 7] VERIFYING PRIMARY CONTACT INTEGRITY RULE (AT MOST ONE PER CUSTOMER)...');

  const { data: allContactsCheck } = await adminClient.from('customer_contacts').select('id, customer_id, is_primary');
  const primaryCountByCustomer = {};
  for (const cnt of allContactsCheck) {
    if (cnt.is_primary) {
      primaryCountByCustomer[cnt.customer_id] = (primaryCountByCustomer[cnt.customer_id] || 0) + 1;
    }
  }

  const violatedCustomers = Object.entries(primaryCountByCustomer).filter(([_, count]) => count > 1);
  assert(violatedCustomers.length === 0, `Integrity Check: Zero customers have more than 1 primary contact (Violations: ${violatedCustomers.length})`);

  // Test Atomic Primary Contact Switching
  await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

  // Create two temporary contacts for a customer to test switching
  const c1 = await contactService.createCustomerContact(targetCustomer, {
    name: `Switch Test Contact A ${Date.now()}`,
    email: `switch.a.${Date.now()}@test.com`,
    is_primary: true
  });
  const c2 = await contactService.createCustomerContact(targetCustomer, {
    name: `Switch Test Contact B ${Date.now()}`,
    email: `switch.b.${Date.now()}@test.com`,
    is_primary: false
  });

  if (c1.data?.id && c2.data?.id) {
    cleanupActions.push(async () => {
      await adminClient.from('customer_contacts').delete().in('id', [c1.data.id, c2.data.id]);
    });

    // Check that C1 is primary and summary is updated
    const { data: custAfterC1 } = await adminClient.from('customers').select('primary_contact_name, primary_email').eq('id', targetCustomer).single();
    assert(custAfterC1.primary_contact_name === c1.data.name, 'Customer master primary_contact_name synchronized with Contact A');

    // Switch primary to Contact B
    const switchRes = await contactService.setPrimaryContact(targetCustomer, c2.data.id);
    assert(!switchRes.error, 'setPrimaryContact executed successfully');

    // Verify Contact B is now true, Contact A is now false
    const { data: c1After } = await adminClient.from('customer_contacts').select('is_primary').eq('id', c1.data.id).single();
    const { data: c2After } = await adminClient.from('customer_contacts').select('is_primary').eq('id', c2.data.id).single();
    assert(c1After.is_primary === false && c2After.is_primary === true, 'Atomic switch confirmed: Contact A is false, Contact B is true');

    // Verify customer summary is now Contact B
    const { data: custAfterC2 } = await adminClient.from('customers').select('primary_contact_name, primary_email').eq('id', targetCustomer).single();
    assert(custAfterC2.primary_contact_name === c2.data.name, 'Customer master primary_contact_name synchronized with Contact B');

    // Cleanup switch test contacts
    await adminClient.from('customer_contacts').delete().in('id', [c1.data.id, c2.data.id]);
  }

  // --------------------------------------------------------------------------
  // SECTION 8: FOREIGN KEY INTEGRITY & ORPHAN CHECK
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 8] CHECKING FOREIGN KEY INTEGRITY & ORPHAN CONTACTS...');
  const { data: allCustomers } = await adminClient.from('customers').select('id');
  const validCustomerIds = new Set(allCustomers.map(c => c.id));

  let orphanCount = 0;
  for (const cnt of allContactsCheck) {
    if (!validCustomerIds.has(cnt.customer_id)) {
      orphanCount++;
    }
  }
  assert(orphanCount === 0, `Zero orphan customer contacts (All ${allContactsCheck.length} contacts point to valid customers)`);

  // --------------------------------------------------------------------------
  // SECTION 9: RLS ENFORCEMENT & ANONYMOUS ACCESS BLOCKING
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 9] VERIFYING ROW LEVEL SECURITY (RLS) POLICIES...');
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Anonymous cannot read sensitive contacts
  const { data: anonCcData } = await anonClient.from('customer_contacts').select('*').limit(5);
  assert(!anonCcData || anonCcData.length === 0, 'Anonymous SELECT on customer_contacts returned 0 rows (BLOCKED by RLS)');

  // Anonymous cannot insert
  const { error: anonInsErr } = await anonClient.from('customer_contacts').insert({
    customer_id: targetCustomer,
    name: 'Hacker Anon',
    email: 'hacker@anon.com'
  });
  assert(anonInsErr !== null, `Anonymous INSERT blocked by RLS (${anonInsErr?.code || 'BLOCKED'})`);

  // --------------------------------------------------------------------------
  // SECTION 10: CROSS-ROLE AUTHORIZATION RESTRICTIONS
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 10] TESTING CROSS-ROLE SECURITY BOUNDARIES...');

  // 1. SALES cannot mutate suppliers
  const { data: salesMutSupp } = await salesClient
    .from('suppliers')
    .update({ rating: 1 })
    .eq('id', targetSupplierId)
    .select();
  assert(!salesMutSupp || salesMutSupp.length === 0, 'SALES role cannot UPDATE suppliers (RLS blocked: 0 rows modified)');

  // 2. PURCHASE cannot mutate customer_contacts
  const { error: purchMutCc } = await purchaseClient
    .from('customer_contacts')
    .insert({
      customer_id: targetCustomer,
      name: 'Unauthorized Purchase Contact',
      email: 'purch@unauthorized.com'
    });
  assert(purchMutCc && purchMutCc.code === '42501', `PURCHASE role cannot INSERT customer_contacts (RLS blocked: code ${purchMutCc?.code})`);

  // 3. OPERATOR cannot mutate either
  const { error: opMutCc } = await operatorClient
    .from('customer_contacts')
    .insert({
      customer_id: targetCustomer,
      name: 'Unauthorized Operator Contact',
      email: 'operator@unauthorized.com'
    });
  assert(opMutCc && opMutCc.code === '42501', `OPERATOR role cannot INSERT customer_contacts (RLS blocked: code ${opMutCc?.code})`);

  const { data: opMutSupp } = await operatorClient
    .from('suppliers')
    .update({ rating: 1 })
    .eq('id', targetSupplierId)
    .select();
  assert(!opMutSupp || opMutSupp.length === 0, 'OPERATOR role cannot UPDATE suppliers (RLS blocked: 0 rows modified)');

  // --------------------------------------------------------------------------
  // SECTION 11: AUDIT LOGGING VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 11] VERIFYING AUDIT LOGGING (public.audit_logs)...');
  const { data: auditEntries, error: auditErr } = await adminClient
    .from('audit_logs')
    .select('*')
    .eq('module', 'Contacts')
    .order('created_at', { ascending: false })
    .limit(5);

  assert(!auditErr && Array.isArray(auditEntries) && auditEntries.length > 0, `Found ${auditEntries?.length} recent Contacts audit log entries in public.audit_logs`);

  // --------------------------------------------------------------------------
  // SECTION 12: SOURCE CODE SECURITY & MOCK AUDIT
  // --------------------------------------------------------------------------
  console.log('\n[SECTION 12] AUDITING SOURCE CODE FOR ZERO MOCK & SECRETS...');

  const contactsScreenCode = fs.readFileSync(path.join(rootDir, 'src', 'screens', 'ContactsScreen.jsx'), 'utf8');

  // Verify no setContacts(prev => ...) mock mutations
  const hasMockArrayMutation = /setContacts\s*\(\s*prev\s*=>/.test(contactsScreenCode);
  assert(!hasMockArrayMutation, 'ContactsScreen.jsx: Zero simulated in-memory CRUD (no setContacts(prev => ...))');

  // Search src/ for service_role exposure
  function scanDirForServiceRole(dir) {
    let violations = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        violations = violations.concat(scanDirForServiceRole(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZnFhbXRldGhsa3FocWdkcGFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIs')) {
          violations.push(fullPath);
        }
      }
    }
    return violations;
  }

  const serviceRoleViolations = scanDirForServiceRole(path.join(rootDir, 'src'));
  assert(serviceRoleViolations.length === 0, `Source Security: 0 service_role credentials in src/ (Found: ${serviceRoleViolations.length})`);

} catch (err) {
  console.error('\nUNEXPECTED VERIFICATION SUITE ERROR:', err);
  failedTests++;
} finally {
  console.log('\n[CLEANUP] EXECUTING TEARDOWN ACTIONS TO PRESERVE PRODUCTION BASELINE...');
  for (const cleanup of cleanupActions) {
    try {
      await cleanup();
    } catch (cleanErr) {
      console.warn('  Cleanup warning:', cleanErr.message);
    }
  }
  console.log('  Teardown complete.');

  console.log('\n' + '='.repeat(80));
  console.log(`VERIFICATION SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log('='.repeat(80));

  if (failedTests > 0) {
    console.error('\nContacts verification FAILED.');
    process.exit(1);
  } else {
    console.log('\nContacts live integration verification PASSED 100%.');
  }
}
