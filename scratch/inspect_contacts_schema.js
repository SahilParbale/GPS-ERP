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

const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
  email: 'rahul.patil@gpspindles.com',
  password: 'Password123!'
});

if (authErr) {
  console.error('Auth error:', authErr);
  process.exit(1);
}

console.log('--- CUSTOMER_CONTACTS SAMPLE ---');
const { data: ccSample, error: ccErr } = await supabase.from('customer_contacts').select('*').limit(2);
console.log('ccErr:', ccErr);
if (ccSample && ccSample[0]) console.log('customer_contacts keys:', Object.keys(ccSample[0]));
console.log('sample row:', ccSample?.[0]);

console.log('--- CUSTOMERS SAMPLE ---');
const { data: cSample, error: cErr } = await supabase.from('customers').select('*').limit(2);
console.log('cErr:', cErr);
if (cSample && cSample[0]) console.log('customers keys:', Object.keys(cSample[0]));
console.log('sample row:', cSample?.[0]);

console.log('--- SUPPLIERS SAMPLE ---');
const { data: sSample, error: sErr } = await supabase.from('suppliers').select('*').limit(2);
console.log('sErr:', sErr);
if (sSample && sSample[0]) console.log('suppliers keys:', Object.keys(sSample[0]));
console.log('sample row:', sSample?.[0]);

console.log('--- AUDIT_LOGS SAMPLE ---');
const { data: aSample, error: aErr } = await supabase.from('audit_logs').select('*').limit(1);
console.log('aErr:', aErr);
if (aSample && aSample[0]) console.log('audit_logs keys:', Object.keys(aSample[0]));

await supabase.auth.signOut();
