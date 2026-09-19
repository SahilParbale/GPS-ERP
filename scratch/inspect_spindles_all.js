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

const { data, count, error } = await supabase.from('spindles').select('id, serial_number, model_code, status, current_stage, current_location', { count: 'exact' });
console.log('Total spindles count:', count, 'Error:', error);
console.log('All spindles:', data);

const statuses = new Set((data || []).map(s => s.status));
const stages = new Set((data || []).map(s => s.current_stage));
console.log('Distinct status:', Array.from(statuses));
console.log('Distinct current_stage:', Array.from(stages));

await supabase.auth.signOut();
