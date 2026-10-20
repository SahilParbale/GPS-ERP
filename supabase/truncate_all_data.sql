-- ==============================================================================
-- GPS SPINDLE ERP — SUPABASE DATABASE COMPLETE DATA WIPE SCRIPT
-- File: supabase/truncate_all_data.sql
-- Target Project: https://eefqamtethlkqhqgdpah.supabase.co
-- Execution Location: Supabase Dashboard -> SQL Editor
-- URL: https://supabase.com/dashboard/project/eefqamtethlkqhqgdpah/sql/new
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open the Supabase SQL Editor:
--    https://supabase.com/dashboard/project/eefqamtethlkqhqgdpah/sql/new
-- 2. Select All and Paste this entire script into the editor.
-- 3. Click "RUN" (or press Cmd+Enter / Ctrl+Enter).
-- 4. Every single operational, transaction, customer, spindle, and mock table
--    will be completely wiped to 0 rows.
-- 5. Core system roles and root admin (Rahul Patil) are safely re-seeded so you
--    can log right back into the software without lockout.
-- ==============================================================================

SET session_replication_role = 'replica';

TRUNCATE TABLE
  -- 1. Manufacturing, Work Orders & Spindles
  public.work_order_items,
  public.work_orders,
  public.work_logs,
  public.digital_twins,
  public.spindle_components,
  public.spindles,
  public.spindle_quality_records,
  public.spindle_service_history,
  public.spindle_models,
  public.machine_assignments,
  public.production_operations,
  public.machines,
  public.production_bays,

  -- 2. Service, Overhaul & Asset Maintenance
  public.service_items,
  public.service_history,
  public.service_jobs,
  public.service_requests,
  public.maintenance_history,
  public.maintenance_orders,
  public.assets,

  -- 3. Quality & Metrology
  public.inspection_results,
  public.inspections,
  public.quality_certificates,
  public.non_conformances,

  -- 4. Logistics, Fleet & Expenses
  public.dispatch_items,
  public.dispatches,
  public.vehicles,
  public.transporters,
  public.expense_items,
  public.expenses,
  public.payment_records,

  -- 5. Commercial, Invoices & Orders
  public.eway_bill_items,
  public.eway_bills,
  public.invoice_items,
  public.invoices,
  public.proforma_invoice_items,
  public.proforma_invoices,
  public.sales_order_items,
  public.sales_orders,
  public.quotation_items,
  public.quotations,
  public.enquiries,
  public.customer_contacts,
  public.customers,

  -- 6. Inventory, Warehouses & Procurement
  public.inventory_transactions,
  public.stock_movements,
  public.stock,
  public.goods_receipt_items,
  public.goods_receipts,
  public.purchase_order_items,
  public.purchase_orders,
  public.purchase_requisition_items,
  public.purchase_requisitions,
  public.products,
  public.product_categories,
  public.warehouses,
  public.suppliers,

  -- 7. Engineering Vault & Communications
  public.document_versions,
  public.documents,
  public.email_activity,
  public.notifications,
  public.audit_logs,

  -- 8. Workforce Operations & Structure
  public.leave_requests,
  public.attendance,
  public.employee_roles,
  public.employees,
  public.profiles,
  public.shifts,
  public.locations,
  public.departments,
  public.branches,
  public.companies
RESTART IDENTITY CASCADE;

SET session_replication_role = 'origin';

-- ------------------------------------------------------------------------------
-- PRESERVE ESSENTIAL ROOT COMPANY & ADMIN LOGIN
-- ------------------------------------------------------------------------------
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

INSERT INTO public.departments (id, code, name, branch_id) VALUES
('d0000000-0000-0000-0000-000000000001', 'DEPT-PROD', 'Production Machining', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000002', 'DEPT-ASSY', 'Cleanroom Assembly', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000003', 'DEPT-QA', 'Metrology & QA', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000004', 'DEPT-SRV', 'Service & Rebuild', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000005', 'DEPT-COMM', 'Sales & Commercial', 'b0000000-0000-0000-0000-000000000001'),
('d0000000-0000-0000-0000-000000000006', 'DEPT-SCM', 'Procurement & Stores', 'b0000000-0000-0000-0000-000000000001')
ON CONFLICT (code) DO NOTHING;

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

