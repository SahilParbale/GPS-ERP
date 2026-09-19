import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envMigrationPath = path.resolve('.env.migration');
const envMigration = {};
if (fs.existsSync(envMigrationPath)) {
  fs.readFileSync(envMigrationPath, 'utf8').split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length >= 2) envMigration[parts[0]] = parts.slice(1).join('=');
  });
}
const url = envMigration.SUPABASE_URL;
const serviceKey = envMigration.SUPABASE_SERVICE_ROLE_KEY;
const client = createClient(url, serviceKey);

async function testValuationQuery() {
  const t0 = Date.now();
  const { data, error } = await client
    .from('stock')
    .select(`
      id,
      bin_location,
      quantity_on_hand,
      quantity_reserved,
      quantity_available,
      last_counted_date,
      updated_at,
      product:products (
        id,
        part_number,
        sku,
        name,
        unit_of_measure,
        unit_cost_inr,
        gst_rate_percent,
        category:product_categories (
          id,
          code,
          name
        )
      ),
      warehouse:warehouses (
        id,
        code,
        name,
        warehouse_type
      )
    `)
    .order('quantity_on_hand', { ascending: false });

  console.log('Query took:', Date.now() - t0, 'ms. Rows:', data?.length, 'Err:', error);
  if (data && data.length > 0) {
    console.log('First row sample:', JSON.stringify(data[0], null, 2));
  }
}
testValuationQuery();
