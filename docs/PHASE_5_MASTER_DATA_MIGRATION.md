# GPS Spindle ERP — Phase 5: Master Data Migration Documentation

## Executive Summary

Phase 5 migrated all master and reference data from static and mock frontend definitions (`mockData.js`, `contactsData.js`, `workforceData.js`) into the live Supabase PostgreSQL production database (`eefqamtethlkqhqgdpah.supabase.co`).

The migration script adheres to strict idempotency, foreign-key dependency ordering, natural business keys, and administrative privilege handling. All browser-facing master data screens were converted to use live Supabase domain services extending `baseService.js` with comprehensive loading, empty, and normalized Row Level Security (RLS) error states.

Transactional data (work orders, purchase orders, invoices, service tickets, attendance logs) was strictly excluded and retained in mock state for subsequent phases.

---

## 1. Migration Scope & Sources

| Master Entity | Source Dataset | Target Table | Natural / Unique Key |
| :--- | :--- | :--- | :--- |
| **Companies** | `PLANT_INFO` (`mockData.js`) | `public.companies` | `code` (`GPS-CORP`) |
| **Branches** | `PLANT_INFO` (`mockData.js`) | `public.branches` | `code` (`PLANT-1`) |
| **Departments** | `DEPARTMENTS_WORKLOAD` (`workforceData.js`) | `public.departments` | `code` (`DEPT-PROD` .. `DEPT-SCM`) |
| **Locations** | Shop Floor Bay specs (`mockData.js`) | `public.locations` | `code` (`LOC-BAY1` .. `LOC-BAY6`) |
| **Roles** | RBAC Reference Specification | `public.roles` | `code` (`ADMIN`, `PLANT_HEAD`, etc.) |
| **Shifts** | `SHIFT_SUMMARY` (`workforceData.js`) | `public.shifts` | `shift_code` (`SHIFT-A`, `SHIFT-B`, `SHIFT-C`) |
| **Employees** | `INITIAL_WORKFORCE_STAFF` (`workforceData.js`) | `public.employees` | `employee_code` (`GPS-EMP-104` .. `GPS-EMP-160`) |
| **Employee Roles** | Staff Role Assignments | `public.employee_roles` | `(employee_id, role_id)` |
| **Customers** | `CUSTOMERS` & `MASTER_CONTACTS` | `public.customers` | `customer_code` (`CUST-01` .. `CUST-10`) |
| **Customer Contacts** | `MASTER_CONTACTS` (`contactsData.js`) | `public.customer_contacts` | `(customer_id, email)` |
| **Suppliers** | `SUPPLIERS` (`mockData.js`) | `public.suppliers` | `supplier_code` (`SUPP-01` .. `SUPP-04`) |
| **Product Categories** | Inventory Category Taxonomy | `public.product_categories` | `code` (`RAW_STEEL`, `BEARINGS`, etc.) |
| **Products** | `INVENTORY_ITEMS` (`mockData.js`) | `public.products` | `sku` (`MAT-18CR-80`, `BRG-HC7008`, etc.) |
| **Warehouses** | Plant Logistics Hubs | `public.warehouses` | `code` (`WH-MAIN`, `WH-CLEAN`, `WH-YARD`) |
| **Stock Balances** | `INVENTORY_ITEMS` stock levels | `public.stock` | `(product_id, warehouse_id, bin_location)` |
| **Spindle Models** | `SPINDLES` specifications | `public.spindle_models` | `model_code` (`GPS-HSK-A63-24K`, etc.) |
| **Production Bays** | `SHOP_BAYS` (`mockData.js`) | `public.production_bays` | `code` (`BAY-1` .. `BAY-6`) |
| **Machines** | Shop Floor Equipment units | `public.machines` | `code` (`CNC-03`, `Studer S33`, etc.) |

---

## 2. Dependency Execution Order

The migration script (`scripts/migrate_master_data.js`) executes in topological foreign-key order:

```text
companies
  ↓
branches
  ↓
departments
  ↓
locations
  ↓
roles
  ↓
shifts
  ↓
employees (authenticated admin session to satisfy trg_prevent_employee_escalation)
  ↓
employee_roles
  ↓
customers
  ↓
customer_contacts
  ↓
suppliers
  ↓
product_categories
  ↓
products (linked to categories and preferred suppliers)
  ↓
warehouses
  ↓
stock (linked to products and warehouses)
  ↓
spindle_models
  ↓
production_bays
  ↓
machines (linked to production bays)
```

---

## 3. Idempotency Implementation

1. **Upsert Semantics**: Every table operation uses explicit `onConflict` clauses matching the schema's unique constraints (e.g. `employee_code`, `customer_code`, `supplier_code`, `sku`, `code`, `(employee_id, role_id)`, `(product_id, warehouse_id, bin_location)`).
2. **Contact Deduplication**: For tables without composite unique constraints (`customer_contacts`), deterministic select-then-upsert by `(customer_id, email)` guarantees zero duplicate creation on subsequent runs.
3. **Identity Preservation**: Existing authentication dev user accounts (`GPS-EMP-100` through `GPS-EMP-108`) have their names and emails strictly preserved, while newly migrated workforce staff have collision-resistant email generation.
4. **Repeated Runs**:
   - First Run: Completed with 0 errors.
   - Second Run: Completed with 0 errors, 0 duplicate records created.

---

## 4. Live Database Verification Results

Executed via:
```bash
node scripts/verify_master_data.js
```

### Record Counts & Comparison Table

