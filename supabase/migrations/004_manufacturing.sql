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
