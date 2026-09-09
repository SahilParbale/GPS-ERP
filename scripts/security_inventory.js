import fs from 'fs';
import path from 'path';

const columns = JSON.parse(fs.readFileSync(path.resolve('scripts', 'schema_columns.json'), 'utf8'));

// Helper to categorize each table
function buildInventory() {
  const inventory = [];

  for (const [tableName, cols] of Object.entries(columns)) {
    let sensitive = false;
    let allowedRoles = ['ADMIN', 'MANAGEMENT'];
    let readAccess = 'ADMIN, MANAGEMENT';
    let insertAccess = 'ADMIN';
    let updateAccess = 'ADMIN';
    let deleteAccess = 'ADMIN';
    let specialRules = '';

    const hasCol = (c) => cols.includes(c);
    const ownerCol = hasCol('created_by') ? 'created_by' : (hasCol('owner_id') ? 'owner_id' : (hasCol('requested_by') ? 'requested_by' : null));
    const empCol = hasCol('employee_id') ? 'employee_id' : (hasCol('technician_id') ? 'technician_id' : (hasCol('inspector_id') ? 'inspector_id' : (hasCol('assigned_to') ? 'assigned_to' : (hasCol('user_id') ? 'user_id' : null))));
    const deptCol = hasCol('department_id') ? 'department_id' : null;

    // 1. Organization
    if (['companies', 'branches', 'departments', 'locations'].includes(tableName)) {
      sensitive = false;
      allowedRoles = ['ALL_AUTHENTICATED'];
      readAccess = 'Authenticated users (Organization catalog)';
      insertAccess = 'ADMIN, MANAGEMENT';
      updateAccess = 'ADMIN, MANAGEMENT';
      deleteAccess = 'ADMIN';
      specialRules = 'Organization metadata needed by all authenticated users for routing & display.';
    }
    // 2. Auth & Profiles
    else if (tableName === 'profiles') {
      sensitive = true;
      allowedRoles = ['ALL_AUTHENTICATED'];
      readAccess = 'Own profile OR ADMIN / MANAGEMENT';
      insertAccess = 'Own profile initial creation OR ADMIN';
      updateAccess = 'Own personal fields only (name, phone, avatar); role_id & employee_id strictly immutable by non-admin';
      deleteAccess = 'ADMIN only';
      specialRules = 'Privilege escalation defense trigger prevents modifying role_id or user id.';
    }
    else if (tableName === 'employees') {
      sensitive = true;
      allowedRoles = ['ALL_AUTHENTICATED'];
      readAccess = 'Authenticated users (employee directory for work orders/tasks)';
      insertAccess = 'ADMIN, MANAGEMENT';
      updateAccess = 'ADMIN, MANAGEMENT (employee can update own current_status only; cannot modify role_id, dept, designation)';
      deleteAccess = 'ADMIN only';
      specialRules = 'Privilege escalation defense trigger prevents modifying role_id, employee_code, department.';
    }
    else if (['roles', 'permissions', 'role_permissions', 'employee_roles'].includes(tableName)) {
      sensitive = true;
      allowedRoles = ['ALL_AUTHENTICATED (read)', 'ADMIN (write)'];
      readAccess = 'Authenticated users (role evaluation)';
      insertAccess = 'ADMIN only';
      updateAccess = 'ADMIN only';
      deleteAccess = 'ADMIN only';
      specialRules = 'Critical privilege escalation boundary. Non-admin modification strictly forbidden.';
    }
    else if (tableName === 'shifts') {
      sensitive = false;
      allowedRoles = ['ALL_AUTHENTICATED (read)', 'ADMIN, MANAGEMENT, PROD_MGR (write)'];
      readAccess = 'Authenticated users';
      insertAccess = 'ADMIN, MANAGEMENT, PROD_MGR';
      updateAccess = 'ADMIN, MANAGEMENT, PROD_MGR';
      deleteAccess = 'ADMIN';
      specialRules = 'Factory work shift roster.';
    }
    else if (tableName === 'attendance') {
      sensitive = true;
      allowedRoles = ['EMPLOYEE (own)', 'ADMIN', 'MANAGEMENT', 'PROD_MGR'];
      readAccess = 'Own attendance records OR ADMIN / MANAGEMENT / PROD_MGR';
      insertAccess = 'Own clock-in OR ADMIN / MANAGEMENT';
      updateAccess = 'Own clock-out OR ADMIN / MANAGEMENT';
      deleteAccess = 'ADMIN only';
      specialRules = 'Employees can only clock in/out their own records for current date.';
    }
    else if (tableName === 'leave_requests') {
      sensitive = true;
      allowedRoles = ['EMPLOYEE (own)', 'ADMIN', 'MANAGEMENT', 'PROD_MGR'];
      readAccess = 'Own leave requests OR ADMIN / MANAGEMENT / PROD_MGR';
      insertAccess = 'Own leave submission';
      updateAccess = 'ADMIN / MANAGEMENT / PROD_MGR (approvals) OR employee if Pending';
      deleteAccess = 'Employee if Pending OR ADMIN';
      specialRules = 'Only designated managers can approve leave requests.';
    }
    // 3. Manufacturing
    else if (['production_bays', 'machines', 'production_operations', 'machine_assignments'].includes(tableName)) {
      sensitive = false;
      allowedRoles = ['ALL_AUTHENTICATED (read)', 'ADMIN, MANAGEMENT, PROD_MGR (write)'];
      readAccess = 'Authenticated users';
      insertAccess = 'ADMIN, MANAGEMENT, PROD_MGR';
      updateAccess = 'ADMIN, MANAGEMENT, PROD_MGR';
      deleteAccess = 'ADMIN';
      specialRules = 'Shop floor machinery and operational routing definitions.';
    }
    // 4. Spindles & Work Orders
    else if (['spindle_models', 'spindles', 'spindle_components', 'digital_twins'].includes(tableName)) {
      sensitive = false;
      allowedRoles = ['ALL_AUTHENTICATED (read)', 'ADMIN, MANAGEMENT, PROD_MGR, QA_MGR, SERVICE (write)'];
      readAccess = 'Authenticated users';
      insertAccess = 'ADMIN, MANAGEMENT, PROD_MGR, QA_MGR, SERVICE';
      updateAccess = 'ADMIN, MANAGEMENT, PROD_MGR, QA_MGR, SERVICE';
      deleteAccess = 'ADMIN';
      specialRules = 'Precision spindle registry, telemetry, and sub-assembly BOM.';
    }
    else if (['work_orders', 'work_order_items'].includes(tableName)) {
      sensitive = false;
      allowedRoles = ['ALL_AUTHENTICATED (read)', 'ADMIN, MANAGEMENT, PROD_MGR (write)'];
      readAccess = 'Authenticated users';
      insertAccess = 'ADMIN, MANAGEMENT, PROD_MGR';
      updateAccess = 'ADMIN, MANAGEMENT, PROD_MGR';
      deleteAccess = 'ADMIN';
      specialRules = 'Manufacturing traveler work orders (WO-2026-XXXX).';
    }
    else if (tableName === 'work_logs') {
      sensitive = false;
      allowedRoles = ['EMPLOYEE (own)', 'ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR'];
      readAccess = 'Own work logs OR ADMIN / MANAGEMENT / PROD_MGR / QA_MGR';
      insertAccess = 'Own work logs OR ADMIN / MANAGEMENT / PROD_MGR';
      updateAccess = 'Own work logs OR ADMIN / MANAGEMENT / PROD_MGR';
      deleteAccess = 'ADMIN, MANAGEMENT, PROD_MGR (ordinary operators cannot delete logs)';
      specialRules = 'Operator daily activity tracking on spindle manufacturing work orders.';
    }
    // 5. Quality
    else if (['inspections', 'inspection_results', 'quality_certificates', 'non_conformances', 'spindle_quality_records'].includes(tableName)) {
      sensitive = true;
      allowedRoles = ['ALL_AUTHENTICATED (read)', 'ADMIN, MANAGEMENT, QA_MGR (write)'];
      readAccess = 'Authenticated users (inspections and quality certs)';
      insertAccess = 'ADMIN, MANAGEMENT, QA_MGR';
      updateAccess = 'ADMIN, MANAGEMENT, QA_MGR';
      deleteAccess = 'ADMIN';
      specialRules = 'Metrology test certificates and non-conformance records (NCR).';
    }
    // 6. Commercial
    else if (['customers', 'customer_contacts'].includes(tableName)) {
      sensitive = false;
      allowedRoles = ['ALL_AUTHENTICATED (read)', 'ADMIN, MANAGEMENT, SALES (write)'];
      readAccess = 'Authenticated users';
      insertAccess = 'ADMIN, MANAGEMENT, SALES';
      updateAccess = 'ADMIN, MANAGEMENT, SALES';
      deleteAccess = 'ADMIN';
      specialRules = 'Client master directory and contact cards.';
    }
    else if (['enquiries', 'quotations', 'quotation_items', 'sales_orders', 'sales_order_items'].includes(tableName)) {
      sensitive = true;
      allowedRoles = ['ADMIN', 'MANAGEMENT', 'SALES'];
      readAccess = 'ADMIN, MANAGEMENT, SALES';
      insertAccess = 'ADMIN, MANAGEMENT, SALES';
      updateAccess = 'ADMIN, MANAGEMENT, SALES';
      deleteAccess = 'ADMIN';
      specialRules = 'Commercial sales pipeline, pricing costing, and client quotations.';
    }
    else if (['proforma_invoices', 'proforma_invoice_items', 'invoices', 'invoice_items', 'eway_bills', 'eway_bill_items'].includes(tableName)) {
      sensitive = true;
      allowedRoles = ['ADMIN', 'MANAGEMENT', 'SALES'];
      readAccess = 'ADMIN, MANAGEMENT, SALES';
      insertAccess = 'ADMIN, MANAGEMENT, SALES';
      updateAccess = 'ADMIN, MANAGEMENT, SALES';
      deleteAccess = 'ADMIN';
      specialRules = 'Financial tax invoicing, bank details, and transit E-Way Bills. Inaccessible to non-commercial roles.';
    }
    // 7. Procurement
    else if (['suppliers', 'purchase_requisitions', 'purchase_requisition_items'].includes(tableName)) {
      sensitive = false;
      allowedRoles = ['ALL_AUTHENTICATED (read/submit requisition)', 'ADMIN, MANAGEMENT, PURCHASE, STORES (write)'];
      readAccess = 'Authenticated users';
      insertAccess = tableName === 'suppliers' ? 'ADMIN, MANAGEMENT, PURCHASE, STORES' : 'Authenticated users (any employee can request items)';
      updateAccess = 'ADMIN, MANAGEMENT, PURCHASE (requisitions can be approved/modified)';
      deleteAccess = 'ADMIN, MANAGEMENT, PURCHASE';
      specialRules = 'Vendor directory and material purchase requests.';
    }
    else if (['purchase_orders', 'purchase_order_items', 'goods_receipts', 'goods_receipt_items'].includes(tableName)) {
      sensitive = true;
      allowedRoles = ['ADMIN', 'MANAGEMENT', 'PURCHASE', 'STORES'];
      readAccess = 'ADMIN, MANAGEMENT, PURCHASE, STORES';
      insertAccess = 'ADMIN, MANAGEMENT, PURCHASE (GRNs by STORES too)';
      updateAccess = 'ADMIN, MANAGEMENT, PURCHASE, STORES';
      deleteAccess = 'ADMIN';
      specialRules = 'Procurement commitments and inward goods receipt inspection notes.';
    }
    // 8. Inventory
    else if (['product_categories', 'products', 'warehouses', 'stock'].includes(tableName)) {
      sensitive = false;
      allowedRoles = ['ALL_AUTHENTICATED (read)', 'ADMIN, MANAGEMENT, STORES, PURCHASE, PROD_MGR (write)'];
      readAccess = 'Authenticated users';
      insertAccess = 'ADMIN, MANAGEMENT, STORES, PURCHASE, PROD_MGR';
      updateAccess = 'ADMIN, MANAGEMENT, STORES, PURCHASE, PROD_MGR';
      deleteAccess = 'ADMIN';
      specialRules = 'Parts master, warehouse bins, and on-hand stock quantities.';
    }
    else if (['stock_movements', 'inventory_transactions'].includes(tableName)) {
      sensitive = true;
      allowedRoles = ['ADMIN', 'MANAGEMENT', 'STORES', 'PURCHASE', 'PROD_MGR'];
      readAccess = 'ADMIN, MANAGEMENT, STORES, PURCHASE, PROD_MGR';
      insertAccess = 'ADMIN, MANAGEMENT, STORES, PURCHASE, PROD_MGR';
      updateAccess = 'ADMIN only (Immutable inventory transaction ledger)';
      deleteAccess = 'ADMIN only (Audit integrity)';
      specialRules = 'Stock ledger records. Modifications restricted to audit corrections by Admin.';
    }
    // 9. Service & Assets
    else if (['service_requests', 'service_jobs', 'service_items', 'service_history', 'spindle_service_history', 'assets', 'maintenance_orders', 'maintenance_history'].includes(tableName)) {
      sensitive = false;
      allowedRoles = ['ALL_AUTHENTICATED (read)', 'ADMIN, MANAGEMENT, SERVICE, PROD_MGR (write)'];
      readAccess = 'Authenticated users';
      insertAccess = 'ADMIN, MANAGEMENT, SERVICE, PROD_MGR';
      updateAccess = 'ADMIN, MANAGEMENT, SERVICE, PROD_MGR';
      deleteAccess = 'ADMIN';
      specialRules = 'Spindle aftermarket overhaul and machine tool preventative maintenance.';
    }
    // 10. Logistics & Finance
    else if (['transporters', 'vehicles', 'dispatches', 'dispatch_items'].includes(tableName)) {
      sensitive = false;
      allowedRoles = ['ADMIN', 'MANAGEMENT', 'SALES', 'STORES', 'PURCHASE'];
      readAccess = 'ADMIN, MANAGEMENT, SALES, STORES, PURCHASE';
      insertAccess = 'ADMIN, MANAGEMENT, SALES, STORES';
      updateAccess = 'ADMIN, MANAGEMENT, SALES, STORES';
      deleteAccess = 'ADMIN';
      specialRules = 'Freight shipping and dispatch crate tracking.';
    }
    else if (['expenses', 'expense_items'].includes(tableName)) {
      sensitive = true;
      allowedRoles = ['EMPLOYEE (own)', 'ADMIN', 'MANAGEMENT'];
      readAccess = 'Own expense claims OR ADMIN / MANAGEMENT';
      insertAccess = 'Authenticated users (submit claim)';
      updateAccess = 'Own expense if pending OR ADMIN / MANAGEMENT';
      deleteAccess = 'ADMIN';
      specialRules = 'Employee expense reimbursements and travel claims.';
    }
    else if (tableName === 'payment_records') {
      sensitive = true;
      allowedRoles = ['ADMIN', 'MANAGEMENT', 'SALES'];
      readAccess = 'ADMIN, MANAGEMENT, SALES';
      insertAccess = 'ADMIN, MANAGEMENT, SALES';
      updateAccess = 'ADMIN, MANAGEMENT, SALES';
      deleteAccess = 'ADMIN';
      specialRules = 'Customer bank wire and RTGS payment receipts.';
    }
    // 11. Documents & Notifications
    else if (['documents', 'document_versions'].includes(tableName)) {
      sensitive = true;
      allowedRoles = ['ALL_AUTHENTICATED'];
      readAccess = 'Authenticated users (CAD drawings & spec sheets)';
      insertAccess = 'Authenticated users';
      updateAccess = 'Authenticated users';
      deleteAccess = 'ADMIN, MANAGEMENT';
      specialRules = 'Engineering document version control.';
    }
    else if (tableName === 'email_activity') {
      sensitive = true;
      allowedRoles = ['ADMIN', 'MANAGEMENT', 'SALES', 'PURCHASE'];
      readAccess = 'ADMIN, MANAGEMENT, SALES, PURCHASE';
      insertAccess = 'ADMIN, MANAGEMENT, SALES, PURCHASE';
      updateAccess = 'ADMIN, MANAGEMENT';
      deleteAccess = 'ADMIN';
      specialRules = 'Outlook client email logs and communication trail.';
    }
    else if (tableName === 'notifications') {
      sensitive = true;
      allowedRoles = ['ALL_AUTHENTICATED (own)'];
      readAccess = 'Authenticated users (own notifications)';
      insertAccess = 'Authenticated users (system / user alerts)';
      updateAccess = 'Authenticated users (mark as read)';
      deleteAccess = 'Authenticated users (dismiss)';
      specialRules = 'User alerts and system notifications.';
    }
    else if (tableName === 'audit_logs') {
      sensitive = true;
      allowedRoles = ['ADMIN', 'MANAGEMENT (read only)'];
      readAccess = 'ADMIN, MANAGEMENT';
      insertAccess = 'Authenticated system trigger / service';
      updateAccess = 'DENIED (Immutable audit trail)';
      deleteAccess = 'DENIED (Immutable audit trail)';
      specialRules = 'Critical audit trail. Update and Delete strictly forbidden to all users!';
    }

    inventory.push({
      table: tableName,
      primary_key: 'id',
      sensitive_data: sensitive,
      owner_column: ownerCol,
      employee_column: empCol,
      department_column: deptCol,
      allowed_roles: allowedRoles,
      read_access: readAccess,
      insert_access: insertAccess,
      update_access: updateAccess,
      delete_access: deleteAccess,
      special_security_rules: specialRules,
    });
  }

  return inventory;
}

const inventory = buildInventory();
fs.writeFileSync(path.resolve('scripts', 'security_inventory.json'), JSON.stringify(inventory, null, 2));
console.log(`Security inventory generated for ${inventory.length} tables.`);
