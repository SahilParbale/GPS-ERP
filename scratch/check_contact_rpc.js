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

await supabase.auth.signInWithPassword({
  email: 'rahul.patil@gpspindles.com',
  password: 'Password123!'
});

// Check if set_primary_customer_contact or similar exists
const { data: rpcRes, error: rpcErr } = await supabase.rpc('set_primary_customer_contact', {
  p_customer_id: '66666666-0000-0000-0000-000000000001',
  p_contact_id: '55669c2f-e776-4b08-9c85-9bd544e5493a'
});
console.log('rpc test:', { rpcRes, rpcErr });

// Check RLS policies on customer_contacts
const { data: policies, error: polErr } = await supabase.rpc('exec_sql', {
  sql: "SELECT policyname, cmd, roles, qual FROM pg_policies WHERE tablename = 'customer_contacts';"
});
console.log('policies check:', { policies, polErr });

await supabase.auth.signOut();
