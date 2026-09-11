-- ==============================================================================
-- GPS SPINDLE ERP — ATOMIC INVENTORY MUTATION RPC
-- Migration: 021_inventory_atomic_mutation.sql
-- Ensures single-transaction atomicity across stock balances, stock movements,
-- and financial inventory audit transactions.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.process_stock_mutation(
    p_product_id UUID,
    p_warehouse_id UUID,
    p_quantity INT,
    p_movement_type VARCHAR(50),
    p_reference_type VARCHAR(50) DEFAULT 'GOODS_RECEIPT',
    p_reference_id VARCHAR(100) DEFAULT 'MANUAL-ENTRY',
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL,
    p_bin_location VARCHAR(100) DEFAULT 'RACK-A-04'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock RECORD;
    v_prev_qty INT := 0;
    v_new_qty INT := 0;
    v_qty_delta INT;
    v_mov_number VARCHAR(100);
    v_txn_number VARCHAR(100);
    v_txn_type VARCHAR(50);
BEGIN
    -- Validate quantity
    IF p_quantity <= 0 AND p_movement_type != 'PHYSICAL_AUDIT_ADJUSTMENT' THEN
        RAISE EXCEPTION 'Quantity must be greater than zero';
    END IF;

    -- Lock and select existing stock row
    SELECT * INTO v_current_stock 
    FROM public.stock 
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id 
    FOR UPDATE;

    IF FOUND THEN
        v_prev_qty := COALESCE(v_current_stock.quantity_on_hand, 0);
    ELSE
        v_prev_qty := 0;
    END IF;

    -- Calculate delta and check negative stock
    IF p_movement_type IN ('ISSUE_PRODUCTION', 'SCRAP_WRITEOFF') THEN
        IF v_prev_qty < p_quantity THEN
            RAISE EXCEPTION 'Insufficient stock on hand (% units) to issue % units', v_prev_qty, p_quantity;
        END IF;
        v_qty_delta := -p_quantity;
        v_new_qty := v_prev_qty - p_quantity;
        v_txn_type := 'OUTWARD_PRODUCTION';
    ELSIF p_movement_type = 'RECEIPT_GRN' THEN
        v_qty_delta := p_quantity;
        v_new_qty := v_prev_qty + p_quantity;
        v_txn_type := 'INWARD_PURCHASE';
    ELSIF p_movement_type = 'PHYSICAL_AUDIT_ADJUSTMENT' THEN
        v_new_qty := p_quantity; -- In adjustment, p_quantity represents target count
        v_qty_delta := v_new_qty - v_prev_qty;
        v_txn_type := CASE WHEN v_qty_delta >= 0 THEN 'ADJUSTMENT_ADD' ELSE 'ADJUSTMENT_SUB' END;
    ELSE
        RAISE EXCEPTION 'Unsupported movement type: %', p_movement_type;
    END IF;

    -- Update stock row
    INSERT INTO public.stock (
        product_id,
        warehouse_id,
        bin_location,
        quantity_on_hand,
        quantity_reserved,
        last_counted_date
    ) VALUES (
        p_product_id,
        p_warehouse_id,
        p_bin_location,
        v_new_qty,
        COALESCE(v_current_stock.quantity_reserved, 0),
        CURRENT_DATE
    )
    ON CONFLICT (product_id, warehouse_id, bin_location)
    DO UPDATE SET 
        quantity_on_hand = EXCLUDED.quantity_on_hand,
        last_counted_date = CURRENT_DATE;

    -- Generate movement number and insert movement
    v_mov_number := 'MOV-2026-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    INSERT INTO public.stock_movements (
        movement_number,
        product_id,
        from_warehouse_id,
        to_warehouse_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        performed_by,
        notes
    ) VALUES (
        v_mov_number,
        p_product_id,
        CASE WHEN v_qty_delta < 0 THEN p_warehouse_id ELSE NULL END,
        CASE WHEN v_qty_delta > 0 THEN p_warehouse_id ELSE NULL END,
        p_movement_type,
        ABS(CASE WHEN p_movement_type = 'PHYSICAL_AUDIT_ADJUSTMENT' THEN v_qty_delta ELSE p_quantity END),
        p_reference_type,
        p_reference_id,
        COALESCE(p_performed_by, public.get_current_employee_id()),
        p_notes
    );

    -- Generate transaction number and insert inventory transaction
    v_txn_number := 'TXN-2026-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    INSERT INTO public.inventory_transactions (
        transaction_number,
        product_id,
        warehouse_id,
        transaction_type,
        quantity_delta,
        previous_quantity,
        new_quantity,
        reference_table,
        reference_id,
        performed_by,
        remarks
    ) VALUES (
        v_txn_number,
        p_product_id,
        p_warehouse_id,
        v_txn_type,
        v_qty_delta,
        v_prev_qty,
        v_new_qty,
        p_reference_type,
        p_reference_id,
        COALESCE(p_performed_by, public.get_current_employee_id()),
        p_notes
    );

    RETURN jsonb_build_object(
        'success', true,
        'movement_number', v_mov_number,
        'transaction_number', v_txn_number,
        'previous_quantity', v_prev_qty,
        'new_quantity', v_new_qty,
        'quantity_delta', v_qty_delta
    );
END;
$$;
