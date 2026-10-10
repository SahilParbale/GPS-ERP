import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient.js';
import { isCleanSlateMode } from '../../utils/dataMode.js';

/**
 * Authentic Reference Proforma Invoice (matching Proforma Invoice_27_TTB.pdf)
 */
export const DEFAULT_TTB_PROFORMA = {
  id: '27',
  dbId: 'ttb-pi-27',
  piNumber: '27',
  estimateNo: '27',
  date: '22-08-2026',
  issueDate: '22-08-2026',
  validUntil: '06-09-2026',
  placeOfSupply: '27-Maharashtra',
  state: '27-Maharashtra',
  status: 'Ready to Send',
  rawStatus: 'Ready to Send',
  customer: 'T T B TOOLING',
  customerFullName: 'T T B TOOLING',
  customerAddress: 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan\nPune, Maharashtra-410501\nIndia',
  billingAddress: 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan\nPune, Maharashtra-410501\nIndia',
  shippingAddress: 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan, Pune, Maharashtra-410501',
  contactNo: '9975108709',
  customerContact: '9975108709',
  customerEmail: 'purchase@ttbtooling.com',
  gstin: '27AAKFT2876K1ZI',
  salesOrder: 'SO-2026-027',
  spindleSerial: 'HMMXXVI (M77-002)',
  challanNo: '049',
  challanDate: '18-08-2026',
  scopeOfWork: `1. DISMENTAL\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. DRAWBAR HARDCHROME\n6. DRAWBAR RECONDITIONING\n7. DISC SPRING REPLACEMENT\n8. TAPER GRINDING\n9. SHAFT BALANCING\n10. DYNAMIC RUN TEST`,
  terms: 'Thanks for doing business with us!',
  bankDetails: {
    bankName: 'ICICI BANK LIMITED, PUNE NANDED CITY',
    accountName: 'GENERAL PRECISION SPINDLES',
    accountNumber: '349105000701',
    ifscCode: 'ICIC0003491',
    branch: 'Nanded City Destination Centre, Pune - 411041'
  },
  items: [
    { id: 1, name: 'RECONDITIONING CHARGES FOR SPINDLE (M77-002)', product: 'RECONDITIONING CHARGES FOR SPINDLE (M77-002)', desc: 'RECONDITIONING CHARGES FOR SPINDLE (M77-002)', hsn: '84669390', qty: 1, unit: '-', unitPrice: 33500, rate: 33500, discount: 0, total: 33500 },
    { id: 2, name: '7014CTYNSULP4 NSK (SET OF 4 )', product: '7014CTYNSULP4 NSK (SET OF 4 )', desc: '7014CTYNSULP4 NSK (SET OF 4 )', hsn: '84821012', qty: 1, unit: 'SET', unitPrice: 22500, rate: 22500, discount: 0, total: 22500 },
    { id: 3, name: 'TRANSPORT CHARGES', product: 'TRANSPORT CHARGES', desc: 'TRANSPORT CHARGES', hsn: '996511', qty: 1, unit: '-', unitPrice: 3500, rate: 3500, discount: 0, total: 3500 },
    { id: 4, name: 'DRAWBAR ASSEMBLY WITH DISC SPRING (MUBEA MAKE GERMANY)', product: 'DRAWBAR ASSEMBLY WITH DISC SPRING (MUBEA MAKE GERMANY)', desc: 'DRAWBAR ASSEMBLY WITH DISC SPRING (MUBEA MAKE GERMANY)', hsn: '84669390', qty: 1, unit: '-', unitPrice: 15500, rate: 15500, discount: 0, total: 15500 },
    { id: 5, name: 'TAPER GRINDING', product: 'TAPER GRINDING', desc: 'TAPER GRINDING', hsn: '998717', qty: 1, unit: '-', unitPrice: 5500, rate: 5500, discount: 0, total: 5500 },
    { id: 6, name: 'SHAFT BALANCING G2.5', product: 'SHAFT BALANCING G2.5', desc: 'SHAFT BALANCING G2.5', hsn: '84669390', qty: 1, unit: '-', unitPrice: 2500, rate: 2500, discount: 0, total: 2500 },
    { id: 7, name: 'REMOVAL & FITMENT CHARGES', product: 'REMOVAL & FITMENT CHARGES', desc: 'REMOVAL & FITMENT CHARGES', hsn: '998717', qty: 1, unit: '-', unitPrice: 12500, rate: 12500, discount: 0, total: 12500 }
  ],
  subtotal: 95500,
  taxRate: 18,
  cgstAmount: 8595,
  sgstAmount: 8595,
  igstAmount: 0,
  gstAmount: 17190,
  totalAmount: 112690,
  formattedTotal: '₹1,12,690',
  receivedAmount: 0,
  balanceAmount: 112690
};

