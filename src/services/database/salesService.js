import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Sales & Commercial Domain Service
 * Handles Quotations, Line Items, Sales Orders, and conversion to Proforma Invoices.
 */
export const salesService = {
  /**
   * Fetch all quotations with line items
   */
  async getQuotations(options = {}) {
    const res = await baseService.select('quotations', {
      select: `
        id,
        quotation_number,
        enquiry_id,
        customer_id,
        customer_name,
        customer_address,
        customer_gstin,
        place_of_supply,
        quotation_date,
        valid_until_date,
        spindle_serial,
        scope_of_work,
        subtotal,
        discount_amount,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_amount,
        status,
        terms,
        notes,
        created_at,
        customer:customers(id, company_name, gstin, billing_address, primary_phone),
        items:quotation_items(
          id,
          item_name,
          description,
          hsn_sac_code,
          quantity,
          unit_price,
          discount,
          gst_percent,
          total_amount
        )
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for frontend compatibility with existing SalesScreen components
    const normalizedData = (res.data || []).map(q => {
      const scopeLines = (q.scope_of_work || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const items = (q.items || []).map((it, idx) => ({
        id: it.id || idx + 1,
        name: it.item_name,
        desc: it.description || it.item_name,
        hsn: it.hsn_sac_code || '84669390',
        qty: it.quantity || 1,
        unitPrice: Number(it.unit_price || 0),
        total: Number(it.total_amount || 0)
      }));

      return {
        id: q.quotation_number || q.id,
        dbId: q.id,
        estimateNo: q.quotation_number,
        date: q.quotation_date || '2026-09-07',
        placeOfSupply: q.place_of_supply || '27-Maharashtra',
        customer: q.customer_name || q.customer?.company_name || 'Linamar India Pvt Ltd',
        customerId: q.customer_id,
        customerAddress: q.customer_address || q.customer?.billing_address || '',
        contactPerson: 'Materials & Plant Maintenance',
        contactNo: q.customer?.primary_phone || '7773877714',
        gstin: q.customer_gstin || q.customer?.gstin || '23AACCL5351J1ZM',
        state: q.place_of_supply || '27-Maharashtra',
        spindleSerial: q.spindle_serial || 'HMMXXVI',
        challanNo: 'N/A',
        inwardDate: q.quotation_date || '2026-08-22',
        scopeOfWork: scopeLines.length > 0 ? scopeLines : ['1. DISMANTLE', '2. CLEANING', '3. INSPECTION', '4. ASSEMBLY', '5. DYNAMIC TEST'],
        status: q.status === 'Sent' ? 'Under Review' : q.status,
        rawStatus: q.status,
        subtotal: Number(q.subtotal || 0),
        taxRate: 18,
        gstAmount: Number(q.total_amount || 0) - Number(q.subtotal || 0),
        totalAmount: Number(q.total_amount || 0),
        validUntil: q.valid_until_date || '2026-10-07',
        terms: q.terms || 'Standard MSME terms apply.',
        notes: q.notes || '',
        items: items
      };
    });

    return {
      ...res,
      data: normalizedData
    };
  },

  /**
   * Get single quotation by estimate number or ID
   */
  async getQuotationById(id) {
    const filter = id.includes('-') && id.length === 36 ? { id } : { quotation_number: id };
    const res = await baseService.select('quotations', {
      select: `
        id,
        quotation_number,
        customer_id,
        customer_name,
        customer_address,
        customer_gstin,
        place_of_supply,
        quotation_date,
        valid_until_date,
        spindle_serial,
        scope_of_work,
        subtotal,
        total_amount,
        status,
        terms,
        notes,
        items:quotation_items(
          id,
          item_name,
          description,
          hsn_sac_code,
          quantity,
          unit_price,
          total_amount
        )
      `,
      filter
    });

    if (res.error) return res;
    return { ...res, data: res.data?.[0] || null };
  },

  /**
   * Create a new quotation and its items transactionally
   */
  async createQuotation(quoteData) {
    const {
      quotationNumber,
      customerId,
      customerName,
      customerAddress,
      customerGstin,
      placeOfSupply,
      spindleSerial,
      scopeOfWork,
      subtotal,
      totalAmount,
      status = 'Draft',
      items = [],
      terms,
      notes
    } = quoteData;

    const record = {
      quotation_number: quotationNumber,
      customer_id: customerId,
      customer_name: customerName,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      place_of_supply: placeOfSupply || '27-Maharashtra',
      quotation_date: new Date().toISOString().split('T')[0],
      valid_until_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      spindle_serial: spindleSerial,
      scope_of_work: Array.isArray(scopeOfWork) ? scopeOfWork.join('\n') : (scopeOfWork || null),
      subtotal: subtotal || 0,
      taxable_amount: subtotal || 0,
      total_amount: totalAmount || (subtotal * 1.18),
      status: status === 'Under Review' ? 'Sent' : status,
      terms: terms || 'Standard 30 Days Warranty & Payment Terms',
      notes: notes || null
    };

    const insertRes = await baseService.insert('quotations', record);
    if (insertRes.error) return insertRes;

    const createdQuote = insertRes.data?.[0];
    if (createdQuote && items.length > 0) {
      const lineItems = items.map(it => ({
        quotation_id: createdQuote.id,
        item_name: it.name || it.desc || 'Spindle Service Item',
        description: it.desc || it.name,
        hsn_sac_code: it.hsn || '84669390',
        quantity: it.qty || 1,
        unit_price: it.unitPrice || it.rate || 0,
        gst_percent: 18.0,
        total_amount: (it.qty || 1) * (it.unitPrice || it.rate || 0)
      }));

      await baseService.insert('quotation_items', lineItems);
    }

    return insertRes;
  },

  /**
   * Update quotation status (Draft, Sent, Approved, Rejected, etc.)
   */
  async updateQuotationStatus(id, newStatus) {
    const dbStatus = newStatus === 'Under Review' ? 'Sent' : newStatus;
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'quotation_number';
    return await baseService.update('quotations', { [filterField]: id }, {
      status: dbStatus,
      updated_at: new Date().toISOString()
    });
  },

  /**
   * Link a launched Work Order to a quotation
   */
  async linkWorkOrderToQuotation(id, woNo) {
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'quotation_number';
    return await baseService.update('quotations', { [filterField]: id }, {
      status: 'Approved',
      notes: `[WO_LAUNCHED: ${woNo}]`,
      updated_at: new Date().toISOString()
    });
  },

  /**
   * Convert Approved Quotation into a Proforma Invoice
   */
  async convertQuotationToProformaInvoice(quoteId) {
    const qRes = await this.getQuotationById(quoteId);
    if (qRes.error || !qRes.data) {
      return { data: null, error: { message: 'Quotation not found for PI conversion.' } };
    }

    const q = qRes.data;
    const piNumber = `PI-2026-${Math.floor(100 + Math.random() * 900)}`;

    const piRecord = {
      pi_number: piNumber,
      quotation_id: q.id,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      customer_address: q.customer_address,
      customer_gstin: q.customer_gstin,
      issue_date: new Date().toISOString().split('T')[0],
      valid_until: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      payment_terms: '50% Advance with Proforma, 50% against Dispatch Inspection',
      subtotal: q.subtotal,
      taxable_amount: q.subtotal,
      total_amount: q.total_amount,
      status: 'Sent',
      notes: `Generated from Approved Quotation ${q.quotation_number}`
    };

    const piRes = await baseService.insert('proforma_invoices', piRecord);
    if (piRes.error) return piRes;

    const createdPI = piRes.data?.[0];
    if (createdPI && q.items?.length > 0) {
      const piItems = q.items.map(it => ({
        proforma_invoice_id: createdPI.id,
        product_name: it.item_name,
        description: it.description,
        hsn_sac: it.hsn_sac_code || '84669390',
        quantity: it.quantity,
        unit_rate: it.unit_price,
        gst_percent: 18.0,
        total: it.total_amount
      }));
      await baseService.insert('proforma_invoice_items', piItems);
    }

    // Mark quotation as Approved/Ordered
    await this.updateQuotationStatus(quoteId, 'Approved');

    return piRes;
  },

  /**
   * Fetch all sales orders
   */
  async getSalesOrders(options = {}) {
    return await baseService.select('sales_orders', {
      select: `
        id,
        sales_order_no,
        quotation_id,
        customer_id,
        customer_name,
        customer_po_reference,
        order_date,
        delivery_promised_date,
        subtotal,
        total_amount,
        status,
        items:sales_order_items(
          id,
          product_id,
          item_description,
          quantity,
          unit_price,
          total_price
        )
      `,
      orderBy: 'order_date',
      ascending: false,
      ...options
    });
  }
};
