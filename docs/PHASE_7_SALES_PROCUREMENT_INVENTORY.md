# GPS SPINDLE ERP — PHASE 7: SALES + PROCUREMENT + INVENTORY TRANSACTIONAL WORKFLOWS

**Status:** COMPLETE & LIVE VERIFIED  
**Target Environment:** Supabase PostgreSQL (`https://eefqamtethlkqhqgdpah.supabase.co`)  
**Frontend Stack:** React 19 + Vite + Vanilla CSS + Lucide React (Maroon Industrial Theme Preserved)  
**Security Enforcement:** Row Level Security (RLS) 75/75 Tables Protected + Zero Mock Fallbacks  

---

## 1. Executive Summary

Phase 7 transitioned all Commercial (Sales), Procurement, and Inventory transactional workflows from frontend mock/static datasets to live relational Supabase PostgreSQL tables.
- **Master Data Reused:** Existing Customers, Customer Contacts, Suppliers, Products, Product Categories, Warehouses, and Employees seeded in Phase 5 were referenced without duplication.
- **Relational Integrity:** Quotations, Quotation Items, Sales Orders, Sales Order Items, Proforma Invoices, Proforma Invoice Items, Invoices, Invoice Items, E-Way Bills, E-Way Bill Items, Purchase Requisitions, Purchase Requisition Items, Purchase Orders, Purchase Order Items, Stock Balances, Stock Movements, and Inventory Transactions were established with strict foreign keys and constraints.
- **Zero Mock Fallbacks:** In all migrated screens (`SalesScreen`, `ProformaInvoiceScreen`, `InvoicesScreen`, `EWayBillScreen`, `PurchaseOrderScreen`, and `InventoryScreen`), mock fallbacks were eliminated. Failures surface as explicit database/permission errors with retry capabilities.
- **Idempotency Verified:** The migration script was executed multiple times, achieving 0 duplicates on rerun with natural-key based conflict resolution.

---

## 2. Database Schema & Entity Mappings