INSERT INTO public.employees (id, employee_code, first_name, last_name, email, phone, designation, department_id, role_id, current_status, avatar_color) VALUES
('e0000000-0000-0000-0000-000000000101', 'GPS-EMP-101', 'Rahul', 'Patil', 'rahul.patil@gpspindles.com', '+91 98220 14921', 'Plant Head & Operations', 'd0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Working', '#7A1F3D'),
('e0000000-0000-0000-0000-000000000100', 'GPS-EMP-100', 'V. R.', 'Kulkarni', 'kulkarni.vr@gpspindles.com', '+91 98220 14920', 'Production Head & Director', 'd0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'Working', '#5a1329'),
('e0000000-0000-0000-0000-000000000103', 'GPS-EMP-103', 'Suresh', 'Sawant', 'suresh.sawant@gpspindles.com', '+91 98220 14923', 'Sr. Precision Machining Lead', 'd0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'Working', '#7A1F3D'),
('e0000000-0000-0000-0000-000000000102', 'GPS-EMP-102', 'Milind', 'Joshi', 'milind.joshi@gpspindles.com', '+91 98220 14922', 'Quality Assurance Lead', 'd0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000004', 'Working', '#7A1F3D'),
('e0000000-0000-0000-0000-000000000106', 'GPS-EMP-106', 'Shreyas', 'Nair', 'shreyas.nair@gpspindles.com', '+91 98220 14926', 'Commercial Desk Lead', 'd0000000-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000005', 'Available', '#7A1F3D'),
('e0000000-0000-0000-0000-000000000107', 'GPS-EMP-107', 'Anand', 'Deshmukh', 'purchase.controller@gpspindles.com', '+91 98220 14927', 'Procurement Lead', 'd0000000-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000006', 'Working', '#7A1F3D'),
('e0000000-0000-0000-0000-000000000105', 'GPS-EMP-105', 'Dinesh', 'More', 'dinesh.more@gpspindles.com', '+91 98220 14925', 'Inventory & Stores Lead', 'd0000000-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000007', 'Available', '#7A1F3D'),
('e0000000-0000-0000-0000-000000000108', 'GPS-EMP-108', 'Pramod', 'Jadhav', 'service.lead@gpspindles.com', '+91 98220 14928', 'Sr. Spindle Service Engineer', 'd0000000-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000008', 'Working', '#7A1F3D'),
('e0000000-0000-0000-0000-000000000104', 'GPS-EMP-104', 'Vikram', 'Shinde', 'vikram.shinde@gpspindles.com', '+91 98220 14924', 'Cleanroom Assembly Technician', 'd0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000009', 'Working', '#7A1F3D')
ON CONFLICT (employee_code) DO UPDATE SET 
    role_id = EXCLUDED.role_id,
    designation = EXCLUDED.designation;

-- Link any existing auth.users to employees and populate profiles
UPDATE public.employees e
SET profile_id = u.id
FROM auth.users u
WHERE e.email = u.email;

INSERT INTO public.profiles (id, email, full_name, role_id)
SELECT u.id, u.email, COALESCE(e.first_name || ' ' || e.last_name, u.email), COALESCE(e.role_id, '11111111-0000-0000-0000-000000000001'::uuid)
FROM auth.users u
LEFT JOIN public.employees e ON e.email = u.email
ON CONFLICT (id) DO UPDATE SET role_id = EXCLUDED.role_id;

-- ------------------------------------------------------------------------------
-- PERMIT TRANSACTIONAL WRITES FOR BOTH AUTHENTICATED AND DEV/ANON CLIENTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS p_customers_select ON public.customers;
CREATE POLICY p_customers_select ON public.customers FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_customers_write ON public.customers;
CREATE POLICY p_customers_write ON public.customers FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_cust_contacts_select ON public.customer_contacts;
CREATE POLICY p_cust_contacts_select ON public.customer_contacts FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_cust_contacts_write ON public.customer_contacts;
CREATE POLICY p_cust_contacts_write ON public.customer_contacts FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_quotations_select ON public.quotations;
CREATE POLICY p_quotations_select ON public.quotations FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_quotations_write ON public.quotations;
CREATE POLICY p_quotations_write ON public.quotations FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_quotation_items_select ON public.quotation_items;
CREATE POLICY p_quotation_items_select ON public.quotation_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_quotation_items_write ON public.quotation_items;
CREATE POLICY p_quotation_items_write ON public.quotation_items FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_proforma_invoices_select ON public.proforma_invoices;
CREATE POLICY p_proforma_invoices_select ON public.proforma_invoices FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_proforma_invoices_write ON public.proforma_invoices;
CREATE POLICY p_proforma_invoices_write ON public.proforma_invoices FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_proforma_invoice_items_select ON public.proforma_invoice_items;
CREATE POLICY p_proforma_invoice_items_select ON public.proforma_invoice_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_proforma_invoice_items_write ON public.proforma_invoice_items;
CREATE POLICY p_proforma_invoice_items_write ON public.proforma_invoice_items FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_invoices_select ON public.invoices;
CREATE POLICY p_invoices_select ON public.invoices FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_invoices_write ON public.invoices;
CREATE POLICY p_invoices_write ON public.invoices FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_invoice_items_select ON public.invoice_items;
CREATE POLICY p_invoice_items_select ON public.invoice_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_invoice_items_write ON public.invoice_items;
CREATE POLICY p_invoice_items_write ON public.invoice_items FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_work_orders_select ON public.work_orders;
CREATE POLICY p_work_orders_select ON public.work_orders FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_work_orders_write ON public.work_orders;
CREATE POLICY p_work_orders_write ON public.work_orders FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_work_order_items_select ON public.work_order_items;
CREATE POLICY p_work_order_items_select ON public.work_order_items FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS p_work_order_items_write ON public.work_order_items;
CREATE POLICY p_work_order_items_write ON public.work_order_items FOR ALL TO public USING (true) WITH CHECK (true);

-- Force update PostgreSQL catalog statistics so row counts immediately read 0
ANALYZE;

-- ------------------------------------------------------------------------------
-- VERIFICATION QUERY: Real LIVE ROW COUNTS across all public tables
-- ------------------------------------------------------------------------------
SELECT 
    schemaname, 
    relname AS table_name, 
    n_live_tup AS remaining_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname ASC;
