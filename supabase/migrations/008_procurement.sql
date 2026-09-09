-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 008_procurement.sql
-- Module: Procurement (Suppliers, Requisitions, Purchase Orders, Goods Receipts)
-- Pipeline: Purchase Requisition ➔ Purchase Order ➔ Goods Receipt (GRN) ➔ Stock
-- ==============================================================================

-- 1. SUPPLIERS MASTER (Vendors)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'SUP-0012', 'SUP-SCHAEFFLER'
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(50),
    gstin VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    payment_terms VARCHAR(100) DEFAULT 'Net 30 Days',
    rating NUMERIC(3, 2) DEFAULT 5.0,
    categories_supplied TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PURCHASE REQUISITIONS (Internal Material Demands)
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requisition_no VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'REQ-2026-0045'
    requested_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    required_by_date DATE,
    priority VARCHAR(30) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'PO Created', 'Rejected', 'Cancelled')),
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PURCHASE REQUISITION ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_requisition_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requisition_id UUID NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
    product_id UUID, -- References products(id) (linked in 009)
    item_description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    estimated_rate NUMERIC(12, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PURCHASE ORDERS (PO Master)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'PO-2026-0087'
    requisition_id UUID REFERENCES public.purchase_requisitions(id) ON DELETE SET NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    supplier_name VARCHAR(255) NOT NULL,
    supplier_email VARCHAR(150),
    supplier_contact VARCHAR(150),
    supplier_phone VARCHAR(50),
    supplier_gstin VARCHAR(20),
    supplier_address TEXT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    payment_terms VARCHAR(100) DEFAULT '30 Days Net',
    billing_address TEXT,
    shipping_address TEXT,
    currency VARCHAR(10) DEFAULT 'INR',
    subtotal NUMERIC(14, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    taxable_amount NUMERIC(14, 2) DEFAULT 0,
    cgst_amount NUMERIC(12, 2) DEFAULT 0,
    sgst_amount NUMERIC(12, 2) DEFAULT 0,
    igst_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Approved', 'Partially Received', 'Received', 'Cancelled')),
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID, -- References products(id) (linked in 009)
    item_description VARCHAR(255) NOT NULL,
    hsn_code VARCHAR(20) DEFAULT '84669390',
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0,
    gst_percent NUMERIC(5, 2) DEFAULT 18.0,
    total_price NUMERIC(14, 2) NOT NULL,
    received_quantity INT DEFAULT 0 CHECK (received_quantity >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. GOODS RECEIPTS (GRN - Goods Receipt Note)
CREATE TABLE IF NOT EXISTS public.goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'GRN-2026-0045'
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_challan_no VARCHAR(100),
    supplier_invoice_no VARCHAR(100),
    received_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    warehouse_id UUID, -- References warehouses(id) (linked in 009)
    status VARCHAR(30) DEFAULT 'Completed' CHECK (status IN ('Pending QC', 'Completed', 'Discrepancy', 'Rejected')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. GOODS RECEIPT ITEMS
CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goods_receipt_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
    product_id UUID, -- References products(id) (linked in 009)
    item_description VARCHAR(255) NOT NULL,
    quantity_received INT NOT NULL CHECK (quantity_received >= 0),
    quantity_accepted INT NOT NULL CHECK (quantity_accepted >= 0),
    quantity_rejected INT DEFAULT 0 CHECK (quantity_rejected >= 0),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON public.suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_po_number ON public.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_no ON public.goods_receipts(grn_number);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_po ON public.goods_receipts(purchase_order_id);
