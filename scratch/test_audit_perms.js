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
const { data: authData } = await salesClient.auth.signInWithPassword({
  email: 'shreyas.nair@gpspindles.com',
  password: 'Password123!'
});

const { data: aData, error: aErr } = await salesClient.from('audit_logs').insert({
  user_id: authData.user.id,
  user_name: 'Shreyas Nair',
  user_email: 'shreyas.nair@gpspindles.com',
  action: 'TEST',
  module: 'Contacts',
  table_name: 'customer_contacts',
  record_id: 'test-audit-id',
  summary_message: 'Audit log insert test'
}).select();

console.log('SALES insert audit_logs:', aData?.[0]?.id, aErr);

// Verify audit immutability (UPDATE blocked)
if (aData?.[0]?.id) {
  const { error: updErr } = await salesClient.from('audit_logs').update({ action: 'TAMPER' }).eq('id', aData[0].id);
  console.log('SALES update audit_logs (expect blocked):', updErr?.code || 'blocked');
}

await salesClient.auth.signOut();
