import { supabase, isConfigured } from '../supabase/supabaseClient.js';
import { clearCachedMockData } from '../../utils/dataMode.js';

/**
 * All operational, transaction, and seed tables in reverse-dependency cascade order.
 * This ensures that child records (e.g. items, logs) are removed before parent records.
 */
export const CLEANABLE_TABLES = [
  // 1. Audit, Alerts & Communication
  { table: 'audit_logs', label: 'System Audit Logs', filterCol: 'created_at' },
  { table: 'notifications', label: 'User Notifications', filterCol: 'created_at' },
  { table: 'email_activity', label: 'Email Activity Log', filterCol: 'created_at' },

  // 2. Documents & File Versions
  { table: 'document_versions', label: 'Document Versions', filterCol: 'document_id' },
  { table: 'documents', label: 'Engineering Documents', filterCol: 'id' },

  // 3. Logistics, Dispatches & Financials
  { table: 'expense_items', label: 'Expense Items', filterCol: 'id' },
  { table: 'expenses', label: 'Operational Expenses', filterCol: 'id' },
  { table: 'payment_records', label: 'Payment Records', filterCol: 'id' },
  { table: 'dispatch_items', label: 'Dispatch Shipment Items', filterCol: 'id' },
  { table: 'dispatches', label: 'Dispatches & Shipments', filterCol: 'id' },
  { table: 'vehicles', label: 'Transport Fleet Vehicles', filterCol: 'id' },
  { table: 'transporters', label: 'Transporters Master', filterCol: 'id' },

  // 4. Service, Asset Overhaul & Maintenance
  { table: 'maintenance_history', label: 'Asset Maintenance History', filterCol: 'id' },
  { table: 'maintenance_orders', label: 'Maintenance Work Orders', filterCol: 'id' },
  { table: 'spindle_service_history', label: 'Spindle Refurbishment Logs', filterCol: 'id' },
  { table: 'service_history', label: 'Spindle Service Events', filterCol: 'id' },
  { table: 'service_items', label: 'Service Replaced Parts', filterCol: 'id' },
  { table: 'service_jobs', label: '9-Stage Service Jobs', filterCol: 'id' },
  { table: 'service_requests', label: 'Customer Service Requests', filterCol: 'id' },
  { table: 'assets', label: 'Plant Equipment Assets', filterCol: 'id' },

  // 5. Inventory, Stock & Procurement
  { table: 'inventory_transactions', label: 'Inventory Audit Transactions', filterCol: 'id' },
  { table: 'stock_movements', label: 'Stock Material Movements', filterCol: 'id' },
  { table: 'stock', label: 'Warehouse Bin Stock', filterCol: 'product_id' },
  { table: 'goods_receipt_items', label: 'Goods Receipt (GRN) Items', filterCol: 'id' },
  { table: 'goods_receipts', label: 'Goods Receipts (GRN)', filterCol: 'id' },
  { table: 'purchase_order_items', label: 'PO Line Items', filterCol: 'id' },
  { table: 'purchase_orders', label: 'Purchase Orders', filterCol: 'id' },
  { table: 'purchase_requisition_items', label: 'Requisition Items', filterCol: 'id' },
  { table: 'purchase_requisitions', label: 'Purchase Requisitions', filterCol: 'id' },
  { table: 'products', label: 'Products & Parts Master', filterCol: 'id' },
  { table: 'product_categories', label: 'Product Categories', filterCol: 'id' },
  { table: 'warehouses', label: 'Storage Hubs & Warehouses', filterCol: 'id' },
  { table: 'suppliers', label: 'Precision Vendors & Suppliers', filterCol: 'id' },

  // 6. Commercial & Billing
  { table: 'eway_bill_items', label: 'E-Way Bill Items', filterCol: 'id' },
  { table: 'eway_bills', label: 'E-Way Bill Transit Passes', filterCol: 'id' },
  { table: 'invoice_items', label: 'Tax Invoice Items', filterCol: 'id' },
  { table: 'invoices', label: 'Tax Invoices & Billing', filterCol: 'id' },
  { table: 'proforma_invoice_items', label: 'Proforma Invoice Items', filterCol: 'id' },
  { table: 'proforma_invoices', label: 'Proforma Invoices', filterCol: 'id' },
  { table: 'sales_order_items', label: 'Sales Order Items', filterCol: 'id' },
  { table: 'sales_orders', label: 'Confirmed Sales Orders', filterCol: 'id' },
  { table: 'quotation_items', label: 'Quotation Costing Items', filterCol: 'id' },
  { table: 'quotations', label: 'Customer Quotations', filterCol: 'id' },
  { table: 'enquiries', label: 'Commercial Inquiries', filterCol: 'id' },
  { table: 'customer_contacts', label: 'Customer Contacts & Leads', filterCol: 'id' },
  { table: 'customers', label: 'Customer Accounts Master', filterCol: 'id' },

  // 7. Quality Control & Metrology
  { table: 'spindle_quality_records', label: 'Spindle Quality Passports', filterCol: 'id' },
  { table: 'non_conformances', label: 'Quality Non-Conformances', filterCol: 'id' },
  { table: 'quality_certificates', label: 'Calibration Certificates', filterCol: 'id' },
  { table: 'inspection_results', label: 'Metrology Checkpoints', filterCol: 'id' },
  { table: 'inspections', label: 'QA Metrology Inspections', filterCol: 'id' },

  // 8. Manufacturing & Spindles
  { table: 'work_logs', label: 'Technician Work Logs', filterCol: 'employee_id' },
  { table: 'work_order_items', label: 'Traveler Step Items', filterCol: 'work_order_id' },
  { table: 'work_orders', label: 'Work Orders & Job Travelers', filterCol: 'id' },
  { table: 'digital_twins', label: 'Digital Twin Telemetry', filterCol: 'spindle_id' },
  { table: 'spindle_components', label: 'Spindle BOM Components', filterCol: 'id' },
  { table: 'spindles', label: 'Spindle Fleet Registry', filterCol: 'id' },
  { table: 'spindle_models', label: 'Spindle Engineering Models', filterCol: 'id' },
  { table: 'machine_assignments', label: 'Machine Operator Allocations', filterCol: 'id' },
  { table: 'production_operations', label: 'Routing Operations', filterCol: 'id' },
  { table: 'machines', label: 'Precision Shop Machines', filterCol: 'id' },
  { table: 'production_bays', label: 'Shop Floor Cleanroom Bays', filterCol: 'id' },

  // 9. Workforce & HR
  { table: 'leave_requests', label: 'Staff Leave Requests', filterCol: 'id' },
  { table: 'attendance', label: 'Shift Attendance Records', filterCol: 'id' }
];

