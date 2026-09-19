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

// 1. Test with anon client
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data: anonCust, error: anonErr } = await anonClient.from('customers').select('id').limit(1);
console.log('Anon customer query:', { rows: anonCust?.length, err: anonErr?.message });

// 2. Test with authenticated client (sales user)
const salesClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data: authData, error: authErr } = await salesClient.auth.signInWithPassword({
  email: 'shreyas.nair@gpspindles.com',
  password: 'Password123!'
});
console.log('Sales user sign in:', { user: authData?.user?.email, err: authErr?.message });

// Query all customer sub-data for CUST-TATA
const tataId = '66666666-0000-0000-0000-000000000001';

const [spindles, workOrders, serviceRequests, invoices, contacts, docs] = await Promise.all([
  salesClient.from('spindles').select('*').eq('customer_id', tataId),
  salesClient.from('work_orders').select('*').eq('customer_id', tataId),
  salesClient.from('service_requests').select('*').eq('customer_id', tataId),
  salesClient.from('invoices').select('*').eq('customer_id', tataId),
  salesClient.from('customer_contacts').select('*').eq('customer_id', tataId),
  salesClient.from('documents').select('*')
]);

console.log('CUST-TATA Sub-Data:');
console.log('  Spindles:', spindles.data?.length, 'Err:', spindles.error?.message);
console.log('  Work Orders:', workOrders.data?.length, 'Err:', workOrders.error?.message);
console.log('  Service Requests:', serviceRequests.data?.length, 'Err:', serviceRequests.error?.message);
console.log('  Invoices:', invoices.data?.length, 'Err:', invoices.error?.message);
console.log('  Contacts:', contacts.data?.length, 'Err:', contacts.error?.message);
console.log('  Docs total in DB:', docs.data?.length, 'Err:', docs.error?.message);

// Check which customer owns the 5 documents in DB
console.log('\n--- Checking Document Ownership ---');
for (const doc of (docs.data || [])) {
  let owner = null;
  if (doc.reference_type === 'SPINDLE') {
    const { data } = await salesClient.from('spindles').select('serial_number, customer_id, customer_name').eq('serial_number', doc.reference_id).maybeSingle();
    owner = data;
  } else if (doc.reference_type === 'INVOICE') {
    const { data } = await salesClient.from('invoices').select('invoice_number, customer_id, customer_name').eq('invoice_number', doc.reference_id).maybeSingle();
    owner = data;
  } else if (doc.reference_type === 'WORK_ORDER') {
    const { data } = await salesClient.from('work_orders').select('work_order_no, customer_id, customer_name').eq('work_order_no', doc.reference_id).maybeSingle();
    owner = data;
  } else if (doc.reference_type === 'SERVICE_REQUEST') {
    const { data } = await salesClient.from('service_requests').select('sr_number, customer_id, customer_name').eq('sr_number', doc.reference_id).maybeSingle();
    owner = data;
  }
  console.log(`Doc: "${doc.title}" [${doc.reference_type} -> ${doc.reference_id}] => Owner:`, owner);
}
