-- ==============================================================================
-- GPS SPINDLE ERP — GST / NIC E-WAY BILL ATOMIC INTEGRATION RPC
-- Migration: 024_ewaybill_atomic_integration.sql
-- Purpose:  Atomic idempotency, advisory locking, and lifecycle state management
--           for official NIC / GST E-Way Bill API v1.03 integration.
-- ==============================================================================

-- 1. begin_ewaybill_generation
-- ─────────────────────────────────────────────────────────────────────────────
-- Atomically checks whether an Active E-Way Bill already exists for the target
-- invoice. If active, returns is_duplicate = TRUE so the caller can return the
-- existing EWB without re-calling NIC. Otherwise creates a 'Draft' record with
-- advisory locking and returns its ID.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.begin_ewaybill_generation(
    p_invoice_id            UUID,
    p_invoice_number        TEXT,
    p_customer_id           UUID,
    p_customer_name         TEXT,
    p_customer_gstin        TEXT,
    p_customer_address      TEXT     DEFAULT NULL,
    p_supplier_gstin        TEXT     DEFAULT '27AABCG1492K1Z8',
    p_dispatch_from_address TEXT     DEFAULT 'Plot 42, MIDC Bhosari, Pune 411026, Maharashtra',
    p_vehicle_number        TEXT     DEFAULT '',
    p_transporter_name      TEXT     DEFAULT 'Direct Transport',
    p_transporter_id        TEXT     DEFAULT NULL,
    p_transport_mode        TEXT     DEFAULT 'Road',
    p_transport_doc_number  TEXT     DEFAULT NULL,
    p_distance_km           INT      DEFAULT 50,
    p_total_invoice_value   NUMERIC  DEFAULT 0,
    p_created_by            UUID     DEFAULT NULL,
    p_notes                 TEXT     DEFAULT NULL,
    p_items                 JSONB    DEFAULT '[]'::JSONB
)
RETURNS TABLE(
    eway_bill_id      UUID,
    is_duplicate      BOOLEAN,
    existing_ewb_no   TEXT,
    existing_status   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id      UUID;
    v_existing_ewb_no  TEXT;
    v_existing_status  TEXT;
    v_new_id           UUID;
    v_draft_ewb_number TEXT;
    v_item             JSONB;
BEGIN
    -- Input validation guards
    IF p_invoice_number IS NULL OR length(trim(p_invoice_number)) = 0 THEN
        RAISE EXCEPTION 'invoice_number must be a non-empty string';
    END IF;
    IF p_customer_gstin IS NULL OR length(trim(p_customer_gstin)) = 0 THEN
        RAISE EXCEPTION 'customer_gstin must be a non-empty string';
    END IF;
    IF p_vehicle_number IS NULL OR length(trim(p_vehicle_number)) = 0 THEN
        RAISE EXCEPTION 'vehicle_number must be a non-empty string';
    END IF;
    IF p_distance_km IS NULL OR p_distance_km <= 0 THEN
        RAISE EXCEPTION 'distance_km must be a positive integer';
    END IF;
    IF p_total_invoice_value IS NULL OR p_total_invoice_value <= 0 THEN
        RAISE EXCEPTION 'total_invoice_value must be greater than zero';
    END IF;

    -- Acquire transaction-scoped advisory lock on invoice number to serialize concurrent calls
    PERFORM pg_advisory_xact_lock(hashtext('ewb_' || p_invoice_number)::BIGINT);

    -- Check if an Active E-Way Bill already exists for this invoice
    SELECT eb.id, eb.ewb_number, eb.status
      INTO v_existing_id, v_existing_ewb_no, v_existing_status
      FROM public.eway_bills eb
     WHERE (eb.invoice_id = p_invoice_id OR eb.invoice_number = p_invoice_number)
       AND eb.status = 'Active'
     ORDER BY eb.created_at DESC
     LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- Active EWB already exists; return existing record to caller without re-calling NIC
        RETURN QUERY SELECT v_existing_id, TRUE, v_existing_ewb_no, v_existing_status;
        RETURN;
    END IF;

    -- Generate temporary draft EWB identifier
    v_draft_ewb_number := 'DRAFT-' || p_invoice_number || '-' || replace(gen_random_uuid()::TEXT, '-', '');

    -- Insert Draft record into eway_bills
    INSERT INTO public.eway_bills (
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
        created_by,
        notes,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_draft_ewb_number,
        p_invoice_id,
        p_invoice_number,
        p_customer_id,
        p_customer_name,
        p_customer_gstin,
        p_customer_address,
        p_supplier_gstin,
        p_dispatch_from_address,
        upper(trim(p_vehicle_number)),
        p_transporter_name,
        p_transporter_id,
        p_transport_mode,
        p_transport_doc_number,
        p_distance_km,
        clock_timestamp(),
        clock_timestamp() + INTERVAL '24 hours',
        p_total_invoice_value,
        'Draft',
        p_created_by,
        p_notes,
        clock_timestamp(),
        clock_timestamp()
    )
    RETURNING id INTO v_new_id;

    -- Insert line items if provided
    IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
        LOOP
            INSERT INTO public.eway_bill_items (
                eway_bill_id,
                product_name,
                hsn_code,
                quantity,
                taxable_value,
                gst_rate,
                total_value
            ) VALUES (
                v_new_id,
                COALESCE(v_item->>'product_name', 'Industrial Goods'),
                COALESCE(v_item->>'hsn_code', '84669390'),
                COALESCE((v_item->>'quantity')::INT, 1),
                COALESCE((v_item->>'taxable_value')::NUMERIC, p_total_invoice_value),
                COALESCE((v_item->>'gst_rate')::NUMERIC, 18.0),
                COALESCE((v_item->>'total_value')::NUMERIC, p_total_invoice_value)
            );
        END LOOP;
    END IF;

    RETURN QUERY SELECT v_new_id, FALSE, NULL::TEXT, 'Draft'::TEXT;
END;
$$;

-- 2. complete_ewaybill_generation
-- ─────────────────────────────────────────────────────────────────────────────
-- Updates the Draft E-Way Bill with the authoritative 12-digit EWB number and
-- validity timestamps returned by NIC, sets status to 'Active', links any
-- corresponding dispatch, and writes an audit log.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.complete_ewaybill_generation(
    p_eway_bill_id   UUID,
    p_ewb_number     TEXT,
    p_valid_from     TIMESTAMPTZ,
    p_valid_until    TIMESTAMPTZ,
    p_status         TEXT    DEFAULT 'Active',
    p_notes          TEXT    DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice_id   UUID;
    v_inv_no       TEXT;
BEGIN
    IF p_eway_bill_id IS NULL THEN
        RAISE EXCEPTION 'eway_bill_id must not be null';
    END IF;
    IF p_ewb_number IS NULL OR length(trim(p_ewb_number)) = 0 THEN
        RAISE EXCEPTION 'ewb_number must be a non-empty string';
    END IF;

    -- Update eway_bills
    UPDATE public.eway_bills
       SET ewb_number   = trim(p_ewb_number),
           valid_from   = COALESCE(p_valid_from, valid_from),
           valid_until  = COALESCE(p_valid_until, valid_until),
           status       = p_status,
           notes        = CASE 
                            WHEN p_notes IS NOT NULL AND length(trim(p_notes)) > 0 
                            THEN COALESCE(notes || ' | ', '') || trim(p_notes)
                            ELSE notes
                          END,
           updated_at   = clock_timestamp()
     WHERE id = p_eway_bill_id
 RETURNING invoice_id, invoice_number INTO v_invoice_id, v_inv_no;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'E-Way Bill % not found', p_eway_bill_id;
    END IF;

    -- Automatically associate with physical dispatch if exists
    IF v_invoice_id IS NOT NULL THEN
        UPDATE public.dispatches
           SET eway_bill_id = p_eway_bill_id
         WHERE invoice_id = v_invoice_id
           AND (eway_bill_id IS NULL OR eway_bill_id = p_eway_bill_id);
    END IF;

    -- Write immutable audit log
    INSERT INTO public.audit_logs (
        module,
        action,
        table_name,
        record_id,
        summary_message,
        ip_address,
        created_at
    ) VALUES (
        'Commercial',
        'GENERATE_EWAY_BILL',
        'eway_bills',
        p_eway_bill_id,
        'Generated official NIC E-Way Bill ' || trim(p_ewb_number) || ' for Invoice ' || COALESCE(v_inv_no, 'N/A'),
        '127.0.0.1',
        clock_timestamp()
    );

    RETURN TRUE;
END;
$$;

-- 3. record_ewaybill_cancellation
-- ─────────────────────────────────────────────────────────────────────────────
-- Records successful NIC E-Way Bill cancellation, updates status to 'Cancelled',
-- and writes an audit log.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.record_ewaybill_cancellation(
    p_eway_bill_id   UUID,
    p_cancel_reason  TEXT,
    p_cancelled_by   UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ewb_no TEXT;
BEGIN
    IF p_eway_bill_id IS NULL THEN
        RAISE EXCEPTION 'eway_bill_id must not be null';
    END IF;

    UPDATE public.eway_bills
       SET status     = 'Cancelled',
           notes      = COALESCE(notes || ' | ', '') || 'Cancelled: ' || COALESCE(p_cancel_reason, 'Order Cancelled'),
           updated_at = clock_timestamp()
     WHERE id = p_eway_bill_id
 RETURNING ewb_number INTO v_ewb_no;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'E-Way Bill % not found', p_eway_bill_id;
    END IF;

    -- Write audit log
    INSERT INTO public.audit_logs (
        module,
        action,
        table_name,
        record_id,
        summary_message,
        ip_address,
        created_at
    ) VALUES (
        'Commercial',
        'CANCEL_EWAY_BILL',
        'eway_bills',
        p_eway_bill_id,
        'Cancelled E-Way Bill ' || COALESCE(v_ewb_no, p_eway_bill_id::TEXT) || '. Reason: ' || COALESCE(p_cancel_reason, 'User Cancelled'),
        '127.0.0.1',
        clock_timestamp()
    );

    RETURN TRUE;
END;
$$;

-- 4. record_ewaybill_vehicle_update
-- ─────────────────────────────────────────────────────────────────────────────
-- Records Part-B / Vehicle update dispatched to NIC, updating vehicle_number,
-- validity extension if applicable, and writing an audit log.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.record_ewaybill_vehicle_update(
    p_eway_bill_id    UUID,
    p_vehicle_number  TEXT,
    p_from_place      TEXT,
    p_reason_code     TEXT,
    p_remarks         TEXT,
    p_valid_until     TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ewb_no TEXT;
BEGIN
    IF p_eway_bill_id IS NULL THEN
        RAISE EXCEPTION 'eway_bill_id must not be null';
    END IF;
    IF p_vehicle_number IS NULL OR length(trim(p_vehicle_number)) = 0 THEN
        RAISE EXCEPTION 'vehicle_number must not be empty';
    END IF;

    UPDATE public.eway_bills
       SET vehicle_number = upper(trim(p_vehicle_number)),
           valid_until    = COALESCE(p_valid_until, valid_until),
           notes          = COALESCE(notes || ' | ', '') || 'Part-B Updated: ' || upper(trim(p_vehicle_number)) || ' (' || COALESCE(p_remarks, 'En-route vehicle change') || ')',
           updated_at     = clock_timestamp()
     WHERE id = p_eway_bill_id
 RETURNING ewb_number INTO v_ewb_no;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'E-Way Bill % not found', p_eway_bill_id;
    END IF;

    -- Write audit log
    INSERT INTO public.audit_logs (
        module,
        action,
        table_name,
        record_id,
        summary_message,
        ip_address,
        created_at
    ) VALUES (
        'Commercial',
        'UPDATE_VEHICLE_EWAY_BILL',
        'eway_bills',
        p_eway_bill_id,
        'Updated vehicle on E-Way Bill ' || COALESCE(v_ewb_no, p_eway_bill_id::TEXT) || ' to ' || upper(trim(p_vehicle_number)) || ' (' || COALESCE(p_remarks, 'Vehicle Updated') || ')',
        '127.0.0.1',
        clock_timestamp()
    );

    RETURN TRUE;
END;
$$;

-- Grant execution to authenticated users (RLS policies govern underlying tables)
GRANT EXECUTE ON FUNCTION public.begin_ewaybill_generation TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ewaybill_generation TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ewaybill_cancellation TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ewaybill_vehicle_update TO authenticated;
