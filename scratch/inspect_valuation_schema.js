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

async function inspect() {
  console.log('--- Inspecting Warehouses ---');
  const { data: whs } = await client.from('warehouses').select('*');
  console.log('Warehouses count:', whs?.length);
  whs?.forEach(w => console.log('  Warehouse:', w.id, w.code, w.name, w.warehouse_type));

  console.log('\n--- Inspecting Products with Stock & Warehouses ---');
  const { data: prods, error: prodErr } = await client.from('products').select(`
    id,
    part_number,
    sku,
    name,
    unit_of_measure,
    unit_cost_inr,
    gst_rate_percent,
    category:product_categories(id, code, name),
    stock(id, warehouse_id, bin_location, quantity_on_hand, quantity_reserved, quantity_available, warehouse:warehouses(id, code, name))
  `);
  if (prodErr) console.error('prodErr:', prodErr);
  console.log('Products count:', prods?.length);
  let totalGlobalValue = 0;
  let totalUnits = 0;
  const whTotals = {};

  prods?.forEach(p => {
    const cost = Number(p.unit_cost_inr || 0);
    p.stock?.forEach(s => {
      const onHand = Number(s.quantity_on_hand || 0);
      const val = onHand * cost;
      totalGlobalValue += val;
      totalUnits += onHand;
      const whName = s.warehouse?.name || s.warehouse_id || 'Unknown';
      whTotals[whName] = (whTotals[whName] || 0) + val;
      console.log(`  ${p.name} (${p.sku || p.part_number}): On Hand=${onHand}, Cost=${cost}, Val=${val}, WH=${whName}`);
    });
  });

  console.log('\n--- Totals ---');
  console.log('Total Global Units:', totalUnits);
  console.log('Total Global Inventory Value:', totalGlobalValue, '(Formatted: ₹' + totalGlobalValue.toLocaleString('en-IN') + ')');
  console.log('Warehouse Totals:', whTotals);

  console.log('\n--- Inspecting Inventory Transactions ---');
  const { data: txs, error: txErr } = await client.from('inventory_transactions').select('*').limit(5);
  console.log('Inventory Transactions count:', txs?.length, 'Err:', txErr);
  txs?.forEach(t => console.log('  Tx:', t.transaction_number, t.transaction_type, t.quantity_delta, t.unit_cost));
}
inspect();
