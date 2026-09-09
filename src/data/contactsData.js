// GPS Spindle ERP — Master Contacts & Systematic CC Email Directory

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

export const MASTER_CONTACTS = [
  {
    id: 'CNT-001',
    companyId: 'CUST-01',
    companyName: 'Tata Advanced Systems Ltd',
    category: 'Customer',
    tier: 'Tier 1 - Aerospace & Defense',
    location: 'Chakan Industrial Zone, Pune',
    gstin: '27AABCT2934K1Z4',
    primaryContact: {
      name: 'Tanmay Sharma',
      designation: 'DGM - Procurement & Capital Equipment',
      department: 'Procurement',
      email: 'tanmay@tataadvanced.com',
      phone: '+91 20 6733 8114',
      altPhone: '+91 98230 45120',
      isPrimary: true
    },
    secondaryContact: {
      name: 'Rajendra Deshmukh',
      designation: 'Plant Head - Aerospace Machining',
      department: 'Plant Operations',
      email: 'r.deshmukh@tataadvanced.com',
      phone: '+91 20 6733 8000'
    },
    ccList: [
      { id: 'c1', label: 'Accounts & Billing', email: 'accounts.pune@tataadvanced.com', dept: 'Accounts', mandatoryFor: ['invoice', 'proforma'] },
      { id: 'c2', label: 'Purchase Central Desk', email: 'purchase@tataadvanced.com', dept: 'Procurement', mandatoryFor: ['quotation', 'invoice'] },
      { id: 'c3', label: 'Plant Maintenance Lead', email: 'plant.head@tataadvanced.com', dept: 'Plant', mandatoryFor: ['service', 'dispatch'] },
      { id: 'c4', label: 'Incoming QC Metrology', email: 'qc.incoming@tataadvanced.com', dept: 'Quality', mandatoryFor: ['quality', 'service'] },
      { id: 'c5', label: 'Inward Receiving Stores', email: 'stores.chakan@tataadvanced.com', dept: 'Stores', mandatoryFor: ['dispatch'] },
      { id: 'c6', label: 'GPS Internal Sales CC', email: 'sales.west@gpsspindle.com', dept: 'Internal', mandatoryFor: ['quotation'] },
      { id: 'c7', label: 'GPS Internal Accounts CC', email: 'billing@gpsspindle.com', dept: 'Internal', mandatoryFor: ['invoice'] }
    ],
    notes: 'Require PO and Quotation PDF copy sent simultaneously to accounts.pune and purchase.'
  },
  {
    id: 'CNT-002',
    companyId: 'CUST-02',
    companyName: 'Bharat Forge Ltd',
    category: 'Customer',
    tier: 'Tier 1 - Heavy Forging & Automotive',
    location: 'Mundhwa & Chakan, Pune',
    gstin: '27AAACB3842F1Z1',
    primaryContact: {
      name: 'Sunil Kadam',
      designation: 'DGM - Maintenance, Tooling & Spindles',
      department: 'Tooling & Maintenance',
      email: 'sunil.kadam@bharatforge.com',
      phone: '+91 20 6704 2777',
      altPhone: '+91 94220 89112',
      isPrimary: true
    },
    secondaryContact: {
      name: 'Rajesh Kulkarni',
      designation: 'Commercial Manager - Sourcing',
      department: 'Procurement',
      email: 'procurement@bharatforge.com',
      phone: '+91 20 6704 2800'
    },
    ccList: [
      { id: 'c11', label: 'Finance & Accounts', email: 'finance@bharatforge.com', dept: 'Accounts', mandatoryFor: ['invoice'] },
      { id: 'c12', label: 'Chakan Plant Commercial', email: 'procurement@bharatforge.com', dept: 'Procurement', mandatoryFor: ['quotation', 'proforma'] },
      { id: 'c13', label: 'Toolroom Engineering', email: 'toolroom.head@bharatforge.com', dept: 'Plant', mandatoryFor: ['service', 'quality'] },
      { id: 'c14', label: 'Quality Receiving Dock', email: 'quality.inward@bharatforge.com', dept: 'Quality', mandatoryFor: ['quality'] },
      { id: 'c15', label: 'Main Security Gate & Stores', email: 'stores.mundhwa@bharatforge.com', dept: 'Stores', mandatoryFor: ['dispatch'] },
      { id: 'c16', label: 'GPS Internal Sales CC', email: 'sales.west@gpsspindle.com', dept: 'Internal', mandatoryFor: ['quotation'] }
    ],
    notes: 'Always include E-Way Bill PDF and vehicle number on dispatch intimation to stores.mundhwa.'
  },
  {
    id: 'CNT-003',
    companyId: 'CUST-03',
    companyName: 'Godrej & Boyce Aerospace',
    category: 'Customer',
    tier: 'Tier 1 - Space Propulsion & Turbomachinery',
    location: 'Vikhroli, Mumbai',
    gstin: '27AAACG0821M1Z8',
    primaryContact: {
      name: 'Anita Saxena',
      designation: 'Lead Engineer - Aerospace Tooling & Drives',
      department: 'Engineering',
      email: 'anita.s@godrej.com',
      phone: '+91 22 6796 5656',
      altPhone: '+91 98201 34990',
      isPrimary: true
    },
    secondaryContact: {
      name: 'V. Ramanathan',
      designation: 'Senior Purchase Officer',
      department: 'Procurement',
      email: 'maintenance@godrejaerospace.com',
      phone: '+91 22 6796 5800'
    },
    ccList: [
      { id: 'c21', label: 'Aerospace Accounts Dept', email: 'finance@godrej.com', dept: 'Accounts', mandatoryFor: ['invoice'] },
      { id: 'c22', label: 'Aerospace Central Maintenance', email: 'maintenance@godrejaerospace.com', dept: 'Plant', mandatoryFor: ['service', 'quotation'] },
      { id: 'c23', label: 'Precision QA Metrology', email: 'space.quality@godrej.com', dept: 'Quality', mandatoryFor: ['quality'] },
      { id: 'c24', label: 'Vikhroli Inward Gate', email: 'stores.vikhroli@godrej.com', dept: 'Stores', mandatoryFor: ['dispatch'] },
      { id: 'c25', label: 'GPS Billing CC', email: 'billing@gpsspindle.com', dept: 'Internal', mandatoryFor: ['invoice'] }
    ],
    notes: 'All quotes require DIN 69893 runout certificate commitment specified in the quote.'
  },
  {
    id: 'CNT-004',
    companyId: 'CUST-04',
    companyName: 'Mahindra Heavy Engines Ltd',
    category: 'Customer',
    tier: 'Tier 1 - Automotive Powertrain',
    location: 'Chakan Phase II, Pune',
    gstin: '27AAACM1294P1Z2',
    primaryContact: {
      name: 'Praveen Shinde',
      designation: 'Head - Engine Block & Crankshaft Line',
      department: 'Plant Operations',
      email: 'p.shinde@mahindra.com',
      phone: '+91 2135 66 5000',
      altPhone: '+91 98505 12040',
      isPrimary: true
    },
    secondaryContact: {
      name: 'Amol Deshpande',
      designation: 'Senior Buyer - Machinery & Spares',
      department: 'Procurement',
      email: 'projects@mahindra.com',
      phone: '+91 2135 66 5210'
    },
    ccList: [
      { id: 'c31', label: 'Accounts Payable Team', email: 'accounts@mahindra.com', dept: 'Accounts', mandatoryFor: ['invoice', 'proforma'] },
      { id: 'c32', label: 'Projects & Capex Sourcing', email: 'projects@mahindra.com', dept: 'Procurement', mandatoryFor: ['quotation'] },
      { id: 'c33', label: 'Tooling & Fixture Crib', email: 'tooling.lead@mahindra.com', dept: 'Plant', mandatoryFor: ['service'] },
      { id: 'c34', label: 'Engine Plant Gate 3 Inward', email: 'stores.engine@mahindra.com', dept: 'Stores', mandatoryFor: ['dispatch'] },
      { id: 'c35', label: 'GPS Western Sales', email: 'sales.west@gpsspindle.com', dept: 'Internal', mandatoryFor: ['quotation'] }
    ],
    notes: 'E-Way bill number must match delivery challan line-by-line.'
  },
  {
    id: 'CNT-005',
    companyId: 'CUST-05',
    companyName: 'Larsen & Toubro Precision Engineering',
    category: 'Customer',
    tier: 'Tier 2 - Nuclear & Defense Machinery',
    location: 'Coimbatore, Tamil Nadu',
    gstin: '33AABCL3921J1Z3',
    primaryContact: {
      name: 'K. Subramanian',
      designation: 'Chief Engineer - Machine Tool Maintenance',
      department: 'Plant Maintenance',
      email: 'k.subramanian@larsentoubro.com',
      phone: '+91 422 220 5000',
      altPhone: '+91 94430 78210',
      isPrimary: true
    },
    secondaryContact: {
      name: 'R. Balakrishnan',
      designation: 'Purchase Officer - Mechanical Spares',
      department: 'Procurement',
      email: 'purchase.cbe@larsentoubro.com',
      phone: '+91 422 220 5230'
    },
    ccList: [
      { id: 'c41', label: 'Accounts Payable South', email: 'accounts.south@larsentoubro.com', dept: 'Accounts', mandatoryFor: ['invoice'] },
      { id: 'c42', label: 'Coimbatore Sourcing Desk', email: 'purchase.cbe@larsentoubro.com', dept: 'Procurement', mandatoryFor: ['quotation', 'proforma'] },
      { id: 'c43', label: 'Defense Quality Assurance (DQA)', email: 'qa.aerospace@larsentoubro.com', dept: 'Quality', mandatoryFor: ['quality'] },
      { id: 'c44', label: 'Inward Material Inspection', email: 'stores.cbe@larsentoubro.com', dept: 'Stores', mandatoryFor: ['dispatch'] }
    ],
    notes: 'Payment terms net 60 days. Invoices require original signed DC copy.'
  },
  {
    id: 'CNT-006',
    companyId: 'CUST-06',
    companyName: 'Kirloskar Oil Engines Ltd',
    category: 'Customer',
    tier: 'Tier 1 - Power Gensets & Marine Engines',
    location: 'Khadki, Pune',
    gstin: '27AAACK0194Q1Z6',
    primaryContact: {
      name: 'Ashok Rao',
      designation: 'Sr. Manager - CNC Operations & Tooling',
      department: 'Plant Operations',
      email: 'ashok.rao@kirloskar.com',
      phone: '+91 20 2581 0341',
      altPhone: '+91 98224 55900',
      isPrimary: true
    },
    secondaryContact: {
      name: 'Mahesh Jadhav',
      designation: 'Manager - Sourcing & Contracts',
      department: 'Procurement',
      email: 'procurement@kirloskar.com',
      phone: '+91 20 2581 0490'
    },
    ccList: [
      { id: 'c51', label: 'Khadki Accounts Team', email: 'accounts.khadki@kirloskar.com', dept: 'Accounts', mandatoryFor: ['invoice'] },
      { id: 'c52', label: 'Direct Sourcing Team', email: 'procurement@kirloskar.com', dept: 'Procurement', mandatoryFor: ['quotation'] },
      { id: 'c53', label: 'Mechanical Maintenance Cell', email: 'maintenance.koel@kirloskar.com', dept: 'Plant', mandatoryFor: ['service'] },
      { id: 'c54', label: 'Central Inward Receiving', email: 'inward.gate2@kirloskar.com', dept: 'Stores', mandatoryFor: ['dispatch'] }
    ],
    notes: 'Urgent spindle repair quotes must copy maintenance.koel immediately.'
  },
  {
    id: 'CNT-007',
    companyId: 'CUST-07',
    companyName: 'Hindustan Aeronautics Ltd (HAL)',
    category: 'Customer',
    tier: 'Tier 1 - Defense Aerospace PSU',
    location: 'Vimanapura, Bangalore',
    gstin: '29AAACH1829L1Z5',
    primaryContact: {
      name: 'V. R. Murthy',
      designation: 'Chief Manager - Aircraft Tooling Division',
      department: 'Aircraft Tooling',
      email: 'vr.murthy@hal-india.co.in',
      phone: '+91 80 2231 4000',
      altPhone: '+91 94480 11982',
      isPrimary: true
    },
    secondaryContact: {
      name: 'S. K. Nambiar',
      designation: 'Materials Manager',
      department: 'Procurement',
      email: 'aircraft.spares@hal-india.co.in',
      phone: '+91 80 2231 4450'
    },
    ccList: [
      { id: 'c61', label: 'Aircraft Spares Finance', email: 'finance.aerospace@hal-india.co.in', dept: 'Accounts', mandatoryFor: ['invoice'] },
      { id: 'c62', label: 'Defense Quality Assurance (DQA)', email: 'dqa.defense@hal-india.co.in', dept: 'Quality', mandatoryFor: ['quality'] },
      { id: 'c63', label: 'HAL Receiving Stores', email: 'stores.vimanapura@hal-india.co.in', dept: 'Stores', mandatoryFor: ['dispatch'] },
      { id: 'c64', label: 'GPS Commercial Head', email: 'sales.head@gpsspindle.com', dept: 'Internal', mandatoryFor: ['quotation', 'invoice'] }
    ],
    notes: 'Defense PSU compliance requires quotation validity minimum 90 days.'
  },
  {
    id: 'CNT-008',
    companyId: 'CUST-08',
    companyName: 'Lakshmi Machine Works (LMW)',
    category: 'Customer',
    tier: 'Tier 1 - CNC Machine Tool OEM',
    location: 'Periyanaickenpalayam, Coimbatore',
    gstin: '33AAACL2819K1Z4',
    primaryContact: {
      name: 'S. Ramanathan',
      designation: 'DGM - Machine Tool Division',
      department: 'Machine Tool Engineering',
      email: 's.ramanathan@lmw.co.in',
      phone: '+91 422 269 2371',
      altPhone: '+91 98422 66012',
      isPrimary: true
    },
    secondaryContact: {
      name: 'G. Chandrasekhar',
      designation: 'Head - OEM Vendor Sourcing',
      department: 'Procurement',
      email: 'mtd.purchase@lmw.co.in',
      phone: '+91 422 269 2500'
    },
    ccList: [
      { id: 'c71', label: 'MTD Accounts Payable', email: 'accounts.coimbatore@lmw.co.in', dept: 'Accounts', mandatoryFor: ['invoice'] },
      { id: 'c72', label: 'OEM Sourcing Desk', email: 'mtd.purchase@lmw.co.in', dept: 'Procurement', mandatoryFor: ['quotation', 'proforma'] },
      { id: 'c73', label: 'Spindle Assembly Line Lead', email: 'spindle.assembly@lmw.co.in', dept: 'Plant', mandatoryFor: ['service', 'quality'] },
      { id: 'c74', label: 'Unit 2 Inward Stores', email: 'stores.lmwunit2@lmw.co.in', dept: 'Stores', mandatoryFor: ['dispatch'] }
    ],
    notes: 'Standard motorized spindles BT40-15K and HSK-A63-24K ordered in batches of 4-6 units.'
  },
  {
    id: 'CNT-009',
    companyId: 'CUST-09',
    companyName: 'Hyundai Motor India Ltd',
    category: 'Customer',
    tier: 'Tier 1 - Automotive OEM',
    location: 'Irungattukottai, Sriperumbudur, Tamil Nadu',
    gstin: '33AAACH2910M1Z7',
    primaryContact: {
      name: 'C. K. Narayanan',
      designation: 'Powertrain Line Maintenance Manager',
      department: 'Powertrain Maintenance',
      email: 'ck.narayanan@hyundai.co.in',
      phone: '+91 44 4710 0000',
      altPhone: '+91 98400 55102',
      isPrimary: true
    },
    secondaryContact: {
      name: 'M. Senthilkumar',
      designation: 'Senior Buyer - Capex & Tooling',
      department: 'Procurement',
      email: 'procurement.chennai@hyundai.co.in',
      phone: '+91 44 4710 0340'
    },
    ccList: [
      { id: 'c81', label: 'Engine Plant Finance', email: 'finance.engine@hyundai.co.in', dept: 'Accounts', mandatoryFor: ['invoice'] },
      { id: 'c82', label: 'Chennai Sourcing Team', email: 'procurement.chennai@hyundai.co.in', dept: 'Procurement', mandatoryFor: ['quotation'] },
      { id: 'c83', label: 'Engine Block Line Maintenance', email: 'maintenance.line1@hyundai.co.in', dept: 'Plant', mandatoryFor: ['service'] },
      { id: 'c84', label: 'Gate 4 Receiving Bay', email: 'stores.engine@hyundai.co.in', dept: 'Stores', mandatoryFor: ['dispatch'] }
    ],
    notes: 'Require emergency spindle repair turnaround time SLA <= 5 working days.'
  },
  {
    id: 'CNT-010',
    companyId: 'CUST-10',
    companyName: 'LINAMAR INDIA PRIVATE LIMITED',
    category: 'Customer',
    tier: 'Tier 1 - Global Powertrain Machining',
    location: 'Dewas Industrial Area, Madhya Pradesh',
    gstin: '23AAACL4892K1Z9',
    primaryContact: {
      name: 'Rajesh Verma',
      designation: 'Head - Materials & Plant Maintenance',
      department: 'Plant Operations',
      email: 'purchase@linamar.com',
      phone: '+91 7272 42 1000',
      altPhone: '+91 98260 77411',
      isPrimary: true
    },
    secondaryContact: {
      name: 'Deepak Sharma',
      designation: 'Plant Maintenance Lead',
      department: 'Maintenance',
      email: 'plant.head@linamar.com',
      phone: '+91 7272 42 1150'
    },
    ccList: [
      { id: 'c91', label: 'Accounts & Billing Dept', email: 'accounts@linamar.com', dept: 'Accounts', mandatoryFor: ['invoice', 'proforma'] },
      { id: 'c92', label: 'Plant Maintenance Head', email: 'plant.head@linamar.com', dept: 'Plant', mandatoryFor: ['service', 'quotation'] },
      { id: 'c93', label: 'Quality Receiving Dock', email: 'quality.inward@linamar.com', dept: 'Quality', mandatoryFor: ['quality'] },
      { id: 'c94', label: 'Inward Stores & Material Gate', email: 'stores.dewas@linamar.com', dept: 'Stores', mandatoryFor: ['dispatch'] },
      { id: 'c95', label: 'GPS Internal Sales CC', email: 'sales.west@gpsspindle.com', dept: 'Internal', mandatoryFor: ['quotation'] }
    ],
    notes: 'Always copy plant.head on quotation submissions.'
  },
  {
    id: 'CNT-011',
    companyId: 'SUPP-01',
    companyName: 'Schaeffler India Ltd (FAG Spindle Bearings)',
    category: 'Supplier',
    tier: 'Key Supplier - P4S / Ceramic Bearings',
    location: 'Maneja, Vadodara, Gujarat',
    gstin: '24AAACS3820Q1Z1',
    primaryContact: {
      name: 'Rajesh Nair',
      designation: 'Sales Director - Spindle Bearings & Precision',
      department: 'Sales & Applications',
      email: 'r.nair@schaeffler.com',
      phone: '+91 265 660 2000',
      altPhone: '+91 98250 99014',
      isPrimary: true
    },
    secondaryContact: {
      name: 'Pooja Trivedi',
      designation: 'Customer Service & Order Desk',
      department: 'Commercial',
      email: 'orders@schaeffler.com',
      phone: '+91 265 660 2150'
    },
    ccList: [
      { id: 's1', label: 'Central Order Processing', email: 'orders@schaeffler.com', dept: 'Procurement', mandatoryFor: ['purchase_order'] },
      { id: 's2', label: 'Accounts & GST Billing', email: 'accounts.pune@schaeffler.com', dept: 'Accounts', mandatoryFor: ['invoice'] },
      { id: 's3', label: 'Precision Application Engineering', email: 'tech.spindles@schaeffler.com', dept: 'Quality', mandatoryFor: ['quality'] }
    ],
    notes: 'Purchase Orders must specify contact angle (15° vs 25°) and light/medium preload code.'
  },
  {
    id: 'CNT-012',
    companyId: 'SUPP-02',
    companyName: 'OTT-Jakob Spanntechnik India',
    category: 'Supplier',
    tier: 'Key Supplier - Power Drawbar Grippers & Rotary Unions',
    location: 'Bhosari Industrial Estate, Pune',
    gstin: '27AABCO4921N1Z3',
    primaryContact: {
      name: 'K. S. Raman',
      designation: 'Country Applications Manager',
      department: 'Technical & Sourcing',
      email: 'raman@ottjakob-india.com',
      phone: '+91 20 2712 9000',
      altPhone: '+91 98220 33499',
      isPrimary: true
    },
    secondaryContact: {
      name: 'Sachin Joshi',
      designation: 'Customer Support Lead',
      department: 'Service',
      email: 'support@ottjakob-india.com',
      phone: '+91 20 2712 9110'
    },
    ccList: [
      { id: 's11', label: 'Support & Dispatch Desk', email: 'support@ottjakob-india.com', dept: 'Procurement', mandatoryFor: ['purchase_order'] },
      { id: 's12', label: 'Gripper Spares & Seals', email: 'drawbar.spares@ottjakob-india.com', dept: 'Stores', mandatoryFor: ['dispatch'] }
    ],
    notes: 'Quote drawbar collets with OTT part numbers (e.g. 95.101.488.9.2 for HSK-A63).'
  }
];
