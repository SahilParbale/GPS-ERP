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
