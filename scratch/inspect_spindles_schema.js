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

console.log('--- SPINDLES SAMPLE & COLUMNS ---');
const { data: spindles, error: spErr } = await supabase.from('spindles').select('*').limit(3);
console.log('spErr:', spErr);
if (spindles && spindles[0]) {
  console.log('spindles keys:', Object.keys(spindles[0]));
  console.log('spindle sample 1:', spindles[0]);
}

console.log('--- SPINDLE_MODELS SAMPLE & COLUMNS ---');
const { data: models, error: modErr } = await supabase.from('spindle_models').select('*').limit(2);
console.log('modErr:', modErr);
if (models && models[0]) {
  console.log('spindle_models keys:', Object.keys(models[0]));
  console.log('spindle_models sample 1:', models[0]);
}

console.log('--- WORK_ORDERS SAMPLE & COLUMNS ---');
const { data: wos, error: woErr } = await supabase.from('work_orders').select('*').limit(2);
console.log('woErr:', woErr);
if (wos && wos[0]) {
  console.log('work_orders keys:', Object.keys(wos[0]));
  console.log('work_orders sample 1:', wos[0]);
}

console.log('--- DISTINCT STATUSES IN SPINDLES ---');
const { data: allSpindles } = await supabase.from('spindles').select('status, manufacturing_status, current_stage');
const statuses = new Set((allSpindles || []).map(s => s.status));
const mfgStatuses = new Set((allSpindles || []).map(s => s.manufacturing_status));
const stages = new Set((allSpindles || []).map(s => s.current_stage));
console.log('Distinct status values:', Array.from(statuses));
console.log('Distinct manufacturing_status values:', Array.from(mfgStatuses));
console.log('Distinct current_stage values:', Array.from(stages));

await supabase.auth.signOut();
