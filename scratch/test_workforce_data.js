import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const migrationEnv = fs.readFileSync('.env.migration', 'utf8');
const envFile = fs.readFileSync('.env', 'utf8');

const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function check() {
  const client = createClient(url, anonKey);
  await client.auth.signInWithPassword({
    email: 'rahul.patil@gpspindles.com',
    password: 'Password123!'
  });

  const { data: emps, error: eErr } = await client.from('employees').select(`
    id,
    employee_code,
    first_name,
    last_name,
    email,
    phone,
    designation,
    current_status,
    avatar_color,
    skills,
    qualifications,
    date_of_joining,
    is_active,
    department:departments!employees_department_id_fkey(id, code, name),
    role:roles!employees_role_id_fkey(id, code, name),
    shift:shifts!employees_current_shift_id_fkey(id, shift_code, name, start_time, end_time)
  `);
  console.log('Employees error:', eErr);
  console.log('Employees count:', emps?.length);
  if (emps && emps.length > 0) {
    console.log('First employee joined successfully:', JSON.stringify(emps[0], null, 2));
  }
}

check().catch(console.error);
