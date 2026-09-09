-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 011_logistics_finance.sql
-- Module: Logistics, Transporters, Dispatches, Expenses & Payment Ledgers
-- Pipeline: Invoice ➔ E-Way Bill ➔ Dispatch ➔ Transporter ➔ Vehicle ➔ Customer
-- ==============================================================================

-- 1. TRANSPORTERS MASTER
CREATE TABLE IF NOT EXISTS public.transporters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'TRP-VRL', 'TRP-TCI'
    name VARCHAR(255) NOT NULL,
    transporter_id_gst VARCHAR(30),
    contact_person VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    rating NUMERIC(3, 2) DEFAULT 4.8,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VEHICLES FLEET
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transporter_id UUID NOT NULL REFERENCES public.transporters(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'MH12AB1234'
    vehicle_type VARCHAR(50) DEFAULT 'Air-Suspension Container Truck',
    driver_name VARCHAR(150),
    driver_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DISPATCHES (Finished Spindle Transit Shipments)
CREATE TABLE IF NOT EXISTS public.dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'DSP-2026-0091'
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,
    eway_bill_id UUID REFERENCES public.eway_bills(id) ON DELETE RESTRICT,
    transporter_id UUID REFERENCES public.transporters(id) ON DELETE RESTRICT,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    dispatch_date TIMESTAMPTZ DEFAULT NOW(),
    packaging_type VARCHAR(100) DEFAULT 'Shock-Sensor Hardwood Export Crate with Hermetic VCI Seal',
    origin VARCHAR(150) DEFAULT 'GPS Plant 1 Nanded City Pune',
    destination VARCHAR(255) NOT NULL,
    estimated_arrival TIMESTAMPTZ,
    actual_delivery_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'In Transit' CHECK (status IN ('Preparing', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned', 'Cancelled')),
    delivery_pod_url TEXT,
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DISPATCH ITEMS
CREATE TABLE IF NOT EXISTS public.dispatch_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    spindle_serial VARCHAR(100),
    quantity INT NOT NULL CHECK (quantity > 0),
    package_box_number VARCHAR(50),
    gross_weight_kg NUMERIC(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EXPENSES (Plant & Administrative Operational Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'EXP-2026-0128'
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- 'Raw Material', 'Machine Tooling', 'Plant Utility', 'Logistics Freight', 'Metrology Calibration'
    amount NUMERIC(14, 2) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_to VARCHAR(255) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'Bank Transfer' CHECK (payment_mode IN ('Bank Transfer', 'Corporate Card', 'UPI', 'Cheque', 'Petty Cash')),
    reference_document_no VARCHAR(100),
    approval_status VARCHAR(30) DEFAULT 'Approved' CHECK (approval_status IN ('Draft', 'Pending Approval', 'Approved', 'Rejected')),
    payment_status VARCHAR(30) DEFAULT 'Paid' CHECK (payment_status IN ('Pending', 'Paid', 'Cancelled')),
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    receipt_document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EXPENSE ITEMS (Itemized Expense Lines)
CREATE TABLE IF NOT EXISTS public.expense_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    amount NUMERIC(14, 2) NOT NULL,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(14, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PAYMENT RECORDS (Customer Collections & Wire Realizations)
CREATE TABLE IF NOT EXISTS public.payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'PAY-2026-0041'
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    proforma_invoice_id UUID REFERENCES public.proforma_invoices(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(50) DEFAULT 'NEFT / RTGS Wire' CHECK (payment_mode IN ('NEFT / RTGS Wire', 'Cheque', 'UPI', 'Letter of Credit', 'Advance Wire')),
    bank_reference_no VARCHAR(100), -- UTR / Reference
    status VARCHAR(30) DEFAULT 'Realized' CHECK (status IN ('Pending Clearance', 'Realized', 'Bounced', 'Refunded')),
    recorded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dispatches_no ON public.dispatches(dispatch_number);
CREATE INDEX IF NOT EXISTS idx_dispatches_inv ON public.dispatches(invoice_id);
CREATE INDEX IF NOT EXISTS idx_expenses_dept ON public.expenses(department_id);
CREATE INDEX IF NOT EXISTS idx_expenses_emp ON public.expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_cust ON public.payment_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_inv ON public.payment_records(invoice_id);
