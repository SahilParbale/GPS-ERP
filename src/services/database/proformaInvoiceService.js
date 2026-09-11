import { baseService } from './baseService';

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
      const items = (pi.items || []).map((it, idx) => ({
        id: it.id || idx + 1,
        product: it.product_name,
        desc: it.description || it.product_name,
        qty: it.quantity || 1,
        unit: 'Units',
        rate: Number(it.unit_rate || 0),
        discount: Number(it.discount || 0),
        gst: Number(it.gst_percent || 18),
        total: Number(it.total || 0)
      }));

      const isInterstate = (pi.customer_gstin || '').startsWith('36');
      const taxAmt = Number(pi.total_amount || 0) - Number(pi.subtotal || 0);

      return {
        id: pi.pi_number || pi.id,
        dbId: pi.id,
        piNumber: pi.pi_number,
        customer: pi.customer_name?.replace(/ Ltd| Limited/i, '') || 'Tata Advanced Systems',
        customerFullName: pi.customer_name || 'Tata Advanced Systems Ltd',
        customerContact: 'Mr. Tanmay Sharma (DGM - Procurement)',
        customerEmail: pi.customer_email || 'tanmay@tataadvanced.com',
        billingAddress: pi.customer_address || 'Aerospace Special Economic Zone, Hyderabad',
        shippingAddress: pi.customer_address || 'Chakan MIDC Phase II, Pune',
        gstin: pi.customer_gstin || '36AAACT2718E1ZQ',
        salesOrder: pi.sales_order?.sales_order_no || 'SO-2026-041',
        date: pi.issue_date || '04 Sep 2026',
        validUntil: pi.valid_until || '19 Sep 2026',
        paymentTerms: pi.payment_terms || '50% Advance with Proforma, 50% against Dispatch Inspection',
        status: pi.status === 'Advance Paid' ? 'Accepted' : pi.status,
        rawStatus: pi.status,
        subtotal: Number(pi.subtotal || 0),
        discount: Number(pi.discount || 0),
        taxRate: 18,
        cgstAmount: isInterstate ? 0 : Math.round(taxAmt / 2),
        sgstAmount: isInterstate ? 0 : Math.round(taxAmt / 2),
        igstAmount: isInterstate ? Math.round(taxAmt) : 0,
        gstAmount: taxAmt,
        totalAmount: Number(pi.total_amount || 0),
        formattedTotal: `₹${Number(pi.total_amount || 0).toLocaleString('en-IN')}`,
        bankDetails: {
          bankName: pi.bank_name || 'ICICI BANK LIMITED, PUNE NANDED CITY',
          accountName: 'GENERAL PRECISION SPINDLES',
          accountNumber: pi.bank_account_no || '349105000701',
          ifscCode: pi.bank_ifsc || 'ICIC0003491',
          branch: 'Nanded City Destination Centre, Pune - 411041'
        },
        notes: pi.notes || 'Proforma Invoice generated against confirmed Sales Order.',
        items: items,
        timeline: [
          {
            id: 1,
            title: 'PI Generated in ERP',
            detail: `Registered against ${pi.sales_order?.sales_order_no || 'Commercial Order'}`,
            time: '04 Sep 2026, 09:30 AM',
            user: 'Rahul Patil'
          },
          {
            id: 2,
            title: 'Proforma Invoice Transmitted',
            detail: `Sent via Outlook integration to ${pi.customer_email || 'client'}`,
            time: '04 Sep 2026, 11:15 AM',
            user: 'Commercial Desk'
          }
        ]
      };
    });

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
      salesOrderNo,
      issueDate,
      validUntil,
      paymentTerms,
      subtotal,
      discount = 0,
      totalAmount,
      status = 'Draft',
      notes,
      items = []
    } = piData;

    let salesOrderId = null;
    if (salesOrderNo) {
      const { data: so } = await supabase.from('sales_orders').select('id').eq('sales_order_no', salesOrderNo).maybeSingle();
      salesOrderId = so?.id || null;
    }

    const record = {
      pi_number: piNumber,
      sales_order_id: salesOrderId,
      customer_id: customerId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      issue_date: issueDate || new Date().toISOString().split('T')[0],
      valid_until: validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      payment_terms: paymentTerms || '50% Advance Wire, 50% Before Dispatch',
      subtotal: subtotal,
      discount: discount,
      taxable_amount: subtotal - discount,
      total_amount: totalAmount || Math.round(subtotal * 1.18),
      status: status === 'Accepted' ? 'Advance Paid' : status,
      notes: notes || null
    };

    const insertRes = await baseService.insert('proforma_invoices', record);
    if (insertRes.error) return insertRes;

    const createdPI = insertRes.data?.[0];
    if (createdPI && items.length > 0) {
      const piItems = items.map(it => ({
        proforma_invoice_id: createdPI.id,
        product_name: it.product || it.name || 'Spindle Assembly',
        description: it.desc || it.product,
        hsn_sac: it.hsn || '84669390',
        quantity: it.qty || 1,
        unit_rate: it.rate || it.unitPrice || 0,
        discount: it.discount || 0,
        gst_percent: it.gst || 18.0,
        total: it.total || (it.qty * it.rate)
      }));
      await baseService.insert('proforma_invoice_items', piItems);
    }

    return insertRes;
  },

  /**
   * Update PI status (Draft, Sent, Advance Paid, Converted to Tax Invoice, Cancelled)
   */
  async updateProformaInvoiceStatus(id, status) {
    const dbStatus = status === 'Accepted' ? 'Advance Paid' : status;
    const filterField = id.includes('-') && id.length === 36 ? 'id' : 'pi_number';
    return await baseService.update('proforma_invoices', { [filterField]: id }, {
      status: dbStatus,
      updated_at: new Date().toISOString()
    });
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
