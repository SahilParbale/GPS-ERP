import { 
  PURCHASE_ORDERS, 
  PROFORMA_INVOICES, 
  E_WAY_BILLS, 
  QUOTATIONS, 
  INVOICES,
  WORK_ORDERS,
  SPINDLES,
  INVENTORY_ITEMS,
  CUSTOMERS,
  SUPPLIERS,
  QUALITY_INSPECTIONS,
  SERVICE_JOBS
} from '../data/mockData';
import { 
  Factory, 
  FileText, 
  Receipt, 
  ShoppingCart, 
  Truck, 
  Layers, 
  Package, 
  Building2, 
  ShieldCheck, 
  Wrench, 
  ArrowRight,
  Cpu,
  FileCheck,
  CheckCircle2,
  Users
} from 'lucide-react';

/**
 * Universal Search Service for GPS Precision Spindle ERP
 * Indexes and searches across all software modules:
 * - Work Orders & Jobs (Production, Bays, Stages)
 * - Quotations & Commercial Estimates
 * - Invoices & GST Billing
 * - Proforma Invoices (PI)
 * - Purchase Orders (PO) & Vendors
 * - E-Way Bills & Dispatch Logistics
 * - Spindle Registry & Fleet Digital Twins
 * - Materials, Spares & Tooling Inventory
 * - Customer Organizations & Accounts
 * - Precision Suppliers & Vendors
 * - Quality & Metrology Lab Inspections
 * - Service, Overhaul & Warranty Tickets
 * - Navigation Shortcuts & System Actions
 */

// Category Metadata Configuration
export const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All Modules', icon: Layers },
  { id: 'work-orders', label: 'Work Orders', icon: Factory, color: '#4f46e5', bg: '#eef2ff' },
  { id: 'quotations', label: 'Quotations', icon: FileText, color: '#7c3aed', bg: '#f5f3ff' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, color: '#059669', bg: '#ecfdf5' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, color: '#7A1F3D', bg: '#F5E8ED' },
  { id: 'inventory', label: 'Inventory & Spares', icon: Package, color: '#d97706', bg: '#fffbeb' },
  { id: 'spindles', label: 'Spindle Fleet', icon: Cpu, color: '#0284c7', bg: '#f0f9ff' },
  { id: 'customers', label: 'Customers', icon: Building2, color: '#0891b2', bg: '#ecfeff' },
  { id: 'suppliers', label: 'Suppliers', icon: Truck, color: '#475569', bg: '#f8fafc' },
  { id: 'quality', label: 'Quality / QC', icon: ShieldCheck, color: '#0d9488', bg: '#f0fdfa' },
  { id: 'service', label: 'Service & Repair', icon: Wrench, color: '#ea580c', bg: '#fff7ed' },
  { id: 'actions', label: 'Quick Actions', icon: ArrowRight, color: '#7A1F3D', bg: '#F5E8ED' }
];

