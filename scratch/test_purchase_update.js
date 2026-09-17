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

const purchaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
await purchaseClient.auth.signInWithPassword({
  email: 'purchase.controller@gpspindles.com',
  password: 'Password123!'
});

const { data: sData, error: sErr } = await purchaseClient.from('suppliers')
  .update({ phone: '+49 8333 9204-0' })
  .eq('id', '77777777-0000-0000-0000-000000000002')
  .select();
console.log('PURCHASE update supplier:', sData?.[0]?.name, sErr);

await purchaseClient.auth.signOut();
