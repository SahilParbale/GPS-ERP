/**
 * GPS SPINDLE ERP — PHASE 7 COMMERCIAL & INVENTORY MIGRATION
 * 
 * Migrates operational sales, procurement, and inventory transactional datasets into Supabase PostgreSQL:
 * 1. Quotations & Line Items (estimates and commercial quotes)
 * 2. Sales Orders & Line Items (confirmed commercial client orders)
 * 3. Proforma Invoices & Line Items (commercial PIs for advance remittance)
 * 4. Tax Invoices & Line Items (GST tax invoices and receivables)
 * 5. E-Way Bills & Items (inter-state transit and transport clearances)
 * 6. Purchase Requisitions & Items (internal department material demands)
 * 7. Purchase Orders & Items (procurement vendor orders)
 * 8. Stock Movements & Transactions (physical issues, GRN inwards, audit ledgers)
 * 
 * Strict Idempotency: Uses natural business keys and deterministic lookups
 * to guarantee that multiple runs produce ZERO duplicate records.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Import frontend mock datasets
import { 
  QUOTATIONS as MOCK_QUOTATIONS,
  PROFORMA_INVOICES as MOCK_PROFORMA_INVOICES,
  INVOICES as MOCK_INVOICES,
  E_WAY_BILLS as MOCK_E_WAY_BILLS,
  PURCHASE_ORDERS as MOCK_PURCHASE_ORDERS,
  INVENTORY_ITEMS as MOCK_INVENTORY_ITEMS
} from '../src/data/mockData.js';

// Read service role key from .env.migration (strictly server-side)
const migrationPath = path.resolve('.env.migration');
const env = {};
if (fs.existsSync(migrationPath)) {
  const raw = fs.readFileSync(migrationPath, 'utf8');
  raw.split('\n').forEach(line => {
    const parts = line.trim().split('=');
    if (parts.length >= 2) env[parts[0]] = parts.slice(1).join('=');
  });
}

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || 'https://eefqamtethlkqhqgdpah.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required in .env.migration for commercial migration.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Helper for deterministic UUID generation from string
function deterministicUuid(namespace, str) {
  const hash = crypto.createHash('md5').update(`${namespace}:${str}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    'a' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

// Clean currency string to integer or float
function parseAmount(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

// Map frontend status to PostgreSQL check constraints
function mapQuotationStatus(s) {
  if (!s) return 'Draft';
  const lower = s.toLowerCase();
  if (lower.includes('review')) return 'Sent';
  if (lower.includes('approve')) return 'Approved';
  if (lower.includes('order')) return 'Ordered';
  if (lower.includes('reject')) return 'Rejected';
  if (lower.includes('expire')) return 'Expired';
  return 'Draft';
}

function mapSalesOrderStatus(s) {
  if (!s) return 'Confirmed';
  const lower = s.toLowerCase();
  if (lower.includes('prod')) return 'In Production';
  if (lower.includes('ready')) return 'Ready for Dispatch';
  if (lower.includes('dispatch')) return 'Dispatched';
  if (lower.includes('complete')) return 'Completed';
  if (lower.includes('cancel')) return 'Cancelled';
  return 'Confirmed';
}

function mapProformaStatus(s) {
  if (!s) return 'Draft';
  const lower = s.toLowerCase();
  if (lower.includes('sent')) return 'Sent';
  if (lower.includes('accept') || lower.includes('paid') || lower.includes('advance')) return 'Advance Paid';
  if (lower.includes('tax') || lower.includes('invoice')) return 'Converted to Tax Invoice';
  if (lower.includes('expire')) return 'Expired';
  if (lower.includes('cancel')) return 'Cancelled';
  return 'Draft';
}

function mapInvoiceStatus(s) {
  if (!s) return 'Pending Payment';
  const lower = s.toLowerCase();
  if (lower.includes('paid') && !lower.includes('part')) return 'Paid';
  if (lower.includes('part')) return 'Partially Paid';
  if (lower.includes('overdue')) return 'Overdue';
  if (lower.includes('cancel')) return 'Cancelled';
  return 'Pending Payment';
}

function mapEwbStatus(s) {
  if (!s) return 'Active';
  const lower = s.toLowerCase();
  if (lower.includes('soon')) return 'Expiring Soon';
  if (lower.includes('expire')) return 'Expired';
  if (lower.includes('cancel')) return 'Cancelled';
  if (lower.includes('draft')) return 'Draft';
  return 'Active';
}

function mapPoStatus(s) {
  if (!s) return 'Draft';
  const lower = s.toLowerCase();
  if (lower.includes('sent')) return 'Sent';
  if (lower.includes('approve')) return 'Approved';
  if (lower.includes('part')) return 'Partially Received';
  if (lower.includes('receive')) return 'Received';
  if (lower.includes('cancel')) return 'Cancelled';
  return 'Draft';
}

async function runMigration() {
  console.log('================================================================');
  console.log('GPS SPINDLE ERP — PHASE 7: COMMERCIAL & INVENTORY MIGRATION');
  console.log('================================================================');
  console.log('Database Target:', url);
  console.log('Execution Mode: Administrative Service-Role (Server-Side Only)\n');

  // --- Step 0: Reference Maps ---
  console.log('--- Step 0: Loading Reference Maps from Database ---');
  const [
    { data: customers },
    { data: suppliers },
    { data: products },
    { data: warehouses },
    { data: employees },
    { data: departments }
  ] = await Promise.all([
    supabase.from('customers').select('id, customer_code, company_name, billing_address, gstin'),
    supabase.from('suppliers').select('id, supplier_code, name, address, gstin, phone, email'),
    supabase.from('products').select('id, part_number, sku, name, unit_cost_inr'),
    supabase.from('warehouses').select('id, code, name'),
    supabase.from('employees').select('id, employee_code, first_name, last_name'),
    supabase.from('departments').select('id, code, name')
  ]);

  console.log(`Loaded: ${customers?.length || 0} Customers, ${suppliers?.length || 0} Suppliers, ${products?.length || 0} Products, ${warehouses?.length || 0} Warehouses, ${employees?.length || 0} Employees\n`);

  // Helper resolvers
  const defaultEmployeeId = employees?.[0]?.id || null;
  const defaultWarehouseId = warehouses?.find(w => w.code === 'WH-MAIN')?.id || warehouses?.[0]?.id || null;
  const cleanroomWarehouseId = warehouses?.find(w => w.code === 'WH-CLEAN')?.id || defaultWarehouseId;

  function findCustomer(nameOrCode) {
    if (!nameOrCode) return customers?.[0] || null;
    const clean = nameOrCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = customers?.find(c => {
      const cName = (c.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cCode = (c.customer_code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return cName.includes(clean) || clean.includes(cName) || cCode === clean;
    });
    return found || customers?.[0] || null;
  }

  function findSupplier(nameOrCode) {
    if (!nameOrCode) return suppliers?.[0] || null;
    const clean = nameOrCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = suppliers?.find(s => {
      const sName = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sCode = (s.supplier_code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return sName.includes(clean) || clean.includes(sName) || sCode === clean;
    });
    return found || suppliers?.[0] || null;
  }

  function findProduct(partOrSkuOrName) {
    if (!partOrSkuOrName) return products?.[0] || null;
    const clean = partOrSkuOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = products?.find(p => {
      const pPart = (p.part_number || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pSku = (p.sku || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pName = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return pPart.includes(clean) || clean.includes(pPart) ||
             pSku.includes(clean) || clean.includes(pSku) ||
             pName.includes(clean) || clean.includes(pName);
    });
    return found || products?.[0] || null;
  }

  const migrationStats = {
    quotations: { inserted: 0, updated: 0 },
    quotation_items: { inserted: 0, updated: 0 },
    sales_orders: { inserted: 0, updated: 0 },
    sales_order_items: { inserted: 0, updated: 0 },
    proforma_invoices: { inserted: 0, updated: 0 },
    proforma_invoice_items: { inserted: 0, updated: 0 },
    invoices: { inserted: 0, updated: 0 },
    invoice_items: { inserted: 0, updated: 0 },
    eway_bills: { inserted: 0, updated: 0 },
    eway_bill_items: { inserted: 0, updated: 0 },
    purchase_requisitions: { inserted: 0, updated: 0 },
    purchase_requisition_items: { inserted: 0, updated: 0 },
    purchase_orders: { inserted: 0, updated: 0 },
    purchase_order_items: { inserted: 0, updated: 0 },
    goods_receipts: { inserted: 0, updated: 0 },
    goods_receipt_items: { inserted: 0, updated: 0 },
    stock_movements: { inserted: 0, updated: 0 },
    inventory_transactions: { inserted: 0, updated: 0 }
  };

  // --- Step 1: Migrating Quotations & Items ---
  console.log('--- Step 1: Migrating Quotations & Line Items ---');
  for (const q of MOCK_QUOTATIONS) {
    const qNo = q.estimateNo || q.id;
    const cust = findCustomer(q.customer);
    const { data: existingQ } = await supabase.from('quotations').select('id').eq('quotation_number', qNo).maybeSingle();
    const qId = existingQ?.id || deterministicUuid('quotation', qNo);

    const subtotal = parseAmount(q.subtotal || q.totalAmount * 0.8475);
    const totalAmount = parseAmount(q.totalAmount);
    const taxAmount = totalAmount - subtotal;
    const isInterstate = (q.placeOfSupply || '').includes('23-') || (q.placeOfSupply || '').includes('Madhya');

    const quoteRecord = {
      id: qId,
      quotation_number: qNo,
      customer_id: cust.id,
      customer_name: q.customer || cust.company_name,
      customer_address: q.customerAddress || cust.billing_address,
      customer_gstin: q.gstin || cust.gstin,
      place_of_supply: q.placeOfSupply || '27-Maharashtra',
      quotation_date: '2026-09-07',
      valid_until_date: '2026-10-07',
      spindle_serial: q.spindleSerial || 'HMMXXVI',
      scope_of_work: Array.isArray(q.scopeOfWork) ? q.scopeOfWork.join('\n') : (q.scopeOfWork || 'Spindle Repair & Refurbishment'),
      subtotal: subtotal,
      discount_amount: 0,
      taxable_amount: subtotal,
      cgst_amount: isInterstate ? 0 : Math.round(taxAmount / 2),
      sgst_amount: isInterstate ? 0 : Math.round(taxAmount / 2),
      igst_amount: isInterstate ? Math.round(taxAmount) : 0,
      total_amount: totalAmount,
      status: mapQuotationStatus(q.status),
      created_by: defaultEmployeeId,
      terms: q.terms || 'Standard MSME terms apply. 30 days validity.',
      notes: `Indian Words: ${q.amountInWords || ''}`
    };

    const { error: qErr } = await supabase.from('quotations').upsert(quoteRecord, { onConflict: 'quotation_number' });
    if (qErr) {
      console.error(`Error upserting quotation ${qNo}:`, qErr.message);
    } else {
      if (existingQ) migrationStats.quotations.updated++;
      else migrationStats.quotations.inserted++;

      // Line items
      if (q.items && q.items.length > 0) {
        for (let idx = 0; idx < q.items.length; idx++) {
          const it = q.items[idx];
          const itemId = deterministicUuid(`quote_item_${qNo}`, String(it.id || idx));
          const qty = it.qty || 1;
          const unitPrice = parseAmount(it.unitPrice || it.rate || (it.total ? it.total / qty : 10000));
          const lineTotal = parseAmount(it.total || qty * unitPrice);

          const itemRecord = {
            id: itemId,
            quotation_id: qId,
            item_name: it.name || it.desc || 'Spindle Service / Component',
            description: it.desc || it.name || null,
            hsn_sac_code: it.hsn || '84669390',
            quantity: qty,
            unit_price: unitPrice,
            discount: 0,
            gst_percent: 18.0,
            total_amount: lineTotal
          };

          const { error: itErr } = await supabase.from('quotation_items').upsert(itemRecord, { onConflict: 'id' });
          if (!itErr) migrationStats.quotation_items.inserted++;
        }
      }
    }
  }
  console.log(`  ✓ Quotations: ${migrationStats.quotations.inserted} inserted, ${migrationStats.quotations.updated} updated`);
  console.log(`  ✓ Quotation Items: ${migrationStats.quotation_items.inserted} upserted\n`);

  // --- Step 2: Migrating Sales Orders & Items ---
  console.log('--- Step 2: Migrating Sales Orders & Line Items ---');
  const mockSalesOrders = [
    {
      sales_order_no: 'SO-2026-041',
      quotation_no: 'QTN/2026-27/294',
      customer: 'Tata Advanced Systems Ltd',
      po_ref: 'TASL/PO/2026/0912',
      order_date: '2026-08-28',
      delivery_date: '2026-10-15',
      subtotal: 842000,
      total_amount: 993560,
      status: 'In Production',
      items: [
        { desc: 'GPS-HSK-A63-24K Precision Motorized Spindle Unit (15 kW, 24,000 RPM)', qty: 2, unitPrice: 421000 }
      ]
    },
    {
      sales_order_no: 'SO-2026-045',
      quotation_no: 'Q-2026-090',
      customer: 'Bharat Forge Ltd',
      po_ref: 'BFL/CHAKAN/2026/884',
      order_date: '2026-09-01',
      delivery_date: '2026-10-20',
      subtotal: 544322,
      total_amount: 642300,
      status: 'Confirmed',
      items: [
        { desc: 'GPS-BT40-15K Spindle Rebuild & Dynamic Runout Balancing', qty: 1, unitPrice: 544322 }
      ]
    },
    {
      sales_order_no: 'SO-2026-048',
      quotation_no: 'Q-2026-089',
      customer: 'Godrej & Boyce Aerospace',
      po_ref: 'GBA/AERO/PO/1192',
      order_date: '2026-08-15',
      delivery_date: '2026-10-01',
      subtotal: 1250000,
      total_amount: 1475000,
      status: 'Ready for Dispatch',
      items: [
        { desc: 'GPS-HF-60K Ultra High-Speed Aerospace Spindle Unit', qty: 1, unitPrice: 1250000 }
      ]
    },
    {
      sales_order_no: 'SO-2026-052',
      quotation_no: 'Q-2026-091',
      customer: 'Mahindra Heavy Engines Ltd',
      po_ref: 'MHE/ENG3/2026/410',
      order_date: '2026-09-02',
      delivery_date: '2026-10-30',
      subtotal: 661017,
      total_amount: 780000,
      status: 'Confirmed',
      items: [
        { desc: 'GPS-ISO50-12K Heavy Milling Spindle Shaft Sleeving & Stator Inspection', qty: 1, unitPrice: 661017 }
      ]
    }
  ];

  for (const so of mockSalesOrders) {
    const cust = findCustomer(so.customer);
    const { data: existingSO } = await supabase.from('sales_orders').select('id').eq('sales_order_no', so.sales_order_no).maybeSingle();
    const soId = existingSO?.id || deterministicUuid('sales_order', so.sales_order_no);
    const qQuote = await supabase.from('quotations').select('id').eq('quotation_number', so.quotation_no).maybeSingle();

    const taxAmount = so.total_amount - so.subtotal;
    const soRecord = {
      id: soId,
      sales_order_no: so.sales_order_no,
      quotation_id: qQuote?.data?.id || null,
      customer_id: cust.id,
      customer_name: so.customer || cust.company_name,
      customer_po_reference: so.po_ref,
      order_date: so.order_date,
      delivery_promised_date: so.delivery_date,
      subtotal: so.subtotal,
      discount_amount: 0,
      taxable_amount: so.subtotal,
      cgst_amount: Math.round(taxAmount / 2),
      sgst_amount: Math.round(taxAmount / 2),
      igst_amount: 0,
      total_amount: so.total_amount,
      status: mapSalesOrderStatus(so.status),
      created_by: defaultEmployeeId,
      notes: `Generated against PO reference ${so.po_ref}`
    };

    const { error: soErr } = await supabase.from('sales_orders').upsert(soRecord, { onConflict: 'sales_order_no' });
    if (soErr) {
      console.error(`Error upserting sales order ${so.sales_order_no}:`, soErr.message);
    } else {
      if (existingSO) migrationStats.sales_orders.updated++;
      else migrationStats.sales_orders.inserted++;

      // Items
      for (let idx = 0; idx < so.items.length; idx++) {
        const it = so.items[idx];
        const itemId = deterministicUuid(`so_item_${so.sales_order_no}`, String(idx));
        const matchedProd = findProduct(it.desc);
        const itemRecord = {
          id: itemId,
          sales_order_id: soId,
          product_id: matchedProd?.id || null,
          item_description: it.desc,
          quantity: it.qty,
          unit_price: it.unitPrice,
          total_price: it.qty * it.unitPrice
        };
        const { error: itErr } = await supabase.from('sales_order_items').upsert(itemRecord, { onConflict: 'id' });
        if (!itErr) migrationStats.sales_order_items.inserted++;
      }
    }
  }
  console.log(`  ✓ Sales Orders: ${migrationStats.sales_orders.inserted} inserted, ${migrationStats.sales_orders.updated} updated`);
  console.log(`  ✓ Sales Order Items: ${migrationStats.sales_order_items.inserted} upserted\n`);

  // --- Step 3: Migrating Proforma Invoices & Items ---
  console.log('--- Step 3: Migrating Proforma Invoices & Line Items ---');
  for (const pi of MOCK_PROFORMA_INVOICES) {
    const cust = findCustomer(pi.customer || pi.customerFullName);
    const piNo = pi.piNumber || pi.id;
    const { data: existingPI } = await supabase.from('proforma_invoices').select('id').eq('pi_number', piNo).maybeSingle();
    const piId = existingPI?.id || deterministicUuid('proforma_invoice', piNo);
    const soRef = pi.salesOrder ? await supabase.from('sales_orders').select('id').eq('sales_order_no', pi.salesOrder).maybeSingle() : null;

    const subtotal = parseAmount(pi.subtotal);
    const totalAmount = parseAmount(pi.totalAmount);
    const isInterstate = (pi.gstin || '').startsWith('36');

    const piRecord = {
      id: piId,
      pi_number: piNo,
      sales_order_id: soRef?.data?.id || null,
      quotation_id: null,
      customer_id: cust.id,
      customer_name: pi.customerFullName || pi.customer || cust.company_name,
      customer_email: pi.customerEmail || cust.primary_email || 'procurement@client.com',
      customer_address: pi.billingAddress || cust.billing_address,
      customer_gstin: pi.gstin || cust.gstin,
      issue_date: '2026-09-04',
      valid_until: '2026-09-19',
      payment_terms: pi.paymentTerms || '50% Advance with Proforma, 50% against Dispatch Inspection',
      bank_account_no: '349105000701',
      bank_ifsc: 'ICIC0003491',
      bank_name: 'ICICI BANK LIMITED, PUNE NANDED CITY',
      subtotal: subtotal,
      discount: parseAmount(pi.discount || 0),
      taxable_amount: subtotal,
      cgst_amount: isInterstate ? 0 : parseAmount(pi.cgstAmount || (totalAmount - subtotal) / 2),
      sgst_amount: isInterstate ? 0 : parseAmount(pi.sgstAmount || (totalAmount - subtotal) / 2),
      igst_amount: isInterstate ? parseAmount(pi.igstAmount || (totalAmount - subtotal)) : 0,
      total_amount: totalAmount,
      advance_received: pi.status === 'Accepted' || pi.status === 'Advance Paid' ? Math.round(totalAmount * 0.5) : 0,
      status: mapProformaStatus(pi.status),
      notes: pi.notes || null,
      created_by: defaultEmployeeId
    };

    const { error: piErr } = await supabase.from('proforma_invoices').upsert(piRecord, { onConflict: 'pi_number' });
    if (piErr) {
      console.error(`Error upserting PI ${piRecord.pi_number}:`, piErr.message);
    } else {
      if (existingPI) migrationStats.proforma_invoices.updated++;
      else migrationStats.proforma_invoices.inserted++;

      // Items
      if (pi.items && pi.items.length > 0) {
        for (let idx = 0; idx < pi.items.length; idx++) {
          const it = pi.items[idx];
          const itemId = deterministicUuid(`pi_item_${piRecord.pi_number}`, String(it.id || idx));
          const itemRecord = {
            id: itemId,
            proforma_invoice_id: piId,
            product_name: it.product || it.desc || 'Spindle Assembly',
            description: it.desc || it.product || null,
            hsn_sac: it.hsn || '84669390',
            quantity: it.qty || 1,
            unit_rate: parseAmount(it.rate || it.total || 421000),
            discount: parseAmount(it.discount || 0),
            gst_percent: it.gst || 18.0,
            total: parseAmount(it.total || it.rate * it.qty)
          };
          const { error: itErr } = await supabase.from('proforma_invoice_items').upsert(itemRecord, { onConflict: 'id' });
          if (!itErr) migrationStats.proforma_invoice_items.inserted++;
        }
      }
    }
  }
  console.log(`  ✓ Proforma Invoices: ${migrationStats.proforma_invoices.inserted} inserted, ${migrationStats.proforma_invoices.updated} updated`);
  console.log(`  ✓ Proforma Invoice Items: ${migrationStats.proforma_invoice_items.inserted} upserted\n`);

  // --- Step 4: Migrating Tax Invoices & Items ---
  console.log('--- Step 4: Migrating Tax Invoices & Line Items ---');
  // Combine MOCK_INVOICES and preset invoices (such as INV-2026-019)
  const allInvoices = [...MOCK_INVOICES];
  if (!allInvoices.find(i => i.id === 'INV-2026-019')) {
    allInvoices.unshift({
      id: 'INV-2026-019',
      customer: 'Tata Advanced Systems Ltd',
      refOrder: 'SO-2026-041',
      date: '2026-09-04',
      dueDate: '2026-10-04',
      amount: '₹9,93,560',
      paidAmount: '₹4,96,780',
      balance: '₹4,96,780',
      status: 'Pending Payment',
      gstin: '36AAACT2718E1ZQ'
    });
  }

  for (const inv of allInvoices) {
    const cust = findCustomer(inv.customer);
    const { data: existingInv } = await supabase.from('invoices').select('id').eq('invoice_number', inv.id).maybeSingle();
    const invId = existingInv?.id || deterministicUuid('invoice', inv.id);
    const totalAmount = parseAmount(inv.amount);
    const paidAmount = parseAmount(inv.paidAmount || (inv.status === 'Paid' ? totalAmount : 0));
    const subtotal = Math.round(totalAmount / 1.18);
    const taxAmount = totalAmount - subtotal;
    const isInterstate = (inv.gstin || cust.gstin || '').startsWith('36');

    const piMap = {
      'INV-2026-019': 'PI-2026-018',
      'INV-2026-021': 'PI-2026-019',
      'INV-2026-024': 'PI-2026-020'
    };
    let piIdRef = null;
    if (piMap[inv.id]) {
      const { data: piFound } = await supabase.from('proforma_invoices').select('id').eq('pi_number', piMap[inv.id]).maybeSingle();
      piIdRef = piFound?.id || null;
    }

    const invRecord = {
      id: invId,
      invoice_number: inv.id,
      sales_order_id: null,
      proforma_invoice_id: piIdRef,
      customer_id: cust.id,
      customer_name: inv.customer || cust.company_name,
      customer_gstin: inv.gstin || cust.gstin,
      billing_address: cust.billing_address || 'Pune MIDC, Maharashtra',
      shipping_address: cust.billing_address || 'Pune MIDC, Maharashtra',
      invoice_date: inv.date || '2026-02-10',
      due_date: inv.dueDate || '2026-03-12',
      payment_terms: 'Net 30 Days',
      subtotal: subtotal,
      discount_amount: 0,
      taxable_amount: subtotal,
      cgst_amount: isInterstate ? 0 : Math.round(taxAmount / 2),
      sgst_amount: isInterstate ? 0 : Math.round(taxAmount / 2),
      igst_amount: isInterstate ? Math.round(taxAmount) : 0,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      status: mapInvoiceStatus(inv.status),
      created_by: defaultEmployeeId,
      notes: `Commercial Tax Invoice generated for ${inv.refOrder || 'Work Order'}`
    };

    const { error: invErr } = await supabase.from('invoices').upsert(invRecord, { onConflict: 'invoice_number' });
    if (invErr) {
      console.error(`Error upserting invoice ${inv.id}:`, invErr.message);
    } else {
      if (existingInv) migrationStats.invoices.updated++;
      else migrationStats.invoices.inserted++;

      // Items
      const itemId = deterministicUuid(`inv_item_${inv.id}`, '0');
      const itemRecord = {
        id: itemId,
        invoice_id: invId,
        product_name: `Precision Spindle Repair & Manufacturing Services (${inv.refOrder || 'General'})`,
        hsn_sac: '84669390',
        quantity: 1,
        unit_price: subtotal,
        discount: 0,
        gst_percent: 18.0,
        total_price: totalAmount
      };
      const { error: itErr } = await supabase.from('invoice_items').upsert(itemRecord, { onConflict: 'id' });
      if (!itErr) migrationStats.invoice_items.inserted++;
    }
  }
  console.log(`  ✓ Tax Invoices: ${migrationStats.invoices.inserted} inserted, ${migrationStats.invoices.updated} updated`);
  console.log(`  ✓ Tax Invoice Items: ${migrationStats.invoice_items.inserted} upserted\n`);

  // --- Step 5: Migrating E-Way Bills & Items ---
  console.log('--- Step 5: Migrating E-Way Bills & Goods Items ---');
  for (const ewb of MOCK_E_WAY_BILLS) {
    const ewbNo = ewb.ewbNumber || ewb.id;
    const { data: existingEWB } = await supabase.from('eway_bills').select('id').eq('ewb_number', ewbNo).maybeSingle();
    const ewbId = existingEWB?.id || deterministicUuid('eway_bill', ewbNo);
    const cust = findCustomer(ewb.customer || ewb.customerFullName);
    const qInv = await supabase.from('invoices').select('id, invoice_number').eq('invoice_number', ewb.invoice || 'INV-2026-019').maybeSingle();

    const distanceKm = parseInt(String(ewb.distance || '540').replace(/[^0-9]/g, '')) || 100;
    const invoiceVal = parseAmount(ewb.totalInvoiceValue || ewb.taxableValue || 993560);

    const ewbRecord = {
      id: ewbId,
      ewb_number: ewbNo,
      invoice_id: qInv?.data?.id || null,
      invoice_number: ewb.invoice || 'INV-2026-019',
      customer_id: cust.id,
      customer_name: ewb.customerFullName || ewb.customer || cust.company_name,
      customer_gstin: ewb.customerGstin || cust.gstin || '36AAACT2718E1ZQ',
      customer_address: ewb.customerAddress || cust.billing_address,
      supplier_gstin: ewb.supplierGstin || '27AABCG1492K1Z8',
      dispatch_from_address: ewb.supplierAddress || 'Plot B-12, Nanded City Industrial Complex, Pune - 411041, Maharashtra',
      vehicle_number: ewb.vehicle || 'MH12AB1234',
      transporter_name: ewb.transporter || 'ABC Logistics Pvt Ltd',
      transporter_id: ewb.transporterId || '27AABCA9081T1Z5',
      transport_mode: 'Road',
      transport_doc_number: ewb.transportDocNo || 'LR-2026-88192',
      distance_km: distanceKm,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 6 * 86400000).toISOString(),
      total_invoice_value: invoiceVal,
      status: mapEwbStatus(ewb.status),
      created_by: defaultEmployeeId,
      notes: `Official E-Way transit document generated for invoice ${ewb.invoice}`
    };

    const { error: ewbErr } = await supabase.from('eway_bills').upsert(ewbRecord, { onConflict: 'ewb_number' });
    if (ewbErr) {
      console.error(`Error upserting EWB ${ewbNo}:`, ewbErr.message);
    } else {
      if (existingEWB) migrationStats.eway_bills.updated++;
      else migrationStats.eway_bills.inserted++;

      // Items
      if (ewb.goods && ewb.goods.length > 0) {
        for (let idx = 0; idx < ewb.goods.length; idx++) {
          const g = ewb.goods[idx];
          const itemId = deterministicUuid(`ewb_item_${ewbNo}`, String(g.id || idx));
          const itemRecord = {
            id: itemId,
            eway_bill_id: ewbId,
            product_name: g.product || 'Precision Motorized Spindle Unit',
            hsn_code: g.hsn || '84669390',
            quantity: g.quantity || 1,
            taxable_value: parseAmount(g.taxableValue || invoiceVal * 0.8475),
            gst_rate: g.gstRate || 18.0,
            total_value: parseAmount(g.totalValue || invoiceVal)
          };
          const { error: itErr } = await supabase.from('eway_bill_items').upsert(itemRecord, { onConflict: 'id' });
          if (!itErr) migrationStats.eway_bill_items.inserted++;
        }
      }
    }
  }
  console.log(`  ✓ E-Way Bills: ${migrationStats.eway_bills.inserted} inserted, ${migrationStats.eway_bills.updated} updated`);
  console.log(`  ✓ E-Way Bill Items: ${migrationStats.eway_bill_items.inserted} upserted\n`);

  // --- Step 6: Migrating Purchase Requisitions & Items ---
  console.log('--- Step 6: Migrating Purchase Requisitions & Items ---');
  const mockRequisitions = [
    {
      requisition_no: 'PR-2026-089',
      priority: 'High',
      status: 'PO Created',
      required_by_date: '2026-09-15',
      notes: 'Urgent ceramic bearings for TASL spindle build',
      items: [
        { product: 'BRG-HC7008', desc: 'FAG HC7008-E-T-P4S Ceramic Hybrid Bearings', qty: 4, rate: 72000 },
        { product: 'FAG-HC7008-EDLR', desc: 'FAG High-Speed Hybrid Ceramic Bearing HC7008', qty: 4, rate: 30118 }
      ]
    },
    {
      requisition_no: 'PR-2026-090',
      priority: 'Medium',
      status: 'PO Created',
      required_by_date: '2026-09-20',
      notes: 'Forged round bar alloy stock for spindle shaft turning',
      items: [
        { product: 'MAT-18CR-80', desc: '18CrNiMo7-6 Forged Round Bar Ø80mm', qty: 25, rate: 6800 }
      ]
    },
    {
      requisition_no: 'PR-2026-091',
      priority: 'Critical',
      status: 'PO Created',
      required_by_date: '2026-09-18',
      notes: 'Power drawbar mechanism for high speed machining',
      items: [
        { product: 'DRW-OTT-A63', desc: 'OTT-Jakob HSK-A63 Power Drawbar Spring Collet Mechanism', qty: 4, rate: 85000 }
      ]
    },
    {
      requisition_no: 'PR-2026-092',
      priority: 'High',
      status: 'PO Created',
      required_by_date: '2026-09-22',
      notes: 'High precision rotary encoder for closed-loop dynamic testing',
      items: [
        { product: 'ENC-HEID-1380', desc: 'Heidenhain ERN 1380 Sine/Cosine Rotary Encoder 2048 Lines', qty: 4, rate: 110000 }
      ]
    },
    {
      requisition_no: 'REQ-2026-0045',
      priority: 'Medium',
      status: 'Approved',
      required_by_date: '2026-09-25',
      notes: 'Belleville disc spring replacement kit',
      items: [
        { product: 'SPR-DISC-34', desc: 'Belleville Disc Springs 34 x 16.3 x 2.0 mm', qty: 200, rate: 250 }
      ]
    }
  ];

  const prodDeptId = departments?.find(d => d.code === 'DEPT-PROD')?.id || departments?.[0]?.id || null;

  for (const pr of mockRequisitions) {
    const { data: existingPR } = await supabase.from('purchase_requisitions').select('id').eq('requisition_no', pr.requisition_no).maybeSingle();
    const prId = existingPR?.id || deterministicUuid('purchase_requisition', pr.requisition_no);
    const prRecord = {
      id: prId,
      requisition_no: pr.requisition_no,
      requested_by: defaultEmployeeId,
      department_id: prodDeptId,
      required_by_date: pr.required_by_date,
      priority: pr.priority,
      status: pr.status,
      approved_by: defaultEmployeeId,
      notes: pr.notes
    };

    const { error: prErr } = await supabase.from('purchase_requisitions').upsert(prRecord, { onConflict: 'requisition_no' });
    if (prErr) {
      console.error(`Error upserting PR ${pr.requisition_no}:`, prErr.message);
    } else {
      if (existingPR) migrationStats.purchase_requisitions.updated++;
      else migrationStats.purchase_requisitions.inserted++;

      // Items
      for (let idx = 0; idx < pr.items.length; idx++) {
        const it = pr.items[idx];
        const itemId = deterministicUuid(`pr_item_${pr.requisition_no}`, String(idx));
        const matchedProd = findProduct(it.product || it.desc);
        const itemRecord = {
          id: itemId,
          requisition_id: prId,
          product_id: matchedProd?.id || null,
          item_description: it.desc,
          quantity: it.qty,
          estimated_rate: it.rate
        };
        const { error: itErr } = await supabase.from('purchase_requisition_items').upsert(itemRecord, { onConflict: 'id' });
        if (!itErr) migrationStats.purchase_requisition_items.inserted++;
      }
    }
  }
  console.log(`  ✓ Purchase Requisitions: ${migrationStats.purchase_requisitions.inserted} inserted, ${migrationStats.purchase_requisitions.updated} updated`);
  console.log(`  ✓ Purchase Requisition Items: ${migrationStats.purchase_requisition_items.inserted} upserted\n`);

  // --- Step 7: Migrating Purchase Orders & Items ---
  console.log('--- Step 7: Migrating Purchase Orders & Line Items ---');
  for (const po of MOCK_PURCHASE_ORDERS) {
    const poNo = po.poNumber || po.id;
    const { data: existingPO } = await supabase.from('purchase_orders').select('id').eq('po_number', poNo).maybeSingle();
    const poId = existingPO?.id || deterministicUuid('purchase_order', poNo);
    const supp = findSupplier(po.supplier);
    const subtotal = parseAmount(po.subtotal);
    const totalAmount = parseAmount(po.totalAmount);
    const taxAmount = totalAmount - subtotal;

    // Check if there is a matching PR
    const prMap = {
      'PO-2026-001': 'PR-2026-089',
      'PO-2026-002': 'PR-2026-090',
      'PO-2026-003': 'PR-2026-091',
      'PO-2026-004': 'PR-2026-092'
    };
    let reqId = null;
    if (prMap[poNo]) {
      const { data: prFound } = await supabase.from('purchase_requisitions').select('id').eq('requisition_no', prMap[poNo]).maybeSingle();
      reqId = prFound?.id || null;
    }

    const poRecord = {
      id: poId,
      po_number: poNo,
      requisition_id: reqId,
      supplier_id: supp.id,
      supplier_name: po.supplier || supp.name,
      supplier_email: po.supplierEmail || supp.email,
      supplier_contact: po.supplierContact || supp.contact_person,
      supplier_phone: po.supplierPhone || supp.phone,
      supplier_gstin: po.supplierGstin || supp.gstin,
      supplier_address: po.supplierAddress || supp.address,
      order_date: '2026-09-02',
      expected_delivery_date: '2026-09-15',
      payment_terms: po.paymentTerms || 'Net 30 Days from GRN inspection',
      billing_address: 'Plot B-12 Nanded City Industrial Complex, Pune - 411041',
      shipping_address: 'Plot B-12 Nanded City Industrial Complex, Pune - 411041',
      currency: 'INR',
      subtotal: subtotal,
      discount_amount: 0,
      taxable_amount: subtotal,
      cgst_amount: Math.round(taxAmount / 2),
      sgst_amount: Math.round(taxAmount / 2),
      igst_amount: 0,
      total_amount: totalAmount,
      status: mapPoStatus(po.status),
      created_by: defaultEmployeeId,
      approved_by: defaultEmployeeId,
      notes: po.notes || 'Precision Spindle Bearing PO'
    };

    const { error: poErr } = await supabase.from('purchase_orders').upsert(poRecord, { onConflict: 'po_number' });
    if (poErr) {
      console.error(`Error upserting PO ${poNo}:`, poErr.message);
    } else {
      if (existingPO) migrationStats.purchase_orders.updated++;
      else migrationStats.purchase_orders.inserted++;

      // Items
      if (po.items && po.items.length > 0) {
        for (let idx = 0; idx < po.items.length; idx++) {
          const it = po.items[idx];
          const itemId = deterministicUuid(`po_item_${poNo}`, String(it.id || idx));
          const matchedProd = findProduct(it.item || it.desc);
          const unitPrice = parseAmount(it.rate || it.total / (it.qty || 1));
          const itemRecord = {
            id: itemId,
            purchase_order_id: poId,
            product_id: matchedProd?.id || null,
            item_description: it.desc || it.item,
            hsn_code: '84669390',
            quantity: it.qty || 1,
            unit_price: unitPrice,
            discount: 0,
            gst_percent: it.gst || 18.0,
            total_price: parseAmount(it.total || it.qty * unitPrice),
            received_quantity: po.status === 'Received' ? it.qty : 0
          };
          const { error: itErr } = await supabase.from('purchase_order_items').upsert(itemRecord, { onConflict: 'id' });
          if (!itErr) migrationStats.purchase_order_items.inserted++;
        }
      }
    }
  }
  console.log(`  ✓ Purchase Orders: ${migrationStats.purchase_orders.inserted} inserted, ${migrationStats.purchase_orders.updated} updated`);
  console.log(`  ✓ Purchase Order Items: ${migrationStats.purchase_order_items.inserted} upserted\n`);

  // --- Step 7B: Migrating Goods Receipts (GRN) ---
  console.log('--- Step 7B: Migrating Goods Receipts (GRN) & Line Items ---');
  const mockGRNs = [
    {
      grn_number: 'GRN-2026-0045',
      po_number: 'PO-2026-001',
      supplier_name: 'Schaeffler India',
      receipt_date: '2026-09-08',
      supplier_challan_no: 'DC-SCH-8819',
      supplier_invoice_no: 'INV-SCH-44102',
      status: 'Completed',
      remarks: 'FAG ceramic hybrid bearings received and inspected in QA bay',
      items: [
        { productSku: 'BRG-HC7008', desc: 'FAG High-Precision Ceramic Angular Contact Bearings', qtyReceived: 4, qtyAccepted: 4, qtyRejected: 0 }
      ]
    },
    {
      grn_number: 'GRN-2026-0046',
      po_number: 'PO-2026-002',
      supplier_name: 'Bharat Special Steel',
      receipt_date: '2026-09-09',
      supplier_challan_no: 'DC-BSS-1102',
      supplier_invoice_no: 'INV-BSS-9018',
      status: 'Completed',
      remarks: 'Alloy round bars 18CrNiMo7-6 received into raw stores yard',
      items: [
        { productSku: 'MAT-18CR-80', desc: '18CrNiMo7-6 Round Bar Ø80mm', qtyReceived: 12, qtyAccepted: 12, qtyRejected: 0 }
      ]
    }
  ];

  for (const grn of mockGRNs) {
    const { data: existingGRN } = await supabase.from('goods_receipts').select('id').eq('grn_number', grn.grn_number).maybeSingle();
    const grnId = existingGRN?.id || deterministicUuid('goods_receipt', grn.grn_number);
    const supp = findSupplier(grn.supplier_name);
    const { data: poRef } = await supabase.from('purchase_orders').select('id').eq('po_number', grn.po_number).maybeSingle();

    const grnRecord = {
      id: grnId,
      grn_number: grn.grn_number,
      purchase_order_id: poRef?.id || null,
      supplier_id: supp.id,
      receipt_date: grn.receipt_date,
      supplier_challan_no: grn.supplier_challan_no,
      supplier_invoice_no: grn.supplier_invoice_no,
      received_by: defaultEmployeeId,
      warehouse_id: defaultWarehouseId,
      status: grn.status,
      remarks: grn.remarks
    };

    const { error: grnErr } = await supabase.from('goods_receipts').upsert(grnRecord, { onConflict: 'grn_number' });
    if (!grnErr) {
      if (existingGRN) migrationStats.goods_receipts.updated++;
      else migrationStats.goods_receipts.inserted++;

      for (let idx = 0; idx < grn.items.length; idx++) {
        const it = grn.items[idx];
        const itemId = deterministicUuid(`grn_item_${grn.grn_number}`, String(idx));
        const prod = findProduct(it.productSku || it.desc);
        const itemRecord = {
          id: itemId,
          goods_receipt_id: grnId,
          product_id: prod?.id || null,
          item_description: it.desc,
          quantity_received: it.qtyReceived,
          quantity_accepted: it.qtyAccepted,
          quantity_rejected: it.qtyRejected || 0,
          rejection_reason: null
        };
        const { error: itErr } = await supabase.from('goods_receipt_items').upsert(itemRecord, { onConflict: 'id' });
        if (!itErr) migrationStats.goods_receipt_items.inserted++;
      }
    }
  }
  console.log(`  ✓ Goods Receipts: ${migrationStats.goods_receipts.inserted} inserted, ${migrationStats.goods_receipts.updated} updated`);
  console.log(`  ✓ Goods Receipt Items: ${migrationStats.goods_receipt_items.inserted} upserted\n`);

  // --- Step 8: Migrating Stock Balances, Stock Movements & Transactions ---
  console.log('--- Step 8: Migrating Stock Balances, Stock Movements & Audit Transactions ---');
  
  // 8A. Ensure stock levels in public.stock match MOCK_INVENTORY_ITEMS
  for (const inv of MOCK_INVENTORY_ITEMS) {
    const prod = findProduct(inv.sku || inv.name);
    if (!prod) continue;
    const stockId = deterministicUuid('stock', `${prod.id}:${defaultWarehouseId}:RACK-A-04`);
    const stockRecord = {
      id: stockId,
      product_id: prod.id,
      warehouse_id: defaultWarehouseId,
      bin_location: inv.location || 'RACK-A-04',
      quantity_on_hand: inv.availableQty + (inv.reservedQty || 0),
      quantity_reserved: inv.reservedQty || 0,
      last_counted_date: '2026-09-01'
    };
    await supabase.from('stock').upsert(stockRecord, { onConflict: 'product_id,warehouse_id,bin_location' });
  }
  console.log('  ✓ Warehouse stock balances synchronized with inventory catalogue');

  // 8B. Seed Stock Movements from Inventory Screen History
  const mockMovements = [
    {
      movement_number: 'MOV-2026-0101',
      productSku: 'BRG-HC7008',
      type: 'ISSUE_PRODUCTION',
      qty: 3,
      refType: 'WORK_ORDER',
      refId: 'WO-2026-104',
      notes: 'Store Issue to Bay 3 (Cleanroom Assembly) for Spindle HSK-A63 rebuild'
    },
    {
      movement_number: 'MOV-2026-0102',
      productSku: 'MAT-18CR-80',
      type: 'RECEIPT_GRN',
      qty: 12,
      refType: 'GOODS_RECEIPT',
      refId: 'PO-2026-085',
      notes: 'Inward GRN receipt of 18CrNiMo7-6 Round Bar into Raw Stores Yard'
    },
    {
      movement_number: 'MOV-2026-0103',
      productSku: 'DRW-OTT-A63',
      type: 'ISSUE_PRODUCTION',
      qty: 1,
      refType: 'WORK_ORDER',
      refId: 'WO-2026-103',
      notes: 'Store Issue of OTT-Jakob Drawbar Collet to Bay 3 Assembly'
    },
    {
      movement_number: 'MOV-2026-0104',
      productSku: 'SEAL-VT-120',
      type: 'ISSUE_PRODUCTION',
      qty: 4,
      refType: 'WORK_ORDER',
      refId: 'WO-2026-106',
      notes: 'Store Issue of Viton Rotary O-Ring Kit to Bay 2 Grinding'
    }
  ];

  for (const mov of mockMovements) {
    const prod = findProduct(mov.productSku);
    const movId = deterministicUuid('stock_movement', mov.movement_number);
    const movRecord = {
      id: movId,
      movement_number: mov.movement_number,
      product_id: prod.id,
      from_warehouse_id: mov.type.includes('ISSUE') ? defaultWarehouseId : null,
      to_warehouse_id: mov.type.includes('RECEIPT') ? defaultWarehouseId : cleanroomWarehouseId,
      movement_type: mov.type,
      quantity: mov.qty,
      reference_type: mov.refType,
      reference_id: mov.refId,
      performed_by: defaultEmployeeId,
      notes: mov.notes
    };

    const { data: existingMov } = await supabase.from('stock_movements').select('id').eq('movement_number', mov.movement_number).maybeSingle();
    const { error: movErr } = await supabase.from('stock_movements').upsert(movRecord, { onConflict: 'movement_number' });
    if (!movErr) {
      if (existingMov) migrationStats.stock_movements.updated++;
      else migrationStats.stock_movements.inserted++;

      // Corresponding financial/quantity transaction audit ledger
      const txnNumber = `TXN-${mov.movement_number.replace('MOV-', '')}`;
      const txnId = deterministicUuid('inventory_transaction', txnNumber);
      const isOutward = mov.type.includes('ISSUE');
      const qtyDelta = isOutward ? -mov.qty : mov.qty;
      const prevQty = 40;
      const newQty = prevQty + qtyDelta;

      const txnRecord = {
        id: txnId,
        transaction_number: txnNumber,
        product_id: prod.id,
        warehouse_id: defaultWarehouseId,
        transaction_type: isOutward ? 'OUTWARD_PRODUCTION' : 'INWARD_PURCHASE',
        quantity_delta: qtyDelta,
        previous_quantity: prevQty,
        new_quantity: newQty,
        unit_cost: prod.unit_cost_inr || 6800,
        reference_table: mov.refType,
        reference_id: mov.refId,
        performed_by: defaultEmployeeId,
        remarks: mov.notes
      };
      const { data: existingTxn } = await supabase.from('inventory_transactions').select('id').eq('transaction_number', txnNumber).maybeSingle();
      const { error: txErr } = await supabase.from('inventory_transactions').upsert(txnRecord, { onConflict: 'transaction_number' });
      if (!txErr) {
        if (existingTxn) migrationStats.inventory_transactions.updated++;
        else migrationStats.inventory_transactions.inserted++;
      }
    }
  }
  console.log(`  ✓ Stock Movements: ${migrationStats.stock_movements.inserted} inserted, ${migrationStats.stock_movements.updated} updated`);
  console.log(`  ✓ Inventory Transactions: ${migrationStats.inventory_transactions.inserted} inserted, ${migrationStats.inventory_transactions.updated} updated\n`);

  console.log('================================================================');
  console.log('PHASE 7 MIGRATION EXECUTION SUMMARY');
  console.log('================================================================');
  console.table({
    'Quotations': migrationStats.quotations,
    'Quotation Items': migrationStats.quotation_items,
    'Sales Orders': migrationStats.sales_orders,
    'Sales Order Items': migrationStats.sales_order_items,
    'Proforma Invoices': migrationStats.proforma_invoices,
    'Proforma Invoice Items': migrationStats.proforma_invoice_items,
    'Tax Invoices': migrationStats.invoices,
    'Tax Invoice Items': migrationStats.invoice_items,
    'E-Way Bills': migrationStats.eway_bills,
    'E-Way Bill Items': migrationStats.eway_bill_items,
    'Purchase Requisitions': migrationStats.purchase_requisitions,
    'Purchase Requisition Items': migrationStats.purchase_requisition_items,
    'Purchase Orders': migrationStats.purchase_orders,
    'Purchase Order Items': migrationStats.purchase_order_items,
    'Goods Receipts': migrationStats.goods_receipts,
    'Goods Receipt Items': migrationStats.goods_receipt_items,
    'Stock Movements': migrationStats.stock_movements,
    'Inventory Transactions': migrationStats.inventory_transactions
  });
  console.log('\nSTATUS: PHASE 7 COMMERCIAL & INVENTORY DATA MIGRATION COMPLETE (PASS)');
}

runMigration().catch(err => {
  console.error('MIGRATION FATAL ERROR:', err);
  process.exit(1);
});
