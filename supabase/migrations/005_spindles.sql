-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 005_spindles.sql
-- Module: Spindles, Digital Twins, Work Orders, Operations Traveler & Work Logs
-- ==============================================================================

-- 1. SPINDLE MODELS (Catalog / Bill of Technical Specs)
CREATE TABLE IF NOT EXISTS public.spindle_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'GPS-HSK-A63', 'GPS-BT40', 'GPS-HF-60K', 'GPS-BT50'
    model_name VARCHAR(255) NOT NULL,
    spindle_type VARCHAR(100) NOT NULL, -- 'Motorized Built-in', 'Direct Drive', 'Belt Driven', 'High Frequency'
    taper_standard VARCHAR(50) NOT NULL, -- 'HSK-A63', 'BT40', 'BT50', 'ISO 30', 'HSK-E25'
    max_rpm INT NOT NULL,
    rated_power_kw NUMERIC(6, 2) NOT NULL,
    nominal_torque_nm NUMERIC(6, 2),
    bearing_type VARCHAR(100) DEFAULT 'Ceramic Hybrid Angular Contact',
    cooling_type VARCHAR(100) DEFAULT 'Deionized Water Glycol Chilled',
    lubrication_type VARCHAR(100) DEFAULT 'Air-Oil Micro Droplet',
    clamping_retention_force_kn NUMERIC(5, 2) DEFAULT 18.0,
    runout_taper_microns NUMERIC(6, 4) DEFAULT 0.8,
    drawing_reference VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SPINDLES (Serialized Fleet Master & Physical Asset Registry)
CREATE TABLE IF NOT EXISTS public.spindles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    serial_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'GPS-2026-0842'
    model_id UUID REFERENCES public.spindle_models(id) ON DELETE RESTRICT,
    model_code VARCHAR(100),
    customer_id UUID, -- References customers(id) (linked via foreign key in 007_commercial)
    customer_name VARCHAR(255),
    spindle_type VARCHAR(100),
    max_rpm INT,
    power_kw NUMERIC(6, 2),
    torque_nm NUMERIC(6, 2),
    taper_interface VARCHAR(50),
    lubrication VARCHAR(150),
    bearings_spec VARCHAR(150),
    cooling_spec VARCHAR(150),
    manufacturing_date DATE DEFAULT CURRENT_DATE,
    warranty_period VARCHAR(100) DEFAULT 'Active (24 Months / 4,000h)',
    status VARCHAR(50) DEFAULT 'Testing' CHECK (status IN ('In Production', 'Testing', 'QC Passed', 'QC Pending', 'Ready', 'Dispatched', 'In Service', 'Under Maintenance', 'Decommissioned')),
    current_stage VARCHAR(50) DEFAULT 'Shaft Turning',
    current_location VARCHAR(150) DEFAULT 'Pune Plant 1',
    max_runout_measured_microns NUMERIC(6, 4) DEFAULT 0.6,
    balance_grade VARCHAR(50) DEFAULT 'ISO 1940 G0.28',
    vibration_overall_velocity_mms NUMERIC(6, 4) DEFAULT 0.27,
    thermal_rise_stabilized_celsius NUMERIC(6, 2) DEFAULT 14.2,
    clamping_force_measured_kn NUMERIC(6, 2) DEFAULT 18.4,
    qr_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SPINDLE COMPONENTS (BOM Fitted Component Registry)