| Domain | Table Name | Natural Key | Primary Foreign Keys | Status Constraint Values |
| :--- | :--- | :--- | :--- | :--- |
| **Sales** | `quotations` | `quotation_number` | `customer_id` $\rightarrow$ `customers.id`<br>`created_by` $\rightarrow$ `employees.id` | `'Draft'`, `'Sent'`, `'Approved'`, `'Ordered'`, `'Rejected'`, `'Expired'` |
| **Sales** | `quotation_items` | `id` | `quotation_id` $\rightarrow$ `quotations.id` | N/A |
| **Sales** | `sales_orders` | `sales_order_no` | `quotation_id` $\rightarrow$ `quotations.id`<br>`customer_id` $\rightarrow$ `customers.id` | `'Draft'`, `'Confirmed'`, `'In Production'`, `'Ready for Dispatch'`, `'Dispatched'`, `'Delivered'`, `'Cancelled'` |
| **Sales** | `sales_order_items` | `id` | `sales_order_id` $\rightarrow$ `sales_orders.id`<br>`product_id` $\rightarrow$ `products.id` | N/A |
| **Sales** | `proforma_invoices` | `pi_number` | `sales_order_id` $\rightarrow$ `sales_orders.id`<br>`quotation_id` $\rightarrow$ `quotations.id`<br>`customer_id` $\rightarrow$ `customers.id` | `'Draft'`, `'Sent'`, `'Advance Paid'`, `'Converted to Tax Invoice'`, `'Expired'`, `'Cancelled'` |
| **Sales** | `proforma_invoice_items` | `id` | `proforma_invoice_id` $\rightarrow$ `proforma_invoices.id` | N/A |
| **Sales** | `invoices` | `invoice_number` | `proforma_invoice_id` $\rightarrow$ `proforma_invoices.id`<br>`sales_order_id` $\rightarrow$ `sales_orders.id`<br>`customer_id` $\rightarrow$ `customers.id` | `'Paid'`, `'Pending Payment'`, `'Partially Paid'`, `'Overdue'`, `'Cancelled'` |
| **Sales** | `invoice_items` | `id` | `invoice_id` $\rightarrow$ `invoices.id` | N/A |
| **Logistics** | `eway_bills` | `ewb_number` | `invoice_id` $\rightarrow$ `invoices.id`<br>`customer_id` $\rightarrow$ `customers.id` | `'Active'`, `'Expiring Soon'`, `'Draft'`, `'Expired'`, `'Cancelled'` |
| **Logistics** | `eway_bill_items` | `id` | `eway_bill_id` $\rightarrow$ `eway_bills.id` | N/A |
| **Procurement** | `purchase_requisitions` | `requisition_no` | `department_id` $\rightarrow$ `departments.id`<br>`requested_by` $\rightarrow$ `employees.id` | `'Draft'`, `'Submitted'`, `'Approved'`, `'Rejected'`, `'PO Created'`, `'Cancelled'` |
| **Procurement** | `purchase_requisition_items` | `id` | `requisition_id` $\rightarrow$ `purchase_requisitions.id`<br>`product_id` $\rightarrow$ `products.id` | N/A |
| **Procurement** | `purchase_orders` | `po_number` | `requisition_id` $\rightarrow$ `purchase_requisitions.id`<br>`supplier_id` $\rightarrow$ `suppliers.id` | `'Draft'`, `'Sent'`, `'Approved'`, `'Partially Received'`, `'Received'`, `'Cancelled'` |
| **Procurement** | `purchase_order_items` | `id` | `purchase_order_id` $\rightarrow$ `purchase_orders.id`<br>`product_id` $\rightarrow$ `products.id` | N/A |
| **Procurement** | `goods_receipts` | `grn_number` | `purchase_order_id` $\rightarrow$ `purchase_orders.id`<br>`supplier_id` $\rightarrow$ `suppliers.id`<br>`warehouse_id` $\rightarrow$ `warehouses.id` | `'Pending QC'`, `'Completed'`, `'Discrepancy'`, `'Rejected'` |
| **Procurement** | `goods_receipt_items` | `id` | `goods_receipt_id` $\rightarrow$ `goods_receipts.id`<br>`product_id` $\rightarrow$ `products.id` | N/A |
| **Inventory** | `stock` | `product_id, warehouse_id, bin_location` | `product_id` $\rightarrow$ `products.id`<br>`warehouse_id` $\rightarrow$ `warehouses.id` | `quantity_on_hand >= 0`, `quantity_available >= 0` |
| **Inventory** | `stock_movements` | `movement_number` | `product_id` $\rightarrow$ `products.id`<br>`from_warehouse_id` / `to_warehouse_id` $\rightarrow$ `warehouses.id`<br>`performed_by` $\rightarrow$ `employees.id` | `'RECEIPT_GRN'`, `'ISSUE_PRODUCTION'`, `'RETURN_PRODUCTION'`, `'WAREHOUSE_TRANSFER'`, `'SCRAP_WRITEOFF'`, `'PHYSICAL_AUDIT_ADJUSTMENT'` |
| **Inventory** | `inventory_transactions` | `transaction_number` | `product_id` $\rightarrow$ `products.id`<br>`warehouse_id` $\rightarrow$ `warehouses.id`<br>`performed_by` $\rightarrow$ `employees.id` | `'INWARD_PURCHASE'`, `'OUTWARD_PRODUCTION'`, `'OUTWARD_SALES'`, `'ADJUSTMENT_ADD'`, `'ADJUSTMENT_SUB'`, `'TRANSFER_IN'`, `'TRANSFER_OUT'` |

---

## 3. Migration Order & Idempotency Strategy

### Relational Execution Order
1. **Reference Resolution:** Load master data IDs (`customers`, `suppliers`, `products`, `warehouses`, `employees`, `departments`).
2. **Quotations & Items:** Upsert quotations matching `quotation_number` natural keys; upsert quotation items with deterministic UUIDs.
3. **Sales Orders & Items:** Upsert sales orders matching `sales_order_no`, referencing `quotation_id`.
4. **Proforma Invoices & Items:** Upsert proforma invoices matching `pi_number`, referencing `sales_order_id` and customer.
5. **Tax Invoices & Items:** Upsert tax invoices matching `invoice_number`, referencing `proforma_invoice_id` and customer.
6. **E-Way Bills & Items:** Upsert e-way bills matching `ewb_number`, referencing `invoice_id`.
7. **Purchase Requisitions & Items:** Upsert purchase requisitions matching `requisition_no`.
8. **Purchase Orders & Items:** Upsert purchase orders matching `po_number`, linking `requisition_id` and `supplier_id`.
9. **Stock Balances:** Synchronize warehouse inventory bins (`quantity_on_hand`, `quantity_reserved`).
10. **Stock Movements & Audit Transactions:** Upsert stock movements and audit transaction ledgers.