/**
 * Proforma Invoice Domain Service
 * Handles Proforma Invoices (PI), Items, and downstream conversion to Tax Invoices.
 */
export const proformaInvoiceService = {
  /**
   * Fetch all Proforma Invoices with items
   */
  async getProformaInvoices(options = {}) {
    const res = await baseService.select('proforma_invoices', {
      select: `
        id,
        pi_number,
        sales_order_id,
        quotation_id,
        customer_id,
        customer_name,
        customer_email,
        customer_address,
        customer_gstin,
        issue_date,
        valid_until,
        payment_terms,
        bank_account_no,
        bank_ifsc,
        bank_name,
        subtotal,
        discount,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_amount,
        advance_received,
        status,
        notes,
        created_at,
        sales_order:sales_orders(id, sales_order_no),
        items:proforma_invoice_items(
          id,
          product_name,
          description,
          hsn_sac,
          quantity,
          unit_rate,
          discount,
          gst_percent,
          total
        )
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for frontend compatibility with ProformaInvoiceScreen
    const normalizedData = (res.data || []).map(pi => {
      // Parse metadata from notes if present
      let meta = {};
      let cleanNotes = pi.notes || '';
      if (cleanNotes.includes('[METADATA:')) {
        try {
          const match = cleanNotes.match(/\[METADATA:([\s\S]*?)\]/);
          if (match && match[1]) {
            meta = JSON.parse(match[1]);
            cleanNotes = cleanNotes.replace(/\[METADATA:[\s\S]*?\]/, '').trim();
          }
        } catch (_e) {}
      }

      const items = (pi.items || []).map((it, idx) => ({
        id: it.id || idx + 1,
        name: it.product_name,
        product: it.product_name,
        desc: it.description || it.product_name,
        hsn: it.hsn_sac || '84669390',
        qty: Number(it.quantity || 1),
        unit: (meta.itemUnits && meta.itemUnits[idx]) || '-',
        rate: Number(it.unit_rate || 0),
        unitPrice: Number(it.unit_rate || 0),
        discount: Number(it.discount || 0),
        gst: Number(it.gst_percent || 18),
        total: Number(it.total || 0)
      }));

      const placeOfSupply = meta.placeOfSupply || 
        (pi.customer_gstin?.startsWith('27') ? '27-Maharashtra' : 
        (pi.customer_address?.includes('Maharashtra') ? '27-Maharashtra' : '27-Maharashtra'));
      
      const isInterstate = !placeOfSupply.startsWith('27');
      const taxAmt = Number(pi.total_amount || 0) - Number(pi.subtotal || 0);

      const rawStat = (pi.status || 'Ready to Send').toLowerCase();
      let status = 'Ready to Send';
      if (rawStat.includes('sent')) {
        status = 'Sent';
      } else {
        status = 'Ready to Send';
      }

      return {
        id: pi.pi_number || pi.id,
        dbId: pi.id,
        piNumber: pi.pi_number,
        estimateNo: pi.pi_number,
        customer: pi.customer_name || 'T T B TOOLING',
        customerFullName: pi.customer_name || 'T T B TOOLING',
        customerContact: meta.contactNo || '9975108709',
        contactNo: meta.contactNo || '9975108709',
        customerEmail: pi.customer_email || 'purchase@ttbtooling.com',
        billingAddress: pi.customer_address || 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan\nPune, Maharashtra-410501\nIndia',
        customerAddress: pi.customer_address || 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan\nPune, Maharashtra-410501\nIndia',
        shippingAddress: pi.customer_address || 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan, Pune',
        gstin: pi.customer_gstin || '27AAKFT2876K1ZI',
        salesOrder: pi.sales_order?.sales_order_no || 'SO-2026-027',
        date: pi.issue_date || '22-08-2026',
        issueDate: pi.issue_date || '22-08-2026',
        validUntil: pi.valid_until || '06-09-2026',
        placeOfSupply: placeOfSupply,
        state: placeOfSupply,
        spindleSerial: meta.spindleSerial || 'HMMXXVI (M77-002)',
        challanNo: meta.challanNo || '049',
        challanDate: meta.challanDate || '18-08-2026',
        scopeOfWork: meta.scopeOfWork || `1. DISMENTAL\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. DRAWBAR HARDCHROME\n6. DRAWBAR RECONDITIONING\n7. DISC SPRING REPLACEMENT\n8. TAPER GRINDING\n9. SHAFT BALANCING\n10. DYNAMIC RUN TEST`,
        paymentTerms: pi.payment_terms || '50% Advance with Proforma, 50% against Dispatch Inspection',
        terms: meta.terms || 'Thanks for doing business with us!',
        status: status,
        rawStatus: pi.status,
        subtotal: Number(pi.subtotal || 0),
        discount: Number(pi.discount || 0),
        taxRate: 18,
        cgstAmount: isInterstate ? 0 : Math.round(taxAmt / 2),
        sgstAmount: isInterstate ? 0 : Math.round(taxAmt / 2),
        igstAmount: isInterstate ? Math.round(taxAmt) : 0,
        gstAmount: taxAmt,
        totalAmount: Number(pi.total_amount || 0),
        receivedAmount: Number(pi.advance_received || 0),
        balanceAmount: Math.max(0, Number(pi.total_amount || 0) - Number(pi.advance_received || 0)),
        formattedTotal: `₹${Number(pi.total_amount || 0).toLocaleString('en-IN')}`,
        bankDetails: {
          bankName: pi.bank_name || 'ICICI BANK LIMITED, PUNE NANDED CITY',
          accountName: 'GENERAL PRECISION SPINDLES',
          accountNumber: pi.bank_account_no || '349105000701',
          ifscCode: pi.bank_ifsc || 'ICIC0003491',
          branch: 'Nanded City Destination Centre, Pune - 411041'
        },
        notes: cleanNotes,
        items: items
      };
    });

    // Provide authentic TTB reference if list is empty and Clean Slate is inactive
    if (normalizedData.length === 0 && !isCleanSlateMode()) {
      normalizedData.push(DEFAULT_TTB_PROFORMA);
    }

    return {
      ...res,
      data: normalizedData
    };
  },

  /**
   * Get single Proforma Invoice by PI Number or UUID
   */
  async getProformaInvoiceById(id) {
    const filter = id.includes('-') && id.length === 36 ? { id } : { pi_number: id };
    const res = await baseService.select('proforma_invoices', {
      select: `
        *,
        items:proforma_invoice_items(*)
      `,
      filter
    });
    if (res.error) return res;
    return { ...res, data: res.data?.[0] || null };
  },

  /**
   * Create new Proforma Invoice and items
   */
  async createProformaInvoice(piData) {
    const {
      piNumber,
      customerId,
      customerName,
      customerEmail,
      customerAddress,
      customerGstin,
      placeOfSupply = '27-Maharashtra',
      contactNo,
      spindleSerial,
      challanNo,
      challanDate,
      scopeOfWork,
      quotationId,
      salesOrderNo,
      issueDate,
      validUntil,
      paymentTerms,
      subtotal,
      discount = 0,
      totalAmount,
      status = 'Ready to Send',
      terms = 'Thanks for doing business with us!',
      notes,
      items = []
    } = piData;

    let targetCustomerId = customerId;
    if (!targetCustomerId && supabase) {
      try {
        const { data: existingCust } = await supabase
          .from('customers')
          .select('id')
          .ilike('company_name', (customerName || '').trim())
          .limit(1)
          .maybeSingle();

        if (existingCust && existingCust.id) {
          targetCustomerId = existingCust.id;
        } else {
          const { data: newCust } = await supabase.from('customers').insert({
            company_name: (customerName || 'General Client').trim(),
            billing_address: customerAddress || '',
            gstin: customerGstin || null,
            state: placeOfSupply || '27-Maharashtra'
          }).select('id').maybeSingle();
          if (newCust && newCust.id) targetCustomerId = newCust.id;
        }
      } catch (_e) {}
    }

    let salesOrderId = null;
    if (salesOrderNo && supabase) {
      try {
        const { data: so } = await supabase.from('sales_orders').select('id').eq('sales_order_no', salesOrderNo).maybeSingle();
        salesOrderId = so?.id || null;
      } catch (_e) {}
    }

    // Embed rich metadata in notes for fields without dedicated database columns
    const metadata = {
      placeOfSupply: placeOfSupply || '27-Maharashtra',
      contactNo: contactNo || '',
      spindleSerial: spindleSerial || '',
      challanNo: challanNo || '',
      challanDate: challanDate || '',
      scopeOfWork: scopeOfWork || '',
      terms: terms || 'Thanks for doing business with us!',
      itemUnits: items.map(it => it.unit || '-')
    };
    const combinedNotes = `[METADATA:${JSON.stringify(metadata)}] ${notes || ''}`.trim();

    const isInterstate = !(placeOfSupply || '').startsWith('27');
    const calcSubtotal = Number(subtotal || 0);
    const calcTaxAmt = (Number(totalAmount) || Math.round(calcSubtotal * 1.18)) - calcSubtotal;
    const cgst = isInterstate ? 0 : Math.round(calcTaxAmt / 2);
    const sgst = isInterstate ? 0 : Math.round(calcTaxAmt / 2);
    const igst = isInterstate ? Math.round(calcTaxAmt) : 0;

    const record = {
      pi_number: piNumber,
      quotation_id: quotationId || null,
      sales_order_id: salesOrderId,
      customer_id: targetCustomerId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      issue_date: issueDate || new Date().toISOString().split('T')[0],
      valid_until: validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      payment_terms: paymentTerms || '50% Advance with Proforma, 50% against Dispatch Inspection',
      subtotal: calcSubtotal,
      discount: Number(discount || 0),
      taxable_amount: Math.max(0, calcSubtotal - Number(discount || 0)),
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_amount: Number(totalAmount || (calcSubtotal + calcTaxAmt)),
      status: status === 'Sent' ? 'Sent' : 'Ready to Send',
      notes: combinedNotes
    };

    const insertRes = await baseService.insert('proforma_invoices', record);
    if (insertRes.error) return insertRes;

    const createdPI = insertRes.data?.[0];
    if (createdPI && items.length > 0) {
      const piItems = items.map(it => ({
        proforma_invoice_id: createdPI.id,
        product_name: it.name || it.product || 'Precision Spindle Component',
        description: it.desc || it.name || it.product,
        hsn_sac: it.hsn || it.hsn_sac || '84669390',
        quantity: Number(it.qty || 1),
        unit_rate: Number(it.unitPrice || it.rate || 0),
        discount: Number(it.discount || 0),
        gst_percent: 18.0,
        total: Number(it.total != null ? it.total : (Number(it.qty || 1) * Number(it.unitPrice || it.rate || 0)))
      }));
      await baseService.insert('proforma_invoice_items', piItems);
    }

    return insertRes;
  },

  /**
   * Update PI status (Ready to Send or Sent)
   */
  async updateProformaInvoiceStatus(id, status) {
    const validStatus = status === 'Sent' ? 'Sent' : 'Ready to Send';
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'pi_number';
    return await baseService.update('proforma_invoices', { [filterField]: id }, {
      status: validStatus,
      updated_at: new Date().toISOString()
    });
  },

  /**
   * Update full Proforma Invoice details
   */
  async updateProformaInvoice(id, piData) {
    if (!id) return { error: { message: 'Proforma Invoice ID is required' } };
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'pi_number';

    const {
      customerName,
      customerEmail,
      contactNo,
      customerAddress,
      customerGstin,
      placeOfSupply = '27-Maharashtra',
      spindleSerial,
      challanNo,
      challanDate,
      scopeOfWork,
      issueDate,
      validUntil,
      paymentTerms,
      terms,
      subtotal,
      totalAmount,
      status = 'Ready to Send',
      items = []
    } = piData;

    const metadata = {
      placeOfSupply: placeOfSupply || '27-Maharashtra',
      contactNo: contactNo || '',
      spindleSerial: spindleSerial || '',
      challanNo: challanNo || '',
      challanDate: challanDate || '',
      scopeOfWork: scopeOfWork || '',
      terms: terms || 'Thanks for doing business with us!',
      itemUnits: items.map(it => it.unit || '-')
    };
    const combinedNotes = `[METADATA:${JSON.stringify(metadata)}]`.trim();

    const isInterstate = !(placeOfSupply || '').startsWith('27');
    const calcSubtotal = Number(subtotal || 0);
    const calcTaxAmt = (Number(totalAmount) || Math.round(calcSubtotal * 1.18)) - calcSubtotal;
    const cgst = isInterstate ? 0 : Math.round(calcTaxAmt / 2);
    const sgst = isInterstate ? 0 : Math.round(calcTaxAmt / 2);
    const igst = isInterstate ? Math.round(calcTaxAmt) : 0;

    const updateRecord = {
      customer_name: customerName,
      customer_email: customerEmail,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      issue_date: issueDate,
      valid_until: validUntil,
      payment_terms: paymentTerms,
      subtotal: calcSubtotal,
      taxable_amount: calcSubtotal,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_amount: Number(totalAmount || (calcSubtotal + calcTaxAmt)),
      status: status === 'Sent' ? 'Sent' : 'Ready to Send',
      notes: combinedNotes,
      updated_at: new Date().toISOString()
    };

    const updateRes = await baseService.update('proforma_invoices', { [filterField]: id }, updateRecord);
    if (updateRes.error) return updateRes;

    // Refresh items
    let piDbId = id;
    if (!id.includes('-') || id.length !== 36) {
      const pi = await this.getProformaInvoiceById(id);
      if (pi.data && pi.data.id) piDbId = pi.data.id;
    }

    if (supabase && piDbId && items.length > 0) {
      try {
        await supabase.from('proforma_invoice_items').delete().eq('proforma_invoice_id', piDbId);
        const piItems = items.map(it => ({
          proforma_invoice_id: piDbId,
          product_name: it.name || it.product || 'Precision Spindle Component',
          description: it.desc || it.name || it.product,
          hsn_sac: it.hsn || it.hsn_sac || '84669390',
          quantity: Number(it.qty || 1),
          unit_rate: Number(it.unitPrice || it.rate || 0),
          discount: Number(it.discount || 0),
          gst_percent: 18.0,
          total: Number(it.total != null ? it.total : (Number(it.qty || 1) * Number(it.unitPrice || it.rate || 0)))
        }));
        await baseService.insert('proforma_invoice_items', piItems);
      } catch (_e) {}
    }

    return updateRes;
  },

  /**
   * Delete Proforma Invoice with its line items
   */
  async deleteProformaInvoice(id) {
    if (!id) return { error: { message: 'Proforma Invoice ID is required for deletion' } };
    const isUuid = typeof id === 'string' && id.includes('-') && id.length === 36;
    let piDbId = id;

    if (!isUuid) {
      const pi = await this.getProformaInvoiceById(id);
      if (pi.data && pi.data.id) {
        piDbId = pi.data.id;
      }
    }

    // 1. Delete associated line items first
    try {
      if (supabase) {
        await supabase.from('proforma_invoice_items').delete().eq('proforma_invoice_id', piDbId);
      }
    } catch (_e) {}

    // 2. Unlink any tax invoices that point to this proforma invoice
    try {
      if (supabase) {
        await supabase.from('invoices').update({ proforma_invoice_id: null }).eq('proforma_invoice_id', piDbId);
      }
    } catch (_e) {}

    // 3. Delete proforma record from database
    return await baseService.delete('proforma_invoices', piDbId, false, 'id');
  },

  /**
   * Convert Proforma Invoice to Tax Invoice
   */
  async convertProformaInvoiceToInvoice(piId) {
    const piRes = await this.getProformaInvoiceById(piId);
    if (piRes.error || !piRes.data) {
      return { data: null, error: { message: 'Proforma Invoice not found for conversion.' } };
    }

    const pi = piRes.data;
    const invNumber = `INV-2026-${Math.floor(100 + Math.random() * 900)}`;

    const invRecord = {
      invoice_number: invNumber,
      proforma_invoice_id: pi.id,
      sales_order_id: pi.sales_order_id,
      customer_id: pi.customer_id,
      customer_name: pi.customer_name,
      customer_gstin: pi.customer_gstin,
      billing_address: pi.customer_address,
      shipping_address: pi.customer_address,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      payment_terms: 'Net 30 Days',
      subtotal: pi.subtotal,
      taxable_amount: pi.taxable_amount,
      total_amount: pi.total_amount,
      paid_amount: pi.advance_received || 0,
      status: (pi.advance_received || 0) > 0 ? 'Partially Paid' : 'Pending Payment',
      notes: `Generated from Proforma Invoice ${pi.pi_number}`
    };

    const invRes = await baseService.insert('invoices', invRecord);
    if (invRes.error) return invRes;

    const createdInv = invRes.data?.[0];
    if (createdInv && pi.items?.length > 0) {
      const invItems = pi.items.map(it => ({
        invoice_id: createdInv.id,
        product_name: it.product_name,
        hsn_sac: it.hsn_sac || '84669390',
        quantity: it.quantity,
        unit_price: it.unit_rate,
        discount: it.discount,
        gst_percent: it.gst_percent,
        total_price: it.total
      }));
      await baseService.insert('invoice_items', invItems);
    }

    // Update PI status to Converted to Tax Invoice
    await this.updateProformaInvoiceStatus(piId, 'Converted to Tax Invoice');

    return invRes;
  }
};
