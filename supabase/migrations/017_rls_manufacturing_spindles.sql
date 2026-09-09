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
