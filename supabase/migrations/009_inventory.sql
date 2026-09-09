-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 009_inventory.sql
-- Module: Inventory, Warehouses, Stock Levels, Stock Movements & Transactions
-- ==============================================================================

-- 1. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'BEARINGS', 'STATORS', 'ENCODERS', 'RAW_STOCK', 'TOOLING'
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCTS / PARTS MASTER
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    part_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'FAG-HC7008-EDLR', 'OTT-JAKOB-95.600'
    sku VARCHAR(100) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_sac_code VARCHAR(20) DEFAULT '84669390',
    unit_of_measure VARCHAR(20) DEFAULT 'PCS' CHECK (unit_of_measure IN ('PCS', 'SETS', 'METERS', 'KG', 'LITERS', 'BOXES')),
    min_reorder_level INT DEFAULT 10 CHECK (min_reorder_level >= 0),
    safety_stock INT DEFAULT 5 CHECK (safety_stock >= 0),
    unit_cost_inr NUMERIC(12, 2) DEFAULT 0,
    gst_rate_percent NUMERIC(5, 2) DEFAULT 18.0,
    lead_time_days INT DEFAULT 14,
    preferred_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. WAREHOUSES & STORAGE HUBS
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'STORES-CENTRAL', 'BOM-KIT-BAY3'
    name VARCHAR(150) NOT NULL,
    warehouse_type VARCHAR(50) DEFAULT 'General Stores' CHECK (warehouse_type IN ('General Stores', 'Cleanroom Kitting', 'Raw Material Yard', 'Finished Goods Store', 'Quarantine Scrap Store')),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STOCK LEVELS (Warehouse-Bin specific balances)
CREATE TABLE IF NOT EXISTS public.stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    bin_location VARCHAR(50), -- e.g. 'RACK-B-04'
    quantity_on_hand INT DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INT DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_available INT GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    last_counted_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (product_id, warehouse_id, bin_location)
);

-- 5. STOCK MOVEMENTS (Physical Relocations & Traveler Issues)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    movement_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'MOV-2026-0182'
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    from_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    to_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('RECEIPT_GRN', 'ISSUE_PRODUCTION', 'RETURN_PRODUCTION', 'WAREHOUSE_TRANSFER', 'SCRAP_WRITEOFF', 'PHYSICAL_AUDIT_ADJUSTMENT')),
    quantity INT NOT NULL CHECK (quantity > 0),
    reference_type VARCHAR(50), -- 'GOODS_RECEIPT', 'WORK_ORDER', 'DISPATCH', 'MAINTENANCE_ORDER'
    reference_id VARCHAR(100),
    goods_receipt_id UUID REFERENCES public.goods_receipts(id) ON DELETE SET NULL,
    performed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVENTORY TRANSACTIONS (Financial & Quantity Audit Ledger)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'TXN-2026-0412'
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('INWARD_PURCHASE', 'OUTWARD_PRODUCTION', 'OUTWARD_SALES', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB', 'TRANSFER_IN', 'TRANSFER_OUT')),
    quantity_delta INT NOT NULL,
    previous_quantity INT NOT NULL,
    new_quantity INT NOT NULL,
    unit_cost NUMERIC(12, 2),
    reference_table VARCHAR(50),
    reference_id VARCHAR(100),
    performed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link products back to sales order items and procurement tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_so_product') THEN
        ALTER TABLE public.sales_order_items ADD CONSTRAINT fk_so_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_req_product') THEN
        ALTER TABLE public.purchase_requisition_items ADD CONSTRAINT fk_req_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_po_product') THEN
        ALTER TABLE public.purchase_order_items ADD CONSTRAINT fk_po_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_grn_product') THEN
        ALTER TABLE public.goods_receipt_items ADD CONSTRAINT fk_grn_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Indexes for inventory queries
CREATE INDEX IF NOT EXISTS idx_products_part ON public.products(part_number);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_stock_prod_wh ON public.stock(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_prod ON public.inventory_transactions(product_id, transaction_date);
