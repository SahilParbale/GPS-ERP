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

const adminClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data: authData } = await adminClient.auth.signInWithPassword({
  email: 'rahul.patil@gpspindles.com',
  password: 'Password123!'
});

const { data: aData, error: aErr } = await adminClient.from('audit_logs').insert({
  user_id: authData.user.id,
  user_name: 'Rahul Patil',
  user_email: 'rahul.patil@gpspindles.com',
  action: 'TEST',
  module: 'Contacts',
  table_name: 'customer_contacts',
  record_id: 'test-admin-audit',
  summary_message: 'Admin audit log test'
}).select();

console.log('ADMIN insert audit_logs:', aData?.[0]?.id, aErr);

await adminClient.auth.signOut();
