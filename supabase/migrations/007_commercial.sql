-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 007_commercial.sql
-- Module: Commercial Master, Contacts, Quotes, Sales Orders, PIs, Invoices & EWBs
-- Pipeline: Quotation ➔ Sales Order ➔ Proforma Invoice ➔ Tax Invoice ➔ E-Way Bill
-- ==============================================================================

-- 1. CUSTOMERS MASTER
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'CUST-001', 'CUST-TATA'
    company_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    gstin VARCHAR(20),
    pan_number VARCHAR(20),
    billing_address TEXT NOT NULL,
    shipping_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    primary_contact_name VARCHAR(150),
    primary_email VARCHAR(150),
    primary_phone VARCHAR(50),
    industry_segment VARCHAR(100), -- 'Aerospace Defense', 'Automotive OEM', 'Precision Tooling', 'Heavy Engineering'
    payment_terms VARCHAR(100) DEFAULT '30 Days Net',
    credit_limit NUMERIC(14, 2) DEFAULT 2500000.0,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CUSTOMER CONTACTS & EMAIL CC REGISTRY
CREATE TABLE IF NOT EXISTS public.customer_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    designation VARCHAR(100),
    department VARCHAR(100), -- 'Accounts', 'Procurement', 'Plant Maintenance', 'Quality QA'
    is_primary BOOLEAN DEFAULT FALSE,
    is_default_cc BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENQUIRIES (Incoming Commercial Inquiries)
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enquiry_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'ENQ-2026-0038'
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(150),
    customer_phone VARCHAR(50),
    enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    spindle_type VARCHAR(100),
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    target_budget NUMERIC(14, 2),
    status VARCHAR(50) DEFAULT 'New' CHECK (status IN ('New', 'Under Review', 'Quote Prepared', 'Closed Won', 'Closed Lost')),
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. QUOTATIONS / ESTIMATES
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'QT-2026-0184' or 'QTN/2026-27/294'
    enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_address TEXT,
    customer_gstin VARCHAR(20),
    place_of_supply VARCHAR(100),
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until_date DATE,
    spindle_serial VARCHAR(100),
    scope_of_work TEXT,
    subtotal NUMERIC(14, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    taxable_amount NUMERIC(14, 2) DEFAULT 0,
    cgst_amount NUMERIC(12, 2) DEFAULT 0,
    sgst_amount NUMERIC(12, 2) DEFAULT 0,
    igst_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(14, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Approved', 'Ordered', 'Rejected', 'Expired')),
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    terms TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. QUOTATION LINE ITEMS
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_sac_code VARCHAR(20) DEFAULT '84669390',
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0,
    gst_percent NUMERIC(5, 2) DEFAULT 18.0,
    total_amount NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SALES ORDERS
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_no VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'SO-2026-041'
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_po_reference VARCHAR(100),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_promised_date DATE,
    subtotal NUMERIC(14, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    taxable_amount NUMERIC(14, 2) DEFAULT 0,
    cgst_amount NUMERIC(12, 2) DEFAULT 0,
    sgst_amount NUMERIC(12, 2) DEFAULT 0,
    igst_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'In Production', 'Ready for Dispatch', 'Dispatched', 'Completed', 'Cancelled')),
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SALES ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_id UUID, -- References products(id) (linked in 009)
    item_description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PROFORMA INVOICES (PI)
CREATE TABLE IF NOT EXISTS public.proforma_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pi_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'PI-2026-0041' or 'PI-2026-018'
    sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(150),
    customer_address TEXT,
    customer_gstin VARCHAR(20),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    payment_terms VARCHAR(100) DEFAULT '50% Advance Wire, 50% Before Dispatch',
    bank_account_no VARCHAR(50) DEFAULT '349105000701',
    bank_ifsc VARCHAR(20) DEFAULT 'ICIC0003491',
    bank_name VARCHAR(100) DEFAULT 'ICICI Bank Ltd, Pune Nanded City',
    subtotal NUMERIC(14, 2) DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    taxable_amount NUMERIC(14, 2) DEFAULT 0,
    cgst_amount NUMERIC(12, 2) DEFAULT 0,
    sgst_amount NUMERIC(12, 2) DEFAULT 0,
    igst_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL,
    advance_received NUMERIC(14, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'Advance Paid', 'Converted to Tax Invoice', 'Expired', 'Cancelled')),
    notes TEXT,
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PROFORMA INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.proforma_invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proforma_invoice_id UUID NOT NULL REFERENCES public.proforma_invoices(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    hsn_sac VARCHAR(20) DEFAULT '84669390',
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_rate NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0,
    gst_percent NUMERIC(5, 2) DEFAULT 18.0,
    total NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TAX INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'INV-2026-019'
    sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    proforma_invoice_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_gstin VARCHAR(20),
    billing_address TEXT NOT NULL,
    shipping_address TEXT,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    payment_terms VARCHAR(100) DEFAULT 'Net 30 Days',
    subtotal NUMERIC(14, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    taxable_amount NUMERIC(14, 2) DEFAULT 0,
    cgst_amount NUMERIC(12, 2) DEFAULT 0,
    sgst_amount NUMERIC(12, 2) DEFAULT 0,
    igst_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL,
    paid_amount NUMERIC(14, 2) DEFAULT 0,
    balance_amount NUMERIC(14, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(50) DEFAULT 'Pending Payment' CHECK (status IN ('Paid', 'Pending Payment', 'Partially Paid', 'Overdue', 'Cancelled')),
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. INVOICE LINE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    hsn_sac VARCHAR(20) DEFAULT '84669390',
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0,
    gst_percent NUMERIC(5, 2) DEFAULT 18.0,
    total_price NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. E-WAY BILLS (Transit Clearance)
CREATE TABLE IF NOT EXISTS public.eway_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ewb_number VARCHAR(100) UNIQUE NOT NULL, -- 12-digit e.g. '2418 9032 1198'
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_gstin VARCHAR(20) NOT NULL,
    customer_address TEXT,
    supplier_gstin VARCHAR(20) DEFAULT '27AABCG1492K1Z8',
    dispatch_from_address TEXT,
    vehicle_number VARCHAR(50) NOT NULL, -- e.g. 'MH12AB1234'
    transporter_name VARCHAR(150) NOT NULL,
    transporter_id VARCHAR(50),
    transport_mode VARCHAR(30) DEFAULT 'Road' CHECK (transport_mode IN ('Road', 'Rail', 'Air', 'Ship')),
    transport_doc_number VARCHAR(100),
    distance_km INT NOT NULL CHECK (distance_km > 0),
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ NOT NULL,
    total_invoice_value NUMERIC(14, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Expiring Soon', 'Draft', 'Expired', 'Cancelled')),
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. E-WAY BILL ITEMS
CREATE TABLE IF NOT EXISTS public.eway_bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    eway_bill_id UUID NOT NULL REFERENCES public.eway_bills(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    hsn_code VARCHAR(20) DEFAULT '84669390',
    quantity INT NOT NULL CHECK (quantity > 0),
    taxable_value NUMERIC(14, 2) NOT NULL,
    gst_rate NUMERIC(5, 2) DEFAULT 18.0,
    total_value NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add relational foreign keys back to spindles, work_orders, and non_conformances
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_spindles_customer') THEN
        ALTER TABLE public.spindles ADD CONSTRAINT fk_spindles_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_wo_customer') THEN
        ALTER TABLE public.work_orders ADD CONSTRAINT fk_wo_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_wo_sales_order') THEN
        ALTER TABLE public.work_orders ADD CONSTRAINT fk_wo_sales_order FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for commercial pipelines
CREATE INDEX IF NOT EXISTS idx_customers_code ON public.customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_cust ON public.customer_contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_no ON public.quotations(quotation_number);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_no ON public.sales_orders(sales_order_no);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_proforma_no ON public.proforma_invoices(pi_number);
CREATE INDEX IF NOT EXISTS idx_invoices_no ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_eway_bills_no ON public.eway_bills(ewb_number);
CREATE INDEX IF NOT EXISTS idx_eway_bills_status ON public.eway_bills(status);
