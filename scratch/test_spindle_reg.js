import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

process.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL;
process.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

const { supabase } = await import('../src/services/supabase/supabaseClient.js');
const { spindleModelService } = await import('../src/services/database/spindleModelService.js');

// Sign in as PROD_MGR (suresh.sawant@gpspindles.com)
await supabase.auth.signInWithPassword({
  email: 'suresh.sawant@gpspindles.com',
  password: 'Password123!'
});

console.log('=== TEST NEXT SERIAL SUGGESTION ===');
const suggested = await spindleModelService.getNextSuggestedSerial();
console.log('Suggested Serial:', suggested);

console.log('=== TEST MODELS LIST ===');
const { data: models } = await spindleModelService.getSpindleModels();
console.log(`Loaded ${models?.length} models. First: ${models?.[0]?.model_code} (${models?.[0]?.id})`);

console.log('=== TEST SPINDLE REGISTRATION ===');
const testSerial = `GPS-TEST-${Date.now()}`;
const regRes = await spindleModelService.registerSpindle({
  serial_number: testSerial,
  model_id: models[0].id,
  status: 'In Production',
  notes: 'Automated test spindle'
});

console.log('Registration result:', regRes);

if (regRes.data?.id) {
  console.log('=== TEST DUPLICATE SERIAL REGISTRATION (EXPECT REJECTION) ===');
  const dupRes = await spindleModelService.registerSpindle({
    serial_number: testSerial,
    model_id: models[0].id
  });
  console.log('Duplicate test result (should have error):', dupRes);

  console.log('=== CLEANUP TEST SPINDLE ===');
  const delRes = await spindleModelService.deleteSpindle(regRes.data.id);
  console.log('Delete result:', delRes);
}

await supabase.auth.signOut();