CREATE TABLE IF NOT EXISTS public.spindle_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spindle_id UUID NOT NULL REFERENCES public.spindles(id) ON DELETE CASCADE,
    component_name VARCHAR(150) NOT NULL, -- 'Front Ceramic Bearings', 'Stator Assembly', 'Drawbar Gripper'
    part_number VARCHAR(100) NOT NULL,
    sub_supplier VARCHAR(150),
    serial_lot_no VARCHAR(100),
    tolerance_fitted_microns NUMERIC(6, 4),
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    installed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DIGITAL TWINS (Real-Time Telemetry & Health Score Twin)
CREATE TABLE IF NOT EXISTS public.digital_twins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spindle_id UUID UNIQUE NOT NULL REFERENCES public.spindles(id) ON DELETE CASCADE,
    spindle_serial VARCHAR(100) NOT NULL,
    operating_hours NUMERIC(10, 2) DEFAULT 0,
    current_rpm INT DEFAULT 0,
    bearing_front_temp_celsius NUMERIC(6, 2) DEFAULT 22.0,
    bearing_rear_temp_celsius NUMERIC(6, 2) DEFAULT 21.5,
    stator_temp_celsius NUMERIC(6, 2) DEFAULT 24.0,
    vibration_x_axis_mms NUMERIC(6, 4) DEFAULT 0.25,
    vibration_y_axis_mms NUMERIC(6, 4) DEFAULT 0.28,
    air_purge_pressure_bar NUMERIC(4, 2) DEFAULT 2.5,
    coolant_flow_rate_lpm NUMERIC(4, 2) DEFAULT 4.2,
    clamping_cycles_count INT DEFAULT 0,
    health_score_percent INT DEFAULT 100 CHECK (health_score_percent BETWEEN 0 AND 100),
    last_telemetry_at TIMESTAMPTZ DEFAULT NOW(),
    telemetry_status VARCHAR(50) DEFAULT 'Normal' CHECK (telemetry_status IN ('Normal', 'Warning', 'Critical', 'Offline')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WORK ORDERS (Shop Floor Production Orders)
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_no VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'WO-2026-0148'
    spindle_id UUID REFERENCES public.spindles(id) ON DELETE SET NULL,
    model_id UUID REFERENCES public.spindle_models(id) ON DELETE RESTRICT,
    customer_id UUID, -- Linked to customers in 007_commercial
    customer_name VARCHAR(255),
    sales_order_id UUID, -- Linked to sales_orders in 007_commercial
    sales_order_no VARCHAR(100),
    order_type VARCHAR(50) DEFAULT 'New Spindle Build' CHECK (order_type IN ('New Spindle Build', 'Refurbishment', 'Prototype', 'Service Repair')),
    priority VARCHAR(30) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    current_stage VARCHAR(50) DEFAULT 'Shaft Turning',
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    assigned_bay_id UUID REFERENCES public.production_bays(id) ON DELETE SET NULL,
    assigned_machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    lead_technician_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    planned_start_date DATE,
    target_delivery_date DATE,
    actual_completion_date DATE,
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    status VARCHAR(50) DEFAULT 'In Progress' CHECK (status IN ('Planned', 'In Progress', 'On Hold', 'QC', 'Completed', 'Closed', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. WORK ORDER ITEMS / ROUTING STEPS (Operation Traveler)
CREATE TABLE IF NOT EXISTS public.work_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    operation_id UUID REFERENCES public.production_operations(id) ON DELETE SET NULL,
    sequence_no INT NOT NULL,
    step_name VARCHAR(150) NOT NULL,
    bay_id UUID REFERENCES public.production_bays(id) ON DELETE SET NULL,
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    assigned_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    estimated_mins INT DEFAULT 60,
    actual_mins INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Skipped')),
    qc_sign_off BOOLEAN DEFAULT FALSE,
    qc_verified_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EMPLOYEE WORK LOGS (Relational Daily Work & Activity Register)
CREATE TABLE IF NOT EXISTS public.work_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    period VARCHAR(50) DEFAULT 'Shift A', -- 'Shift A', 'Shift B', 'General Shift'
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration_mins INT DEFAULT 0,
    work_type VARCHAR(100) NOT NULL, -- e.g. 'Rough Turning', 'CNC Grinding', 'Cleanroom Assembly', 'Dynamic Balancing', 'Test Run', 'Metrology QC'
    task_name VARCHAR(255) NOT NULL,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    work_order_no VARCHAR(100),
    operation_id UUID REFERENCES public.production_operations(id) ON DELETE SET NULL,
    spindle_id UUID REFERENCES public.spindles(id) ON DELETE SET NULL,
    spindle_serial VARCHAR(100),
    machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    machine_name VARCHAR(100),
    production_bay_id UUID REFERENCES public.production_bays(id) ON DELETE SET NULL,
    bay_name VARCHAR(100),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    quantity_completed NUMERIC(10, 2) DEFAULT 1,
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    status VARCHAR(50) DEFAULT 'Working' CHECK (status IN ('Working', 'Completed', 'Paused', 'Review', 'Idle')),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance & reporting
CREATE INDEX IF NOT EXISTS idx_spindles_serial ON public.spindles(serial_number);
CREATE INDEX IF NOT EXISTS idx_spindles_model ON public.spindles(model_id);
CREATE INDEX IF NOT EXISTS idx_spindles_status ON public.spindles(status);
CREATE INDEX IF NOT EXISTS idx_digital_twins_spindle ON public.digital_twins(spindle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_no ON public.work_orders(work_order_no);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_order_items_wo ON public.work_order_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_employee_date ON public.work_logs(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_work_logs_work_order ON public.work_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_status ON public.work_logs(status);
