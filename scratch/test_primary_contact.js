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

// Pick customer 66666666-0000-0000-0000-000000000001
const customerId = '66666666-0000-0000-0000-000000000001';

// Check existing contacts
const { data: contacts } = await salesClient.from('customer_contacts').select('*').eq('customer_id', customerId);
console.log('Customer contacts count:', contacts.length);
console.log('Primary contact currently:', contacts.find(c => c.is_primary)?.name);

// Check customer master row
const { data: customer } = await salesClient.from('customers').select('id, company_name, primary_contact_name, primary_email, primary_phone').eq('id', customerId).single();
console.log('Customer master summary:', customer);

await salesClient.auth.signOut();
