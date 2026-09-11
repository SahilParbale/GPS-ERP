import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const migrationPath = path.resolve('.env.migration');
const env = {};
if (fs.existsSync(migrationPath)) {
  const raw = fs.readFileSync(migrationPath, 'utf8');
  raw.split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length >= 2) env[parts[0]] = parts.slice(1).join('=');
  });
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkNotifPolicies() {
  const { data, error } = await supabase.rpc('execute_sql_query', {
    sql_text: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'notifications';`
  });
  if (error) {
    console.log('Error querying pg_policies via RPC:', error.message);
  } else {
    console.log('Policies on notifications:', data);
  }
}

checkNotifPolicies();
