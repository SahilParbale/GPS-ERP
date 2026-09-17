import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const envPath = path.join(rootDir, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const salesClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data: authData, error: authErr } = await salesClient.auth.signInWithPassword({
  email: 'shreyas.nair@gpspindles.com',
  password: 'Password123!'
});

console.log('SALES auth:', authData.user?.email, authErr);

// Test customer select
const { data: custs, error: custErr } = await salesClient.from('customers').select('id, company_name, primary_contact_name').limit(1);
console.log('SALES read customers:', custs?.[0]?.company_name, custErr);

// Test customer_contacts select
const { data: cContacts, error: ccErr } = await salesClient.from('customer_contacts').select('id, name, customer_id').limit(1);
console.log('SALES read customer_contacts:', cContacts?.[0]?.name, ccErr);

// Test customer_contacts insert (dry-run test with rollback)
if (cContacts?.[0]?.customer_id) {
  const testContact = {
    customer_id: cContacts[0].customer_id,
    name: 'Sales Test Temporary Contact',
    email: 'sales.test@temporary.com',
    phone: '+91 99999 88888',
    designation: 'Test Specialist',
    department: 'Sales',
    is_primary: false,
    is_default_cc: true
  };
  const { data: insData, error: insErr } = await salesClient.from('customer_contacts').insert(testContact).select();
  console.log('SALES insert customer_contact:', insData?.[0]?.id, insErr);
  if (insData?.[0]?.id) {
    const { error: delErr } = await salesClient.from('customer_contacts').delete().eq('id', insData[0].id);
    console.log('SALES delete test contact cleanup:', delErr);
  }
}

// Test suppliers mutation by SALES (should be blocked by RLS)
const { error: suppMutErr } = await salesClient.from('suppliers').update({ rating: 4 }).eq('id', '77777777-0000-0000-0000-000000000002');
console.log('SALES update suppliers (expected blocked):', suppMutErr?.code, suppMutErr?.message);

await salesClient.auth.signOut();
