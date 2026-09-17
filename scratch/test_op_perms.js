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

const opClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
await opClient.auth.signInWithPassword({
  email: 'vikram.shinde@gpspindles.com',
  password: 'Password123!'
});

// Can operator read?
const { data: readCc, error: readCcErr } = await opClient.from('customer_contacts').select('id, name').limit(1);
console.log('OPERATOR read customer_contacts:', readCc?.[0]?.name, readCcErr);

// Can operator insert customer_contacts?
const { data: opInsData, error: opInsErr } = await opClient.from('customer_contacts').insert({
  customer_id: '66666666-0000-0000-0000-000000000001',
  name: 'Op Contact',
  email: 'op@test.com'
}).select();
console.log('OPERATOR insert customer_contacts (expect blocked):', opInsErr?.code);

// Can operator update suppliers?
const { data: opSuppData, error: opSuppErr } = await opClient.from('suppliers').update({ rating: 1 }).eq('id', '77777777-0000-0000-0000-000000000002').select();
console.log('OPERATOR update suppliers (expect 0 rows):', opSuppData?.length, opSuppErr);

await opClient.auth.signOut();
