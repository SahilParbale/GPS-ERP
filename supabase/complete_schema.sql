-- ==============================================================================
-- GPS SPINDLE ERP — COMPLETE RELATIONAL DATABASE ARCHITECTURE & SEED
-- Platform: Supabase PostgreSQL
-- Generated for: GPS Spindle Precision Manufacturing ERP
-- Version: 2.0 (Phase 2 Database Architecture)
-- ==============================================================================


-- >>> START: 001_extensions.sql <<<

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 001_extensions.sql
-- Purpose: Required PostgreSQL extensions for UUID and cryptographic functions
-- ==============================================================================

-- Enable UUID extension for database-generated UUID primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for advanced cryptographic operations and random tokens
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- >>> END: 001_extensions.sql <<<


-- >>> START: 002_organization.sql <<<

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 002_organization.sql
-- Module: Organization Structure (Company -> Branch -> Department -> Location)
-- ==============================================================================

-- 1. COMPANIES (Multi-Company / Legal Entity Master)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50), -- PAN / CIN
    gstin VARCHAR(20) UNIQUE,
    email VARCHAR(150),
    phone VARCHAR(50),
    website VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    currency VARCHAR(10) DEFAULT 'INR',
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BRANCHES (Manufacturing Plants, Tech Centers, Facilities)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    branch_type VARCHAR(50) DEFAULT 'Manufacturing Plant' CHECK (branch_type IN ('Manufacturing Plant', 'Assembly Facility', 'Service Center', 'R&D Center', 'Corporate Office', 'Warehouse')),
    gstin VARCHAR(20),
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DEPARTMENTS (Functional Units)
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    head_of_department_id UUID, -- References employees(id) (linked via foreign key once workforce is created)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. LOCATIONS (Physical Shop Floor Sub-locations, Racks, Test Stands)
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    location_type VARCHAR(50) DEFAULT 'Shop Floor Bay' CHECK (location_type IN ('Shop Floor Bay', 'Cleanroom', 'Warehouse Rack', 'Test Cell', 'Inspection Metrology Lab', 'Tool Crib', 'Office')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for organizational queries
CREATE INDEX IF NOT EXISTS idx_branches_company ON public.branches(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_branch ON public.departments(branch_id);
CREATE INDEX IF NOT EXISTS idx_locations_branch ON public.locations(branch_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON public.locations(location_type);


-- >>> END: 002_organization.sql <<<


-- >>> START: 003_workforce.sql <<<

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 003_workforce.sql
-- Module: Workforce, Auth Profiles, Roles, Shifts, Attendance & Leave
-- ==============================================================================

-- 1. ROLES (ERP Role Hierarchy)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SALES', 'PURCHASE', 'STORES', 'SERVICE', 'OPERATOR'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERMISSIONS (Granular Capability Flags)
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'read', 'create', 'update', 'delete', 'approve', 'export'
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'production.work_orders.approve'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ROLE_PERMISSIONS (Junction Table)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. USER PROFILES (1:1 Extension for Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SHIFTS (Shift A Morning, Shift B Evening, Night Shift)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    shift_code VARCHAR(30) UNIQUE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_mins INT DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EMPLOYEES (Precision Workforce Master)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'GPS-EMP-101'
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(50),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    designation VARCHAR(150) NOT NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    current_shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    date_of_joining DATE DEFAULT CURRENT_DATE,
    current_status VARCHAR(50) DEFAULT 'Available' CHECK (current_status IN ('Working', 'Break', 'Available', 'Completed', 'Idle', 'Overtime', 'Leave', 'Offline')),
    avatar_color VARCHAR(20) DEFAULT '#7A1F3D',
    skills TEXT[],
    qualifications TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key from departments.head_of_department_id to employees
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_dept_head' AND table_name = 'departments'
    ) THEN
        ALTER TABLE public.departments 
        ADD CONSTRAINT fk_dept_head 
        FOREIGN KEY (head_of_department_id) REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. EMPLOYEE_ROLES (Multi-Role Assignment Junction)
CREATE TABLE IF NOT EXISTS public.employee_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, role_id)
);

-- 8. ATTENDANCE (Daily Clock-in / Out Tracking)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'Present' CHECK (status IN ('Present', 'Late', 'Half Day', 'Absent', 'On Duty', 'Weekly Off', 'Holiday')),
    total_hours NUMERIC(5, 2) DEFAULT 0,
    overtime_hours NUMERIC(5, 2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, date)
);

-- 9. LEAVE_REQUESTS (Leave Management & Approvals)
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('Casual Leave', 'Sick Leave', 'Privilege Leave', 'Unpaid Leave', 'Compensatory Off')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4, 1) NOT NULL CHECK (total_days > 0),
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for workforce queries
CREATE INDEX IF NOT EXISTS idx_employees_code ON public.employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_dept ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(current_status);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON public.attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_emp_status ON public.leave_requests(employee_id, status);


-- >>> END: 003_workforce.sql <<<


-- >>> START: 004_manufacturing.sql <<<

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 004_manufacturing.sql
-- Module: Manufacturing Infrastructure (Bays, Machines, Operations, Assignments)
-- ==============================================================================

-- 1. PRODUCTION BAYS (Shop Floor Factory Cells)
CREATE TABLE IF NOT EXISTS public.production_bays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'Bay 1', 'Bay 2', 'Bay 3', 'Bay 6'
    name VARCHAR(150) NOT NULL,
    bay_type VARCHAR(100) DEFAULT 'Machining' CHECK (bay_type IN ('Machining', 'Cleanroom Assembly', 'Balancing Rig', 'Metrology QC', 'Test Cell', 'Disassembly & Cleaning')),
    cleanliness_class VARCHAR(50) DEFAULT 'Standard', -- 'ISO Class 6', 'ISO Class 7', 'Standard'
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Occupied', 'Maintenance', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MACHINES & SHOP FLOOR EQUIPMENT
CREATE TABLE IF NOT EXISTS public.machines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bay_id UUID REFERENCES public.production_bays(id) ON DELETE SET NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'CNC-03', 'Studer S33', 'Schenck Rig-01'
    name VARCHAR(150) NOT NULL,
    manufacturer VARCHAR(100),
    model_number VARCHAR(100),
    serial_number VARCHAR(100),
    machine_type VARCHAR(100) NOT NULL, -- 'CNC Lathe', 'CNC Cylindrical Grinder', 'Dynamic Balancing Stand', etc.
    precision_tolerance_microns NUMERIC(6, 4) DEFAULT 1.0,
    power_kw NUMERIC(6, 2),
    status VARCHAR(50) DEFAULT 'Operating' CHECK (status IN ('Operating', 'Idle', 'Maintenance', 'Calibrating', 'Offline')),
    last_calibration_date DATE,
    next_calibration_due DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRODUCTION OPERATIONS (Operation Standard Catalog)
CREATE TABLE IF NOT EXISTS public.production_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'OP-MATERIAL', 'OP-ROUGH-TURN', 'OP-GRIND-TAPER', etc.
    name VARCHAR(150) NOT NULL,
    stage VARCHAR(50) NOT NULL, -- 'Material', 'Machining', 'Grinding', 'Assembly', 'Balancing', 'Testing', 'QC', 'Dispatch'
    default_bay_id UUID REFERENCES public.production_bays(id) ON DELETE SET NULL,
    default_machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
    standard_time_mins INT DEFAULT 60,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MACHINE ASSIGNMENTS (Operator ➔ Machine Shift Binding)
CREATE TABLE IF NOT EXISTS public.machine_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Handover', 'Suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_machines_bay ON public.machines(bay_id);
CREATE INDEX IF NOT EXISTS idx_machines_status ON public.machines(status);
CREATE INDEX IF NOT EXISTS idx_operations_stage ON public.production_operations(stage);
CREATE INDEX IF NOT EXISTS idx_machine_assignments_active ON public.machine_assignments(machine_id, employee_id, status);


-- >>> END: 004_manufacturing.sql <<<


-- >>> START: 005_spindles.sql <<<

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


-- >>> END: 005_spindles.sql <<<


-- >>> START: 006_quality.sql <<<

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 006_quality.sql
-- Module: Metrology QC, Inspection Measurements, Quality Certs & NCRs
-- ==============================================================================