export const SYSTEM_ACTIONS = [
  {
    id: 'act-dash',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Executive Dashboard',
    title: 'Manufacturing Dashboard',
    subtitle: 'Shift A live metrics, cell throughput, KPI overview & delivery timeline',
    targetScreen: 'dashboard',
    badgeColor: '#7A1F3D',
    icon: Layers,
    keywords: ['dashboard', 'home', 'kpi', 'metrics', 'shift', 'overview']
  },
  {
    id: 'act-wo',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Production Board',
    title: 'Shop Floor Production & Travelers',
    subtitle: 'Active CNC turning, cylindrical grinding, cleanroom assembly & balancing bays',
    targetScreen: 'production',
    badgeColor: '#4f46e5',
    icon: Factory,
    keywords: ['production', 'traveler', 'bay', 'machining', 'grinding', 'assembly', 'balancing', 'create wo']
  },
  {
    id: 'act-sales',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Sales & Quotations',
    title: 'Precision Quotations & Estimates',
    subtitle: 'Linamar, TASL, Bharat Forge customer proposals, GST breakdown & WO launch',
    targetScreen: 'sales',
    badgeColor: '#7c3aed',
    icon: FileText,
    keywords: ['sales', 'quotation', 'estimate', 'proposal', 'commercial', 'new quote', 'linamar']
  },
  {
    id: 'act-po',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Purchase Orders',
    title: 'Purchase Orders & Procurement',
    subtitle: 'Schaeffler bearings, OTT-Jakob drawbars, alloy round bar material orders',
    targetScreen: 'purchase-orders',
    badgeColor: '#7A1F3D',
    icon: ShoppingCart,
    keywords: ['purchase', 'po', 'procurement', 'vendor', 'schaeffler', 'material', 'raise po']
  },
  {
    id: 'act-inv',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Tax Invoices',
    title: 'GST Tax Invoices & Billing',
    subtitle: 'Customer tax invoices, payment reconciliation, receivables & credit terms',
    targetScreen: 'invoices',
    badgeColor: '#059669',
    icon: Receipt,
    keywords: ['invoice', 'billing', 'tax', 'gst', 'payment', 'receivables']
  },
  {
    id: 'act-pi',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Proforma Invoices',
    title: 'Proforma Invoices (PI)',
    subtitle: 'Advance payment commercial proforma invoices and dispatch documentation',
    targetScreen: 'proforma-invoices',
    badgeColor: '#2563eb',
    icon: Receipt,
    keywords: ['proforma', 'pi', 'advance', 'commercial']
  },
  {
    id: 'act-ewb',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'E-Way Bills',
    title: 'E-Way Bills & Dispatch Logistics',
    subtitle: 'NIC portal generation, vehicle movement, transporter assignment & gatepass',
    targetScreen: 'e-way-bills',
    badgeColor: '#d97706',
    icon: Truck,
    keywords: ['e-way', 'ewb', 'dispatch', 'logistics', 'vehicle', 'transport', 'shipping']
  },
  {
    id: 'act-stock',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Stock Control',
    title: 'Materials & Spares Inventory',
    subtitle: 'FAG bearings, drawbar collets, stators, viton seals & alloy steel stock',
    targetScreen: 'inventory',
    badgeColor: '#d97706',
    icon: Package,
    keywords: ['inventory', 'stock', 'spares', 'bearings', 'materials', 'reorder']
  },
  {
    id: 'act-spindles',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Digital Twin Registry',
    title: 'Spindle Fleet Digital Twins',
    subtitle: 'Telemetry, runout history, ISO balancing grade, bearing vibration RMS & specs',
    targetScreen: 'spindles',
    badgeColor: '#0284c7',
    icon: Cpu,
    keywords: ['spindles', 'digital twin', 'fleet', 'registry', 'telemetry', 'hsk', 'bt40']
  },
  {
    id: 'act-qc',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Quality Metrology',
    title: 'Quality Control & Metrology Lab',
    subtitle: 'Sub-micron air gauge runout, dynamic Schenck balancing G0.4 & test certificates',
    targetScreen: 'quality',
    badgeColor: '#0d9488',
    icon: ShieldCheck,
    keywords: ['qc', 'quality', 'inspection', 'metrology', 'runout', 'balancing', 'air gauge']
  },
  {
    id: 'act-service',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Service Center',
    title: 'Spindle Overhaul & Service Center',
    subtitle: 'Failure diagnostics, bearing rebuilds, shaft regrinding & warranty repair',
    targetScreen: 'service',
    badgeColor: '#ea580c',
    icon: Wrench,
    keywords: ['service', 'repair', 'overhaul', 'warranty', 'diagnostics', 'rebuild']
  },
  {
    id: 'act-cust',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Customer Directory',
    title: 'Client Organizations & Accounts',
    subtitle: 'Linamar, Tata Advanced Systems, Bharat Forge, Godrej Aerospace accounts',
    targetScreen: 'customers',
    badgeColor: '#0891b2',
    icon: Building2,
    keywords: ['customers', 'clients', 'accounts', 'directory']
  },
  {
    id: 'act-supp',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Vendors & Suppliers',
    title: 'Precision Tooling & Vendor Register',
    subtitle: 'Schaeffler, OTT-Jakob, Heidenhain, Bharat Special Steel partner directory',
    targetScreen: 'suppliers',
    badgeColor: '#475569',
    icon: Truck,
    keywords: ['suppliers', 'vendors', 'partners', 'procurement']
  },
  {
    id: 'act-rep',
    docType: 'Quick Action',
    category: 'actions',
    docNumber: 'Plant Analytics',
    title: 'Shift Analytics & PDF Reports',
    subtitle: 'OEE, bay cycle times, spindle delivery rate & executive shift export',
    targetScreen: 'reports',
    badgeColor: '#7A1F3D',
    icon: FileCheck,
    keywords: ['reports', 'analytics', 'pdf', 'shift report', 'oee', 'metrics']
  }
];

