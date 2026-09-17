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
await salesClient.auth.signInWithPassword({
  email: 'shreyas.nair@gpspindles.com',
  password: 'Password123!'
});

// Test suppliers mutation by SALES with .select()
const { data, error } = await salesClient.from('suppliers').update({ rating: 4 }).eq('id', '77777777-0000-0000-0000-000000000002').select();
console.log('SALES update suppliers data (should be empty/null):', data);
console.log('SALES update suppliers error:', error);

// Test purchaseClient updating customer_contacts
const purchaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
await purchaseClient.auth.signInWithPassword({
  email: 'purchase.controller@gpspindles.com',
  password: 'Password123!'
});
const { data: pData, error: pError } = await purchaseClient.from('customer_contacts').insert({
  customer_id: '66666666-0000-0000-0000-000000000001',
  name: 'Purchase Test Contact',
  email: 'purch@test.com',
  phone: '1234567890'
}).select();
console.log('PURCHASE insert customer_contacts data (should be empty/null):', pData);
console.log('PURCHASE insert customer_contacts error (should be error or 42501):', pError);

await salesClient.auth.signOut();
await purchaseClient.auth.signOut();