### Idempotency Verification Results
The migration script (`scripts/migrate_commercial_inventory_data.js`) was executed consecutively:
- **Run 1:** Populated missing records and synchronized schema.
- **Run 2 (Verification Run):**
  - Quotations: 0 inserted, 4 updated in place
  - Quotation Items: 12 upserted
  - Sales Orders: 0 inserted, 4 updated in place
  - Sales Order Items: 4 upserted
  - Proforma Invoices: 0 inserted, 5 updated in place
  - Proforma Invoice Items: 6 upserted
  - Tax Invoices: 0 inserted, 5 updated in place
  - Tax Invoice Items: 5 upserted
  - E-Way Bills: 0 inserted, 5 updated in place
  - E-Way Bill Items: 5 upserted
  - Purchase Requisitions: 0 inserted, 5 updated in place
  - Purchase Requisition Items: 6 upserted
  - Purchase Orders: 0 inserted, 5 updated in place
  - Purchase Order Items: 8 upserted
  - Stock Movements: 0 inserted, 4 updated in place
  - Inventory Transactions: 0 inserted, 4 updated in place
  - **Duplicate Records Created:** **0**

---

## 4. Domain Services Architecture

All database communication is encapsulated within `src/services/database/`:
- `salesService.js`:
  - `getQuotations(options)`: Retrieves quotations with customer joins and line items.
  - `getQuotationById(id)`: Fetches quotation by UUID or natural number.
  - `createQuotation(data)`: Generates and persists new quotation and line items.
  - `updateQuotationStatus(id, status)`: Transitions status (`Draft`, `Sent`, `Approved`, `Ordered`, etc.).
  - `convertQuotationToProformaInvoice(quotationId)`: Idempotently creates linked Proforma Invoice.
  - `getSalesOrders(options)`: Retrieves sales orders.
- `proformaInvoiceService.js`:
  - `getProformaInvoices(options)`: Live fetch with line items and customer details.
  - `getProformaInvoiceById(id)`: Single proforma invoice inspection.
  - `createProformaInvoice(piData)`: Creates proforma invoice with tax breakdown.
  - `updateProformaInvoiceStatus(id, status)`: Updates advance payment status or cancellation.
  - `convertProformaInvoiceToInvoice(piId)`: Idempotently generates live Tax Invoice.
- `invoiceService.js`:
  - `getInvoices(options)`: Live tax invoice register with customer joins.
  - `getInvoiceById(id)`: Single invoice detail.
  - `recordInvoicePayment(invoiceId, paymentAmount)`: Updates `paid_amount` and recalculates balance/status.
  - `updateInvoiceStatus(id, status)`: Updates payment status (`Paid`, `Partially Paid`, `Cancelled`).
- `ewayBillService.js`:
  - `getEWayBills(options)`: Live consignment passes and Part-A/Part-B transporter metadata.
  - `createEWayBill(ewbData)`: Creates E-Way Bill with goods items against an invoice.
  - `cancelEWayBill(ewbId, reason)`: Cancels consignment pass with audit remarks.
- `purchaseOrderService.js`:
  - `getPurchaseOrders(options)`: Live PO register with vendor details and line items.
  - `getPurchaseOrderById(id)`: Single purchase order inspection.
  - `createPurchaseOrder(poData)`: Creates purchase order and line items.
  - `updatePurchaseOrderStatus(id, newStatus)`: Updates order status (`Draft`, `Sent`, `Approved`, `Received`, `Cancelled`).
  - `getPurchaseRequisitions(options)`: Retrieves purchase requisitions.
  - `convertRequisitionToPurchaseOrder(reqId, supplierId)`: Converts approved requisition to PO.
- `inventoryService.js`:
  - `getInventoryItems(options)`: Live product stock catalog.
  - `getStockMovements(options)`: Live historical movement ledger with performer and reference joins.
  - `receiveStock(...)`: Inward GRN movement and stock quantity increment.
  - `issueStock(...)`: Store issue to shop floor and stock decrement.
  - `adjustStock(...)`: Physical cycle count audit reconciliation.

---

## 5. Frontend Screens Migrated

Each screen strictly maintains the Maroon Industrial UI, controls, and tables without visual redesign:

