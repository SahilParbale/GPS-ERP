import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const migrationEnv = fs.readFileSync(path.join(rootDir, '.env.migration'), 'utf8');
const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = migrationEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('=== 1. SPINDLES COLUMNS ===');
const { data: spCols, error: spErr } = await adminClient.from('spindles').select('*').limit(1);
console.log('spindles keys:', Object.keys(spCols[0]));

console.log('=== 2. SPINDLE_MODELS COLUMNS ===');
const { data: modCols, error: modErr } = await adminClient.from('spindle_models').select('*').limit(1);
console.log('spindle_models keys:', Object.keys(modCols[0]));

console.log('=== 3. SPINDLE SAMPLE 1 VALUES ===');
console.log(spCols[0]);

console.log('=== 4. SPINDLE_MODEL SAMPLE 1 VALUES ===');
console.log(modCols[0]);

console.log('=== 5. CHECK USER ROLES (PROD_MGR & OTHERS) ===');
const { data: profiles, error: pErr } = await adminClient
  .from('profiles')
  .select('id, email, full_name, role_id, roles(id, code, name)');

console.log('Profiles and resolved roles:');
(profiles || []).forEach(p => {
  console.log(`  ${p.email.padEnd(35)} -> Role Code: ${p.roles?.code || p.role_id} (${p.roles?.name || ''})`);
});
