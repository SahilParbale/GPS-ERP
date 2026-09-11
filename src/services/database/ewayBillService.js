import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * E-Way Bills & Logistics Domain Service
 * Handles GST E-Way Bills, Vehicle Allocations, Transporter Tracking, and Cancellation.
 */
export const ewayBillService = {
  /**
   * Fetch all E-Way Bills with goods items
   */
  async getEWayBills(options = {}) {
    const res = await baseService.select('eway_bills', {
      select: `
        id,
        ewb_number,
        invoice_id,
        invoice_number,
        customer_id,
        customer_name,
        customer_gstin,
        customer_address,
        supplier_gstin,
        dispatch_from_address,
        vehicle_number,
        transporter_name,
        transporter_id,
        transport_mode,
        transport_doc_number,
        distance_km,
        valid_from,
        valid_until,
        total_invoice_value,
        status,
        notes,
        created_at,
        customer:customers(id, company_name, gstin, city, state, postal_code),
        items:eway_bill_items(
          id,
          product_name,
          hsn_code,
          quantity,
          taxable_value,
          gst_rate,
          total_value
        )
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for EWayBillScreen
    const normalizedData = (res.data || []).map(ewb => {
      const goods = (ewb.items || []).map((g, idx) => ({
        id: g.id || idx + 1,
        product: g.product_name,
        hsn: g.hsn_code || '84669390',
        quantity: g.quantity || 1,
        unit: 'Sets',
        taxableValue: Number(g.taxable_value || 0),
        gstRate: Number(g.gst_rate || 18),
        totalValue: Number(g.total_value || 0)
      }));

      const totalVal = Number(ewb.total_invoice_value || 0);
      const taxable = Math.round(totalVal / 1.18);
      const taxAmt = totalVal - taxable;
      const isInterstate = (ewb.customer_gstin || '').startsWith('36');

      return {
        id: ewb.ewb_number || ewb.id,
        dbId: ewb.id,
        ewbNumber: ewb.ewb_number,
        invoice: ewb.invoice_number,
        invoiceDate: '04 Sep 2026',
        customer: ewb.customer_name?.replace(/ Ltd| Limited/i, '') || 'Tata Advanced Systems',
        customerFullName: ewb.customer_name || 'Tata Advanced Systems Ltd',
        customerGstin: ewb.customer_gstin || '36AAACT2718E1ZQ',
        customerAddress: ewb.customer_address || 'Aerospace SEZ, Adibatla, Hyderabad',
        customerState: isInterstate ? '36-Telangana' : '27-Maharashtra',
        customerPin: ewb.customer?.postal_code || '501510',
        supplierCompany: 'General Precision Spindles Pvt. Ltd.',
        supplierGstin: ewb.supplier_gstin || '27AABCG1492K1Z8',
        supplierAddress: ewb.dispatch_from_address || 'Plot B-12, Nanded City Industrial Complex, Pune - 411041, Maharashtra',
        supplierState: '27-Maharashtra',
        supplierPin: '411041',
        vehicle: ewb.vehicle_number || 'MH12AB1234',
        transporter: ewb.transporter_name || 'ABC Logistics',
        transporterId: ewb.transporter_id || '27AABCA9081T1Z5',
        mode: ewb.transport_mode || 'Road',
        distance: `${ewb.distance_km || 540} km`,
        transportDocNo: ewb.transport_doc_number || 'LR-2026-88192',
        transportDocDate: '04 Sep 2026',
        transactionType: 'Supply',
        validFrom: ewb.valid_from ? new Date(ewb.valid_from).toLocaleString('en-IN') : '04 Sep 2026, 06:00 PM',
        validUntil: ewb.valid_until ? new Date(ewb.valid_until).toLocaleString('en-IN') : '10 Sep 2026, 11:59 PM',
        status: ewb.status || 'Active',
        taxableValue: taxable,
        cgstAmount: isInterstate ? 0 : Math.round(taxAmt / 2),
        sgstAmount: isInterstate ? 0 : Math.round(taxAmt / 2),
        igstAmount: isInterstate ? Math.round(taxAmt) : 0,
        totalInvoiceValue: totalVal,
        formattedTotal: `₹${totalVal.toLocaleString('en-IN')}`,
        goods: goods.length > 0 ? goods : [
          {
            id: 1,
            product: 'GPS-HSK-A63-24K Motorized Spindle Unit',
            hsn: '84669390',
            quantity: 2,
            unit: 'Sets',
            taxableValue: taxable,
            gstRate: 18,
            totalValue: totalVal
          }
        ],
        timeline: [
          {
            id: 1,
            title: 'E-Way Bill Generated (Live Supabase)',
            detail: `Generated against Tax Invoice ${ewb.invoice_number} with vehicle ${ewb.vehicle_number}`,
            time: '04 Sep 2026, 06:00 PM',
            user: 'Ganesh Pawar (Dispatch)'
          },
          {
            id: 2,
            title: 'Consignment Dispatched',
            detail: 'Vehicle exited Nanded City plant gate after security verification',
            time: '04 Sep 2026, 07:15 PM',
            user: 'Security Post 1'
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
   * Create a new E-Way Bill and goods items
   */
  async createEWayBill(ewbData) {
    const {
      ewbNumber,
      invoiceNumber,
      customerId,
      customerName,
      customerGstin,
      customerAddress,
      vehicleNumber,
      transporterName,
      transporterId,
      transportMode = 'Road',
      transportDocNo,
      distanceKm = 100,
      totalInvoiceValue,
      status = 'Active',
      goods = []
    } = ewbData;

    let invoiceId = null;
    if (invoiceNumber) {
      const { data: inv } = await supabase.from('invoices').select('id').eq('invoice_number', invoiceNumber).maybeSingle();
      invoiceId = inv?.id || null;
    }

    const record = {
      ewb_number: ewbNumber || `2418 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      invoice_id: invoiceId,
      invoice_number: invoiceNumber || 'INV-2026-019',
      customer_id: customerId,
      customer_name: customerName,
      customer_gstin: customerGstin || '36AAACT2718E1ZQ',
      customer_address: customerAddress,
      supplier_gstin: '27AABCG1492K1Z8',
      dispatch_from_address: 'Plot B-12, Nanded City Industrial Complex, Pune - 411041, Maharashtra',
      vehicle_number: vehicleNumber || 'MH12AB1234',
      transporter_name: transporterName || 'ABC Logistics Pvt Ltd',
      transporter_id: transporterId || '27AABCA9081T1Z5',
      transport_mode: transportMode,
      transport_doc_number: transportDocNo || 'LR-2026-001',
      distance_km: parseInt(String(distanceKm).replace(/[^0-9]/g, '')) || 100,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 6 * 86400000).toISOString(),
      total_invoice_value: totalInvoiceValue,
      status: status,
      notes: `Generated for Invoice ${invoiceNumber}`
    };

    const insertRes = await baseService.insert('eway_bills', record);
    if (insertRes.error) return insertRes;

    const createdEWB = insertRes.data?.[0];
    if (createdEWB && goods.length > 0) {
      const items = goods.map(g => ({
        eway_bill_id: createdEWB.id,
        product_name: g.product || 'Precision Motorized Spindle Unit',
        hsn_code: g.hsn || '84669390',
        quantity: g.quantity || 1,
        taxable_value: g.taxableValue || Math.round(totalInvoiceValue / 1.18),
        gst_rate: g.gstRate || 18.0,
        total_value: g.totalValue || totalInvoiceValue
      }));
      await baseService.insert('eway_bill_items', items);
    }

    return insertRes;
  },

  /**
   * Cancel an active E-Way Bill
   */
  async cancelEWayBill(ewbId, cancelReason = 'Consignment Cancelled') {
    const filterField = ewbId.includes('-') && ewbId.length === 36 ? 'id' : 'ewb_number';
    return await baseService.update('eway_bills', { [filterField]: ewbId }, {
      status: 'Cancelled',
      notes: cancelReason,
      updated_at: new Date().toISOString()
    });
  }
};