-- 1. INSPECTIONS (Shop Floor & Metrology Audits)
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'QC-2026-0412'
    spindle_id UUID REFERENCES public.spindles(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    inspection_type VARCHAR(50) NOT NULL CHECK (inspection_type IN ('First Article', 'In-Process Grinding', 'Dynamic Balancing', 'Final Metrology QA', 'Incoming Inspection')),
    inspector_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_result VARCHAR(30) DEFAULT 'Pass' CHECK (overall_result IN ('Pass', 'Conditional Pass', 'Fail', 'Rework Required')),
    approval_status VARCHAR(30) DEFAULT 'Approved' CHECK (approval_status IN ('Draft', 'Pending Sign-off', 'Approved', 'Rejected')),
    ambient_temp_celsius NUMERIC(4, 2) DEFAULT 20.0,
    gauge_equipment_used VARCHAR(255) DEFAULT 'Mahr Federal Air Collet Probe & Schenck Rig',
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSPECTION RESULTS (Discrete Measurable Dimension Records)
CREATE TABLE IF NOT EXISTS public.inspection_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    parameter_name VARCHAR(150) NOT NULL, -- 'Nose Taper Dynamic Runout', 'Dynamic Balancing ISO 1940', 'Thermal Rise (4h)', 'Drawbar Clamping Force'
    nominal_value NUMERIC(10, 4) NOT NULL,
    tolerance_min NUMERIC(10, 4),
    tolerance_max NUMERIC(10, 4),
    measured_value NUMERIC(10, 4) NOT NULL,
    unit_of_measure VARCHAR(30) DEFAULT 'µm', -- 'µm', 'mm/s', '°C', 'kN', 'bar', 'RPM'
    result_status VARCHAR(20) DEFAULT 'Pass' CHECK (result_status IN ('Pass', 'Fail', 'Warning')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. QUALITY CERTIFICATES (ISO Compliance Certificates)
CREATE TABLE IF NOT EXISTS public.quality_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certificate_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'CERT-2026-0842'
    spindle_id UUID NOT NULL REFERENCES public.spindles(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    iso_standard VARCHAR(150) DEFAULT 'ISO 1940-1 Grade 0.4 / ISO 21940-21',
    approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    pdf_document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NON-CONFORMANCE REPORTS (NCR Management)
CREATE TABLE IF NOT EXISTS public.non_conformances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ncr_number VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'NCR-2026-0014'
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    spindle_id UUID REFERENCES public.spindles(id) ON DELETE SET NULL,
    severity VARCHAR(30) DEFAULT 'Medium' CHECK (severity IN ('Minor', 'Medium', 'Critical')),
    defect_description TEXT NOT NULL,
    root_cause_analysis TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    raised_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'Open' CHECK (status IN ('Open', 'Under Investigation', 'Resolved', 'Closed')),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SPINDLE QUALITY RECORDS (Permanent Metrology Audit Log per Spindle)
CREATE TABLE IF NOT EXISTS public.spindle_quality_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spindle_id UUID NOT NULL REFERENCES public.spindles(id) ON DELETE CASCADE,
    inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL,
    test_parameter VARCHAR(150) NOT NULL,
    specified_value NUMERIC(10, 4) NOT NULL,
    measured_value NUMERIC(10, 4) NOT NULL,
    unit_of_measure VARCHAR(30) NOT NULL,
    tolerance_band VARCHAR(50),
    passed BOOLEAN DEFAULT TRUE,
    inspector_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    tested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inspections_spindle ON public.inspections(spindle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_wo ON public.inspections(work_order_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_insp ON public.inspection_results(inspection_id);
CREATE INDEX IF NOT EXISTS idx_quality_certs_spindle ON public.quality_certificates(spindle_id);
CREATE INDEX IF NOT EXISTS idx_ncr_status ON public.non_conformances(status);


-- >>> END: 006_quality.sql <<<


-- >>> START: 007_commercial.sql <<<

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


-- >>> END: 007_commercial.sql <<<


-- >>> START: 008_procurement.sql <<<

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


-- >>> END: 008_procurement.sql <<<


-- >>> START: 009_inventory.sql <<<

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


-- >>> END: 009_inventory.sql <<<


-- >>> START: 010_service_assets.sql <<<

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


-- >>> END: 010_service_assets.sql <<<


-- >>> START: 011_logistics_finance.sql <<<

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


-- >>> END: 011_logistics_finance.sql <<<


-- >>> START: 012_documents_notifications.sql <<<

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 012_documents_notifications.sql
-- Module: Documents, File Versions, Email Communications, Alerts & Audit Trails
-- ==============================================================================

-- 1. DOCUMENTS MASTER (Engineering Drawings, Metrology Certs, Schematics)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- 'Engineering Drawing', 'Metrology Cert', 'Invoice PDF', 'PO Attachment', 'CAD STEP', 'Service Report'
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    storage_bucket VARCHAR(100) DEFAULT 'documents',
    storage_path TEXT NOT NULL,
    version INT DEFAULT 1,
    reference_type VARCHAR(50), -- 'SPINDLE', 'WORK_ORDER', 'INVOICE', 'PURCHASE_ORDER', 'SERVICE_REQUEST', 'QUALITY_CERTIFICATE'
    reference_id VARCHAR(100),
    uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DOCUMENT VERSIONS (Revision History & CAD Check-ins)
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    storage_path TEXT NOT NULL,
    change_notes TEXT,
    uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (document_id, version_number)
);

-- 3. EMAIL ACTIVITY & TRANSMISSION REGISTER (Outlook Integration History)
CREATE TABLE IF NOT EXISTS public.email_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(150),
    from_address VARCHAR(150) NOT NULL,
    to_recipients TEXT[] NOT NULL,
    cc_recipients TEXT[],
    bcc_recipients TEXT[],
    subject VARCHAR(255) NOT NULL,
    body_text TEXT,
    body_html TEXT,
    document_type VARCHAR(50) NOT NULL, -- 'Quotation', 'Tax Invoice', 'Proforma Invoice', 'E-Way Bill', 'Purchase Order', 'Service Report'
    document_id VARCHAR(100) NOT NULL,
    related_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    related_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    attachments_count INT DEFAULT 0,
    delivery_status VARCHAR(50) DEFAULT 'Sent' CHECK (delivery_status IN ('Draft', 'Queued', 'Sent', 'Delivered', 'Failed', 'Opened')),
    sent_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    sent_by_name VARCHAR(150) DEFAULT 'Rahul Patil',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- 4. ERP PERSISTENT NOTIFICATIONS (Live Bell Alerts & Approvals)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) DEFAULT 'System' CHECK (notification_type IN ('System', 'Approval Required', 'Low Stock Alert', 'QC Passed', 'Overdue Work Order', 'EWB Expiry', 'Task Assigned')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(30) DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'Urgent', 'Critical')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    related_module VARCHAR(50), -- 'Manufacturing', 'Commercial', 'Procurement', 'Inventory', 'Quality', 'Service', 'Workforce'
    related_record_id VARCHAR(100),
    reference_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SYSTEM AUDIT LOG (Immutable Event Ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name VARCHAR(150),
    user_email VARCHAR(150),
    action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'DISPATCH', 'CLOCK_IN', 'CLOCK_OUT'
    module VARCHAR(50) NOT NULL, -- 'Manufacturing', 'Commercial', 'Procurement', 'Inventory', 'Quality', 'Service', 'Workforce', 'Finance'
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    summary_message TEXT NOT NULL,
    previous_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_ref ON public.documents(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_email_activity_doc ON public.email_activity(document_id);
CREATE INDEX IF NOT EXISTS idx_email_activity_cust ON public.email_activity(related_customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(table_name, record_id);


-- >>> END: 012_documents_notifications.sql <<<


-- >>> START: 013_audit_triggers.sql <<<

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 013_audit_triggers.sql
-- Module: Automated Timestamp Management Triggers
-- ==============================================================================

-- 1. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. APPLY TRIGGER TO ALL TABLES WITH UPDATED_AT COLUMN
DO $$ 
DECLARE 
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'updated_at' 
          AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;', t);
        EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', t);
    END LOOP;
END $$;


-- >>> END: 013_audit_triggers.sql <<<


-- >>> START: 014_seed_data.sql <<<

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 014_seed_data.sql
-- Module: Production Seed Data (Preserving Real ERP Relational Chains)
-- ==============================================================================

-- 1. COMPANY SEED
INSERT INTO public.companies (id, code, name, legal_name, tax_id, gstin, email, phone, website, address, city, state, postal_code)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'GPS-CORP',
    'General Precision Spindles',
    'General Precision Spindles Private Limited',
    'AAACG1492K',
    '27AABCG1492K1Z8',
    'contact@gpspindles.com',
    '+91 20 6791 4200',
    'https://gpspindles.com',
    'Plot B-12, Nanded City Industrial Complex, Sinhagad Road',
    'Pune',
    'Maharashtra',
    '411041'
) ON CONFLICT (code) DO NOTHING;

-- 2. BRANCH SEED
INSERT INTO public.branches (id, company_id, code, name, branch_type, gstin, address, city, state, postal_code)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'PLANT-1',
    'Nanded City Plant 1 (HQ)',
    'Manufacturing Plant',
    '27AABCG1492K1Z8',
    'Plot B-12, Nanded City Industrial Complex, Pune - 411041',
    'Pune',
    'Maharashtra',
    '411041'
) ON CONFLICT (code) DO NOTHING;

-- 3. DEPARTMENTS SEED
INSERT INTO public.departments (id, code, name, branch_id) VALUES
('d0000000-0000-0000-0000-000000000001', 'DEPT-PROD', 'Production Machining', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000002', 'DEPT-ASSY', 'Cleanroom Assembly', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000003', 'DEPT-QA', 'Metrology & QA', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000004', 'DEPT-SRV', 'Service & Rebuild', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000005', 'DEPT-COMM', 'Sales & Commercial', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000006', 'DEPT-SCM', 'Procurement & Stores', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 4. LOCATIONS SEED
INSERT INTO public.locations (code, name, location_type, branch_id) VALUES
('LOC-BAY1', 'Bay 1: Heavy Rough Turning', 'Shop Floor Bay', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY2', 'Bay 2: Studer CNC Grinding Cell', 'Shop Floor Bay', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY3', 'Bay 3: ISO Class 6 Cleanroom', 'Cleanroom', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY4', 'Bay 4: Schenck Dynamic Balancing Rig', 'Test Cell', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY5', 'Bay 5: 4-Hour Thermal Endurance Stand', 'Test Cell', 'b0000000-0000-0000-0000-000000000001'),
('LOC-BAY6', 'Bay 6: Precision Air Gauge Metrology', 'Inspection Metrology Lab', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 5. ROLES SEED
INSERT INTO public.roles (id, code, name, description, is_system_role) VALUES
('11111111-0000-0000-0000-000000000001', 'ADMIN', 'Plant Admin & Operations', 'Full administrative authority', TRUE),
('11111111-0000-0000-0000-000000000002', 'MANAGEMENT', 'Executive Management', 'Executive dashboards and reporting', TRUE),
('11111111-0000-0000-0000-000000000003', 'PROD_MGR', 'Production Manager', 'Shop floor scheduling and travelers', TRUE),
('11111111-0000-0000-0000-000000000004', 'QA_MGR', 'Quality Assurance Manager', 'Metrology sign-off and certificates', TRUE),
('11111111-0000-0000-0000-000000000005', 'SALES', 'Commercial & Sales Lead', 'Quotes, PI, Invoices and E-Way Bills', TRUE),
('11111111-0000-0000-0000-000000000006', 'PURCHASE', 'Procurement Controller', 'Suppliers, Requisitions and POs', TRUE),
('11111111-0000-0000-0000-000000000007', 'STORES', 'Warehouse & Inventory Lead', 'Stock movements and bin management', TRUE),
('11111111-0000-0000-0000-000000000008', 'SERVICE', 'Service & Rebuild Lead', 'Spindle 9-stage restoration pipeline', TRUE),
('11111111-0000-0000-0000-000000000009', 'OPERATOR', 'Shop Floor Precision Technician', 'Machine routing and work logs', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 6. SHIFTS SEED
INSERT INTO public.shifts (id, name, shift_code, start_time, end_time, branch_id) VALUES
('22222222-0000-0000-0000-000000000001', 'Shift A (Morning)', 'SHIFT-A', '07:00:00', '15:30:00', 'b0000000-0000-0000-0000-000000000001'),
('22222222-0000-0000-0000-000000000002', 'Shift B (Evening)', 'SHIFT-B', '15:30:00', '00:00:00', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (shift_code) DO NOTHING;

-- 7. EMPLOYEES SEED
INSERT INTO public.employees (id, employee_code, first_name, last_name, email, phone, designation, department_id, current_status, avatar_color, skills) VALUES
('e0000000-0000-0000-0000-000000000101', 'GPS-EMP-101', 'Rahul', 'Patil', 'rahul.patil@gpspindles.com', '+91 98220 14921', 'Plant Head & Operations', 'd0000000-0000-0000-0000-000000000001', 'Working', '#7A1F3D', ARRAY['CNC Machining', 'Production Scheduling', 'Six Sigma']),
('e0000000-0000-0000-0000-000000000102', 'Milind', 'Joshi', 'milind.joshi@gpspindles.com', '+91 98220 14922', 'Quality Assurance Lead', 'd0000000-0000-0000-0000-000000000003', 'Working', '#7A1F3D', ARRAY['Air Gauging', 'ISO 1940 Balancing', 'CMM Metrology']),
('e0000000-0000-0000-0000-000000000103', 'Suresh', 'Sawant', 'suresh.sawant@gpspindles.com', '+91 98220 14923', 'Sr. Precision Grinder', 'd0000000-0000-0000-0000-000000000001', 'Working', '#7A1F3D', ARRAY['Studer S33 Grinding', 'Taper Journal Lapping', 'Sub-micron Runout']),
('e0000000-0000-0000-0000-000000000104', 'Vikram', 'Shinde', 'vikram.shinde@gpspindles.com', '+91 98220 14924', 'Cleanroom Assembly Lead', 'd0000000-0000-0000-0000-000000000002', 'Working', '#7A1F3D', ARRAY['Ceramic Bearings', 'Preload Clamping', 'Class 1000 Cleanroom']),
('e0000000-0000-0000-0000-000000000105', 'Dinesh', 'More', 'dinesh.more@gpspindles.com', '+91 98220 14925', 'Inventory & Stores Lead', 'd0000000-0000-0000-0000-000000000006', 'Available', '#7A1F3D', ARRAY['Warehouse ERP', 'Bin Kitting', 'FIFO Control']),
('e0000000-0000-0000-0000-000000000106', 'Shreyas', 'Nair', 'shreyas.nair@gpspindles.com', '+91 98220 14926', 'Commercial & Sales Desk', 'd0000000-0000-0000-0000-000000000005', 'Available', '#7A1F3D', ARRAY['Quotation Costing', 'GST E-Way Bills', 'Client SLA Management'])
ON CONFLICT (employee_code) DO NOTHING;

-- 8. PRODUCTION BAYS SEED
INSERT INTO public.production_bays (id, code, name, bay_type, cleanliness_class, branch_id) VALUES
('33333333-0000-0000-0000-000000000001', 'BAY-1', 'Bay 1: Heavy Rough Turning', 'Machining', 'Standard', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000002', 'BAY-2', 'Bay 2: Studer CNC Grinding Cell', 'Machining', 'Standard', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000003', 'BAY-3', 'Bay 3: ISO Class 6 Cleanroom', 'Cleanroom Assembly', 'ISO Class 6', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000004', 'BAY-4', 'Bay 4: Schenck Dynamic Balancing Rig', 'Balancing Rig', 'Standard', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000005', 'BAY-5', 'Bay 5: 4-Hour Thermal Endurance Stand', 'Test Cell', 'Standard', 'b0000000-0000-0000-0000-000000000001'),
('33333333-0000-0000-0000-000000000006', 'BAY-6', 'Bay 6: Precision Air Gauge Metrology', 'Metrology QC', 'ISO Class 7', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

-- 9. MACHINES SEED
INSERT INTO public.machines (id, bay_id, code, name, manufacturer, model_number, machine_type, precision_tolerance_microns, status) VALUES
('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'CNC-03', 'Doosan Puma 2600Y CNC Lathe', 'Doosan Machine Tools', 'Puma 2600Y', 'CNC Lathe', 1.5, 'Operating'),
('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'Studer S33', 'Studer S33 CNC Cylindrical Grinder', 'Fritz Studer AG', 'S33', 'CNC Cylindrical Grinder', 0.5, 'Operating'),
('44444444-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000004', 'Schenck Rig-01', 'Schenck SmartBalancing Rig G0.4', 'Schenck RoTec GmbH', 'SmartBalance 2', 'Dynamic Balancing Stand', 0.2, 'Operating'),
('44444444-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000005', 'Test Stand 01', 'High-Speed Automated Test Stand', 'GPS Engineering', 'TS-24K', 'High-Speed Test Stand', 0.5, 'Operating'),
('44444444-0000-0000-0000-000000000005', '33333333-0000-0000-0000-000000000006', 'QC-02', 'Mahr Federal Air Collet Taper Probe', 'Mahr Metrology', 'Federal Dimensionair', 'Air Metrology Gauge', 0.1, 'Operating')
ON CONFLICT (code) DO NOTHING;

-- 10. PRODUCTION OPERATIONS SEED
INSERT INTO public.production_operations (code, name, stage, default_bay_id, default_machine_id, standard_time_mins) VALUES
('OP-MATERIAL', 'Material Bar Stock Sawing & Inspection', 'Material', '33333333-0000-0000-0000-000000000001', NULL, 45),
('OP-ROUGH-TURN', 'Rough CNC Shaft Turning & Boring', 'Machining', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 120),
('OP-GRIND-TAPER', 'Studer Sub-Micron Taper & Bearing Grinding', 'Grinding', '33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002', 150),
('OP-ASSY-CLEAN', 'Class 1000 Cleanroom Bearing Assembly', 'Assembly', '33333333-0000-0000-0000-000000000003', NULL, 180),
('OP-BAL-G04', 'Dual-Plane Dynamic Balancing (ISO G0.4)', 'Balancing', '33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003', 90),
('OP-TEST-RUN', '4-Hour Thermal Run-In & Vibration Test', 'Testing', '33333333-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000004', 240),
('OP-QC-AIR', 'Final Air Gauging & Runout Certification', 'QC', '33333333-0000-0000-0000-000000000006', '44444444-0000-0000-0000-000000000005', 60),
('OP-DISPATCH-PACK', 'Anti-Corrosion Crate Packaging & Desiccant Seal', 'Dispatch', '33333333-0000-0000-0000-000000000001', NULL, 60)
ON CONFLICT (code) DO NOTHING;

-- 11. SPINDLE MODELS SEED
INSERT INTO public.spindle_models (id, model_code, model_name, spindle_type, taper_standard, max_rpm, rated_power_kw, nominal_torque_nm, runout_taper_microns) VALUES
('55555555-0000-0000-0000-000000000063', 'GPS-HSK-A63', 'GPS Motorized High-Speed Spindle (24k)', 'Motorized Built-in', 'HSK-A63', 24000, 15.0, 32.0, 0.8),
('55555555-0000-0000-0000-000000000040', 'GPS-BT40', 'GPS Precision Machining Spindle (15k)', 'Belt Driven', 'BT40', 15000, 11.0, 48.0, 1.0),
('55555555-0000-0000-0000-000000000060', 'GPS-HF-60K', 'GPS Ultra High-Frequency PCB/Die Spindle', 'High Frequency', 'HSK-E25', 60000, 5.5, 4.2, 0.5),
('55555555-0000-0000-0000-000000000050', 'GPS-BT50', 'GPS Heavy Duty Geared Milling Spindle', 'Direct Drive', 'BT50', 8000, 22.0, 95.0, 1.2)
ON CONFLICT (model_code) DO NOTHING;

-- 12. CUSTOMERS SEED
INSERT INTO public.customers (id, customer_code, company_name, gstin, billing_address, state, primary_contact_name, primary_email, industry_segment) VALUES
('66666666-0000-0000-0000-000000000001', 'CUST-TATA', 'Tata Advanced Systems Ltd', '36AAACT2718E1ZQ', 'Aerospace SEZ, Adibatla, Hyderabad, Telangana 501510', 'Telangana', 'Naveen Reddy', 'procurement@tataadvanced.com', 'Aerospace Defense'),
('66666666-0000-0000-0000-000000000002', 'CUST-BFORGE', 'Bharat Forge Limited', '27AAACB0565F1ZS', 'Mundhwa Industrial Area, Pune, Maharashtra 411036', 'Maharashtra', 'Amit Kulkarni', 'spindle.maintenance@bharatforge.com', 'Automotive OEM'),
('66666666-0000-0000-0000-000000000003', 'CUST-LINAMAR', 'Linamar India Private Limited', '23AACCL5351J1ZM', 'Survey No. 332/3, Industrial Area-3, Dewas, MP 455001', 'Madhya Pradesh', 'Rajesh Verma', 'accounts@linamar.com', 'Precision Tooling'),
('66666666-0000-0000-0000-000000000004', 'CUST-KOEL', 'Kirloskar Oil Engines Ltd', '27AAACK1422G1ZZ', 'Laxmanrao Kirloskar Road, Khadki, Pune 411003', 'Maharashtra', 'Sunil Joshi', 'maintenance@kirloskar.com', 'Heavy Engineering')
ON CONFLICT (customer_code) DO NOTHING;

-- 13. CUSTOMER CONTACTS SEED
INSERT INTO public.customer_contacts (customer_id, name, email, phone, designation, department, is_primary, is_default_cc) VALUES
('66666666-0000-0000-0000-000000000001', 'Naveen Reddy', 'naveen.reddy@tataadvanced.com', '+91 94401 23456', 'Head of Procurement', 'Procurement', TRUE, FALSE),
('66666666-0000-0000-0000-000000000001', 'K. Venkat', 'k.venkat@tataadvanced.com', '+91 94401 23457', 'Finance Accounts Lead', 'Accounts', FALSE, TRUE),
('66666666-0000-0000-0000-000000000002', 'Amit Kulkarni', 'amit.kulkarni@bharatforge.com', '+91 98221 54321', 'Sr. Manager Spindle Cell', 'Plant Maintenance', TRUE, FALSE)
ON CONFLICT DO NOTHING;

-- 14. SUPPLIERS SEED
INSERT INTO public.suppliers (id, supplier_code, name, contact_person, email, phone, payment_terms) VALUES
('77777777-0000-0000-0000-000000000001', 'SUP-SCHAEFFLER', 'Schaeffler India Limited (FAG Spindle Bearings)', 'Markus Weber', 'orders.precision@schaeffler.com', '+91 20 6608 4000', 'Net 30 Days'),
('77777777-0000-0000-0000-000000000002', 'SUP-JAKOB', 'OTT-Jakob Spanntechnik GmbH', 'Klaus Mueller', 'sales@ott-jakob.de', '+49 8333 9204-0', 'Advance Wire'),
('77777777-0000-0000-0000-000000000003', 'SUP-LENORD', 'Lenord+Bauer Precision Encoders', 'Hans Schmidt', 'support@lenord.de', '+49 208 9963-0', 'Net 45 Days')
ON CONFLICT (supplier_code) DO NOTHING;

-- 15. SPINDLES SEED (Physical Fleet Registry)
INSERT INTO public.spindles (id, serial_number, model_id, customer_id, customer_name, spindle_type, max_rpm, power_kw, taper_interface, status, current_stage, max_runout_measured_microns, vibration_overall_velocity_mms, thermal_rise_stabilized_celsius, clamping_force_measured_kn, qr_code) VALUES
('88888888-0000-0000-0000-000000000842', 'GPS-2026-0842', '55555555-0000-0000-0000-000000000063', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'Motorized Built-in', 24000, 15.0, 'HSK-A63', 'Testing', 'Testing', 0.6, 0.42, 23.8, 18.2, 'GPS-2026-0842-HSK-A63-TASL'),
('88888888-0000-0000-0000-000000000841', 'GPS-2026-0841', '55555555-0000-0000-0000-000000000040', '66666666-0000-0000-0000-000000000002', 'Bharat Forge Limited', 'Belt Driven', 15000, 11.0, 'BT40', 'QC Passed', 'QC', 0.5, 0.38, 22.5, 12.2, 'GPS-2026-0841-BT40-BFL'),
('88888888-0000-0000-0000-000000000840', 'GPS-2026-0840', '55555555-0000-0000-0000-000000000060', '66666666-0000-0000-0000-000000000003', 'Linamar India Pvt Ltd', 'High Frequency', 60000, 5.5, 'HSK-E25', 'In Production', 'Machining', 0.8, 0.48, 24.1, 4.8, 'GPS-2026-0840-HF60K-LINAMAR')
ON CONFLICT (serial_number) DO NOTHING;

-- 16. DIGITAL TWINS SEED
INSERT INTO public.digital_twins (spindle_id, spindle_serial, operating_hours, current_rpm, bearing_front_temp_celsius, bearing_rear_temp_celsius, stator_temp_celsius, vibration_x_axis_mms, vibration_y_axis_mms, air_purge_pressure_bar, coolant_flow_rate_lpm, health_score_percent, telemetry_status) VALUES
('88888888-0000-0000-0000-000000000842', 'GPS-2026-0842', 1240.5, 24000, 23.8, 22.1, 25.4, 0.26, 0.28, 2.5, 4.2, 98, 'Normal'),
('88888888-0000-0000-0000-000000000841', 'GPS-2026-0841', 2860.0, 15000, 22.5, 21.0, 24.0, 0.24, 0.27, 2.4, 3.8, 95, 'Normal')
ON CONFLICT (spindle_id) DO NOTHING;

-- 17. WORK ORDERS SEED
INSERT INTO public.work_orders (id, work_order_no, spindle_id, model_id, customer_id, customer_name, priority, current_stage, progress_percentage, assigned_bay_id, assigned_machine_id, lead_technician_id, planned_start_date, target_delivery_date, status) VALUES
('99999999-0000-0000-0000-000000000148', 'WO-2026-0148', '88888888-0000-0000-0000-000000000842', '55555555-0000-0000-0000-000000000063', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'High', 'Shaft Turning', 65, '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000101', '2026-02-18', '2026-03-15', 'In Progress'),
('99999999-0000-0000-0000-000000000147', 'WO-2026-0147', '88888888-0000-0000-0000-000000000841', '55555555-0000-0000-0000-000000000040', '66666666-0000-0000-0000-000000000002', 'Bharat Forge Limited', 'Medium', 'Cleanroom Assembly', 85, '33333333-0000-0000-0000-000000000003', NULL, 'e0000000-0000-0000-0000-000000000104', '2026-02-14', '2026-03-10', 'In Progress'),
('99999999-0000-0000-0000-000000000146', 'WO-2026-0146', '88888888-0000-0000-0000-000000000840', '55555555-0000-0000-0000-000000000060', '66666666-0000-0000-0000-000000000003', 'Linamar India Pvt Ltd', 'Critical', 'Dynamic Balancing', 92, '33333333-0000-0000-0000-000000000004', '44444444-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000102', '2026-02-10', '2026-03-08', 'In Progress')
ON CONFLICT (work_order_no) DO NOTHING;

-- 18. WORK ORDER ITEMS SEED
INSERT INTO public.work_order_items (work_order_id, sequence_no, step_name, bay_id, machine_id, assigned_employee_id, estimated_mins, actual_mins, status, qc_sign_off) VALUES
('99999999-0000-0000-0000-000000000148', 1, 'Material Bar Stock Inspection & Sawing', '33333333-0000-0000-0000-000000000001', NULL, 'e0000000-0000-0000-0000-000000000101', 45, 40, 'Completed', TRUE),
('99999999-0000-0000-0000-000000000148', 2, 'CNC Rough Shaft Turning & Center Bore', '33333333-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000101', 120, 115, 'Completed', TRUE),
('99999999-0000-0000-0000-000000000148', 3, 'Studer S33 Sub-Micron Taper Grinding', '33333333-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000103', 150, 140, 'In Progress', FALSE)
ON CONFLICT DO NOTHING;

-- 19. EMPLOYEE WORK LOGS SEED
INSERT INTO public.work_logs (employee_id, date, period, start_time, end_time, duration_mins, work_type, task_name, work_order_id, work_order_no, spindle_id, spindle_serial, machine_id, machine_name, production_bay_id, bay_name, quantity_completed, progress_percentage, status, remarks) VALUES
('e0000000-0000-0000-0000-000000000101', '2026-03-08', 'Shift A', '2026-03-08 07:30:00+05:30', '2026-03-08 10:00:00+05:30', 150, 'Rough Turning', 'Rough turning of main spindle shaft', '99999999-0000-0000-0000-000000000148', 'WO-2026-0148', '88888888-0000-0000-0000-000000000842', 'GPS-2026-0842', '44444444-0000-0000-0000-000000000001', 'CNC-03 (Doosan Puma)', '33333333-0000-0000-0000-000000000001', 'Bay 1', 1, 65, 'Completed', 'Passes initial dimensional and concentricity checks'),
('e0000000-0000-0000-0000-000000000103', '2026-03-08', 'Shift A', '2026-03-08 10:30:00+05:30', '2026-03-08 13:30:00+05:30', 180, 'CNC Grinding', 'Precision taper grinding finish pass', '99999999-0000-0000-0000-000000000148', 'WO-2026-0148', '88888888-0000-0000-0000-000000000842', 'GPS-2026-0842', '44444444-0000-0000-0000-000000000002', 'Studer S33 Grinder', '33333333-0000-0000-0000-000000000002', 'Bay 2', 1, 80, 'Completed', 'Taper runout holding steady at 0.6 microns'),
('e0000000-0000-0000-0000-000000000104', '2026-03-08', 'Shift A', '2026-03-08 08:00:00+05:30', '2026-03-08 10:00:00+05:30', 120, 'Cleanroom Assembly', 'Ceramic hybrid bearing pair installation in Class 1000 cleanroom', '99999999-0000-0000-0000-000000000147', 'WO-2026-0147', '88888888-0000-0000-0000-000000000841', 'GPS-2026-0841', NULL, 'Manual Precision Press', '33333333-0000-0000-0000-000000000003', 'Bay 3', 1, 85, 'Completed', 'Preload adjusted to 1.2 kN spec')
ON CONFLICT DO NOTHING;

-- 20. COMMERCIAL PIPELINE SEED (TASL Full Commercial Relationship)
-- 20A. Quotation
INSERT INTO public.quotations (id, quotation_number, customer_id, customer_name, customer_address, customer_gstin, place_of_supply, scope_of_work, subtotal, cgst_amount, sgst_amount, total_amount, status) VALUES
('aaaaaaaa-0000-0000-0000-000000000294', 'QTN/2026-27/294', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'Aerospace SEZ, Adibatla, Hyderabad', '36AAACT2718E1ZQ', 'Telangana (36)', 'Complete rebuild & high-speed balancing of 24k HSK-A63 motorized spindle', 842000.00, 75780.00, 75780.00, 993560.00, 'Approved')
ON CONFLICT (quotation_number) DO NOTHING;

-- 20B. Sales Order
INSERT INTO public.sales_orders (id, sales_order_no, quotation_id, customer_id, customer_name, customer_po_reference, subtotal, cgst_amount, sgst_amount, total_amount, status) VALUES
('bbbbbbbb-0000-0000-0000-000000000041', 'SO-2026-041', 'aaaaaaaa-0000-0000-0000-000000000294', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'PO-TASL-2026-8812', 842000.00, 75780.00, 75780.00, 993560.00, 'In Production')
ON CONFLICT (sales_order_no) DO NOTHING;

-- 20C. Proforma Invoice
INSERT INTO public.proforma_invoices (id, pi_number, sales_order_id, quotation_id, customer_id, customer_name, customer_email, subtotal, cgst_amount, sgst_amount, total_amount, advance_received, status) VALUES
('cccccccc-0000-0000-0000-000000000041', 'PI-2026-0041', 'bbbbbbbb-0000-0000-0000-000000000041', 'aaaaaaaa-0000-0000-0000-000000000294', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'procurement@tataadvanced.com', 842000.00, 75780.00, 75780.00, 993560.00, 496780.00, 'Advance Paid'),
('cccccccc-0000-0000-0000-000000000018', 'PI-2026-018', 'bbbbbbbb-0000-0000-0000-000000000041', 'aaaaaaaa-0000-0000-0000-000000000294', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', 'procurement@tataadvanced.com', 842000.00, 75780.00, 75780.00, 993560.00, 496780.00, 'Converted to Tax Invoice')
ON CONFLICT (pi_number) DO NOTHING;

-- 20D. Tax Invoice
INSERT INTO public.invoices (id, invoice_number, sales_order_id, proforma_invoice_id, customer_id, customer_name, customer_gstin, billing_address, subtotal, cgst_amount, sgst_amount, total_amount, paid_amount, status) VALUES
('dddddddd-0000-0000-0000-000000000019', 'INV-2026-019', 'bbbbbbbb-0000-0000-0000-000000000041', 'cccccccc-0000-0000-0000-000000000018', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', '36AAACT2718E1ZQ', 'Aerospace SEZ, Adibatla, Hyderabad', 842000.00, 75780.00, 75780.00, 993560.00, 496780.00, 'Pending Payment')
ON CONFLICT (invoice_number) DO NOTHING;

-- 20E. E-Way Bill
INSERT INTO public.eway_bills (id, ewb_number, invoice_id, invoice_number, customer_id, customer_name, customer_gstin, vehicle_number, transporter_name, distance_km, valid_until, total_invoice_value, status) VALUES
('eeeeeeee-0000-0000-0000-000000000042', '2418 9032 1198', 'dddddddd-0000-0000-0000-000000000019', 'INV-2026-019', '66666666-0000-0000-0000-000000000001', 'Tata Advanced Systems Ltd', '36AAACT2718E1ZQ', 'MH12AB1234', 'VRL Logistics Ltd', 540, NOW() + INTERVAL '2 days', 993560.00, 'Active')
ON CONFLICT (ewb_number) DO NOTHING;

-- 21. PROCUREMENT PIPELINE SEED
INSERT INTO public.purchase_orders (id, po_number, supplier_id, supplier_name, supplier_email, total_amount, status) VALUES
('ffffffff-0000-0000-0000-000000000087', 'PO-2026-0087', '77777777-0000-0000-0000-000000000001', 'Schaeffler India Limited (FAG Spindle Bearings)', 'orders.precision@schaeffler.com', 485000.00, 'Approved'),
('ffffffff-0000-0000-0000-000000000086', 'PO-2026-0086', '77777777-0000-0000-0000-000000000002', 'OTT-Jakob Spanntechnik GmbH', 'sales@ott-jakob.de', 320000.00, 'Sent')
ON CONFLICT (po_number) DO NOTHING;

-- 22. INVENTORY WAREHOUSES & PRODUCTS SEED
INSERT INTO public.product_categories (id, code, name) VALUES
('10101010-0000-0000-0000-000000000001', 'BEARINGS', 'Precision Spindle Bearings'),
('10101010-0000-0000-0000-000000000002', 'GRIPPERS', 'Drawbar Clamping Grippers'),
('10101010-0000-0000-0000-000000000003', 'ENCODERS', 'Speed & Angular Position Encoders')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.products (id, category_id, part_number, sku, name, unit_cost_inr, preferred_supplier_id) VALUES
('20202020-0000-0000-0000-000000000001', '10101010-0000-0000-0000-000000000001', 'FAG-HC7008-EDLR', 'SKU-BRG-001', 'FAG High-Speed Hybrid Ceramic Bearing HC7008', 42500.00, '77777777-0000-0000-0000-000000000001'),
('20202020-0000-0000-0000-000000000002', '10101010-0000-0000-0000-000000000002', 'OTT-JAKOB-95.600', 'SKU-GRP-002', 'OTT-Jakob Power Drawbar Collet Gripper HSK-A63', 34000.00, '77777777-0000-0000-0000-000000000002'),
('20202020-0000-0000-0000-000000000003', '10101010-0000-0000-0000-000000000003', 'LENORD-GEL-2444', 'SKU-ENC-003', 'Lenord+Bauer Mini-Coder High-Speed Spindle Encoder', 28500.00, '77777777-0000-0000-0000-000000000003')
ON CONFLICT (part_number) DO NOTHING;

INSERT INTO public.warehouses (id, branch_id, code, name, warehouse_type) VALUES
('30303030-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'STORES-CENTRAL', 'Central Stores & Raw Material Yard', 'General Stores'),
('30303030-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'BOM-KIT-BAY3', 'Cleanroom Kitting Store', 'Cleanroom Kitting')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.stock (product_id, warehouse_id, bin_location, quantity_on_hand, quantity_reserved) VALUES
('20202020-0000-0000-0000-000000000001', '30303030-0000-0000-0000-000000000002', 'BIN-CR-01', 48, 6),
('20202020-0000-0000-0000-000000000002', '30303030-0000-0000-0000-000000000001', 'RACK-B-04', 18, 2),
('20202020-0000-0000-0000-000000000003', '30303030-0000-0000-0000-000000000001', 'RACK-E-02', 12, 1)
ON CONFLICT (product_id, warehouse_id, bin_location) DO NOTHING;

-- 23. QUALITY INSPECTIONS SEED
INSERT INTO public.inspections (id, inspection_number, spindle_id, work_order_id, inspection_type, inspector_id, overall_result) VALUES
('40404040-0000-0000-0000-000000000412', 'QC-2026-0412', '88888888-0000-0000-0000-000000000842', '99999999-0000-0000-0000-000000000148', 'Final Metrology QA', 'e0000000-0000-0000-0000-000000000102', 'Pass')
ON CONFLICT (inspection_number) DO NOTHING;

INSERT INTO public.inspection_results (inspection_id, parameter_name, nominal_value, tolerance_min, tolerance_max, measured_value, unit_of_measure, result_status) VALUES
('40404040-0000-0000-0000-000000000412', 'Nose Taper Dynamic Runout', 0.0008, 0.0, 0.0010, 0.0006, 'µm', 'Pass'),
('40404040-0000-0000-0000-000000000412', 'Dynamic Balancing (ISO 1940)', 0.40, 0.0, 0.40, 0.28, 'ISO G', 'Pass'),
('40404040-0000-0000-0000-000000000412', '4-Hour Stabilized Thermal Rise', 20.0, 0.0, 25.0, 14.2, '°C', 'Pass')
ON CONFLICT DO NOTHING;

-- 24. LOGISTICS SEED
INSERT INTO public.transporters (id, code, name, contact_person, phone, rating) VALUES
('50505050-0000-0000-0000-000000000001', 'TRP-VRL', 'VRL Logistics Ltd', 'Santosh Pawar', '+91 98224 55112', 4.8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.vehicles (id, transporter_id, vehicle_number, driver_name, driver_phone) VALUES
('60606060-0000-0000-0000-000000000001', '50505050-0000-0000-0000-000000000001', 'MH12AB1234', 'Ramesh Yadav', '+91 97654 32109')
ON CONFLICT (vehicle_number) DO NOTHING;

INSERT INTO public.dispatches (dispatch_number, invoice_id, eway_bill_id, transporter_id, vehicle_id, customer_id, destination, status) VALUES
('DSP-2026-0091', 'dddddddd-0000-0000-0000-000000000019', 'eeeeeeee-0000-0000-0000-000000000042', '50505050-0000-0000-0000-000000000001', '60606060-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Aerospace SEZ, Adibatla, Hyderabad', 'In Transit')
ON CONFLICT (dispatch_number) DO NOTHING;


-- >>> END: 014_seed_data.sql <<<



-- ==============================================================================
-- 015_security_helpers.sql
-- ==============================================================================

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 015_security_helpers.sql
-- Module: Row Level Security Helper Functions & Privilege Escalation Triggers
-- ==============================================================================

-- 1. Get Current Profile ID (auth.uid wrapper)
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT auth.uid();
$$;

-- 2. Get Current Employee ID
-- Resolves the employee record linked to the authenticated user via profile_id or email
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT e.id
    FROM public.employees e
    WHERE e.profile_id = auth.uid()
       OR e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    LIMIT 1;
$$;

-- 3. Get Current User Roles
-- Retrieves all role codes assigned to the active user across profiles, employees, and employee_roles
CREATE OR REPLACE FUNCTION public.get_current_user_roles()
RETURNS TABLE(role_code VARCHAR(50))
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Check role directly on user profile
    SELECT r.code
    FROM public.profiles p
    JOIN public.roles r ON p.role_id = r.id
    WHERE p.id = auth.uid()
    UNION
    -- Check primary role on linked employee record
    SELECT r.code
    FROM public.employees e
    JOIN public.roles r ON e.role_id = r.id
    WHERE e.profile_id = auth.uid()
       OR e.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    UNION
    -- Check multi-role junction table (employee_roles)
    SELECT r.code
    FROM public.employees e
    JOIN public.employee_roles er ON e.id = er.employee_id
    JOIN public.roles r ON er.role_id = r.id
    WHERE e.profile_id = auth.uid()
       OR e.email = (SELECT email FROM auth.users WHERE id = auth.uid());
$$;

-- 4. Has Specific Role Check
CREATE OR REPLACE FUNCTION public.has_role(required_role VARCHAR(50))
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.get_current_user_roles() WHERE role_code = required_role
    );
$$;

-- 5. Has Any Role Check (Variadic)
CREATE OR REPLACE FUNCTION public.has_any_role(VARIADIC required_roles VARCHAR(50)[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.get_current_user_roles() WHERE role_code = ANY(required_roles)
    );
$$;

-- 6. Is Administrator Check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role('ADMIN');
$$;

-- 7. Is Management Check (Admin or Executive Management)
CREATE OR REPLACE FUNCTION public.is_management()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_any_role('ADMIN', 'MANAGEMENT');
$$;

-- 8. Is Same Employee Check (Ownership evaluation)
CREATE OR REPLACE FUNCTION public.is_same_employee(check_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT check_employee_id IS NOT NULL 
       AND check_employee_id = public.get_current_employee_id();
$$;

-- 9. Has Permission Code Check
CREATE OR REPLACE FUNCTION public.has_permission(permission_code_check VARCHAR(100))
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_admin() OR EXISTS (
        SELECT 1
        FROM public.get_current_user_roles() ur
        JOIN public.roles r ON ur.role_code = r.code
        JOIN public.role_permissions rp ON r.id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE p.code = permission_code_check
    );
$$;

-- 10. Privilege Escalation Defense: Profiles
-- Prevents ordinary authenticated users from altering role_id or user ID
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Only system administrators can modify profile roles.';
        END IF;
        IF NEW.id IS DISTINCT FROM OLD.id THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Profile user identity is immutable.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 11. Privilege Escalation Defense: Employees
-- Prevents non-administrators from modifying authorization-sensitive employee fields
CREATE OR REPLACE FUNCTION public.prevent_employee_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        IF NEW.role_id IS DISTINCT FROM OLD.role_id THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Only administrators can reassign employee roles.';
        END IF;
        IF NEW.employee_code IS DISTINCT FROM OLD.employee_code THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Employee badge codes are immutable.';
        END IF;
        IF NEW.department_id IS DISTINCT FROM OLD.department_id THEN
            RAISE EXCEPTION 'Privilege escalation rejected: Department transfers require administrative authorization.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_employee_escalation ON public.employees;
CREATE TRIGGER trg_prevent_employee_escalation
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.prevent_employee_privilege_escalation();


-- ==============================================================================
-- 016_rls_workforce_profiles.sql
-- ==============================================================================

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 016_rls_workforce_profiles.sql
-- Module: Row Level Security on Organization, Profiles, Roles, Employees & Workforce
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ORGANIZATION: companies, branches, departments, locations
-- ------------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- companies policies
DROP POLICY IF EXISTS p_companies_select ON public.companies;
CREATE POLICY p_companies_select ON public.companies
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_companies_write ON public.companies;
CREATE POLICY p_companies_write ON public.companies
    FOR ALL TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());

-- branches policies
DROP POLICY IF EXISTS p_branches_select ON public.branches;
CREATE POLICY p_branches_select ON public.branches
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_branches_write ON public.branches;
CREATE POLICY p_branches_write ON public.branches
    FOR ALL TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());

-- departments policies
DROP POLICY IF EXISTS p_departments_select ON public.departments;
CREATE POLICY p_departments_select ON public.departments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_departments_write ON public.departments;
CREATE POLICY p_departments_write ON public.departments
    FOR ALL TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());

-- locations policies
DROP POLICY IF EXISTS p_locations_select ON public.locations;
CREATE POLICY p_locations_select ON public.locations
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_locations_write ON public.locations;
CREATE POLICY p_locations_write ON public.locations
    FOR ALL TO authenticated USING (public.is_management()) WITH CHECK (public.is_management());

-- ------------------------------------------------------------------------------
-- 2. USER PROFILES: profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_profiles_select ON public.profiles;
CREATE POLICY p_profiles_select ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_management());

DROP POLICY IF EXISTS p_profiles_insert ON public.profiles;
CREATE POLICY p_profiles_insert ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS p_profiles_update ON public.profiles;
CREATE POLICY p_profiles_update ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS p_profiles_delete ON public.profiles;
CREATE POLICY p_profiles_delete ON public.profiles
    FOR DELETE TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. ROLES & PERMISSIONS: roles, permissions, role_permissions, employee_roles
-- (High Security Boundary — Writable ONLY by System Administrators)
-- ------------------------------------------------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_roles ENABLE ROW LEVEL SECURITY;

-- roles: Read by authenticated; modify only by admin
DROP POLICY IF EXISTS p_roles_select ON public.roles;
CREATE POLICY p_roles_select ON public.roles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_roles_admin_write ON public.roles;
CREATE POLICY p_roles_admin_write ON public.roles
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- permissions: Read by authenticated; modify only by admin
DROP POLICY IF EXISTS p_permissions_select ON public.permissions;
CREATE POLICY p_permissions_select ON public.permissions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_permissions_admin_write ON public.permissions;
CREATE POLICY p_permissions_admin_write ON public.permissions
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- role_permissions: Read by authenticated; modify only by admin
DROP POLICY IF EXISTS p_role_permissions_select ON public.role_permissions;
CREATE POLICY p_role_permissions_select ON public.role_permissions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_role_permissions_admin_write ON public.role_permissions;
CREATE POLICY p_role_permissions_admin_write ON public.role_permissions
    FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- employee_roles: Read by authenticated; insert/update/delete strictly ADMIN only (prevents Attack 2 & Attack 3)
DROP POLICY IF EXISTS p_employee_roles_select ON public.employee_roles;
CREATE POLICY p_employee_roles_select ON public.employee_roles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_employee_roles_admin_insert ON public.employee_roles;
CREATE POLICY p_employee_roles_admin_insert ON public.employee_roles
    FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS p_employee_roles_admin_update ON public.employee_roles;
CREATE POLICY p_employee_roles_admin_update ON public.employee_roles
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS p_employee_roles_admin_delete ON public.employee_roles;
CREATE POLICY p_employee_roles_admin_delete ON public.employee_roles
    FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. EMPLOYEES: employees
-- ------------------------------------------------------------------------------
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_employees_select ON public.employees;
CREATE POLICY p_employees_select ON public.employees
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_employees_insert ON public.employees;
CREATE POLICY p_employees_insert ON public.employees
    FOR INSERT TO authenticated WITH CHECK (public.is_management());

DROP POLICY IF EXISTS p_employees_update ON public.employees;
CREATE POLICY p_employees_update ON public.employees
    FOR UPDATE TO authenticated
    USING (public.is_management() OR public.is_same_employee(id))
    WITH CHECK (public.is_management() OR public.is_same_employee(id));

DROP POLICY IF EXISTS p_employees_delete ON public.employees;
CREATE POLICY p_employees_delete ON public.employees
    FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 5. SHIFTS: shifts
-- ------------------------------------------------------------------------------
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_shifts_select ON public.shifts;
CREATE POLICY p_shifts_select ON public.shifts
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_shifts_write ON public.shifts;
CREATE POLICY p_shifts_write ON public.shifts
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

-- ------------------------------------------------------------------------------
-- 6. ATTENDANCE: attendance
-- (Employees can only clock in/out their own record; prevents Attack 4)
-- ------------------------------------------------------------------------------
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_attendance_select ON public.attendance;
CREATE POLICY p_attendance_select ON public.attendance
    FOR SELECT TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_attendance_insert ON public.attendance;
CREATE POLICY p_attendance_insert ON public.attendance
    FOR INSERT TO authenticated
    WITH CHECK (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_attendance_update ON public.attendance;
CREATE POLICY p_attendance_update ON public.attendance
    FOR UPDATE TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_attendance_delete ON public.attendance;
CREATE POLICY p_attendance_delete ON public.attendance
    FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. LEAVE REQUESTS: leave_requests
-- ------------------------------------------------------------------------------
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_leave_select ON public.leave_requests;
CREATE POLICY p_leave_select ON public.leave_requests
    FOR SELECT TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_leave_insert ON public.leave_requests;
CREATE POLICY p_leave_insert ON public.leave_requests
    FOR INSERT TO authenticated
    WITH CHECK (public.is_same_employee(employee_id) OR public.is_admin());

DROP POLICY IF EXISTS p_leave_update ON public.leave_requests;
CREATE POLICY p_leave_update ON public.leave_requests
    FOR UPDATE TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_leave_delete ON public.leave_requests;
CREATE POLICY p_leave_delete ON public.leave_requests
    FOR DELETE TO authenticated
    USING ((public.is_same_employee(employee_id) AND status = 'Pending') OR public.is_admin());


-- ==============================================================================
-- 017_rls_manufacturing_spindles.sql
-- ==============================================================================

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 017_rls_manufacturing_spindles.sql
-- Module: Row Level Security on Manufacturing, Spindles, Work Orders & Quality
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. MANUFACTURING: production_bays, machines, production_operations, machine_assignments
-- ------------------------------------------------------------------------------
ALTER TABLE public.production_bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_assignments ENABLE ROW LEVEL SECURITY;

-- production_bays
DROP POLICY IF EXISTS p_bays_select ON public.production_bays;
CREATE POLICY p_bays_select ON public.production_bays
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_bays_write ON public.production_bays;
CREATE POLICY p_bays_write ON public.production_bays
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

-- machines
DROP POLICY IF EXISTS p_machines_select ON public.machines;
CREATE POLICY p_machines_select ON public.machines
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_machines_write ON public.machines;
CREATE POLICY p_machines_write ON public.machines
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

-- production_operations
DROP POLICY IF EXISTS p_operations_select ON public.production_operations;
CREATE POLICY p_operations_select ON public.production_operations
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_operations_write ON public.production_operations;
CREATE POLICY p_operations_write ON public.production_operations
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

-- machine_assignments
DROP POLICY IF EXISTS p_mach_assign_select ON public.machine_assignments;
CREATE POLICY p_mach_assign_select ON public.machine_assignments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_mach_assign_write ON public.machine_assignments;
CREATE POLICY p_mach_assign_write ON public.machine_assignments
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

-- ------------------------------------------------------------------------------
-- 2. SPINDLE REGISTRY: spindle_models, spindles, spindle_components, digital_twins
-- ------------------------------------------------------------------------------
ALTER TABLE public.spindle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spindles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spindle_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_twins ENABLE ROW LEVEL SECURITY;

-- spindle_models
DROP POLICY IF EXISTS p_models_select ON public.spindle_models;
CREATE POLICY p_models_select ON public.spindle_models
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_models_write ON public.spindle_models;
CREATE POLICY p_models_write ON public.spindle_models
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'));

-- spindles
DROP POLICY IF EXISTS p_spindles_select ON public.spindles;
CREATE POLICY p_spindles_select ON public.spindles
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_spindles_write ON public.spindles;
CREATE POLICY p_spindles_write ON public.spindles
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'));

-- spindle_components
DROP POLICY IF EXISTS p_spindle_comp_select ON public.spindle_components;
CREATE POLICY p_spindle_comp_select ON public.spindle_components
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_spindle_comp_write ON public.spindle_components;
CREATE POLICY p_spindle_comp_write ON public.spindle_components
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'));

-- digital_twins
DROP POLICY IF EXISTS p_twins_select ON public.digital_twins;
CREATE POLICY p_twins_select ON public.digital_twins
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_twins_write ON public.digital_twins;
CREATE POLICY p_twins_write ON public.digital_twins
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'));

-- ------------------------------------------------------------------------------
-- 3. WORK ORDERS & WORK LOGS: work_orders, work_order_items, work_logs
-- ------------------------------------------------------------------------------
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_logs ENABLE ROW LEVEL SECURITY;

-- work_orders
DROP POLICY IF EXISTS p_work_orders_select ON public.work_orders;
CREATE POLICY p_work_orders_select ON public.work_orders
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_work_orders_write ON public.work_orders;
CREATE POLICY p_work_orders_write ON public.work_orders
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

-- work_order_items
DROP POLICY IF EXISTS p_wo_items_select ON public.work_order_items;
CREATE POLICY p_wo_items_select ON public.work_order_items
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_wo_items_write ON public.work_order_items;
CREATE POLICY p_wo_items_write ON public.work_order_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

-- work_logs (Ownership-based: operators read/insert/update own logs; supervisors oversee all)
DROP POLICY IF EXISTS p_work_logs_select ON public.work_logs;
CREATE POLICY p_work_logs_select ON public.work_logs
    FOR SELECT TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR'));

DROP POLICY IF EXISTS p_work_logs_insert ON public.work_logs;
CREATE POLICY p_work_logs_insert ON public.work_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_work_logs_update ON public.work_logs;
CREATE POLICY p_work_logs_update ON public.work_logs
    FOR UPDATE TO authenticated
    USING (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'))
    WITH CHECK (public.is_same_employee(employee_id) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

DROP POLICY IF EXISTS p_work_logs_delete ON public.work_logs;
CREATE POLICY p_work_logs_delete ON public.work_logs
    FOR DELETE TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR'));

-- ------------------------------------------------------------------------------
-- 4. QUALITY ASSURANCE: inspections, inspection_results, quality_certificates,
-- non_conformances, spindle_quality_records
-- ------------------------------------------------------------------------------
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_conformances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spindle_quality_records ENABLE ROW LEVEL SECURITY;

-- inspections
DROP POLICY IF EXISTS p_inspections_select ON public.inspections;
CREATE POLICY p_inspections_select ON public.inspections
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_inspections_write ON public.inspections;
CREATE POLICY p_inspections_write ON public.inspections
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'));

-- inspection_results
DROP POLICY IF EXISTS p_insp_results_select ON public.inspection_results;
CREATE POLICY p_insp_results_select ON public.inspection_results
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_insp_results_write ON public.inspection_results;
CREATE POLICY p_insp_results_write ON public.inspection_results
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'));

-- quality_certificates
DROP POLICY IF EXISTS p_certificates_select ON public.quality_certificates;
CREATE POLICY p_certificates_select ON public.quality_certificates
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_certificates_write ON public.quality_certificates;
CREATE POLICY p_certificates_write ON public.quality_certificates
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'));

-- non_conformances (NCR)
DROP POLICY IF EXISTS p_ncr_select ON public.non_conformances;
CREATE POLICY p_ncr_select ON public.non_conformances
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_ncr_write ON public.non_conformances;
CREATE POLICY p_ncr_write ON public.non_conformances
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR', 'PROD_MGR'));

-- spindle_quality_records
DROP POLICY IF EXISTS p_spindle_qa_select ON public.spindle_quality_records;
CREATE POLICY p_spindle_qa_select ON public.spindle_quality_records
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_spindle_qa_write ON public.spindle_quality_records;
CREATE POLICY p_spindle_qa_write ON public.spindle_quality_records
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'));


-- ==============================================================================
-- 018_rls_commercial_procurement.sql
-- ==============================================================================

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 018_rls_commercial_procurement.sql
-- Module: Row Level Security on Commercial Sales, Invoices, Procurement & GRN
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CUSTOMERS & CONTACTS: customers, customer_contacts
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

-- customers
DROP POLICY IF EXISTS p_customers_select ON public.customers;
CREATE POLICY p_customers_select ON public.customers
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_customers_write ON public.customers;
CREATE POLICY p_customers_write ON public.customers
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

-- customer_contacts
DROP POLICY IF EXISTS p_cust_contacts_select ON public.customer_contacts;
CREATE POLICY p_cust_contacts_select ON public.customer_contacts
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_cust_contacts_write ON public.customer_contacts;
CREATE POLICY p_cust_contacts_write ON public.customer_contacts
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

-- ------------------------------------------------------------------------------
-- 2. SALES PIPELINE: enquiries, quotations, quotation_items, sales_orders, sales_order_items
-- (Restricted to Commercial/Sales, Executive Management & Admin)
-- ------------------------------------------------------------------------------
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- enquiries
DROP POLICY IF EXISTS p_enquiries_select ON public.enquiries;
CREATE POLICY p_enquiries_select ON public.enquiries
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_enquiries_write ON public.enquiries;
CREATE POLICY p_enquiries_write ON public.enquiries
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

-- quotations & items
DROP POLICY IF EXISTS p_quotations_select ON public.quotations;
CREATE POLICY p_quotations_select ON public.quotations
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_quotations_write ON public.quotations;
CREATE POLICY p_quotations_write ON public.quotations
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_quotation_items_select ON public.quotation_items;
CREATE POLICY p_quotation_items_select ON public.quotation_items
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_quotation_items_write ON public.quotation_items;
CREATE POLICY p_quotation_items_write ON public.quotation_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

-- sales_orders & items
DROP POLICY IF EXISTS p_sales_orders_select ON public.sales_orders;
CREATE POLICY p_sales_orders_select ON public.sales_orders
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'PROD_MGR'));

DROP POLICY IF EXISTS p_sales_orders_write ON public.sales_orders;
CREATE POLICY p_sales_orders_write ON public.sales_orders
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_sales_order_items_select ON public.sales_order_items;
CREATE POLICY p_sales_order_items_select ON public.sales_order_items
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'PROD_MGR'));

DROP POLICY IF EXISTS p_sales_order_items_write ON public.sales_order_items;
CREATE POLICY p_sales_order_items_write ON public.sales_order_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

-- ------------------------------------------------------------------------------
-- 3. FINANCIAL INVOICES & TRANSIT: proforma_invoices, proforma_invoice_items,
-- invoices, invoice_items, eway_bills, eway_bill_items
-- (Strict Financial Boundary — Non-commercial roles DENIED; prevents Attack 6)
-- ------------------------------------------------------------------------------
ALTER TABLE public.proforma_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proforma_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eway_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eway_bill_items ENABLE ROW LEVEL SECURITY;

-- proforma_invoices & items
DROP POLICY IF EXISTS p_pi_select ON public.proforma_invoices;
CREATE POLICY p_pi_select ON public.proforma_invoices
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_pi_write ON public.proforma_invoices;
CREATE POLICY p_pi_write ON public.proforma_invoices
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_pi_items_select ON public.proforma_invoice_items;
CREATE POLICY p_pi_items_select ON public.proforma_invoice_items
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_pi_items_write ON public.proforma_invoice_items;
CREATE POLICY p_pi_items_write ON public.proforma_invoice_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

-- invoices & items
DROP POLICY IF EXISTS p_invoices_select ON public.invoices;
CREATE POLICY p_invoices_select ON public.invoices
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_invoices_write ON public.invoices;
CREATE POLICY p_invoices_write ON public.invoices
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_invoice_items_select ON public.invoice_items;
CREATE POLICY p_invoice_items_select ON public.invoice_items
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_invoice_items_write ON public.invoice_items;
CREATE POLICY p_invoice_items_write ON public.invoice_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

-- eway_bills & items
DROP POLICY IF EXISTS p_ewb_select ON public.eway_bills;
CREATE POLICY p_ewb_select ON public.eway_bills
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_ewb_write ON public.eway_bills;
CREATE POLICY p_ewb_write ON public.eway_bills
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_ewb_items_select ON public.eway_bill_items;
CREATE POLICY p_ewb_items_select ON public.eway_bill_items
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_ewb_items_write ON public.eway_bill_items;
CREATE POLICY p_ewb_items_write ON public.eway_bill_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

-- ------------------------------------------------------------------------------
-- 4. PROCUREMENT: suppliers, purchase_requisitions, purchase_requisition_items,
-- purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items
-- ------------------------------------------------------------------------------
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;

-- suppliers
DROP POLICY IF EXISTS p_suppliers_select ON public.suppliers;
CREATE POLICY p_suppliers_select ON public.suppliers
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_suppliers_write ON public.suppliers;
CREATE POLICY p_suppliers_write ON public.suppliers
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE', 'STORES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE', 'STORES'));

-- purchase_requisitions & items
DROP POLICY IF EXISTS p_pr_select ON public.purchase_requisitions;
CREATE POLICY p_pr_select ON public.purchase_requisitions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_pr_insert ON public.purchase_requisitions;
CREATE POLICY p_pr_insert ON public.purchase_requisitions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS p_pr_update ON public.purchase_requisitions;
CREATE POLICY p_pr_update ON public.purchase_requisitions
    FOR UPDATE TO authenticated
    USING (public.is_same_employee(requested_by) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE'))
    WITH CHECK (public.is_same_employee(requested_by) OR public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE'));

DROP POLICY IF EXISTS p_pr_delete ON public.purchase_requisitions;
CREATE POLICY p_pr_delete ON public.purchase_requisitions
    FOR DELETE TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE'));

DROP POLICY IF EXISTS p_pr_items_select ON public.purchase_requisition_items;
CREATE POLICY p_pr_items_select ON public.purchase_requisition_items
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_pr_items_write ON public.purchase_requisition_items;
CREATE POLICY p_pr_items_write ON public.purchase_requisition_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE'));

-- purchase_orders & items
DROP POLICY IF EXISTS p_po_select ON public.purchase_orders;
CREATE POLICY p_po_select ON public.purchase_orders
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE', 'STORES'));

DROP POLICY IF EXISTS p_po_write ON public.purchase_orders;
CREATE POLICY p_po_write ON public.purchase_orders
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE'));

DROP POLICY IF EXISTS p_po_items_select ON public.purchase_order_items;
CREATE POLICY p_po_items_select ON public.purchase_order_items
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE', 'STORES'));

DROP POLICY IF EXISTS p_po_items_write ON public.purchase_order_items;
CREATE POLICY p_po_items_write ON public.purchase_order_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE'));

-- goods_receipts (GRN) & items
DROP POLICY IF EXISTS p_grn_select ON public.goods_receipts;
CREATE POLICY p_grn_select ON public.goods_receipts
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE', 'STORES'));

DROP POLICY IF EXISTS p_grn_write ON public.goods_receipts;
CREATE POLICY p_grn_write ON public.goods_receipts
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE'));

DROP POLICY IF EXISTS p_grn_items_select ON public.goods_receipt_items;
CREATE POLICY p_grn_items_select ON public.goods_receipt_items
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'PURCHASE', 'STORES'));

DROP POLICY IF EXISTS p_grn_items_write ON public.goods_receipt_items;
CREATE POLICY p_grn_items_write ON public.goods_receipt_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE'));


-- ==============================================================================
-- 019_rls_inventory_service_finance.sql
-- ==============================================================================

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 019_rls_inventory_service_finance.sql
-- Module: Row Level Security on Inventory, Service, Logistics, Finance & Audit
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. INVENTORY & STOCK: product_categories, products, warehouses, stock,
-- stock_movements, inventory_transactions
-- ------------------------------------------------------------------------------
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- product_categories
DROP POLICY IF EXISTS p_categories_select ON public.product_categories;
CREATE POLICY p_categories_select ON public.product_categories
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_categories_write ON public.product_categories;
CREATE POLICY p_categories_write ON public.product_categories
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'));

-- products
DROP POLICY IF EXISTS p_products_select ON public.products;
CREATE POLICY p_products_select ON public.products
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_products_write ON public.products;
CREATE POLICY p_products_write ON public.products
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'));

-- warehouses
DROP POLICY IF EXISTS p_warehouses_select ON public.warehouses;
CREATE POLICY p_warehouses_select ON public.warehouses
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_warehouses_write ON public.warehouses;
CREATE POLICY p_warehouses_write ON public.warehouses
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES'));

-- stock
DROP POLICY IF EXISTS p_stock_select ON public.stock;
CREATE POLICY p_stock_select ON public.stock
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_stock_write ON public.stock;
CREATE POLICY p_stock_write ON public.stock
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'));

-- stock_movements (Ledger-like audit: authorized insert; update/delete restricted to admin)
DROP POLICY IF EXISTS p_movements_select ON public.stock_movements;
CREATE POLICY p_movements_select ON public.stock_movements
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'));

DROP POLICY IF EXISTS p_movements_insert ON public.stock_movements;
CREATE POLICY p_movements_insert ON public.stock_movements
    FOR INSERT TO authenticated
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'));

DROP POLICY IF EXISTS p_movements_admin_modify ON public.stock_movements;
CREATE POLICY p_movements_admin_modify ON public.stock_movements
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS p_movements_admin_delete ON public.stock_movements;
CREATE POLICY p_movements_admin_delete ON public.stock_movements
    FOR DELETE TO authenticated USING (public.is_admin());

-- inventory_transactions (Financial/valuation stock ledger)
DROP POLICY IF EXISTS p_inv_trans_select ON public.inventory_transactions;
CREATE POLICY p_inv_trans_select ON public.inventory_transactions
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'));

DROP POLICY IF EXISTS p_inv_trans_insert ON public.inventory_transactions;
CREATE POLICY p_inv_trans_insert ON public.inventory_transactions
    FOR INSERT TO authenticated
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'));

DROP POLICY IF EXISTS p_inv_trans_admin_modify ON public.inventory_transactions;
CREATE POLICY p_inv_trans_admin_modify ON public.inventory_transactions
    FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS p_inv_trans_admin_delete ON public.inventory_transactions;
CREATE POLICY p_inv_trans_admin_delete ON public.inventory_transactions
    FOR DELETE TO authenticated USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 2. SERVICE & ASSETS: service_requests, service_jobs, service_items,
-- service_history, spindle_service_history, assets, maintenance_orders, maintenance_history
-- ------------------------------------------------------------------------------
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spindle_service_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_history ENABLE ROW LEVEL SECURITY;

-- service_requests
DROP POLICY IF EXISTS p_serv_req_select ON public.service_requests;
CREATE POLICY p_serv_req_select ON public.service_requests
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_serv_req_write ON public.service_requests;
CREATE POLICY p_serv_req_write ON public.service_requests
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'SALES'));

-- service_jobs & items
DROP POLICY IF EXISTS p_serv_jobs_select ON public.service_jobs;
CREATE POLICY p_serv_jobs_select ON public.service_jobs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_serv_jobs_write ON public.service_jobs;
CREATE POLICY p_serv_jobs_write ON public.service_jobs
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'QA_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'QA_MGR'));

DROP POLICY IF EXISTS p_serv_items_select ON public.service_items;
CREATE POLICY p_serv_items_select ON public.service_items
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_serv_items_write ON public.service_items;
CREATE POLICY p_serv_items_write ON public.service_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE'));

-- service_history & spindle_service_history
DROP POLICY IF EXISTS p_serv_hist_select ON public.service_history;
CREATE POLICY p_serv_hist_select ON public.service_history
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_serv_hist_write ON public.service_history;
CREATE POLICY p_serv_hist_write ON public.service_history
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE'));

DROP POLICY IF EXISTS p_spindle_serv_hist_select ON public.spindle_service_history;
CREATE POLICY p_spindle_serv_hist_select ON public.spindle_service_history
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_spindle_serv_hist_write ON public.spindle_service_history;
CREATE POLICY p_spindle_serv_hist_write ON public.spindle_service_history
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE'));

-- assets
DROP POLICY IF EXISTS p_assets_select ON public.assets;
CREATE POLICY p_assets_select ON public.assets
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_assets_write ON public.assets;
CREATE POLICY p_assets_write ON public.assets
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'PROD_MGR'));

-- maintenance_orders & history
DROP POLICY IF EXISTS p_maint_orders_select ON public.maintenance_orders;
CREATE POLICY p_maint_orders_select ON public.maintenance_orders
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_maint_orders_write ON public.maintenance_orders;
CREATE POLICY p_maint_orders_write ON public.maintenance_orders
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'PROD_MGR'));

DROP POLICY IF EXISTS p_maint_hist_select ON public.maintenance_history;
CREATE POLICY p_maint_hist_select ON public.maintenance_history
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_maint_hist_write ON public.maintenance_history;
CREATE POLICY p_maint_hist_write ON public.maintenance_history
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'PROD_MGR'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SERVICE', 'PROD_MGR'));

-- ------------------------------------------------------------------------------
-- 3. LOGISTICS & FINANCE: transporters, vehicles, dispatches, dispatch_items,
-- expenses, expense_items, payment_records
-- ------------------------------------------------------------------------------
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- transporters & vehicles
DROP POLICY IF EXISTS p_transporters_select ON public.transporters;
CREATE POLICY p_transporters_select ON public.transporters
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES', 'PURCHASE'));

DROP POLICY IF EXISTS p_transporters_write ON public.transporters;
CREATE POLICY p_transporters_write ON public.transporters
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'));

DROP POLICY IF EXISTS p_vehicles_select ON public.vehicles;
CREATE POLICY p_vehicles_select ON public.vehicles
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES', 'PURCHASE'));

DROP POLICY IF EXISTS p_vehicles_write ON public.vehicles;
CREATE POLICY p_vehicles_write ON public.vehicles
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'));

-- dispatches & items
DROP POLICY IF EXISTS p_dispatches_select ON public.dispatches;
CREATE POLICY p_dispatches_select ON public.dispatches
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'));

DROP POLICY IF EXISTS p_dispatches_write ON public.dispatches;
CREATE POLICY p_dispatches_write ON public.dispatches
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'));

DROP POLICY IF EXISTS p_disp_items_select ON public.dispatch_items;
CREATE POLICY p_disp_items_select ON public.dispatch_items
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'));

DROP POLICY IF EXISTS p_disp_items_write ON public.dispatch_items;
CREATE POLICY p_disp_items_write ON public.dispatch_items
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'STORES'));

-- expenses & items (Ownership-based employee expense reimbursement)
DROP POLICY IF EXISTS p_expenses_select ON public.expenses;
CREATE POLICY p_expenses_select ON public.expenses
    FOR SELECT TO authenticated
    USING (public.is_same_employee(employee_id) OR public.is_management());

DROP POLICY IF EXISTS p_expenses_insert ON public.expenses;
CREATE POLICY p_expenses_insert ON public.expenses
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS p_expenses_update ON public.expenses;
CREATE POLICY p_expenses_update ON public.expenses
    FOR UPDATE TO authenticated
    USING (public.is_same_employee(employee_id) OR public.is_management())
    WITH CHECK (public.is_same_employee(employee_id) OR public.is_management());

DROP POLICY IF EXISTS p_expenses_delete ON public.expenses;
CREATE POLICY p_expenses_delete ON public.expenses
    FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS p_exp_items_select ON public.expense_items;
CREATE POLICY p_exp_items_select ON public.expense_items
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_items.expense_id
          AND (public.is_same_employee(e.employee_id) OR public.is_management())
    ));

DROP POLICY IF EXISTS p_exp_items_write ON public.expense_items;
CREATE POLICY p_exp_items_write ON public.expense_items
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_items.expense_id
          AND (public.is_same_employee(e.employee_id) OR public.is_management())
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.expenses e
        WHERE e.id = expense_items.expense_id
          AND (public.is_same_employee(e.employee_id) OR public.is_management())
    ));

