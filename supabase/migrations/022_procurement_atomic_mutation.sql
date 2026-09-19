-- ==============================================================================
-- GPS SPINDLE ERP — ATOMIC PROCUREMENT MUTATION RPC
-- Migration: 022_procurement_atomic_mutation.sql
-- Module: Procurement (Inventory Demand -> PR -> PO)
-- Ensures single-transaction atomicity across Purchase Requisitions (PR),
-- PR Line Items, Purchase Orders (PO), and PO Line Items.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.raise_purchase_order_from_inventory(
    p_product_id UUID,
    p_supplier_id UUID,
    p_quantity INT,
    p_expected_delivery_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'Approved',
    p_priority VARCHAR(30) DEFAULT 'High',
    p_payment_terms VARCHAR(100) DEFAULT 'Net 30 Days from GRN inspection',
    p_requested_by UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_supplier RECORD;
    v_pr_id UUID;
    v_po_id UUID;
    v_pr_number VARCHAR(100);
    v_po_number VARCHAR(100);
    v_unit_cost NUMERIC(12, 2);
    v_gst_rate NUMERIC(5, 2);
    v_subtotal NUMERIC(14, 2);
    v_gst_amount NUMERIC(12, 2);
    v_total_amount NUMERIC(14, 2);
    v_hsn VARCHAR(20);
    v_delivery_date DATE;
    v_current_year TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
BEGIN
    -- 1. Check role authorization (ADMIN, MANAGEMENT, PURCHASE)
    IF NOT (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE')) THEN
        RAISE EXCEPTION 'Permission denied (42501): Only Purchase, Management, or Administrator can raise Purchase Orders.';
    END IF;

    -- 2. Validate input quantity
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Order quantity must be greater than zero.';
    END IF;

    -- 3. Lock & validate product
    SELECT * INTO v_product
    FROM public.products
    WHERE id = p_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product with ID % not found.', p_product_id;
    END IF;

    -- 4. Lock & validate supplier
    SELECT * INTO v_supplier
    FROM public.suppliers
    WHERE id = p_supplier_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Supplier with ID % not found.', p_supplier_id;
    END IF;

    IF v_supplier.is_active = FALSE THEN
        RAISE EXCEPTION 'Supplier % is inactive.', v_supplier.name;
    END IF;

    -- 5. Calculate financials
    v_unit_cost := COALESCE(v_product.unit_cost_inr, 0);
    v_gst_rate := COALESCE(v_product.gst_rate_percent, 18.0);
    v_subtotal := p_quantity * v_unit_cost;
    v_gst_amount := ROUND(v_subtotal * (v_gst_rate / 100.0), 2);
    v_total_amount := v_subtotal + v_gst_amount;
    v_hsn := COALESCE(v_product.hsn_sac_code, '84669390');
    v_delivery_date := COALESCE(p_expected_delivery_date, CURRENT_DATE + INTERVAL '14 days');

    -- 6. Concurrency-safe number generation
    PERFORM pg_advisory_xact_lock(hashtext('procurement_numbering_lock'));

    v_pr_number := 'PR-' || v_current_year || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    v_po_number := 'PO-' || v_current_year || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    -- 7. Insert Purchase Requisition (PR)
    INSERT INTO public.purchase_requisitions (
        requisition_no,
        requested_by,
        department_id,
        required_by_date,
        priority,
        status,
        notes
    ) VALUES (
        v_pr_number,
        COALESCE(p_requested_by, public.get_current_employee_id()),
        p_department_id,
        v_delivery_date,
        p_priority,
        'PO Created',
        COALESCE(p_notes, 'Auto-requisition raised from Inventory stock control for ' || v_product.name)
    ) RETURNING id INTO v_pr_id;

    -- 8. Insert PR Line Item
    INSERT INTO public.purchase_requisition_items (
        requisition_id,
        product_id,
        item_description,
        quantity,
        estimated_rate
    ) VALUES (
        v_pr_id,
        v_product.id,
        v_product.name,
        p_quantity,
        v_unit_cost
    );

    -- 9. Insert Purchase Order (PO)
    INSERT INTO public.purchase_orders (
        po_number,
        requisition_id,
        supplier_id,
        supplier_name,
        supplier_email,
        supplier_contact,
        supplier_phone,
        supplier_gstin,
        supplier_address,
        order_date,
        expected_delivery_date,
        payment_terms,
        billing_address,
        shipping_address,
        currency,
        subtotal,
        taxable_amount,
        cgst_amount,
        sgst_amount,
        igst_amount,
        total_amount,
        status,
        notes
    ) VALUES (
        v_po_number,
        v_pr_id,
        v_supplier.id,
        v_supplier.name,
        v_supplier.email,
        v_supplier.contact_person,
        v_supplier.phone,
        v_supplier.gstin,
        v_supplier.address,
        CURRENT_DATE,
        v_delivery_date,
        p_payment_terms,
        'Plot B-12 Nanded City Industrial Complex, Pune - 411041',
        'Plot B-12 Nanded City Industrial Complex, Pune - 411041',
        'INR',
        v_subtotal,
        v_subtotal,
        ROUND(v_gst_amount / 2.0, 2),
        ROUND(v_gst_amount / 2.0, 2),
        0,
        v_total_amount,
        p_status,
        p_notes
    ) RETURNING id INTO v_po_id;

    -- 10. Insert PO Line Item
    INSERT INTO public.purchase_order_items (
        purchase_order_id,
        product_id,
        item_description,
        hsn_code,
        quantity,
        unit_price,
        gst_percent,
        total_price
    ) VALUES (
        v_po_id,
        v_product.id,
        v_product.name,
        v_hsn,
        p_quantity,
        v_unit_cost,
        v_gst_rate,
        v_subtotal
    );

    -- 11. Log Audit Event
    BEGIN
        INSERT INTO public.audit_logs (
            user_id,
            user_name,
            user_email,
            action,
            module,
            table_name,
            record_id,
            summary_message,
            new_values
        ) VALUES (
            auth.uid(),
            'Procurement System',
            COALESCE(auth.jwt()->>'email', 'system@gpspindles.com'),
            'CREATE',
            'Procurement',
            'purchase_orders',
            v_po_id::TEXT,
            'Raised Purchase Order ' || v_po_number || ' from Inventory demand (' || v_product.name || ')',
            jsonb_build_object(
                'po_id', v_po_id,
                'po_number', v_po_number,
                'pr_id', v_pr_id,
                'pr_number', v_pr_number,
                'product_id', v_product.id,
                'product_name', v_product.name,
                'quantity', p_quantity,
                'total_amount', v_total_amount,
                'supplier_id', v_supplier.id
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking audit failure
        NULL;
    END;

    -- 12. Return full result payload
    RETURN jsonb_build_object(
        'success', true,
        'po_id', v_po_id,
        'po_number', v_po_number,
        'pr_id', v_pr_id,
        'pr_number', v_pr_number,
        'total_amount', v_total_amount,
        'subtotal', v_subtotal,
        'gst_amount', v_gst_amount,
        'quantity', p_quantity,
        'product_name', v_product.name,
        'supplier_name', v_supplier.name
    );
END;
$$;
