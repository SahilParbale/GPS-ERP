import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const url = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const client = createClient(url, anonKey);

async function test() {
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'rahul.patil@gpspindles.com',
    password: 'Password123!'
  });

  console.log('Auth error:', authErr);
  console.log('Auth user:', authData?.user?.email);

  const { data: products, error: prodErr } = await client.from('products').select(`
    id, part_number, sku, name, description, hsn_sac_code, unit_of_measure,
    min_reorder_level, safety_stock, unit_cost_inr, is_active,
    category:product_categories(id, code, name),
    supplier:suppliers(id, supplier_code, name),
    stock(id, warehouse_id, bin_location, quantity_on_hand, quantity_reserved, quantity_available)
  `);

  console.log('Products error:', prodErr);
  console.log('Products count:', products ? products.length : null);
}

test().catch(e => console.error(e));
