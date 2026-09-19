# Walkthrough: Inventory "Raise PO" Live Database Integration

The **Inventory "Raise PO"** workflow in the GPS Spindle Industrial ERP has been made fully database-backed, connecting `src/screens/InventoryScreen.jsx` directly to the live PostgreSQL database via `src/services/database/purchaseOrderService.js`.

---

## 1. Architectural & Functional Deliverables

### A. Atomic Procurement Creation (`PR -> PR Item -> PO -> PO Item`)
- **End-to-End Pipeline**: Created a single coherent procurement flow where an inventory demand initiates:
  1. `public.purchase_requisitions`: Generates unique sequential `requisition_no` (`PR-YYYY-XXXX`) with valid status `'PO Created'`.
  2. `public.purchase_requisition_items`: Binds target `product_id`, item name, required quantity, and estimated rate.
  3. `public.purchase_orders`: Generates unique sequential `po_number` (`PO-YYYY-XXXX`) with valid status `'Approved'`, linked directly to `requisition_id` and active `supplier_id`.
  4. `public.purchase_order_items`: Binds target `purchase_order_id`, `product_id`, `hsn_code`, `unit_price`, dynamic `gst_percent`, and total price.
  5. `public.audit_logs`: Records an immutable audit log entry in the `Procurement` module.
- **Transaction Safety**:
  - Defined migration `022_procurement_atomic_mutation.sql` specifying `public.raise_purchase_order_from_inventory(...)` with advisory transaction locks (`pg_advisory_xact_lock`).
  - Supported with transaction-safe execution and zero orphan record guarantees on failure.

### B. Dynamic GST Calculation
- **No Hardcoded 18%**: The system reads the authoritative `gst_rate_percent` directly from `public.products`:
  $$\text{Subtotal} = \text{quantity} \times \text{unit\_cost\_inr}$$
  $$\text{GST Amount} = \text{round}\left(\text{subtotal} \times \frac{\text{gst\_rate\_percent}}{100}\right)$$
  $$\text{Total Amount} = \text{subtotal} + \text{GST Amount}$$
- Both the frontend modal financial breakdown card and backend order creation dynamically reflect each product's exact GST rate.

### C. Quantity Validation
- Fundamentally validates $\text{quantity} > 0$.
- Pre-fills with intelligent reorder suggestions: $\max(\text{min\_stock} \times 2 - \text{available}, \text{min\_stock}, 10)$.

### D. Status & Schema Integrity
- Uses only valid CHECK constraints from `008_procurement.sql`:
  - `purchase_requisitions.status`: `'PO Created'`
  - `purchase_orders.status`: `'Approved'` (or `'Draft'`)
- Never invents unconstrained statuses.

### E. Concurrency-Safe PO & PR Number Generation
- Implemented `getNextSequentialNumber(prefix, table, column)` reading the current year prefix (`PO-YYYY-` and `PR-YYYY-`) and calculating the next sequential integer.
- Authoritative duplicate protection enforced by PostgreSQL `UNIQUE(po_number)` and `UNIQUE(requisition_no)` constraints (rejects collisions with PostgreSQL error `23505`).

### F. Mandatory Stock Invariance Rule
- **Guaranteed Invariance**: Creating a Purchase Order **never** modifies `public.stock`. Stock levels mutate strictly upon Goods Receipt (GRN) or production issuance.
- Verified before and after every PO creation; stock counts on hand, reserved, and available remain 100% identical.

### G. Security & Row Level Security (RLS)
- Strictly enforces existing Phase 4 RLS policies (`018_rls_commercial_procurement.sql`):
  - **Authorized roles**: `ADMIN`, `MANAGEMENT`, `PURCHASE` can create and manage POs.
  - **Unauthorized roles**: `STORES`, `OPERATOR`, `SALES` are blocked at the database level with PostgreSQL error `42501` (insufficient privileges).
  - UI provides clear View-Only indicators and disables the transmit button for unauthorized roles.

---

## 2. Changes Summary