export const SUPABASE_TRUNCATE_SQL = `-- GPS Spindle ERP — Complete Supabase Data Wipe Script
-- Paste into: https://supabase.com/dashboard/project/eefqamtethlkqhqgdpah/sql/new

SET session_replication_role = 'replica';

TRUNCATE TABLE
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
  public.service_items,
  public.service_history,
  public.service_jobs,
  public.service_requests,
  public.maintenance_history,
  public.maintenance_orders,
  public.assets,
  public.inspection_results,
  public.inspections,
  public.quality_certificates,
  public.non_conformances,
  public.dispatch_items,
  public.dispatches,
  public.vehicles,
  public.transporters,
  public.expense_items,
  public.expenses,
  public.payment_records,
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
  public.document_versions,
  public.documents,
  public.email_activity,
  public.notifications,
  public.audit_logs,
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

-- Re-seed essential root company and admin login
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

INSERT INTO public.employees (id, employee_code, first_name, last_name, email, phone, designation, department_id, current_status, avatar_color)
VALUES (
    'e0000000-0000-0000-0000-000000000101',
    'GPS-EMP-101',
    'Rahul',
    'Patil',
    'rahul.patil@gpspindles.com',
    '+91 98220 14921',
    'Plant Head & Operations',
    'd0000000-0000-0000-0000-000000000001',
    'Working',
    '#7A1F3D'
) ON CONFLICT (employee_code) DO NOTHING;

ANALYZE;

SELECT schemaname, relname AS table_name, n_live_tup AS remaining_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname ASC;`;

export const databaseCleanService = {
  /**
   * Attempts to delete all data from Supabase tables programmatically
   * using the active client session.
   * @param {function} onProgress - Callback with ({ table, index, total, status })
   * @returns {Promise<{ success: boolean, results: Array, rlsBlockedCount: number }>}
   */
  async clearAllSupabaseData(onProgress = () => {}) {
    clearCachedMockData();

    if (!isConfigured) {
      return {
        success: true,
        message: 'Supabase client is not configured with live credentials. Local cache cleared.',
        results: [],
        rlsBlockedCount: 0
      };
    }

    const results = [];
    let rlsBlockedCount = 0;
    const total = CLEANABLE_TABLES.length;

    for (let i = 0; i < total; i++) {
      const { table, label, filterCol } = CLEANABLE_TABLES[i];
      onProgress({ table, label, index: i + 1, total, status: 'cleaning' });

      try {
        // Delete all rows matching a non-null condition on the primary/filter column
        const { error } = await supabase
          .from(table)
          .delete()
          .not(filterCol, 'is', null);

        if (error) {
          const isRls = error.code === '42501' || 
                        error.message?.includes('permission denied') ||
                        error.message?.includes('row-level security');
          if (isRls) rlsBlockedCount++;
          results.push({ table, label, success: false, error: error.message, isRls });
        } else {
          results.push({ table, label, success: true, error: null });
        }
      } catch (err) {
        results.push({ table, label, success: false, error: err.message, isRls: false });
      }

      onProgress({ table, label, index: i + 1, total, status: 'done' });
    }

    return {
      success: rlsBlockedCount === 0,
      results,
      rlsBlockedCount,
      sqlScript: SUPABASE_TRUNCATE_SQL,
      sqlUrl: 'https://supabase.com/dashboard/project/eefqamtethlkqhqgdpah/sql/new'
    };
  }
};

export default databaseCleanService;
