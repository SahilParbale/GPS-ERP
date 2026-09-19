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

const { data: twins, error: twinErr } = await supabase.from('digital_twins').select('*').limit(3);
console.log('digital_twins count:', twins?.length, 'error:', twinErr);

// Check if triggers exist on spindles
const { data: trigCheck } = await supabase.from('spindles').select('id, serial_number').limit(1);
console.log('Spindle check:', trigCheck);

await supabase.auth.signOut();
