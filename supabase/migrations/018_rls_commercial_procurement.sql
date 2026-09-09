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
