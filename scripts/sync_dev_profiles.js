import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read service role key from .env.migration
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

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const COMPANY_ID = 'c0000000-0000-0000-0000-000000000001';
const BRANCH_ID = 'b0000000-0000-0000-0000-000000000001';

const ROLE_MAP = {
  'ADMIN': '11111111-0000-0000-0000-000000000001',
  'MANAGEMENT': '11111111-0000-0000-0000-000000000002',
  'PROD_MGR': '11111111-0000-0000-0000-000000000003',
  'QA_MGR': '11111111-0000-0000-0000-000000000004',
  'SALES': '11111111-0000-0000-0000-000000000005',
  'PURCHASE': '11111111-0000-0000-0000-000000000006',
  'STORES': '11111111-0000-0000-0000-000000000007',
  'SERVICE': '11111111-0000-0000-0000-000000000008',
  'OPERATOR': '11111111-0000-0000-0000-000000000009'
};

const DEPT_MAP = {
  'ADMIN': 'd0000000-0000-0000-0000-000000000001',
  'MANAGEMENT': 'd0000000-0000-0000-0000-000000000001',
  'PROD_MGR': 'd0000000-0000-0000-0000-000000000001',
  'QA_MGR': 'd0000000-0000-0000-0000-000000000003',
  'SALES': 'd0000000-0000-0000-0000-000000000005',
  'PURCHASE': 'd0000000-0000-0000-0000-000000000006',
  'STORES': 'd0000000-0000-0000-0000-000000000006',
  'SERVICE': 'd0000000-0000-0000-0000-000000000004',
  'OPERATOR': 'd0000000-0000-0000-0000-000000000002'
};

async function syncDevProfiles() {
  console.log('Connecting to Supabase Auth & DB...');
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list auth users:', listError);
    return;
  }

  console.log(`Found ${users.length} auth users.`);

  for (const u of users) {
    const roleCode = u.user_metadata?.role || 'ADMIN';
    const roleId = ROLE_MAP[roleCode] || ROLE_MAP['ADMIN'];
    const deptId = DEPT_MAP[roleCode] || DEPT_MAP['ADMIN'];
    const fullName = u.user_metadata?.full_name || 'User';
    const parts = fullName.split(' ');
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    const employeeCode = u.user_metadata?.employee_code || `GPS-EMP-${u.id.slice(0, 4)}`;

    console.log(`Syncing: ${u.email} -> Role: ${roleCode} (RoleID: ${roleId})`);

    // 1. Upsert Profile
    const { error: profError } = await supabase.from('profiles').upsert({
      id: u.id,
      company_id: COMPANY_ID,
      branch_id: BRANCH_ID,
      role_id: roleId,
      first_name: firstName,
      last_name: lastName,
      email: u.email,
      phone: '+91 98220 14900',
      status: 'Active'
    }, { onConflict: 'id' });

    if (profError) {
      console.error(`  Error upserting profile for ${u.email}:`, profError.message);
    } else {
      console.log(`  Profile synced.`);
    }

    // 2. Upsert Employee Record
    // Check if employee exists by email
    const { data: existingEmp } = await supabase
      .from('employees')
      .select('id')
      .eq('email', u.email)
      .maybeSingle();

    if (existingEmp) {
      const { error: empUpdateErr } = await supabase
        .from('employees')
        .update({
          profile_id: u.id,
          role_id: roleId,
          department_id: deptId,
          current_status: 'Available',
          is_active: true
        })
        .eq('id', existingEmp.id);

      if (empUpdateErr) console.error(`  Error updating employee ${u.email}:`, empUpdateErr.message);
      else console.log(`  Employee record updated (ID: ${existingEmp.id}).`);
    } else {
      const { data: newEmp, error: empInsertErr } = await supabase
        .from('employees')
        .insert({
          profile_id: u.id,
          role_id: roleId,
          employee_code: employeeCode,
          first_name: firstName,
          last_name: lastName,
          email: u.email,
          phone: '+91 98220 14900',
          department_id: deptId,
          designation: `${roleCode} Specialist`,
          current_status: 'Available',
          is_active: true
        })
        .select()
        .single();

      if (empInsertErr) console.error(`  Error inserting employee ${u.email}:`, empInsertErr.message);
      else console.log(`  Employee record inserted (ID: ${newEmp.id}).`);
    }
  }

  console.log('\nSync completed successfully!');
}

syncDevProfiles();
