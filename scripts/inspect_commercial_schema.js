import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envConfig = fs.readFileSync('.env.migration', 'utf8');
const env = {};
envConfig.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
});

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://eefqamtethlkqhqgdpah.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function inspectSchema() {
  console.log('--- Inspecting Candidate Tables in Supabase ---');

  // If exec_sql RPC doesn't exist, we can query known tables
  const candidateTables = [
    'quotations', 'quotation_items',
    'sales_orders', 'sales_order_items',
    'proforma_invoices', 'proforma_invoice_items',
    'invoices', 'invoice_items',
    'eway_bills',
    'purchase_requisitions', 'purchase_requisition_items',
    'purchase_orders', 'purchase_order_items',
    'inventory_items', 'inventory_transactions', 'stock_movements',
    'warehouse_stocks', 'warehouse_stock', 'inventory_adjustments',
    'goods_receipt_notes', 'grn_items', 'delivery_challans', 'delivery_challan_items'
  ];

  console.log('Checking candidate tables existence:');
  for (const table of candidateTables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      const cols = data && data.length > 0 ? Object.keys(data[0]) : 'empty table';
      console.log(`✓ Table [${table}] EXISTS`);
    } else {
      console.log(`✗ Table [${table}] Error: ${error.message} (${error.code})`);
    }
  }
}

inspectSchema();
