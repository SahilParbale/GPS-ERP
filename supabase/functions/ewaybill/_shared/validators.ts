// =============================================================================
// GPS SPINDLE ERP — NIC E-WAY BILL VALIDATORS
// File: supabase/functions/ewaybill/_shared/validators.ts
// =============================================================================

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const VEHICLE_REGEX = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/;

export interface EWayBillInput {
  invoice_id: string;
  invoice_number: string;
  invoice_date?: string;
  customer_id?: string;
  customer_name: string;
  customer_gstin: string;
  customer_address?: string;
  supplier_gstin?: string;
  dispatch_from_address?: string;
  vehicle_number: string;
  transporter_name?: string;
  transporter_id?: string;
  transport_mode?: string;
  transport_doc_number?: string;
  distance_km: number;
  total_invoice_value: number;
  transaction_type?: string;
  items?: Array<{
    product_name: string;
    hsn_code: string;
    quantity: number;
    taxable_value: number;
    gst_rate: number;
    total_value: number;
  }>;
}

export function validateEWayBillInput(data: Partial<EWayBillInput>): { valid: boolean; error?: string } {
  if (!data.invoice_number || data.invoice_number.trim() === '') {
    return { valid: false, error: 'Invoice number is required' };
  }

  if (!data.customer_gstin || !GSTIN_REGEX.test(data.customer_gstin.trim().toUpperCase())) {
    return { valid: false, error: `Invalid Customer GSTIN format: "${data.customer_gstin}". Expected 15-character format (e.g. 27AABCT2418K1Z2)` };
  }

  if (data.supplier_gstin && !GSTIN_REGEX.test(data.supplier_gstin.trim().toUpperCase())) {
    return { valid: false, error: `Invalid Supplier GSTIN format: "${data.supplier_gstin}"` };
  }

  if (!data.vehicle_number || data.vehicle_number.trim() === '') {
    return { valid: false, error: 'Vehicle number is required' };
  }

  const cleanVehicle = data.vehicle_number.replace(/[\s-]/g, '').toUpperCase();
  if (!VEHICLE_REGEX.test(cleanVehicle)) {
    return { valid: false, error: `Invalid Vehicle Number format: "${data.vehicle_number}". Expected e.g. MH12AB1234` };
  }

  if (!data.distance_km || Number(data.distance_km) <= 0) {
    return { valid: false, error: 'Distance in KM must be greater than 0' };
  }

  if (Number(data.distance_km) > 4000) {
    return { valid: false, error: 'Distance in KM exceeds maximum permitted limit (4,000 km)' };
  }

  if (!data.total_invoice_value || Number(data.total_invoice_value) <= 0) {
    return { valid: false, error: 'Total invoice value must be greater than 0' };
  }

  return { valid: true };
}
