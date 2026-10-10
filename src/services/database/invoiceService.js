import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient.js';
import { isCleanSlateMode } from '../../utils/dataMode.js';

/**
 * Authentic Reference Tax Invoice (matching Tax Invoice_INV2026-27 265_PS MAINTENANCE.pdf)
 */
export const DEFAULT_PS_MAINTENANCE_INVOICE = {
  id: 'INV2026-27/265',
  invoiceNumber: 'INV2026-27/265',
  dbId: 'ps-maintenance-265',
  date: '30-09-2026',
  invoiceDate: '30-09-2026',
  dueDate: '15-10-2026',
  placeOfSupply: '27-Maharashtra',
  state: '27-Maharashtra',
  poNumber: 'VERBAL',
  purchaseOrderNo: 'VERBAL',
  status: 'Payment Pending',
  rawStatus: 'Pending Payment',
  customer: 'PS MAINTENANCE SERVICE',
  customerFullName: 'PS MAINTENANCE SERVICE',
  customerAddress: 'PLOT NO 64 FLAT NO 6 PURVA APARTMENT CDC SHAHU NAGAR CHINCHWAD\nPune, Maharashtra-411019\nIndia',
  billingAddress: 'PLOT NO 64 FLAT NO 6 PURVA APARTMENT CDC SHAHU NAGAR CHINCHWAD\nPune, Maharashtra-411019\nIndia',
  contactNo: '8600280084',
  customerContact: '8600280084',
  customerEmail: 'service@psmaintenance.in',
  gstin: '27AIBPB6756H1ZB',
  spindleSerial: 'IMMXXVI',
  scopeOfWork: `1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. SHAFT SLEEVING\n6. STATIC TEST\n7. ASSEMBLY\n8. DYNAMIC TEST`,
  terms: `We declare that this invoice shows the actual price of the goods\ndescribed and that all particulars are true and correct.\nBank Details:\nICICI Bank Ltd(Nanded City Branch)\nA/c No : 349105000701\nIFSC Code: ICIC0003491\nMSME (UDYAM ADHAR) NO-MH26A0189736\nTYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING\nMAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,INTEGRATED,SPINDLE REPAIRING ,SPINDLE MANUFACTURING.`,
  bankDetails: {
    bankName: 'ICICI BANK LIMITED, PUNE NANDED CITY',
    accountName: 'GENERAL PRECISION SPINDLES',
    accountNumber: '349105000701',
    ifscCode: 'ICIC0003491',
    branch: 'Nanded City Destination Centre, Pune - 411041'
  },
  items: [
    { id: 1, name: 'REPAIR MAKINO (S-33)', product: 'REPAIR MAKINO (S-33)', desc: 'REPAIR MAKINO (S-33)', hsn: '84669390', qty: 1, unitPrice: 55000, rate: 55000, discount: 0, total: 55000 },
    { id: 2, name: 'SHAFT SLEEVING', product: 'SHAFT SLEEVING', desc: 'SHAFT SLEEVING', hsn: '998717', qty: 1, unitPrice: 25000, rate: 25000, discount: 0, total: 25000 }
  ],
  subtotal: 80000,
  taxRate: 18,
  cgstAmount: 7200,
  sgstAmount: 7200,
  igstAmount: 0,
  gstAmount: 14400,
  totalAmount: 94400,
  amountNum: 94400,
  amount: '₹94,400',
  formattedTotal: '₹94,400',
  paidAmountNum: 0,
  paidAmount: '₹0',
  receivedAmount: 0,
  balanceNum: 94400,
  balance: '₹94,400',
  balanceAmount: 94400
};

/**
 * Tax Invoices & Receivables Domain Service
 * Handles Invoices, Invoice Line Items, Payment Recording, and Quotation/Proforma Conversion.
 */
