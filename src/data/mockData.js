// GPS Spindle Industrial ERP - Clean Production Data Layer (Zero Seed Data)
import { isCleanSlateMode } from '../utils/dataMode';

export const PLANT_INFO = {
  name: "GPS Spindle Pvt. Ltd.",
  facility: "Nanded City Unit 1 - Precision Spindle Manufacturing & Tech Center",
  address: "Plot B-12, Nanded City Industrial Complex, Pune, Maharashtra 411041",
  gstin: "27AABCG1492K1Z8",
  iso: "ISO 9001:2015 & ISO 14001 Certified",
  operationalStatus: "Nanded City Unit 1 Operational (Shift A)",
  currentShift: "Shift A (07:00 - 15:30)",
  shiftSuper: "V. R. Kulkarni (Production Head)"
};

export const PRODUCTION_PIPELINE_STAGES = [
  { id: 1, key: "material", name: "Material", desc: "Bar stock inspection & sawing", count: 0 },
  { id: 2, key: "machining", name: "Machining", desc: "CNC Turning & boring", count: 0 },
  { id: 3, key: "grinding", name: "Grinding", desc: "Studer taper & journal grinding", count: 0 },
  { id: 4, key: "assembly", name: "Assembly", desc: "Cleanroom Class 1000 fitting", count: 0 },
  { id: 5, key: "balancing", name: "Balancing", desc: "Schenck dynamic dual-plane G0.4", count: 0 },
  { id: 6, key: "testing", name: "Testing", desc: "4h dynamic run-in & thermal test", count: 0 },
  { id: 7, key: "qc", name: "QC", desc: "Micron air gauging & runout", count: 0 },
  { id: 8, key: "dispatch", name: "Dispatch", desc: "Anti-corrosion pack & shipping", count: 0 },
];

export const SERVICE_PIPELINE_STAGES = [
  { id: 1, key: "complaint", name: "Complaint", desc: "Customer report logging", count: 0 },
  { id: 2, key: "inspection", name: "Inspection", desc: "Incoming runout & vibration audit", count: 0 },
  { id: 3, key: "diagnosis", name: "Diagnosis", desc: "Disassembly & failure analysis", count: 0 },
  { id: 4, key: "estimate", name: "Estimate", desc: "BOM & labor quotation", count: 0 },
  { id: 5, key: "approval", name: "Approval", desc: "Client PO confirmation", count: 0 },
  { id: 6, key: "repair", name: "Repair", desc: "Shaft re-grinding & bearing rebuild", count: 0 },
  { id: 7, key: "testing", name: "Testing", desc: "Dynamic balancing & 6h run-in", count: 0 },
  { id: 8, key: "qc", name: "QC", desc: "Final certificate sign-off", count: 0 },
  { id: 9, key: "dispatch", name: "Dispatch", desc: "Express crated delivery", count: 0 },
];

export const DASHBOARD_METRICS = [
  { id: "active_jobs", label: "Active Jobs", value: "0", trend: "0 in rotation", isUp: true, icon: "Cpu" },
  { id: "in_prod", label: "In Production", value: "0", trend: "Floor idle", isUp: true, icon: "Cog" },
  { id: "pending_qc", label: "Pending QC", value: "0", trend: "All clear", isUp: true, alert: false, icon: "CheckCircle2" },
  { id: "ready_dispatch", label: "Ready Dispatch", value: "0", trend: "No pending pickup", isUp: true, icon: "Truck" },
  { id: "active_service", label: "Active Service", value: "0", trend: "0 active jobs", isUp: true, icon: "Wrench" },
  { id: "low_stock", label: "Low Stock Items", value: "0", trend: "Stock adequate", alert: false, isUp: true, icon: "AlertTriangle" },
  { id: "receivables", label: "Outstanding Rec.", value: "₹0", trend: "₹0 due", isUp: true, icon: "DollarSign" },
];

// Completely Clean Empty Operational Datasets (All Seed Data Deleted)
export const SPINDLES = [];
export const WORK_ORDERS = [];
export const SHOP_BAYS = [];
export const SERVICE_JOBS = [];
export const INVENTORY_ITEMS = [];
export const QUALITY_INSPECTIONS = [];
export const QUOTATIONS = [];
export const CUSTOMERS = [];
export const SUPPLIERS = [];
export const INVOICES = [];
export const RECENT_ACTIVITY = [];
export const UPCOMING_DELIVERIES = [];

export const WORKFORCE_KPIS = [
  { id: "active_workers", label: "Active Technicians", value: "0", sub: "Shift A", isAlert: false },
  { id: "overall_efficiency", label: "Plant Efficiency", value: "0%", sub: "Clean floor", isAlert: false },
  { id: "stations_utilized", label: "Stations Operating", value: "0/6", sub: "0% active", isAlert: false },
  { id: "delayed_ops", label: "Delayed Ops", value: "0", sub: "All clear", isAlert: false },
];

export const WORKFORCE_STAFF = [];
export const DEPARTMENTS_WORKLOAD = [
  { department: "Production", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Assembly", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Quality", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Testing", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Balancing", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Service", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Stores", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" },
  { department: "Engineering", staffCount: 0, activeTasks: 0, completedToday: 0, hoursLogged: "0h", utilization: 0, status: "Available" }
];
export const BAY_ALLOCATIONS = [];
export const WORKFORCE_ALERTS = [];

export const SHIFT_SUMMARY = {
  activeOperators: 0,
  wipSpindles: 0,
  qcSignoffsPending: 0,
  stationsOperational: "0/6"
};

export const PURCHASE_ORDERS = [];
export const PROFORMA_INVOICES = [];
export const E_WAY_BILLS = [];

export const SEED_QUOTATIONS = [];
export const SEED_CUSTOMERS = [];
export const SEED_INVOICES = [];
export const SEED_PROFORMA_INVOICES = [];
