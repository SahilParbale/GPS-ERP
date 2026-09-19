import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const migrationEnv = fs.readFileSync(path.join(rootDir, '.env.migration'), 'utf8');
const envFile = fs.readFileSync(path.join(rootDir, '.env'), 'utf8');

const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const DEV_ACCOUNTS = [
  { role: 'ADMIN', email: 'rahul.patil@gpspindles.com', password: 'Password123!' },
  { role: 'MANAGEMENT', email: 'kulkarni.vr@gpspindles.com', password: 'Password123!' },
  { role: 'PROD_MGR', email: 'suresh.sawant@gpspindles.com', password: 'Password123!' },
  { role: 'QA_MGR', email: 'milind.joshi@gpspindles.com', password: 'Password123!' },
  { role: 'SALES', email: 'shreyas.nair@gpspindles.com', password: 'Password123!' },
  { role: 'PURCHASE', email: 'purchase.controller@gpspindles.com', password: 'Password123!' },
  { role: 'STORES', email: 'dinesh.more@gpspindles.com', password: 'Password123!' },
  { role: 'SERVICE', email: 'service.lead@gpspindles.com', password: 'Password123!' },
  { role: 'EMPLOYEE', email: 'vikram.shinde@gpspindles.com', password: 'Password123!' }
];

console.log('=== VERIFY ALL 9 ROLES & PERMISSIONS ON SPINDLES ===');
for (const acc of DEV_ACCOUNTS) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: acc.email,
    password: acc.password
  });
  if (authErr) {
    console.log(`[AUTH FAILED] ${acc.role}: ${acc.email} -> ${authErr.message}`);
    continue;
  }
  const { data: prof, error: profErr } = await client.from('profiles').select('id, role:roles(code, name)').eq('id', authData.user.id).single();
  const resolvedRole = prof?.role?.code;

  // Test insert permission on spindles for this role
  const testSerial = `TEST-PERM-${acc.role}-${Date.now()}`;
  const { data: insData, error: insErr } = await client.from('spindles').insert({
    serial_number: testSerial,
    status: 'In Production'
  }).select();

  const writeAllowed = !insErr && insData?.length > 0;
  console.log(`Role: ${acc.role.padEnd(12)} | Email: ${acc.email.padEnd(35)} | Resolved: ${resolvedRole} | Spindles Write: ${writeAllowed ? 'ALLOWED' : 'BLOCKED (' + (insErr?.code || '0 rows') + ')'}`);

  if (writeAllowed && insData?.[0]?.id) {
    // cleanup
    await client.from('spindles').delete().eq('id', insData[0].id);
  }
}
