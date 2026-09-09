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