| Entity | Source Mock Count | Live Supabase Count | Baseline Diff | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Companies** | 1 | 1 | +0 | **PASS** |
| **Branches** | 1 | 1 | +0 | **PASS** |
| **Departments** | 6 | 6 | +0 | **PASS** |
| **Locations** | 6 | 6 | +0 | **PASS** |
| **Roles** | 9 | 9 | +0 | **PASS** |
| **Shifts** | 3 | 3 | +0 | **PASS** |
| **Employees** | 15 | 22 | +7 (dev accounts) | **PASS** |
| **Employee Roles** | 15 | 15 | +0 | **PASS** |
| **Customers** | 10 | 14 | +4 (schema seeds) | **PASS** |
| **Customer Contacts** | 20 | 23 | +3 (schema seeds) | **PASS** |
| **Suppliers** | 4 | 7 | +3 (schema seeds) | **PASS** |
| **Product Categories** | 6 | 7 | +1 (schema seeds) | **PASS** |
| **Products** | 8 | 11 | +3 (schema seeds) | **PASS** |
| **Warehouses** | 3 | 5 | +2 (schema seeds) | **PASS** |
| **Stock** | 8 | 11 | +3 (schema seeds) | **PASS** |
| **Spindle Models** | 6 | 9 | +3 (schema seeds) | **PASS** |
| **Production Bays** | 6 | 6 | +0 | **PASS** |
| **Machines** | 6 | 8 | +2 (schema seeds) | **PASS** |

### Integrity Assertions

1. **Duplicate Business Keys**: **PASS** (0 duplicate keys found across all master tables).
2. **Foreign Key Integrity**: **PASS** (0 orphan records, all branch, customer, supplier, product, bay, and machine foreign keys verified).
3. **Required Non-Null Fields**: **PASS** (100% compliant with PostgreSQL non-null constraints).
4. **Source Entity Presence**: **PASS** (100% of mock source records present in the live database).

---

## 5. Domain Services Architecture

Created in `src/services/database/`:

1. [`customerService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/customerService.js): `getCustomers`, `getCustomerById`, `createCustomer`, `updateCustomer`, `getCustomerContacts`.
2. [`supplierService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/supplierService.js): `getSuppliers`, `getSupplierById`, `createSupplier`, `updateSupplier`.
3. [`contactService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/contactService.js): `getCustomerContacts`, `getSupplierContacts`, `getContacts`, `getUnifiedDirectory`, `getInternalCcs`.
4. [`inventoryService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/inventoryService.js): `getInventoryItems`, `getCategories`, `getWarehouses`, `getStockLevels`.
5. [`workforceService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/workforceService.js): `getStaffList`, `getStaffById`, `getDepartments`, `getShifts`.
6. [`spindleModelService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/spindleModelService.js): `getSpindleModels`, `getModelByCode`, `getSpindles`.
7. [`manufacturingService.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/manufacturingService.js): `getBays`, `getMachines`, `getBayById`, `getMachineById`.
8. [`index.js`](file:///c:/Users/SAHIL/Downloads/ERP/src/services/database/index.js): Unified service barrel export.

All domain services use the authenticated Supabase client through `baseService.js`. Never is `SUPABASE_SERVICE_ROLE_KEY` used or exposed in frontend/client code.

---

## 6. Connected Frontend Screens

1. **`CustomersScreen.jsx`**:
   - Connected to `customerService.getCustomers()`.
   - Renders live enterprise accounts, industry, GSTIN, and credit terms.
   - Includes full loading spinner, RLS error state with retry, and empty state.
2. **`SuppliersScreen.jsx`**:
   - Connected to `supplierService.getSuppliers()`.
   - Renders live approved vendor records, categories supplied, lead times, and ratings.
3. **`ContactsScreen.jsx`**:
   - Connected to `contactService.getUnifiedDirectory()`.
   - Renders live customer and supplier contacts directory, configured CC groups, and email actions.
4. **`InventoryScreen.jsx`**:
   - Connected to `inventoryService.getInventoryItems()`.
   - Renders live catalogued products, stock balances, reorder levels, and unit costs.
5. **`WorkforceScreen.jsx`**:
   - Connected to `workforceService.getStaffList()`.
   - Renders live precision workforce technicians, department allocations, roles, and shift assignments.
6. **`SpindleRegistryScreen.jsx`**:
   - Connected to `spindleModelService.getSpindles()`.
   - Renders live serialized fleet registry assets with model families, taper standards, and runout tolerances.

**No Mock Fallback**: In accordance with project requirements, screens do NOT fall back silently to mock data on database errors. If Supabase or RLS rejects a query, the screen presents the normalized database notice and allows retry.

---

## 7. Security & Row Level Security (RLS) Verification

Rerun of Phase 4 verification script:
```bash
node scripts/verify_phase4_live.js
```

Results:
* **Application Tables**: 75 / 75
* **RLS Enabled**: 75 / 75 (100%)
* **Active Policies**: 172
* **Helper Functions**: 9 / 9
* **Privilege Escalation Triggers**: 2 / 2
* **Application Roles Verified**: 9 / 9
* **Privilege Escalation Attacks Blocked**: 7 / 7 (100%)
* **Anonymous Access Blocked**: Verified
* **Cross-Module Authorization**: Verified
* **Frontend Key Inspection**: 0 occurrences of `SUPABASE_SERVICE_ROLE_KEY` or `service_role` in `src/`.

---

## 8. Build & Lint Validation

* `npm run lint`: **PASS** (0 errors, 198 existing non-blocking warnings).
* `npm run build`: **PASS** (Client bundle generated in 585ms).