export const invoiceService = {
  /**
   * Fetch all registered tax invoices with line items
   */
  async getInvoices(options = {}) {
    const res = await baseService.select('invoices', {
      select: `
        id,
        invoice_number,
        sales_order_id,
        proforma_invoice_id,
        customer_id,
        customer_name,
        customer_gstin,
        billing_address,
        shipping_address,
        invoice_date,
        due_date,
        payment_terms,
        subtotal,
        discount_amount,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_amount,
        paid_amount,
        balance_amount,
        status,
        notes,
        created_at,
        customer:customers(id, company_name, gstin),
        sales_order:sales_orders(id, sales_order_no),
        items:invoice_items(
          id,
          product_name,
          hsn_sac,
          quantity,
          unit_price,
          discount,
          gst_percent,
          total_price
        )
      `,
      orderBy: options.orderBy || 'invoice_date',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for frontend compatibility with InvoicesScreen
    const normalizedData = (res.data || []).map(inv => {
      let meta = {};
      let cleanNotes = inv.notes || '';
      if (cleanNotes.includes('[METADATA:')) {
        try {
          const match = cleanNotes.match(/\[METADATA:([\s\S]*?)\]/);
          if (match && match[1]) {
            meta = JSON.parse(match[1]);
            cleanNotes = cleanNotes.replace(/\[METADATA:[\s\S]*?\]/, '').trim();
          }
        } catch (_e) {}
      }

      const totalNum = Number(inv.total_amount || 0);
      const paidNum = Number(inv.paid_amount || 0);
      const balanceNum = Math.max(0, totalNum - paidNum);

      const items = (inv.items || []).map((it, idx) => ({
        id: it.id || idx + 1,
        name: it.product_name,
        product: it.product_name,
        desc: it.product_name,
        hsn: it.hsn_sac || '84669390',
        qty: Number(it.quantity || 1),
        rate: Number(it.unit_price || 0),
        unitPrice: Number(it.unit_price || 0),
        discount: Number(it.discount || 0),
        gst: Number(it.gst_percent || 18),
        total: Number(it.total_price != null ? it.total_price : (Number(it.quantity || 1) * Number(it.unit_price || 0)))
      }));

      const placeOfSupply = meta.placeOfSupply || 
        (inv.customer_gstin?.startsWith('27') ? '27-Maharashtra' : 
        (inv.billing_address?.includes('Maharashtra') ? '27-Maharashtra' : '27-Maharashtra'));
      
      const isInterstate = !placeOfSupply.startsWith('27');
      const calcSubtotal = Number(inv.subtotal || 0);
      const calcTaxAmt = totalNum - calcSubtotal;

      const rawStat = (inv.status || 'Payment Pending').toLowerCase();
      let status = 'Payment Pending';
      if (rawStat.includes('paid') && !rawStat.includes('part')) {
        status = 'Paid';
      } else if (rawStat.includes('part')) {
        status = 'Partially Paid';
      } else if (rawStat.includes('overdue')) {
        status = 'Overdue';
      } else {
        status = 'Payment Pending';
      }

      return {
        id: inv.invoice_number || inv.id,
        dbId: inv.id,
        invoiceNumber: inv.invoice_number || inv.id,
        customer: inv.customer_name || inv.customer?.company_name || 'PS MAINTENANCE SERVICE',
        customerFullName: inv.customer_name || inv.customer?.company_name || 'PS MAINTENANCE SERVICE',
        customerId: inv.customer_id,
        customerEmail: meta.customerEmail || 'service@psmaintenance.in',
        customerAddress: inv.billing_address || 'PLOT NO 64 FLAT NO 6 PURVA APARTMENT CDC SHAHU NAGAR CHINCHWAD\nPune, Maharashtra-411019\nIndia',
        billingAddress: inv.billing_address || 'PLOT NO 64 FLAT NO 6 PURVA APARTMENT CDC SHAHU NAGAR CHINCHWAD\nPune, Maharashtra-411019\nIndia',
        shippingAddress: inv.shipping_address || inv.billing_address,
        contactNo: meta.contactNo || '8600280084',
        customerContact: meta.contactNo || '8600280084',
        gstin: inv.customer_gstin || inv.customer?.gstin || '27AIBPB6756H1ZB',
        customerGstin: inv.customer_gstin || inv.customer?.gstin || '27AIBPB6756H1ZB',
        poNumber: meta.poNumber || inv.sales_order?.sales_order_no || 'VERBAL',
        purchaseOrderNo: meta.poNumber || inv.sales_order?.sales_order_no || 'VERBAL',
        refOrder: meta.poNumber || inv.sales_order?.sales_order_no || 'VERBAL',
        salesOrder: inv.sales_order?.sales_order_no || '',
        proformaInvoiceId: inv.proforma_invoice_id,
        date: inv.invoice_date || '30-09-2026',
        invoiceDate: inv.invoice_date || '30-09-2026',
        dueDate: inv.due_date || '15-10-2026',
        placeOfSupply: placeOfSupply,
        state: placeOfSupply,
        spindleSerial: meta.spindleSerial || 'IMMXXVI',
        scopeOfWork: meta.scopeOfWork || `1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. SHAFT SLEEVING\n6. STATIC TEST\n7. ASSEMBLY\n8. DYNAMIC TEST`,
        terms: meta.terms || `We declare that this invoice shows the actual price of the goods\ndescribed and that all particulars are true and correct.\nBank Details:\nICICI Bank Ltd(Nanded City Branch)\nA/c No : 349105000701\nIFSC Code: ICIC0003491\nMSME (UDYAM ADHAR) NO-MH26A0189736\nTYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING\nMAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,INTEGRATED,SPINDLE REPAIRING ,SPINDLE MANUFACTURING.`,
        paymentTerms: inv.payment_terms || 'Due on Receipt / Net 15 Days',
        subtotal: calcSubtotal,
        taxRate: 18,
        cgstAmount: isInterstate ? 0 : Math.round(calcTaxAmt / 2),
        sgstAmount: isInterstate ? 0 : Math.round(calcTaxAmt / 2),
        igstAmount: isInterstate ? Math.round(calcTaxAmt) : 0,
        gstAmount: calcTaxAmt,
        totalAmount: totalNum,
        amountNum: totalNum,
        amount: `₹${totalNum.toLocaleString('en-IN')}`,
        formattedTotal: `₹${totalNum.toLocaleString('en-IN')}`,
        paidAmountNum: paidNum,
        paidAmount: `₹${paidNum.toLocaleString('en-IN')}`,
        receivedAmount: paidNum,
        balanceNum: balanceNum,
        balance: `₹${balanceNum.toLocaleString('en-IN')}`,
        balanceAmount: balanceNum,
        status: status,
        rawStatus: inv.status,
        bankDetails: {
          bankName: 'ICICI BANK LIMITED, PUNE NANDED CITY',
          accountName: 'GENERAL PRECISION SPINDLES',
          accountNumber: '349105000701',
          ifscCode: 'ICIC0003491',
          branch: 'Nanded City Destination Centre, Pune - 411041'
        },
        notes: cleanNotes,
        items: items
      };
    });

    // Provide authentic PS MAINTENANCE reference if list is empty and Clean Slate is inactive
    if (normalizedData.length === 0 && !isCleanSlateMode()) {
      normalizedData.push(DEFAULT_PS_MAINTENANCE_INVOICE);
    }

    return {
      ...res,
      data: normalizedData
    };
  },

  /**
   * Get single invoice by invoice number or UUID
   */
  async getInvoiceById(id) {
    const filter = id.includes('-') && id.length === 36 ? { id } : { invoice_number: id };
    const res = await baseService.select('invoices', {
      select: `
        *,
        items:invoice_items(*),
        customer:customers(*)
      `,
      filter
    });
    if (res.error) return res;
    return { ...res, data: res.data?.[0] || null };
  },

  /**
   * Create new Tax Invoice and line items
   */
  async createInvoice(invData) {
    const {
      invoiceNumber,
      customerId,
      customerName,
      customerEmail,
      customerAddress,
      customerGstin,
      placeOfSupply = '27-Maharashtra',
      contactNo,
      spindleSerial,
      poNumber = 'VERBAL',
      scopeOfWork,
      quotationId,
      proformaInvoiceId,
      salesOrderNo,
      invoiceDate,
      dueDate,
      paymentTerms,
      subtotal,
      discount = 0,
      totalAmount,
      paidAmount = 0,
      status = 'Payment Pending',
      terms,
      notes,
      items = []
    } = invData;

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
            company_name: (customerName || 'PS MAINTENANCE SERVICE').trim(),
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

    // Embed rich metadata in notes
    const metadata = {
      placeOfSupply: placeOfSupply || '27-Maharashtra',
      contactNo: contactNo || '',
      customerEmail: customerEmail || '',
      spindleSerial: spindleSerial || '',
      poNumber: poNumber || 'VERBAL',
      scopeOfWork: scopeOfWork || '',
      terms: terms || `We declare that this invoice shows the actual price of the goods\ndescribed and that all particulars are true and correct.\nBank Details:\nICICI Bank Ltd(Nanded City Branch)\nA/c No : 349105000701\nIFSC Code: ICIC0003491\nMSME (UDYAM ADHAR) NO-MH26A0189736\nTYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING\nMAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,INTEGRATED,SPINDLE REPAIRING ,SPINDLE MANUFACTURING.`
    };
    const combinedNotes = `[METADATA:${JSON.stringify(metadata)}] ${notes || ''}`.trim();

    const isInterstate = !(placeOfSupply || '').startsWith('27');
    const calcSubtotal = Number(subtotal || 0);
    const calcTaxAmt = (Number(totalAmount) || Math.round(calcSubtotal * 1.18)) - calcSubtotal;
    const cgst = isInterstate ? 0 : Math.round(calcTaxAmt / 2);
    const sgst = isInterstate ? 0 : Math.round(calcTaxAmt / 2);
    const igst = isInterstate ? Math.round(calcTaxAmt) : 0;
    const finalTotal = Number(totalAmount || (calcSubtotal + calcTaxAmt));
    const finalPaid = Number(paidAmount || 0);
    const finalBalance = Math.max(0, finalTotal - finalPaid);

    let finalStatus = status;
    if (finalPaid >= finalTotal) {
      finalStatus = 'Paid';
    } else if (finalPaid > 0) {
      finalStatus = 'Partially Paid';
    } else {
      finalStatus = 'Pending Payment';
    }

    const record = {
      invoice_number: invoiceNumber,
      proforma_invoice_id: proformaInvoiceId || null,
      sales_order_id: salesOrderId,
      customer_id: targetCustomerId,
      customer_name: customerName,
      customer_gstin: customerGstin,
      billing_address: customerAddress,
      shipping_address: customerAddress,
      invoice_date: invoiceDate || new Date().toISOString().split('T')[0],
      due_date: dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      payment_terms: paymentTerms || 'Due on Receipt / Net 15 Days',
      subtotal: calcSubtotal,
      discount_amount: Number(discount || 0),
      taxable_amount: Math.max(0, calcSubtotal - Number(discount || 0)),
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_amount: finalTotal,
      paid_amount: finalPaid,
      balance_amount: finalBalance,
      status: finalStatus,
      notes: combinedNotes
    };

    const insertRes = await baseService.insert('invoices', record);
    if (insertRes.error) return insertRes;

    const createdInv = insertRes.data?.[0];
    if (createdInv && items.length > 0) {
      const invItems = items.map(it => ({
        invoice_id: createdInv.id,
        product_name: it.name || it.product || 'Precision Spindle Component',
        hsn_sac: it.hsn || it.hsn_sac || '84669390',
        quantity: Number(it.qty != null ? it.qty : (it.quantity || 1)),
        unit_price: Number(it.unitPrice != null ? it.unitPrice : (it.rate || it.price || 0)),
        discount: Number(it.discount || 0),
        gst_percent: 18.0,
        total_price: Number(it.total != null ? it.total : (Number(it.qty || 1) * Number(it.unitPrice || it.rate || 0)))
      }));
      await baseService.insert('invoice_items', invItems);
    }

    return insertRes;
  },

  /**
   * Update full Tax Invoice details and line items
   */
  async updateInvoice(id, invData) {
    if (!id) return { error: { message: 'Tax Invoice ID is required' } };
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'invoice_number';

    const {
      customerName,
      customerEmail,
      contactNo,
      customerAddress,
      customerGstin,
      placeOfSupply = '27-Maharashtra',
      spindleSerial,
      poNumber = 'VERBAL',
      scopeOfWork,
      invoiceDate,
      dueDate,
      paymentTerms,
      terms,
      subtotal,
      totalAmount,
      paidAmount = 0,
      status,
      items = []
    } = invData;

    const metadata = {
      placeOfSupply: placeOfSupply || '27-Maharashtra',
      contactNo: contactNo || '',
      customerEmail: customerEmail || '',
      spindleSerial: spindleSerial || '',
      poNumber: poNumber || 'VERBAL',
      scopeOfWork: scopeOfWork || '',
      terms: terms || `We declare that this invoice shows the actual price of the goods\ndescribed and that all particulars are true and correct.\nBank Details:\nICICI Bank Ltd(Nanded City Branch)\nA/c No : 349105000701\nIFSC Code: ICIC0003491\nMSME (UDYAM ADHAR) NO-MH26A0189736\nTYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING\nMAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,INTEGRATED,SPINDLE REPAIRING ,SPINDLE MANUFACTURING.`
    };
    const combinedNotes = `[METADATA:${JSON.stringify(metadata)}]`.trim();

    const isInterstate = !(placeOfSupply || '').startsWith('27');
    const calcSubtotal = Number(subtotal || 0);
    const calcTaxAmt = (Number(totalAmount) || Math.round(calcSubtotal * 1.18)) - calcSubtotal;
    const cgst = isInterstate ? 0 : Math.round(calcTaxAmt / 2);
    const sgst = isInterstate ? 0 : Math.round(calcTaxAmt / 2);
    const igst = isInterstate ? Math.round(calcTaxAmt) : 0;
    const finalTotal = Number(totalAmount || (calcSubtotal + calcTaxAmt));
    const finalPaid = Number(paidAmount || 0);
    const finalBalance = Math.max(0, finalTotal - finalPaid);

    let finalStatus = status;
    if (!finalStatus) {
      if (finalPaid >= finalTotal) finalStatus = 'Paid';
      else if (finalPaid > 0) finalStatus = 'Partially Paid';
      else finalStatus = 'Pending Payment';
    }

    const updateRecord = {
      customer_name: customerName,
      customer_gstin: customerGstin,
      billing_address: customerAddress,
      shipping_address: customerAddress,
      invoice_date: invoiceDate,
      due_date: dueDate,
      payment_terms: paymentTerms,
      subtotal: calcSubtotal,
      taxable_amount: calcSubtotal,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total_amount: finalTotal,
      paid_amount: finalPaid,
      balance_amount: finalBalance,
      status: finalStatus,
      notes: combinedNotes,
      updated_at: new Date().toISOString()
    };

    const updateRes = await baseService.update('invoices', { [filterField]: id }, updateRecord);
    if (updateRes.error) return updateRes;

    // Refresh items
    let invDbId = id;
    if (!id.includes('-') || id.length !== 36) {
      const inv = await this.getInvoiceById(id);
      if (inv.data && inv.data.id) invDbId = inv.data.id;
    }

    if (supabase && invDbId && items.length > 0) {
      try {
        await supabase.from('invoice_items').delete().eq('invoice_id', invDbId);
        const invItems = items.map(it => ({
          invoice_id: invDbId,
          product_name: it.name || it.product || 'Precision Spindle Component',
          hsn_sac: it.hsn || it.hsn_sac || '84669390',
          quantity: Number(it.qty != null ? it.qty : (it.quantity || 1)),
          unit_price: Number(it.unitPrice != null ? it.unitPrice : (it.rate || it.price || 0)),
          discount: Number(it.discount || 0),
          gst_percent: 18.0,
          total_price: Number(it.total != null ? it.total : (Number(it.qty || 1) * Number(it.unitPrice || it.rate || 0)))
        }));
        await baseService.insert('invoice_items', invItems);
      } catch (_e) {}
    }

    return updateRes;
  },

  /**
   * Delete Tax Invoice with its line items
   */
  async deleteInvoice(id) {
    if (!id) return { error: { message: 'Invoice ID is required for deletion' } };
    const isUuid = typeof id === 'string' && id.includes('-') && id.length === 36;
    let invDbId = id;

    if (!isUuid) {
      const inv = await this.getInvoiceById(id);
      if (inv.data && inv.data.id) {
        invDbId = inv.data.id;
      }
    }

    // 1. Delete associated line items first
    try {
      if (supabase) {
        await supabase.from('invoice_items').delete().eq('invoice_id', invDbId);
      }
    } catch (_e) {}

    // 2. Delete invoice record from database
    return await baseService.delete('invoices', invDbId, false, 'id');
  },

  /**
   * Record payment receipt on an invoice
   */
  async recordInvoicePayment(invoiceId, paymentAmount = null) {
    const invRes = await this.getInvoiceById(invoiceId);
    if (invRes.error || !invRes.data) {
      return { data: null, error: { message: 'Invoice not found to record payment.' } };
    }

    const inv = invRes.data;
    const currentPaid = Number(inv.paid_amount || 0);
    const total = Number(inv.total_amount || 0);
    const amountToApply = paymentAmount !== null ? Number(paymentAmount) : (total - currentPaid);
    const newPaid = Math.min(total, currentPaid + amountToApply);
    const newBalance = Math.max(0, total - newPaid);
    const newStatus = newPaid >= total ? 'Paid' : (newPaid > 0 ? 'Partially Paid' : 'Pending Payment');

    const filterField = invoiceId.includes('-') && invoiceId.length === 36 ? 'id' : 'invoice_number';
    return await baseService.update('invoices', { [filterField]: invoiceId }, {
      paid_amount: newPaid,
      balance_amount: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString()
    });
  },

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(id, newStatus) {
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'invoice_number';
    let dbStatus = newStatus;
    if (newStatus === 'Partial') dbStatus = 'Partially Paid';
    if (newStatus === 'Pending') dbStatus = 'Pending Payment';

    return await baseService.update('invoices', { [filterField]: id }, {
      status: dbStatus,
      updated_at: new Date().toISOString()
    });
  }
};