-- payment_records (Financial wires & receipts)
DROP POLICY IF EXISTS p_payments_select ON public.payment_records;
CREATE POLICY p_payments_select ON public.payment_records
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_payments_write ON public.payment_records;
CREATE POLICY p_payments_write ON public.payment_records
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

-- ------------------------------------------------------------------------------
-- 4. DOCUMENTS, EMAIL, NOTIFICATIONS & AUDIT: documents, document_versions,
-- email_activity, notifications, audit_logs
-- ------------------------------------------------------------------------------
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- documents & versions
DROP POLICY IF EXISTS p_docs_select ON public.documents;
CREATE POLICY p_docs_select ON public.documents
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_docs_write ON public.documents;
CREATE POLICY p_docs_write ON public.documents
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS p_doc_ver_select ON public.document_versions;
CREATE POLICY p_doc_ver_select ON public.document_versions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_doc_ver_write ON public.document_versions;
CREATE POLICY p_doc_ver_write ON public.document_versions
    FOR ALL TO authenticated
    USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- email_activity
DROP POLICY IF EXISTS p_email_select ON public.email_activity;
CREATE POLICY p_email_select ON public.email_activity
    FOR SELECT TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'PURCHASE'));

DROP POLICY IF EXISTS p_email_write ON public.email_activity;
CREATE POLICY p_email_write ON public.email_activity
    FOR ALL TO authenticated
    USING (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'PURCHASE'))
    WITH CHECK (public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES', 'PURCHASE'));

-- notifications (User alerts scoped to recipient)
DROP POLICY IF EXISTS p_notif_select ON public.notifications;
CREATE POLICY p_notif_select ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS p_notif_insert ON public.notifications;
CREATE POLICY p_notif_insert ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS p_notif_update ON public.notifications;
CREATE POLICY p_notif_update ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid() OR public.is_admin())
    WITH CHECK (recipient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS p_notif_delete ON public.notifications;
CREATE POLICY p_notif_delete ON public.notifications
    FOR DELETE TO authenticated
    USING (recipient_id = auth.uid() OR public.is_admin());

-- audit_logs (Strictly Immutable Security Audit Ledger — Prevents Attack 7)
-- SELECT: ADMIN / MANAGEMENT only
-- INSERT: Authenticated users / triggers
-- UPDATE: DENIED (No policy = rejected by default)
-- DELETE: DENIED (No policy = rejected by default)
DROP POLICY IF EXISTS p_audit_select ON public.audit_logs;
CREATE POLICY p_audit_select ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_management());