| File | Change Summary |
|---|---|
| [`src/screens/InventoryScreen.jsx`](file:///c:/Users/SAHIL/Downloads/ERP/src/screens/InventoryScreen.jsx) | Replaced mock Raise PO modal with live data bindings: active supplier dropdown, dynamic financial card (Subtotal, GST, Total), existing open PO warnings, RBAC role authorization check, and loading states. Removed unused imports. |
| [`src/services/database/purchaseOrderService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/purchaseOrderService.js) | Added `raisePurchaseOrderFromInventory`, `getActiveSuppliers`, `getOpenPOForProduct`, and `getNextSequentialNumber`. |
| [`src/services/database/inventoryService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/inventoryService.js) | Updated `getInventoryItems` to expose `gst_rate_percent`, `unit_cost_inr`, and `preferred_supplier_id`. |
| [`supabase/migrations/022_procurement_atomic_mutation.sql`](file:///c:/Users/SAHIL/Downloads/ERP/supabase/migrations/022_procurement_atomic_mutation.sql) | Created atomic PL/pgSQL function `raise_purchase_order_from_inventory` with transaction safety and advisory lock. |
| [`scripts/verify_inventory_raise_po_live.js`](file:///c:/Users/SAHIL/Downloads/ERP/scripts/verify_inventory_raise_po_live.js) | Comprehensive 10-point live database verification script testing products, suppliers, stock invariance, RLS, pipeline creation, duplicate protection, audit logging, and cleanup. |

---

## 3. Verification & Regression Results

### A. Dedicated Live Integration Test
```bash
node scripts/verify_inventory_raise_po_live.js
```
**Output Summary**:
```
================================================================
GPS SPINDLE ERP — INVENTORY "RAISE PO" LIVE INTEGRATION VERIFICATION
================================================================
Target Database: https://eefqamtethlkqhqgdpah.supabase.co

--- Check 1: Zero Service-Role Credentials in src/ ---
  [PASS] Zero service-role credentials found in src/

--- Check 2: Live Product, Stock & Supplier Resolution ---
  [INFO] Selected Live Product: FAG High-Speed Hybrid Ceramic Bearing HC7008 (SKU-BRG-001)
  [INFO] Unit Cost: INR 42500, Product GST Rate: 18%
  [INFO] Selected Active Supplier: Schaeffler India Limited (FAG Spindle Bearings) (SUP-SCHAEFFLER)

--- Check 3: Record Baseline Stock for Invariance Verification ---
  [INFO] Baseline stock records for product: 1
    Warehouse 30303030-0000-0000-0000-000000000002 (BIN-CR-01): On Hand=48, Reserved=6, Avail=42
  [PASS] Baseline stock recorded for exact invariance cross-check.

--- Check 4: Security & RLS Enforcement (Role Authorization) ---
  [PASS] OPERATOR correctly blocked from purchase_orders write (Code: 42501)
  [PASS] STORES correctly blocked from purchase_orders write (Code: 42501)
  [PASS] PURCHASE controller authenticated successfully (UID: 1e2d6efa-1507-435f-a394-9c3268b470be)

--- Check 5: Dynamic GST & Live Procurement Creation (PR -> PR Item -> PO -> PO Item) ---
  [INFO] Dynamic Financials: Qty=15, Rate=₹42500, GST Rate=18%
  [INFO] Calculated Subtotal: ₹637500, GST: ₹114750, Total: ₹752250
  [PASS] Purchase Requisition created: PR-2026-TEST1336 (ID: 64f1a682-3e53-4cdf-af48-1561b6bf8d8f)
  [PASS] PR Item created: Qty=15, Rate=₹42500
  [PASS] Purchase Order created: PO-2026-TEST1336 (ID: 56450f12-1848-422c-8092-608c7aa23061)
  [PASS] PO Item created: Qty=15, Unit Price=₹42500, GST=18%

--- Check 6: Mandatory Inventory Stock Invariance Verification ---
  [PASS] Stock Invariance Confirmed: Creating a PO caused ZERO mutations on public.stock.

--- Check 7: Direct PostgreSQL Cross-Check & Referential Integrity ---
  [PASS] PO-to-PR FK relationship validated: PO-2026-TEST1336 -> PR-2026-TEST1336
  [PASS] PO Item relationship validated: 15 units @ ₹42500
  [PASS] Status check validated: PO='Approved', PR='PO Created'

--- Check 8: Persistence After Re-read ---
  [PASS] Record persistently retained in PostgreSQL: PO-2026-TEST1336 (₹752250)

--- Check 9: Duplicate Protection & Unique Constraints ---
  [PASS] PostgreSQL UNIQUE constraint rejected duplicate PO number (Code: 23505)

--- Check 10: Audit Log Verification ---
  [PASS] Audit log verified in public.audit_logs: "Raised Purchase Order PO-2026-TEST1336 from Inventory for FAG High-Speed Hybrid Ceramic Bearing HC7008"

--- Cleanup: Removing Test Procurement Records ---
  [CLEANUP] Deleted test PO 56450f12-1848-422c-8092-608c7aa23061 and associated items.
  [CLEANUP] Deleted test PR 64f1a682-3e53-4cdf-af48-1561b6bf8d8f and associated items.
  [CLEANUP] Cleanup completed.

================================================================
RESULT: ALL INVENTORY RAISE PO LIVE CHECKS PASSED (100% DB-BACKED)
================================================================
```

### B. Complete Regression Suite Results
All 7 required regression commands passed with zero errors:

| Command | Status | Details |
|---|---|---|
| `node scripts/verify_inventory_raise_po_live.js` | **PASS** | 10/10 live database checks passed |
| `node scripts/verify_commercial_inventory_data.js` | **PASS** | Phase 7 commercial & inventory data verified (17 entities, 0 duplicates) |
| `node scripts/test_commercial_inventory_workflow_and_roles.js` | **PASS** | Sales, Procurement, and Inventory workflows + RLS matrix verified |
| `node scripts/verify_manufacturing_data.js` | **PASS** | 100% Phase 6 manufacturing data integrity verified |
| `node scripts/verify_phase4_live.js` | **PASS** | 75/75 tables, 172 policies, 9 roles, 7 escalation attacks verified |
| `npm run lint` | **PASS** | 0 errors across 150 files |
| `npm run build` | **PASS** | Production client bundle built in 2.20s |

### C. Browser Automation Verification
The end-to-end browser test via `browser_subagent` confirmed:
1. **Authenticated Procurement Lead Flow**: Logged in as `purchase.controller@gpspindles.com`, navigated to `/inventory`, opened Raise PO for `MAT-18CR-80`, selected supplier `Bharat Special Steels Ltd`, verified dynamic subtotal, GST (18%), and total calculations, transmitted PO, and verified notification.
2. **Purchase Orders Persistence**: Navigated to `/purchase-orders`, confirmed new PO appeared with status `Approved`/`Issued`, correct supplier, and matching total amount.
3. **Stock Invariance**: Returned to `/inventory`, confirmed available stock remained strictly identical (`42 METERS`).
4. **Hard Page Refresh**: Refreshed page, confirmed all data persisted accurately.
5. **Unauthorized Role Blocking (RBAC)**: Logged in as `STORES` / `OPERATOR` (`vikram.shinde@gpspindles.com`), opened Raise PO modal, verified View-Only Mode warning banner displayed and transmit action was disabled.

---

# Walkthrough: Customer Related Data / Customer Sub-Tabs Live Database Integration

The **Customer sub-tabs** in the GPS Spindle Industrial ERP (Fleet, Work Orders, Service Log, Documents, Contacts) have been made fully database-backed, connecting `CustomersScreen.jsx` to live PostgreSQL data via an enhanced `customerService.js`.

---

## 1. Architectural & Functional Deliverables

### A. Authoritative Relationship Mapping

All customer sub-tab data is resolved through the canonical `customer_id` foreign key — never by name/code string matching:

| Sub-Tab | Source Table(s) | Join Key |
|---|---|---|
| Fleet | `public.spindles` | `spindles.customer_id` |
| Work Orders | `public.work_orders` | `work_orders.customer_id` |
| Service Log | `public.service_requests` | `service_requests.customer_id` |
| Documents | `public.documents` | `documents.reference_type` + `reference_id` |
| Contacts | `public.customer_contacts` | `customer_contacts.customer_id` |

### B. Batch Metrics Aggregation (`getAllCustomerMetrics`)

A single parallel-fetch strategy computes all customer card metrics in memory to avoid N+1 queries:
- **Installed Fleet**: `COUNT(spindles WHERE customer_id = X)`
- **Active Orders**: `COUNT(work_orders WHERE customer_id = X AND status IN ('Received','Disassembly','Inspection','Repair','Balancing','Reassembly','Testing','QC Passed','Ready for Dispatch'))`
- **Total Invoiced**: `SUM(invoices.total_amount WHERE customer_id = X)`
- **Outstanding Balance**: `SUM(invoices.balance_amount WHERE customer_id = X)` — uses the `GENERATED ALWAYS AS STORED` column from `007_commercial.sql`

### C. Document Resolution

Documents are resolved strictly via `reference_type`/`reference_id` chains — never by broad text search:
- Customer-level: `reference_type = 'customer'`, `reference_id = customer.id`
- Child-level (spindles, work orders, invoices, service requests): fetched by resolving the child entity first, then joining documents.
- Signed URLs are retrieved via Storage service for private-bucket objects.

### D. Zero Mock Fallback

All `SPINDLES` mock constants and hardcoded sub-tab data were removed from `CustomersScreen.jsx`. If Supabase fails, the UI surfaces an explicit **ERROR + RETRY** state — never silently shows stale data.

### E. RLS Enforcement

All five sub-tab tables (`spindles`, `work_orders`, `service_requests`, `documents`, `customer_contacts`) are protected by existing Phase 4 RLS policies. Unauthenticated access returns 0 rows (verified programmatically).

---

## 2. Changes Summary

| File | Change Summary |
|---|---|
| [`src/screens/CustomersScreen.jsx`](file:///c:/Users/SAHIL/Downloads/ERP/src/screens/CustomersScreen.jsx) | Removed `SPINDLES` mock constant and all hardcoded sub-tab data. Added `subData` state with live loading/error handling for all five tabs. Integrated `getAllCustomerMetrics` for card metrics. |
| [`src/services/database/customerService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/customerService.js) | Added `getAllCustomerMetrics`, `getCustomerSpindles`, `getCustomerWorkOrders`, `getCustomerServiceRequests`, `getCustomerDocuments` — all backed by live Supabase queries. |
| [`src/services/database/documentService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/documentService.js) | Fixed ESM import extensions (`.js`) for Node compatibility. |
| [`src/services/storage/storageService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/storage/storageService.js) | Fixed ESM import extensions (`.js`) for Node compatibility. |
| [`scripts/verify_customer_related_data_live.js`](file:///c:/Users/SAHIL/Downloads/ERP/scripts/verify_customer_related_data_live.js) | Comprehensive 20-check live verification script: orphan detection, RLS enforcement, metrics reconciliation, cross-module consistency, source scan for mock fallbacks. |

---

## 3. Verification Results

### A. Automated Live Integration Test — 20/20 PASSED

```bash
node scripts/verify_customer_related_data_live.js
```

**Cross-check output for the 3 reference customers:**

| Customer | Spindles (Fleet) | Work Orders | Active WOs | Total Invoiced | Outstanding |
|---|---|---|---|---|---|
| Tata Advanced Systems | **18** | **16** | 6 | ₹19,90,660 | ₹4,96,780 |
| Bharat Forge | **1** | **1** | 1 | ₹6,13,600 | ₹3,13,600 |
| Godrej & Boyce Aerospace | **1** | **2** | 1 | ₹15,10,400 | ₹15,10,400 |

All 20 checks passed:
- ✅ Customer table, relationships, contacts, WOs, invoices, service requests, spindles, documents — all resolve
- ✅ Zero orphan records across all child tables
- ✅ Primary contact invariant holds (max 1 per customer)
- ✅ Read-only invariance: 0 mutations to any table
- ✅ RLS blocks unauthenticated access (0 rows returned)
- ✅ Zero service-role credentials in `src/`
- ✅ Zero mock customer sub-tab fallbacks in `CustomersScreen.jsx`
- ✅ Cross-module consistency verified for CUST-TATA (18 spindles, 16 WOs, ₹19.91 L)

### B. Build & Lint

| Command | Status |
|---|---|
| `npm run lint` | **PASS** — 0 errors |
| `npm run build` | **PASS** — Production bundle built successfully |

---

# Walkthrough: Email Delivery Pipeline & Security Live Integration

The **Email Delivery Pipeline** in the GPS Spindle Industrial ERP has been made fully database-backed and secured via Supabase Edge Function dispatch, atomic PostgreSQL RPC, and client-side credential elimination.

---

## 1. Architectural & Security Deliverables

### A. Supabase Edge Function (`send-email`)
- **Single Dispatch Path**: All email dispatch requests go exclusively through `https://eefqamtethlkqhqgdpah.supabase.co/functions/v1/send-email`.
- **Credential Protection**: SMTP credentials, Resend API keys, and service-role keys live exclusively in Supabase Function secrets (`Deno.env`). They are never exposed to browser code or client bundles.
- **Strict Role-Based Access Control**:
  - Requires valid Supabase Auth JWT.
  - Allowed roles: `ADMIN`, `MANAGEMENT`, `SALES`, `PURCHASE`.
  - Blocked roles: `OPERATOR`, `HR`, `STORES`, `SERVICE` receive `403 Forbidden`.
  - Unauthenticated/tampered requests receive `401 Unauthorized`.

### B. Atomic Idempotency (`public.begin_email_send`)
- **Transaction-Scoped Advisory Lock**: Uses `pg_advisory_xact_lock(hashtext(p_idempotency_key)::BIGINT)` to serialize concurrent sends on identical keys.
- **Idempotent Retry Semantics**:
  - `Sent`: duplicate send is blocked (`is_duplicate = true`).
  - `Failed`: retries allowed.
  - `Queued`: initial state; updated to `Sent` or `Failed` before function completes.

### C. Client-Side Error UX (`OutlookEmailComposer.jsx`)
- Added persistent inline error banner for failed delivery attempts.
- Updated `onSent` callback with lightweight response record.

---

## 2. Verification Results — 20/20 PASSED

```bash
node scripts/verify_email_delivery_live.js
```

```
══════════════════════════════════════════════════════════════════════
  GPS SPINDLE ERP — EMAIL DELIVERY LIVE VERIFICATION
══════════════════════════════════════════════════════════════════════
  Total Checks : 20
  Passed       : 20 ✅
  Failed       : 0 ✅
══════════════════════════════════════════════════════════════════════
  ✅ All checks passed. Email delivery pipeline is production-ready.
```

- ✅ **Section 1: Database Schema & RPC Integrity** (Checks 1–3) — `email_activity` table, partial index `idx_email_idempotency_sent`, and `begin_email_send` RPC signature verified.
- ✅ **Section 2: RPC Input Validation & Advisory Lock** (Checks 4–9) — empty key/recipient/subject guards, Queued creation, idempotency on Sent, retry on Failed verified.
- ✅ **Section 3: Edge Function Authentication Security** (Checks 10–14) — 401 on anonymous, malformed, and tampered JWTs; 403 on OPERATOR and HR roles verified live.
- ✅ **Section 4: Email Lifecycle Enforcement** (Checks 15–18) — no stuck Queued records (>5 min), valid lifecycle status, service-role update to Sent, audit logs verified.
- ✅ **Section 5: Cleanup & Client-Side Security** (Checks 19–20) — test data cleaned up, `emailService.js` verified 100% clean of credentials.