export const universalSearchService = {
  /**
   * Search all software modules for the given query.
   * @param {string} query - The search text
   * @param {string} [activeCategory='all'] - Optional category filter
   * @param {number} [limit=20] - Maximum results
   */
  search(query = '', activeCategory = 'all', limit = 25) {
    const q = (query || '').trim().toLowerCase();
    
    // Read any dynamically launched Work Orders from localStorage
    let launchedWos = {};
    try {
      const cached = localStorage.getItem('gps_quotation_work_orders');
      if (cached) launchedWos = JSON.parse(cached);
    } catch (e) {}

    // Gather all searchable items across the ERP
    const allItems = [];

    // 1. Work Orders (mock + dynamically launched)
    WORK_ORDERS.forEach(wo => {
      allItems.push({
        id: wo.id,
        category: 'work-orders',
        docType: 'Work Order',
        docNumber: wo.id,
        title: `${wo.id} • ${wo.spindleModel}`,
        subtitle: `${wo.customer} • Serial: ${wo.spindleSerial} • ${wo.shopBay}`,
        metaPrimary: wo.value || '₹8,45,000',
        metaSecondary: wo.status,
        status: wo.status,
        targetScreen: 'production',
        icon: Factory,
        badgeColor: '#4f46e5',
        badgeBg: '#eef2ff',
        searchText: `${wo.id} ${wo.spindleModel} ${wo.spindleSerial} ${wo.customer} ${wo.currentOperation} ${wo.shopBay} ${wo.assignedOperator} ${wo.status} ${wo.priority}`.toLowerCase()
      });
    });

    Object.values(launchedWos).forEach(lwo => {
      if (lwo && lwo.woNo && !allItems.some(it => it.id === lwo.woNo)) {
        allItems.push({
          id: lwo.woNo,
          category: 'work-orders',
          docType: 'Work Order',
          docNumber: lwo.woNo,
          title: `${lwo.woNo} • ${lwo.model || 'GPS-HSK-A63-24K'}`,
          subtitle: `${lwo.customer} • Serial: ${lwo.serial || '—'} • Routed to Shop Floor Bay 1`,
          metaPrimary: 'In Production',
          metaSecondary: 'Bay 1',
          status: 'In Production',
          targetScreen: 'production',
          icon: Factory,
          badgeColor: '#059669',
          badgeBg: '#ecfdf5',
          searchText: `${lwo.woNo} ${lwo.model || ''} ${lwo.serial || ''} ${lwo.customer || ''} in production bay 1 quotation launched`.toLowerCase()
        });
      }
    });

    // 2. Quotations & Commercial Estimates
    QUOTATIONS.forEach(qt => {
      const scopeStr = Array.isArray(qt.scopeOfWork) ? qt.scopeOfWork.join(' ') : (qt.scopeOfWork || '');
      allItems.push({
        id: qt.id,
        category: 'quotations',
        docType: 'Quotation',
        docNumber: qt.estimateNo || qt.id,
        title: `${qt.estimateNo || qt.id} • ${qt.customer}`,
        subtitle: `Serial: ${qt.spindleSerial || 'N/A'} • Valid until: ${qt.validUntil || '30 days'}`,
        metaPrimary: qt.totalAmount ? `₹${Number(qt.totalAmount).toLocaleString('en-IN')}` : '-',
        metaSecondary: qt.status,
        status: qt.status,
        targetScreen: 'sales',
        icon: FileText,
        badgeColor: '#7c3aed',
        badgeBg: '#f5f3ff',
        searchText: `${qt.id} ${qt.estimateNo || ''} ${qt.customer} ${qt.spindleSerial || ''} ${qt.status} ${scopeStr} ${qt.contactPerson || ''}`.toLowerCase()
      });
    });

    // 3. Invoices & Billing
    INVOICES.forEach(inv => {
      allItems.push({
        id: inv.id,
        category: 'invoices',
        docType: 'Tax Invoice',
        docNumber: inv.id,
        title: `${inv.id} • ${inv.customer}`,
        subtitle: `Ref Order: ${inv.refOrder || 'WO'} • GSTIN: ${inv.gstin || '27AABCG1492K1Z8'}`,
        metaPrimary: inv.amount,
        metaSecondary: inv.status,
        status: inv.status,
        targetScreen: 'invoices',
        icon: Receipt,
        badgeColor: '#059669',
        badgeBg: '#ecfdf5',
        searchText: `${inv.id} ${inv.customer} ${inv.refOrder || ''} ${inv.gstin || ''} ${inv.status} ${inv.amount}`.toLowerCase()
      });
    });

    // 4. Proforma Invoices
    PROFORMA_INVOICES.forEach(pi => {
      allItems.push({
        id: pi.id,
        category: 'invoices',
        docType: 'Proforma Invoice',
        docNumber: pi.piNumber,
        title: `${pi.piNumber} • ${pi.customer}`,
        subtitle: `Sales Order: ${pi.salesOrder || 'SO'} • Date: ${pi.date || 'Active'}`,
        metaPrimary: pi.formattedTotal || `₹${Number(pi.totalAmount || 0).toLocaleString('en-IN')}`,
        metaSecondary: pi.status,
        status: pi.status,
        targetScreen: 'proforma-invoices',
        icon: Receipt,
        badgeColor: '#2563eb',
        badgeBg: '#eff6ff',
        searchText: `${pi.piNumber} ${pi.customer} ${pi.salesOrder || ''} ${pi.status}`.toLowerCase()
      });
    });

    // 5. Purchase Orders
    PURCHASE_ORDERS.forEach(po => {
      const itemsStr = (po.items || []).map(it => it.item || '').join(' ');
      allItems.push({
        id: po.id,
        category: 'purchase-orders',
        docType: 'Purchase Order',
        docNumber: po.poNumber,
        title: `${po.poNumber} • ${po.supplier}`,
        subtitle: `Items: ${itemsStr || 'Material procurement'} • Status: ${po.status}`,
        metaPrimary: po.formattedTotal || `₹${Number(po.totalAmount || 0).toLocaleString('en-IN')}`,
        metaSecondary: po.status,
        status: po.status,
        targetScreen: 'purchase-orders',
        icon: ShoppingCart,
        badgeColor: '#7A1F3D',
        badgeBg: '#F5E8ED',
        searchText: `${po.poNumber} ${po.supplier} ${itemsStr} ${po.status}`.toLowerCase()
      });
    });

    // 6. E-Way Bills
    E_WAY_BILLS.forEach(ewb => {
      allItems.push({
        id: ewb.id,
        category: 'purchase-orders',
        docType: 'E-Way Bill',
        docNumber: ewb.ewbNumber,
        title: `${ewb.ewbNumber} • ${ewb.customer}`,
        subtitle: `Vehicle: ${ewb.vehicle || 'MH-12-RN-4821'} • Invoice: ${ewb.invoice || 'INV'}`,
        metaPrimary: ewb.formattedTotal || `₹${Number(ewb.totalInvoiceValue || 0).toLocaleString('en-IN')}`,
        metaSecondary: ewb.status,
        status: ewb.status,
        targetScreen: 'e-way-bills',
        icon: Truck,
        badgeColor: '#d97706',
        badgeBg: '#fffbeb',
        searchText: `${ewb.ewbNumber} ${ewb.customer} ${ewb.vehicle || ''} ${ewb.invoice || ''} ${ewb.transporter || ''}`.toLowerCase()
      });
    });

    // 7. Spindle Registry / Digital Twins
    SPINDLES.forEach(sp => {
      allItems.push({
        id: sp.serialNumber,
        category: 'spindles',
        docType: 'Spindle Twin',
        docNumber: sp.serialNumber,
        title: `${sp.serialNumber} • ${sp.model}`,
        subtitle: `${sp.customer} • ${sp.type} • Taper: ${sp.interface}`,
        metaPrimary: sp.rpm,
        metaSecondary: sp.status,
        status: sp.status,
        targetScreen: 'spindles',
        icon: Cpu,
        badgeColor: '#0284c7',
        badgeBg: '#f0f9ff',
        searchText: `${sp.serialNumber} ${sp.model} ${sp.customer} ${sp.type} ${sp.interface} ${sp.rpm} ${sp.status} ${sp.stage} ${sp.qrCode || ''}`.toLowerCase()
      });
    });

    // 8. Materials & Inventory Spares
    INVENTORY_ITEMS.forEach(it => {
      allItems.push({
        id: it.id,
        category: 'inventory',
        docType: 'Inventory Item',
        docNumber: it.sku || it.id,
        title: `${it.sku || it.id} • ${it.name}`,
        subtitle: `Category: ${it.category} • Location: ${it.location} • Supplier: ${it.supplier}`,
        metaPrimary: `${it.availableQty} ${it.unit}`,
        metaSecondary: it.status,
        status: it.status,
        targetScreen: 'inventory',
        icon: Package,
        badgeColor: '#d97706',
        badgeBg: '#fffbeb',
        searchText: `${it.id} ${it.sku} ${it.name} ${it.category} ${it.location} ${it.supplier} ${it.status}`.toLowerCase()
      });
    });

    // 9. Customer Organizations
    CUSTOMERS.forEach(c => {
      allItems.push({
        id: c.id,
        category: 'customers',
        docType: 'Customer',
        docNumber: c.id,
        title: c.name,
        subtitle: `${c.industry || 'Precision Machining'} • Location: ${c.location} • Contact: ${c.contactName}`,
        metaPrimary: c.totalBusiness || 'Tier 1',
        metaSecondary: c.rating || 'Active',
        status: c.rating,
        targetScreen: 'customers',
        icon: Building2,
        badgeColor: '#0891b2',
        badgeBg: '#ecfeff',
        searchText: `${c.id} ${c.name} ${c.industry || ''} ${c.location || ''} ${c.contactName || ''} ${c.gstin || ''} ${c.contactEmail || ''}`.toLowerCase()
      });
    });

    // 10. Precision Vendors & Suppliers
    SUPPLIERS.forEach(s => {
      allItems.push({
        id: s.id,
        category: 'suppliers',
        docType: 'Supplier',
        docNumber: s.id,
        title: s.name,
        subtitle: `Category: ${s.category} • Rating: ${s.rating} • Location: ${s.location}`,
        metaPrimary: s.leadTime || 'Standard',
        metaSecondary: s.rating,
        status: s.rating,
        targetScreen: 'suppliers',
        icon: Truck,
        badgeColor: '#475569',
        badgeBg: '#f8fafc',
        searchText: `${s.id} ${s.name} ${s.category} ${s.location} ${s.contact || ''} ${s.activePo || ''}`.toLowerCase()
      });
    });

    // 11. Quality Inspections
    QUALITY_INSPECTIONS.forEach(qc => {
      allItems.push({
        id: qc.id,
        category: 'quality',
        docType: 'QC Metrology',
        docNumber: qc.id,
        title: `${qc.id} • ${qc.spindleModel} (${qc.spindleSerial})`,
        subtitle: `Customer: ${qc.customer} • Inspector: ${qc.inspector} • ${qc.notes ? qc.notes.substring(0, 60) + '...' : ''}`,
        metaPrimary: qc.overallResult,
        metaSecondary: qc.approvalStatus,
        status: qc.overallResult,
        targetScreen: 'quality',
        icon: ShieldCheck,
        badgeColor: '#0d9488',
        badgeBg: '#f0fdfa',
        searchText: `${qc.id} ${qc.workOrder || ''} ${qc.spindleSerial} ${qc.spindleModel} ${qc.customer} ${qc.inspector} ${qc.overallResult} ${qc.notes || ''}`.toLowerCase()
      });
    });

    // 12. Service Jobs
    SERVICE_JOBS.forEach(sr => {
      allItems.push({
        id: sr.id,
        category: 'service',
        docType: 'Service Ticket',
        docNumber: sr.id,
        title: `${sr.id} • ${sr.spindleModel} (${sr.spindleSerial})`,
        subtitle: `${sr.customer} • Stage: ${sr.currentStage} • Tech: ${sr.technician}`,
        metaPrimary: sr.estimatedCost || 'Under Diagnosis',
        metaSecondary: sr.status,
        status: sr.status,
        targetScreen: 'service',
        icon: Wrench,
        badgeColor: '#ea580c',
        badgeBg: '#fff7ed',
        searchText: `${sr.id} ${sr.spindleSerial} ${sr.spindleModel} ${sr.customer} ${sr.complaint || ''} ${sr.technician || ''} ${sr.status}`.toLowerCase()
      });
    });

    // 13. System Navigation Actions
    SYSTEM_ACTIONS.forEach(act => {
      allItems.push({
        ...act,
        searchText: `${act.docNumber} ${act.title} ${act.subtitle} ${(act.keywords || []).join(' ')}`.toLowerCase()
      });
    });

    // If query is empty, return suggested top items for instant access
    if (!q) {
      const suggestions = [
        ...allItems.filter(it => it.category === 'actions').slice(0, 3),
        ...allItems.filter(it => it.category === 'work-orders').slice(0, 3),
        ...allItems.filter(it => it.category === 'quotations').slice(0, 2),
        ...allItems.filter(it => it.category === 'inventory' && it.status.includes('Low')).slice(0, 2)
      ];

      return {
        results: suggestions,
        totalCount: suggestions.length,
        isSuggestion: true,
        categoryCounts: {}
      };
    }

    // Filter and score results based on query
    const scoredResults = [];

    allItems.forEach(item => {
      // Category filter check
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return;
      }

      let score = 0;
      const docNum = (item.docNumber || '').toLowerCase();
      const title = (item.title || '').toLowerCase();
      const text = item.searchText || '';

      if (docNum === q || item.id.toLowerCase() === q) {
        score += 200; // Exact match
      } else if (docNum.startsWith(q)) {
        score += 120;
      } else if (docNum.includes(q)) {
        score += 80;
      }

      if (title.startsWith(q)) {
        score += 60;
      } else if (title.includes(q)) {
        score += 40;
      }

      if (text.includes(q)) {
        score += 20;
      }

      // Check individual words
      const words = q.split(' ').filter(Boolean);
      let matchAllWords = true;
      words.forEach(w => {
        if (text.includes(w)) {
          score += 15;
        } else {
          matchAllWords = false;
        }
      });

      if (matchAllWords && words.length > 1) {
        score += 30;
      }

      if (score > 0) {
        scoredResults.push({ ...item, searchScore: score });
      }
    });

    // Sort by relevance score descending
    scoredResults.sort((a, b) => b.searchScore - a.searchScore);

    // Compute category counts for pills
    const categoryCounts = {};
    allItems.forEach(item => {
      if (item.searchText && item.searchText.includes(q)) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    });

    return {
      results: scoredResults.slice(0, limit),
      totalCount: scoredResults.length,
      isSuggestion: false,
      categoryCounts
    };
  }
};
