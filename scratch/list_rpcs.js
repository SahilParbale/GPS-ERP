import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const migrationEnv = fs.readFileSync('.env.migration', 'utf8');
const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = migrationEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Try to list RPCs or test RPCs
const { data, error } = await adminClient.rpc('get_current_user_roles');
console.log('get_current_user_roles:', { data, error });

const { data: stockRpc, error: stockRpcErr } = await adminClient.rpc('process_stock_mutation', {
  p_product_id: '00000000-0000-0000-0000-000000000000',
  p_warehouse_id: '00000000-0000-0000-0000-000000000000',
  p_quantity: 0,
  p_movement_type: 'INVALID'
});
console.log('process_stock_mutation test:', { stockRpc, stockRpcErr });