1. **`SalesScreen.jsx`**:
   - Replaced static `QUOTATIONS` with `salesService.getQuotations()`.
   - Add/Edit/Status changes persist directly to PostgreSQL.
   - Quotation approval and PI conversion operate on live records.
   - Added Loading state (`RefreshCw` spinner) and Database Error state with retry action.
2. **`ProformaInvoiceScreen.jsx`**:
   - Replaced static `PROFORMA_INVOICES` with `proformaInvoiceService.getProformaInvoices()`.
   - Creation modal persists to `proforma_invoices` and `proforma_invoice_items`.
   - "Convert to Tax Invoice" creates relational row in `invoices`.
   - Full loading and RLS-aware error states.
3. **`InvoicesScreen.jsx`**:
   - Replaced static `INVOICES` with `invoiceService.getInvoices()`.
   - "Record Payment" mutates `invoices.paid_amount` and updates status in live database.
   - Full loading and RLS-aware error states.
4. **`EWayBillScreen.jsx`**:
   - Replaced static `E_WAY_BILLS` with `ewayBillService.getEWayBills()`.
   - "Generate E-Way Bill" persists to `eway_bills` and `eway_bill_items`.
   - Cancel action records audit status in database.
   - Full loading and RLS-aware error states.
5. **`PurchaseOrderScreen.jsx`**:
   - Replaced mock `PURCHASE_ORDERS` with `purchaseOrderService.getPurchaseOrders()`.
   - Save Draft / Send PO persists to `purchase_orders` and `purchase_order_items`.
   - Cancel PO updates order status in PostgreSQL.
   - Full loading and RLS-aware error states.
6. **`InventoryScreen.jsx`**:
   - Connected "Recent Inventory Transactions & Store Issues" to `inventoryService.getStockMovements()`.
   - Stock items and movements loaded simultaneously via live API.
   - Full loading and RLS-aware error states.

---

## 6. Verification and Test Results

### 1. Data Integrity Verification (`scripts/verify_commercial_inventory_data.js`)
- All 15 entities passed validation.
- 0 natural key duplicates.
- 0 orphan line items across Quotations, PIs, Invoices, E-Way Bills, Requisitions, and POs.
- Valid foreign key constraints on Customers, Suppliers, and Products.

### 2. End-to-End Workflow & Role Tests (`scripts/test_commercial_inventory_workflow_and_roles.js`)
- **Sales Workflow:**
  - Quotation created $\rightarrow$ Status Approved $\rightarrow$ Converted to Proforma Invoice $\rightarrow$ Converted to Tax Invoice $\rightarrow$ Generated E-Way Bill.
  - Full relational chain verified: `QTN` $\rightarrow$ `PI` $\rightarrow$ `INV` $\rightarrow$ `EWB`.
- **Procurement Workflow:**
  - Purchase Requisition created $\rightarrow$ Converted to Purchase Order with linked `requisition_id`.
- **Inventory Workflow:**
  - Inward GRN receipt movement (+10 units) verified.
  - Outward store issue movement (-2 units) verified.
  - Physical audit adjustment movement verified.
- **Cross-Role Authorization Matrix:**
  - `SALES` role blocked from inserting `purchase_orders` (RLS denied).
  - `PURCHASE` role blocked from inserting `invoices` (RLS denied).
  - `EMPLOYEE` role blocked from inserting `quotations` (RLS denied).
  - Anonymous requests to `quotations` rejected / 0 rows returned.

### 3. Phase 4 RLS Security Regression (`scripts/verify_phase4_live.js`)
- 75 / 75 tables with Row Level Security enabled.
- 172 active RLS policies.
- 9 / 9 security helper functions intact.
- 2 / 2 privilege escalation triggers active.
- 7 / 7 privilege escalation attacks blocked.
- Service role key completely isolated from client bundle.

---

## 7. Build and Lint Validation

- **Lint (`npm run lint`):** 0 errors.
- **Build (`npm run build`):** 0 errors, production client bundle built in 1.12s.

---

## 8. Defers & Scope Boundaries (Phase 8 Notice)

In strict adherence to Directive 30, the following modules are **intentionally deferred to Phase 8**:
- Human Resources, Attendance, and Leave Management UI
- Fixed Asset Registry and Tool Depreciation
- Machine Preventive Maintenance Scheduling
- Service Tickets and On-Site Field Engineer Workflows
- General Ledger, Chart of Accounts, and Expense Vouchers
- Advanced Automated Document Generation and Email Webhooks
- Custom BI Analytics and Reporting Dashboards
