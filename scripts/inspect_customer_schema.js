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
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspect() {
  console.log('--- INSPECTING CUSTOMER RELATED SCHEMA ---');

  // Sign in as admin
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'rahul.patil@gpspindles.com',
    password: 'Password123!'
  });
  if (authErr) {
    console.error('Auth error:', authErr.message);
    return;
  }
  console.log('Signed in as:', authData.user.email);

  // Check customers
  const { data: customers } = await supabase.from('customers').select('id, customer_code, company_name');
  console.log('All customers:', customers);

  // Check documents reference types
  const { data: docs } = await supabase.from('documents').select('reference_type, reference_id, title, file_name');
  console.log('All documents:', docs);

  // Check counts per customer
  for (const c of (customers || [])) {
    const [sp, wo, so, inv, sr, cont, doc] = await Promise.all([
      supabase.from('spindles').select('id', { count: 'exact' }).eq('customer_id', c.id),
      supabase.from('work_orders').select('id', { count: 'exact' }).eq('customer_id', c.id),
      supabase.from('sales_orders').select('id, total_amount', { count: 'exact' }).eq('customer_id', c.id),
      supabase.from('invoices').select('id, total_amount, balance_amount, status', { count: 'exact' }).eq('customer_id', c.id),
      supabase.from('service_requests').select('id', { count: 'exact' }).eq('customer_id', c.id),
      supabase.from('customer_contacts').select('id', { count: 'exact' }).eq('customer_id', c.id),
      supabase.from('documents').select('id', { count: 'exact' }).eq('reference_id', c.id)
    ]);
    console.log(`\nCustomer: ${c.customer_code} (${c.company_name}) [${c.id}]`);
    console.log(`  Spindles: ${sp.count}, Work Orders: ${wo.count}, Sales Orders: ${so.count}`);
    console.log(`  Invoices: ${inv.count}, Service Requests: ${sr.count}, Contacts: ${cont.count}, Docs (ref_id): ${doc.count}`);
    if (inv.data?.length > 0) {
      console.log('  Invoices sample:', inv.data);
    }
    if (so.data?.length > 0) {
      console.log('  Sales Orders sample:', so.data);
    }
  }
}

inspect();
