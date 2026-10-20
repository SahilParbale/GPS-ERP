// GPS Spindle ERP — Master Contacts & Systematic CC Email Directory
// Clean Master Contacts (All Seed Data Deleted)

export const INTERNAL_GPS_CCS = [
  { id: 'billing', label: 'Accounts & Invoicing', email: 'billing@gpsspindle.com', role: 'Finance & Tax Invoices' },
  { id: 'sales_west', label: 'Western Sales Desk', email: 'sales.west@gpsspindle.com', role: 'Quotation Follow-ups' },
  { id: 'sales_head', label: 'Commercial Head', email: 'sales.head@gpsspindle.com', role: 'High-Value Approvals' },
  { id: 'dispatch', label: 'Logistics & Dispatch', email: 'dispatch@gpsspindle.com', role: 'E-Way Bill & Truck LR' },
  { id: 'quality', label: 'Quality & Testing', email: 'quality@gpsspindle.com', role: 'Test Certificates & QAP' },
  { id: 'service', label: 'Service & Spindle Overhaul', email: 'service@gpsspindle.com', role: 'RMA Teardown Reports' }
];

export const PRESET_EMAIL_GROUPS = [
  { id: 'quotation', label: 'Quotation & Commercial Proposals', icon: 'ShoppingBag', desc: 'Pre-fills Procurement Head, Plant Maintenance & Sales Desk' },
  { id: 'invoice', label: 'Tax Invoices & Proforma Invoices', icon: 'FileText', desc: 'Pre-fills Accounts Payable, Commercial Manager & GPS Billing' },
  { id: 'dispatch', label: 'Dispatch & E-Way Bill Intimations', icon: 'Truck', desc: 'Pre-fills Inward Stores, Security Gate, Transport & GPS Dispatch' },
  { id: 'service', label: 'Spindle Service & Overhaul Reports', icon: 'Wrench', desc: 'Pre-fills Maintenance Head, Toolroom & GPS Service Lead' },
  { id: 'quality', label: 'Quality Inspection & Balancing Reports', icon: 'ShieldCheck', desc: 'Pre-fills QC Inward, Metrology Lab & GPS QA' }
];

export const SEED_MASTER_CONTACTS = [];
export const MASTER_CONTACTS = [];
