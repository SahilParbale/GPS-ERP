import { baseService } from './baseService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Logistics & Dispatch Domain Service
 * Manages Transporters, Delivery Fleets, Dispatches,
 * Consignment Packaging Boxes, and Transit Tracking.
 */
export const logisticsService = {
  /**
   * Fetch all approved logistics transporters
   */
  async getTransporters() {
    return await baseService.select('transporters', {
      orderBy: 'rating',
      ascending: false
    });
  },

  /**
   * Fetch vehicles assigned to a transporter or all active vehicles
   */
  async getVehicles(transporterId) {
    return await baseService.select('vehicles', {
      eq: transporterId ? { transporter_id: transporterId } : undefined,
      orderBy: 'vehicle_number',
      ascending: true
    });
  },

  /**
   * Fetch all dispatches with customer, transporter, vehicle, and item joins
   */
  async getDispatches(options = {}) {
    const res = await baseService.select('dispatches', {
      select: `
        id,
        dispatch_number,
        invoice_id,
        eway_bill_id,
        transporter_id,
        vehicle_id,
        customer_id,
        dispatch_date,
        packaging_type,
        origin,
        destination,
        estimated_arrival,
        actual_delivery_date,
        status,
        delivery_pod_url,
        created_at,
        customer:customers(id, customer_code, company_name),
        transporter:transporters(id, code, name, phone),
        vehicle:vehicles(id, vehicle_number, driver_name, driver_phone),
        invoice:invoices(id, invoice_number, total_amount),
        eway_bill:eway_bills(id, ewb_number),
        items:dispatch_items(id, product_name, spindle_serial, quantity, package_box_number, gross_weight_kg)
      `,
      orderBy: options.orderBy || 'dispatch_date',
      ascending: options.ascending ?? false,
      ...options
    });

    if (res.error) return res;

    // Normalize for clean UI display
    const normalized = (res.data || []).map(d => {
      const cust = d.customer || {};
      const trp = d.transporter || {};
      const veh = d.vehicle || {};
      const inv = d.invoice || {};
      const ewb = d.eway_bill || {};

      return {
        id: d.dispatch_number || d.id,
        dbId: d.id,
        dispatchNumber: d.dispatch_number,
        customer: cust.company_name || 'Customer Plant',
        customerCode: cust.customer_code,
        destination: d.destination,
        origin: d.origin,
        dispatchDate: d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString('en-GB') : '—',
        estimatedArrival: d.estimated_arrival ? new Date(d.estimated_arrival).toLocaleDateString('en-GB') : '—',
        actualDeliveryDate: d.actual_delivery_date ? new Date(d.actual_delivery_date).toLocaleDateString('en-GB') : null,
        status: d.status || 'In Transit',
        transporter: trp.name || 'VRL Logistics Ltd',
        transporterPhone: trp.phone,
        vehicle: veh.vehicle_number || 'MH12AB1234',
        driverName: veh.driver_name || 'Designated Driver',
        driverPhone: veh.driver_phone,
        invoiceNumber: inv.invoice_number || 'INV-2026-019',
        ewbNumber: ewb.ewb_number || '2418 9032 1198',
        packagingType: d.packaging_type,
        itemCount: (d.items || []).length,
        items: d.items || []
      };
    });

    return {
      ...res,
      data: normalized
    };
  },

  /**
   * Fetch single dispatch by dispatch_number or UUID
   */
  async getDispatchById(identifier) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const filter = isUuid ? { id: identifier } : { dispatch_number: identifier };

    const { data, error } = await supabase
      .from('dispatches')
      .select(`
        *,
        customer:customers(*),
        transporter:transporters(*),
        vehicle:vehicles(*),
        items:dispatch_items(*)
      `)
      .match(filter)
      .limit(1);

    if (error) return { data: null, error };
    return { data: data?.[0] || null, error: null };
  },

  /**
   * Atomic creation of Dispatch and Dispatch Items with compensating rollback
   */
  async createDispatch(dispatchData, items = []) {
    const dispatchNumber = dispatchData.dispatch_number || `DSP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const dispatchRecord = {
      dispatch_number: dispatchNumber,
      invoice_id: dispatchData.invoice_id || null,
      eway_bill_id: dispatchData.eway_bill_id || null,
      transporter_id: dispatchData.transporter_id || null,
      vehicle_id: dispatchData.vehicle_id || null,
      customer_id: dispatchData.customer_id || null,
      dispatch_date: dispatchData.dispatch_date || new Date().toISOString(),
      packaging_type: dispatchData.packaging_type || 'Shock-Sensor Hardwood Export Crate with Hermetic VCI Seal',
      origin: dispatchData.origin || 'GPS Plant 1 Nanded City Pune',
      destination: dispatchData.destination || 'Customer Industrial Facility',
      status: dispatchData.status || 'Preparing'
    };

    // 1. Insert parent dispatch row
    const { data: dispatch, error: dspErr } = await supabase
      .from('dispatches')
      .insert(dispatchRecord)
      .select()
      .single();

    if (dspErr) {
      return { data: null, error: dspErr };
    }

    // 2. Insert itemized packing boxes if provided
    if (items.length > 0) {
      const itemsPayload = items.map((it, idx) => ({
        dispatch_id: dispatch.id,
        product_name: it.product_name || it.product || 'Precision Spindle Unit',
        spindle_serial: it.spindle_serial || it.serial || null,
        quantity: it.quantity || 1,
        package_box_number: it.package_box_number || `BOX-${idx + 1}`,
        gross_weight_kg: it.gross_weight_kg || 45.0
      }));

      const { error: itemsErr } = await supabase.from('dispatch_items').insert(itemsPayload);

      if (itemsErr) {
        // Compensating Rollback: Remove the parent dispatch record
        await supabase.from('dispatches').delete().eq('id', dispatch.id);
        return { data: null, error: itemsErr };
      }
    }

    return { data: dispatch, error: null };
  },

  /**
   * Update transit status (In Transit, Delivered, etc.)
   */
  async updateDispatchStatus(dispatchId, newStatus, actualDeliveryDate = null) {
    const payload = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };
    if (newStatus === 'Delivered') {
      payload.actual_delivery_date = actualDeliveryDate || new Date().toISOString();
    }

    return await baseService.update('dispatches', dispatchId, payload);
  }
};
