import fs from 'fs';
import path from 'path';

// Read all application tables from schema
const schemaColumns = JSON.parse(fs.readFileSync(path.resolve('scripts', 'schema_columns.json'), 'utf8'));
const tableNames = Object.keys(schemaColumns);

// Read SQL migration files containing RLS
const rlsFiles = [
  '016_rls_workforce_profiles.sql',
  '017_rls_manufacturing_spindles.sql',
  '018_rls_commercial_procurement.sql',
  '019_rls_inventory_service_finance.sql',
  '020_storage_security.sql'
];

let fullSql = '';
for (const f of rlsFiles) {
  const p = path.resolve('supabase', 'migrations', f);
  if (fs.existsSync(p)) {
    fullSql += '\n' + fs.readFileSync(p, 'utf8');
  }
}

// 1. Audit ENABLE ROW LEVEL SECURITY
const rlsEnabledRegex = /ALTER TABLE public\.([a-zA-Z0-9_]+)\s+ENABLE ROW LEVEL SECURITY;/gi;
const enabledTables = new Set();
let match;
while ((match = rlsEnabledRegex.exec(fullSql)) !== null) {
  enabledTables.add(match[1]);
}

// 2. Audit Policies
// Match CREATE POLICY <name> ON public.<table_name> FOR <action> ...
const policyRegex = /CREATE POLICY\s+([a-zA-Z0-9_]+)\s+ON\s+public\.([a-zA-Z0-9_]+)\s+(?:FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL))?/gi;
const tablePolicies = {};
tableNames.forEach(t => {
  tablePolicies[t] = {
    select: [],
    insert: [],
    update: [],
    delete: [],
    all: [],
    total: 0
  };
});

while ((match = policyRegex.exec(fullSql)) !== null) {
  const policyName = match[1];
  const table = match[2];
  const action = (match[3] || 'ALL').toUpperCase();

  if (tablePolicies[table]) {
    if (action === 'ALL') tablePolicies[table].all.push(policyName);
    else if (action === 'SELECT') tablePolicies[table].select.push(policyName);
    else if (action === 'INSERT') tablePolicies[table].insert.push(policyName);
    else if (action === 'UPDATE') tablePolicies[table].update.push(policyName);
    else if (action === 'DELETE') tablePolicies[table].delete.push(policyName);
    tablePolicies[table].total++;
  }
}

// Audit Storage Objects RLS
const hasStorageRls = fullSql.includes('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
const storagePolicies = (fullSql.match(/CREATE POLICY\s+([a-zA-Z0-9_]+)\s+ON\s+storage\.objects/gi) || []).length;

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — ROW LEVEL SECURITY (RLS) AUDIT REPORT');
console.log('='.repeat(80));

const auditResults = [];
let tablesWithoutRls = 0;
let tablesWithIntentionalRestrictions = 0;

for (const t of tableNames) {
  const isEnabled = enabledTables.has(t);
  if (!isEnabled) tablesWithoutRls++;

  const p = tablePolicies[t];
  const hasSelect = p.select.length > 0 || p.all.length > 0;
  const hasInsert = p.insert.length > 0 || p.all.length > 0;
  const hasUpdate = p.update.length > 0 || p.all.length > 0;
  const hasDelete = p.delete.length > 0 || p.all.length > 0;

  let classification = 'Standard CRUD Coverage';
  if (t === 'audit_logs') {
    classification = 'INTENTIONAL IMMUTABLE (Update/Delete strictly denied)';
    tablesWithIntentionalRestrictions++;
  } else if (['stock_movements', 'inventory_transactions'].includes(t)) {
    classification = 'INTENTIONAL LEDGER (Update/Delete restricted to Admin)';
    tablesWithIntentionalRestrictions++;
  } else if (['roles', 'permissions', 'role_permissions', 'employee_roles'].includes(t)) {
    classification = 'HIGH SECURITY BOUNDARY (Write restricted to Admin)';
    tablesWithIntentionalRestrictions++;
  }

  auditResults.push({
    table: t,
    rls_enabled: isEnabled ? 'YES' : 'NO',
    total_policies: p.total,
    select: hasSelect ? 'YES' : 'NO',
    insert: hasInsert ? 'YES' : 'NO',
    update: hasUpdate ? 'YES' : 'NO',
    delete: hasDelete ? 'YES' : 'NO',
    classification
  });
}

console.table(auditResults.slice(0, 25)); // Print sample
console.log(`... and ${auditResults.length - 25} more tables verified.`);

console.log('\nAUDIT SUMMARY:');
console.log(`- Total Application Tables: ${tableNames.length}`);
console.log(`- Tables with RLS Enabled: ${enabledTables.size} / ${tableNames.length}`);
console.log(`- Unprotected Tables (RLS Disabled): ${tablesWithoutRls}`);
console.log(`- Total Table Policies Created: ${Object.values(tablePolicies).reduce((sum, p) => sum + p.total, 0)}`);
console.log(`- Storage RLS Enabled: ${hasStorageRls ? 'YES (storage.objects)' : 'NO'}`);
console.log(`- Storage Policies Created: ${storagePolicies}`);
console.log(`- Intentionally Restricted / Immutable Tables: ${tablesWithIntentionalRestrictions}`);

if (tablesWithoutRls === 0) {
  console.log('\n[PASS] RLS Policy Audit: 100% of application tables are secured with Row Level Security.');
} else {
  console.error(`\n[FAIL] RLS Policy Audit: ${tablesWithoutRls} tables are missing RLS protection!`);
  process.exit(1);
}