DROP POLICY IF EXISTS p_audit_insert ON public.audit_logs;
CREATE POLICY p_audit_insert ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
-- Notice: No UPDATE or DELETE policies are created for audit_logs, making the audit ledger immutable.


-- ==============================================================================
-- 020_storage_security.sql
-- ==============================================================================

-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 020_storage_security.sql
-- Module: Supabase Storage Buckets & Storage Object Row Level Security
-- ==============================================================================

-- 1. Create Core Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('spindle-documents', 'spindle-documents', false, 52428800, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/acad', 'application/x-autocad', 'application/dxf', 'model/step', 'model/iges']),
    ('quality-reports', 'quality-reports', false, 20971520, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    ('invoices-ewb', 'invoices-ewb', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg']),
    ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Storage Policies

-- A. AVATARS (Public read, authenticated upload)
DROP POLICY IF EXISTS p_storage_avatars_public_read ON storage.objects;
CREATE POLICY p_storage_avatars_public_read ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS p_storage_avatars_auth_upload ON storage.objects;
CREATE POLICY p_storage_avatars_auth_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS p_storage_avatars_owner_delete ON storage.objects;
CREATE POLICY p_storage_avatars_owner_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND (owner = auth.uid() OR public.is_admin()));

-- B. SPINDLE DOCUMENTS (Private: authenticated read, production/QA upload)
DROP POLICY IF EXISTS p_storage_spindle_docs_read ON storage.objects;
CREATE POLICY p_storage_spindle_docs_read ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'spindle-documents');

DROP POLICY IF EXISTS p_storage_spindle_docs_upload ON storage.objects;
CREATE POLICY p_storage_spindle_docs_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'spindle-documents' AND public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'));

DROP POLICY IF EXISTS p_storage_spindle_docs_delete ON storage.objects;
CREATE POLICY p_storage_spindle_docs_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'spindle-documents' AND public.is_management());

-- C. QUALITY REPORTS (Private: authenticated read, QA/Admin upload)
DROP POLICY IF EXISTS p_storage_qa_reports_read ON storage.objects;
CREATE POLICY p_storage_qa_reports_read ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'quality-reports');

DROP POLICY IF EXISTS p_storage_qa_reports_upload ON storage.objects;
CREATE POLICY p_storage_qa_reports_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'quality-reports' AND public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'));

DROP POLICY IF EXISTS p_storage_qa_reports_delete ON storage.objects;
CREATE POLICY p_storage_qa_reports_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'quality-reports' AND public.is_management());

-- D. INVOICES & E-WAY BILLS (Private: Commercial, Management & Admin read/write)
DROP POLICY IF EXISTS p_storage_invoices_read ON storage.objects;
CREATE POLICY p_storage_invoices_read ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'invoices-ewb' AND public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_storage_invoices_upload ON storage.objects;
CREATE POLICY p_storage_invoices_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'invoices-ewb' AND public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_storage_invoices_delete ON storage.objects;
CREATE POLICY p_storage_invoices_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'invoices-ewb' AND public.is_admin());
