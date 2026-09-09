-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 010_service_assets.sql
-- Module: Service & Recalibration Pipeline, Plant Assets & Preventive Maintenance
-- ==============================================================================

-- 1. SERVICE REQUESTS (Inward Customer Restoration Inquiries)
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sr_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'SR-2026-018'
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_contact VARCHAR(150),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(150),
    spindle_id UUID REFERENCES public.spindles(id) ON DELETE SET NULL,
    spindle_model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    operating_hours_logged INT,
    failure_description TEXT NOT NULL,
    reported_symptoms TEXT[],
    inward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    priority VARCHAR(30) DEFAULT 'High' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(50) DEFAULT 'Inward Assessment' CHECK (status IN ('Inward Assessment', 'In Disassembly', 'Spindle Cleanroom Rebuild', 'Testing', 'Ready for Dispatch', 'Delivered', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SERVICE JOBS (9-Stage Recalibration & Rebuild Pipeline)
CREATE TABLE IF NOT EXISTS public.service_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    job_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'SR-2026-018-JOB'
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    current_pipeline_stage VARCHAR(50) DEFAULT 'Dismantle' CHECK (current_pipeline_stage IN ('Inward Inspection', 'Dismantle', 'Decontamination', 'Metrology Diagnostic', 'Bearing Replacement', 'Dynamic Balancing', '4-Hour Thermal Run', 'Final QC Sign-off', 'Preservation Packing')),
    lead_technician_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    taper_runout_initial NUMERIC(6, 4),
    taper_runout_final NUMERIC(6, 4),
    balancing_grade_achieved VARCHAR(50) DEFAULT 'ISO G0.4',
    bearing_pack_lot VARCHAR(100),
    completion_target_date DATE,
    actual_completion_date DATE,
    total_service_cost NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'In Progress' CHECK (status IN ('Scheduled', 'In Progress', 'Testing', 'Completed', 'On Hold', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SERVICE ITEMS (Consumed Parts / Bearing Replacement Kits)
CREATE TABLE IF NOT EXISTS public.service_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_job_id UUID NOT NULL REFERENCES public.service_jobs(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    item_description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SERVICE HISTORY (Lifecycle Event Log for Spindles)
CREATE TABLE IF NOT EXISTS public.service_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spindle_id UUID REFERENCES public.spindles(id) ON DELETE CASCADE,
    service_job_id UUID REFERENCES public.service_jobs(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    event_type VARCHAR(100) NOT NULL, -- e.g. 'Emergency Bearing Failure', 'Scheduled Re-greasing & Balance', 'Taper Nose Regrind'
    performed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    findings TEXT,
    actions_taken TEXT,
    next_service_due DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SPINDLE SERVICE HISTORY (Historical Refurbishments & Runout Delta Log)
CREATE TABLE IF NOT EXISTS public.spindle_service_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spindle_id UUID NOT NULL REFERENCES public.spindles(id) ON DELETE CASCADE,
    service_job_no VARCHAR(100) NOT NULL,
    service_date DATE DEFAULT CURRENT_DATE,
    service_type VARCHAR(100) NOT NULL, -- 'Bearing Replacement', 'Nose Taper Regrind', 'Stator Rewind', 'Full Rebuild'
    taper_runout_before_microns NUMERIC(6, 4),
    taper_runout_after_microns NUMERIC(6, 4),
    serviced_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PLANT ASSETS (Machines, Dynamic Stands & Metrology Air Gauges)
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_tag VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'AST-CNC-003', 'AST-BAL-001'
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Precision Machine Tool', 'Balancing Rig', 'Air Collet Metrology', 'Chiller Unit'
    bay_id UUID REFERENCES public.production_bays(id) ON DELETE SET NULL,
    purchase_date DATE,
    purchase_cost NUMERIC(14, 2),
    calibration_cycle_days INT DEFAULT 180,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Under Maintenance', 'Calibrating', 'Retired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. MAINTENANCE ORDERS (Preventative, Breakdown & Calibration Orders)
CREATE TABLE IF NOT EXISTS public.maintenance_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'MNT-2026-0042'
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    order_type VARCHAR(50) DEFAULT 'Preventive' CHECK (order_type IN ('Preventive', 'Breakdown', 'Calibration', 'Lubrication Routine')),
    scheduled_date DATE NOT NULL,
    performed_date DATE,
    technician_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    findings TEXT,
    actions_taken TEXT,
    parts_replaced TEXT[],
    downtime_hours NUMERIC(5, 2) DEFAULT 0,
    maintenance_cost NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Delayed', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MAINTENANCE HISTORY
CREATE TABLE IF NOT EXISTS public.maintenance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.maintenance_orders(id) ON DELETE SET NULL,
    maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    technician_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    work_summary TEXT NOT NULL,
    total_cost NUMERIC(12, 2) DEFAULT 0,
    downtime_hours NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_req_spindle ON public.service_requests(spindle_id);
CREATE INDEX IF NOT EXISTS idx_service_req_cust ON public.service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_service_jobs_stage ON public.service_jobs(current_pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_assets_bay ON public.assets(bay_id);
CREATE INDEX IF NOT EXISTS idx_maint_orders_asset ON public.maintenance_orders(asset_id);
