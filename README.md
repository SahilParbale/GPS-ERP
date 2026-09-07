# GPS Spindle — Industrial Manufacturing ERP Frontend

A high-performance, precision engineering ERP system frontend built for **GPS Spindle Pvt. Ltd.** (Nanded City Unit 1, Pune), manufacturers of precision motorized, belt-driven, and high-frequency electro-spindles.

## Tech Stack

- **Framework**: React 19 + Vite 8
- **Styling**: Pure Vanilla CSS Design System with custom industrial tokens (`src/index.css`)
- **Icons**: Lucide React
- **Architecture**: Frontend-only with domain-accurate mock data (`src/data/mockData.js`)

## Features & Screens

1. **Dashboard**: Live plant operations, 7 KPI metrics, 8-stage manufacturing flow, recent work orders, low-stock alerts, upcoming deliveries, and activity stream.
2. **Production Pipeline & Bays**: 8-stage flow (Material → Machining → Grinding → Assembly → Balancing → Testing → QC → Dispatch), Bay utilization telemetry, and horizontal Kanban board.
3. **Work Order Detail**: Production traveler with operations routing checklist, engineering tolerances, Bill of Materials (BOM), assigned team, and CAD documents.
4. **Spindle Registry**: Searchable and filterable asset directory across spindle families, speed ratings, and customers.
5. **Digital Twin Profile**: Spindle blueprint CAD schematic, 4-hour dynamic run-in thermal curves, vibration spectrum, and QR pass.
6. **Sales & Quotations**: Commercial proposals with line items, 18% GST calculation, and approval workflows.
7. **Materials & Inventory**: Stock control, critical ceramic bearing low-stock indicators, and material movement logs.
8. **Service & Restoration**: 9-stage overhaul lifecycle, failure analysis diagnosis reports, and repair case files.
9. **Quality Control (QC)**: Metrology air gauge inspection parameter table, micron tolerances, and digital QA approval seals.
10. **Customer Accounts**: Tier-1 clients directory (Tata, Bharat Forge, Godrej, Mahindra, L&T, Kirloskar) with installed fleet tracking.
11. **Precision Suppliers**: Approved component vendors, ratings, lead times, and purchase orders.
12. **Invoices & Billing**: Commercial tax invoices, accounts receivables, and GST tracking.
13. **Reports & BI Analytics**: Monthly production throughput SVG bar charts, first-pass yield trends, and failure root causes.
14. **Settings & Configuration**: Plant profile, user role-based permissions, and machine calibration logs.
15. **Collapsible Sidebar**: Icon-rail preview mode with centered rounded pill highlights and instant tooltips.

## Running Locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```
