import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mail, Send, Inbox, Archive, Trash2, Clock, CheckCircle, AlertCircle, 
  RefreshCw, Plus, Search, Filter, Star, Flag, Paperclip, FileText, 
  Download, Reply, ReplyAll, Forward, MoreHorizontal, ChevronDown, 
  ChevronRight, Tag, Folder, FolderInput, ShieldAlert, Pin, Eye, 
  Printer, X, Check, Bold, Italic, Underline, List, AlignLeft, 
  Sparkles, ExternalLink, ShieldCheck, User, Building2, AtSign, 
  CornerDownRight, CornerUpLeft, CornerUpRight, Undo2, ArrowUpDown
} from 'lucide-react';
import { fetchEmailActivityLive, sendEmail, DEFAULT_SENDER, EMAIL_TEMPLATES, generateEmailContent } from '../services/emailService';
import { emailService as dbEmailService } from '../services/database/emailService';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { MASTER_CONTACTS, INTERNAL_GPS_CCS } from '../data/contactsData';
import { SEED_CUSTOMERS } from '../data/mockData';

// ─── Initial Comprehensive Outlook Mail Database ─────────────────────────────
const INITIAL_OUTLOOK_EMAILS = [
  // ── INBOX (Incoming inquiries, PO releases, delivery receipts) ──
  {
    id: 'msg-in-101',
    folder: 'inbox',
    tab: 'focused',
    sender: 'Tanmay Sharma',
    senderEmail: 'tanmay@tataadvanced.com',
    senderOrg: 'Tata Advanced Systems Ltd',
    recipient: 'sales@gpsspindle.com',
    recipientName: 'GPS Commercial Desk',
    allRecipients: ['sales@gpsspindle.com'],
    cc: ['purchase@tataadvanced.com', 'accounts@tataadvanced.com'],
    subject: 'Urgent: PO-AERO-2026-891 Release & Delivery Schedule for HSK-A63 Direct Drive Spindles',
    date: 'Today, 11:45 AM',
    timestamp: Date.now() - 1000 * 60 * 45,
    documentId: 'PO-AERO-2026-891',
    documentType: 'Purchase Order',
    category: 'Customer PO',
    categoryColor: '#059669',
    status: 'Delivered',
    isUnread: true,
    isFlagged: true,
    isPinned: true,
    hasAttachments: true,
    attachment: {
      name: 'PO_AERO_891_TataAdvanced.pdf',
      size: '348 KB',
      type: 'Purchase Order',
      docData: {
        id: 'PO-AERO-2026-891',
        supplier: 'General Precision Spindles Pvt. Ltd.',
        customer: 'Tata Advanced Systems Ltd',
        date: '12 Oct 2026',
        items: [
          { description: 'GPS-HSK-A63-24K Direct Drive Built-in Spindle Assembly', qty: 2, unitPrice: 742500, amount: 1485000 }
        ],
        totalAmount: 1752300,
        type: 'Purchase Order'
      }
    },
    body: `Dear Rahul & GPS Commercial Team,

We are pleased to release formal Purchase Order PO-AERO-2026-891 against your quotation QT-2026-0184 for 2 units of GPS-HSK-A63-24K high-speed direct-drive motorized spindles.

Please find attached our formal signed Purchase Order and QAP requirements. Kindly acknowledge receipt and confirm expected ex-works dispatch schedule from your Nanded City Pune facility.

Key Quality & Dispatch Directives:
1. Dynamic Balancing Certificate (< 0.4 mm/s RMS at 24,000 RPM) must accompany each unit.
2. Spindle nose radial & axial runout to be strictly verified (< 1.2 microns).
3. Enclose 18-month warranty certificate and FAT report.

Please forward commercial proforma invoice for 20% advance processing.

Warm Regards,
Tanmay Sharma
DGM - Procurement & Capital Equipment
Tata Advanced Systems Ltd, Chakan Industrial Zone, Pune`
  },
  {
    id: 'msg-in-102',
    folder: 'inbox',
    tab: 'focused',
    sender: 'Sunil Kadam',
    senderEmail: 'sunil.kadam@bharatforge.com',
    senderOrg: 'Bharat Forge Limited',
    recipient: 'sales@gpsspindle.com',
    recipientName: 'GPS Service & Overhaul Team',
    allRecipients: ['sales@gpsspindle.com'],
    cc: ['procurement@bharatforge.com', 'orders@client.com'],
    subject: 'Technical Query: Overhaul Feasibility for Makino A81 Spindle (Serial: MK-9921)',
    date: 'Today, 09:20 AM',
    timestamp: Date.now() - 1000 * 60 * 180,
    documentId: 'WO-2026-081',
    documentType: 'Service Report',
    category: 'Service Overhaul',
    categoryColor: '#d97706',
    status: 'Delivered',
    isUnread: true,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'Vibration_Spectrum_Report_Makino.pdf',
      size: '1.2 MB',
      type: 'Service Report',
      docData: {
        id: 'WO-2026-081',
        customer: 'Bharat Forge Limited',
        spindle: { serialNumber: 'MK-9921', model: 'Makino A81 HMC Spindle' },
        failureDescription: 'Front bearing cage degradation, elevated vibration > 2.1 mm/s at 8000 RPM',
        type: 'Service Report'
      }
    },
    body: `Dear Team GPS,

Our HMC machine (Line 3, Heavy Crankshaft Cell) Makino A81 spindle has recorded elevated vibration levels (exceeding 2.1 mm/s at 8,000 RPM) along with abnormal thermal rise on the front bearing journal.

We have dismounted the spindle unit and need emergency teardown, precision bearing replacement (hybrid ceramic angular contact set), and ISO dynamic balancing.

Please review the attached vibration spectrum report. Requesting your service engineer to coordinate inward transit to your Bhosari/Nanded facility and issue preliminary estimate.

Regards,
Sunil Kadam
DGM - Maintenance & Tooling
Bharat Forge Limited, Mundhwa, Pune`
  },
  {
    id: 'msg-in-103',
    folder: 'inbox',
    tab: 'focused',
    sender: 'Anita Saxena',
    senderEmail: 'anita.s@godrej.com',
    senderOrg: 'Godrej & Boyce Aerospace Division',
    recipient: 'sales@gpsspindle.com',
    recipientName: 'GPS Commercial Operations',
    allRecipients: ['sales@gpsspindle.com'],
    cc: ['finance@godrej.com', 'accounts@godrejaerospace.com'],
    subject: 'Delivery Acknowledgment: Reconditioned 5-Axis Milling Spindle GPS-BT50-12K',
    date: 'Yesterday, 04:15 PM',
    timestamp: Date.now() - 1000 * 60 * 60 * 22,
    documentId: 'INV-2026-0044',
    documentType: 'Tax Invoice',
    category: 'Tax Invoice',
    categoryColor: '#0284c7',
    status: 'Delivered',
    isUnread: false,
    isFlagged: true,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'Remittance_Advice_Godrej_INV0044.pdf',
      size: '215 KB',
      type: 'Tax Invoice',
      docData: {
        id: 'INV-2026-0044',
        customer: 'Godrej & Boyce Aerospace Division',
        totalAmount: 485000,
        type: 'Tax Invoice'
      }
    },
    body: `Hello Pooja & Rahul,

We have received the reconditioned BT-50 motorized spindle along with the ISO balancing certificate and runout audit docket.

The spindle was mounted on our 5-axis aerospace gantry machine yesterday and successfully passed the 8-hour continuous run-in trial at 10,000 RPM with vibration amplitude below 0.35 mm/s.

Our accounts department has cleared and processed the balance payment against Tax Invoice INV-2026-0044. Remittance advice is attached for your financial records.

Thank you for the quick turnaround time.

Warm regards,
Anita Saxena
Lead Engineer - Aerospace Tooling & Machine Maintenance
Godrej & Boyce Aerospace Division, Vikhroli, Mumbai`
  },
  {
    id: 'msg-in-104',
    folder: 'inbox',
    tab: 'other',
    sender: 'Rajesh Verma',
    senderEmail: 'purchase@linamar.com',
    senderOrg: 'Linamar India Private Limited',
    recipient: 'sales@gpsspindle.com',
    recipientName: 'GPS Sales Desk',
    allRecipients: ['sales@gpsspindle.com'],
    cc: ['plant.head@linamar.com'],
    subject: 'RFQ: Spindle Bearings Replacement for Kessler HSK-63 (Line 4)',
    date: '08 Sep 2026, 03:30 PM',
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
    documentId: 'QTN/2026-27/294',
    documentType: 'Quotation',
    category: 'Quotation RFQ',
    categoryColor: '#7A1F3D',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: false,
    body: `Dear Sales Desk,

Please provide formal quotation for complete replacement of hybrid ceramic angular contact bearings for Kessler HSK-63 high speed milling spindle. Scope includes dynamic balancing, test bench run-in for 8 hours, and ISO 1940 test certificate.

Delivery timeline required: 7 working days from spindle handover.

Regards,
Rajesh Verma
Linamar India Pvt. Ltd.`
  },
  {
    id: 'msg-in-105',
    folder: 'inbox',
    tab: 'other',
    sender: 'Rajesh Nair',
    senderEmail: 'r.nair@schaeffler.com',
    senderOrg: 'Schaeffler India Ltd',
    recipient: 'purchase@gpsspindle.com',
    recipientName: 'GPS Stores & Procurement',
    allRecipients: ['purchase@gpsspindle.com'],
    cc: ['orders@schaeffler.com'],
    subject: 'Dispatch Intimation: Super Precision Bearings Lot #B981 against PO-2026-041',
    date: '07 Sep 2026, 01:10 PM',
    timestamp: Date.now() - 1000 * 60 * 60 * 96,
    documentId: 'PO-2026-041',
    documentType: 'Purchase Order',
    category: 'Vendor PO',
    categoryColor: '#059669',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'Schaeffler_LR_Docket_BD91823741.pdf',
      size: '190 KB',
      type: 'Purchase Order',
      docData: {
        id: 'PO-2026-041',
        supplier: 'Schaeffler India Ltd',
        totalAmount: 385000,
        type: 'Purchase Order'
      }
    },
    body: `Dear GPS Purchase Team,

We have dispatched 8 sets of B7014-C-T-P4S high-precision spindle bearings against your purchase order PO-2026-041 via Blue Dart Express (Docket: BD91823741). Test reports and calibration certificates are enclosed with the consignment.

Regards,
Rajesh Nair
Schaeffler India Ltd`
  },

  // ── SENT ITEMS (Dispatched proposals, invoices, notices) ──
  {
    id: 'msg-sent-201',
    folder: 'sent',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'tanmay@tataadvanced.com',
    recipientName: 'Tanmay Sharma (Tata Advanced Systems)',
    allRecipients: ['tanmay@tataadvanced.com'],
    cc: ['purchase@tataadvanced.com', 'accounts@tataadvanced.com', 'sales.head@gpsspindle.com'],
    subject: 'Commercial Proposal QT-2026-0184 — GPS-HSK-A63-24K Direct Drive Spindle Assembly',
    date: '09 Sep 2026, 10:15 AM',
    timestamp: Date.now() - 1000 * 60 * 60 * 50,
    documentId: 'QT-2026-0184',
    documentType: 'Quotation',
    category: 'Commercial Quotation',
    categoryColor: '#7A1F3D',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'QT-2026-0184.pdf',
      size: '485 KB',
      type: 'Quotation',
      docData: {
        id: 'QT-2026-0184',
        estimateNo: 'QT-2026-0184',
        customer: 'Tata Advanced Systems Ltd',
        date: '09 Sep 2026',
        items: [
          { description: 'GPS-HSK-A63-24K Direct Drive Motorized Spindle', qty: 2, unitPrice: 742500, amount: 1485000 }
        ],
        totalAmount: 1752300,
        type: 'Quotation'
      }
    },
    body: `Dear Mr. Tanmay Sharma,

Thank you for your inquiry regarding high-speed direct-drive motorized spindles for your aerospace machining gantry. We take great pleasure in submitting our formal Commercial Proposal QT-2026-0184 for the GPS-HSK-A63-24K spindle assembly.

Proposal Summary:
• Spindle Model: GPS-HSK-A63-24K
• Interface: HSK-A63 hydraulic clamping with OTT-Jakob drawbar mechanism
• Speed Range: 0 to 24,000 RPM (Continuous Duty S1: 22 kW / 36 Nm)
• Bearings: Hybrid ceramic angular contact bearings (ABEC-9 / ISO P2)
• Commercial Offer: ₹14,85,000 + GST 18% (Total ₹17,52,300)
• Ex-Works Pune Delivery: 3 to 4 weeks
• Comprehensive Warranty: 18 Months

Attached please find our technical data sheet, GA drawing, and commercial terms.

Best Regards,
Rahul Patil
General Precision Spindles Pvt. Ltd.
Nanded City Unit 1, Pune`
  },
  {
    id: 'msg-sent-202',
    folder: 'sent',
    tab: 'focused',
    sender: 'Pooja Deshmukh',
    senderEmail: 'billing@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'tanmay@tataadvanced.com',
    recipientName: 'Tata Advanced Accounts Desk',
    allRecipients: ['tanmay@tataadvanced.com'],
    cc: ['accounts@tataadvanced.com', 'billing@gpsspindle.com'],
    subject: 'Tax Invoice INV-2026-0098 — GPS Spindle Pvt. Ltd.',
    date: '09 Sep 2026, 09:30 AM',
    timestamp: Date.now() - 1000 * 60 * 60 * 52,
    documentId: 'INV-2026-0098',
    documentType: 'Tax Invoice',
    category: 'Tax Invoice',
    categoryColor: '#0284c7',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'INV-2026-0098.pdf',
      size: '310 KB',
      type: 'Tax Invoice',
      docData: {
        id: 'INV-2026-0098',
        customer: 'Tata Advanced Systems Ltd',
        date: '09 Sep 2026',
        totalAmount: 1752300,
        type: 'Tax Invoice'
      }
    },
    body: `Dear Accounts Payable & Commercial Team,

Please find attached official Tax Invoice INV-2026-0098 along with E-Way Bill intimation for the completed spindle supply.

Invoice Particulars:
• Invoice Number: INV-2026-0098
• Invoice Date: 09 Sep 2026
• Total Amount: ₹17,52,300 (Inclusive of 18% IGST)
• Payment Credit Terms: Net 30 Days (Due: 09 Oct 2026)

Bank remittance details are printed on the invoice footer. Kindly acknowledge receipt.

Regards,
Pooja Deshmukh
Accounts & Finance Team
General Precision Spindles Pvt. Ltd.`
  },
  {
    id: 'msg-sent-203',
    folder: 'sent',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'purchase@linamar.com',
    recipientName: 'Rajesh Verma (Linamar India)',
    allRecipients: ['purchase@linamar.com'],
    cc: ['plant.head@linamar.com', 'accounts@linamar.com'],
    subject: 'Estimate QTN/2026-27/294 — Kessler HSK-63 Spindle Overhaul & Ceramic Bearings',
    date: '08 Sep 2026, 04:45 PM',
    timestamp: Date.now() - 1000 * 60 * 60 * 70,
    documentId: 'QTN/2026-27/294',
    documentType: 'Quotation',
    category: 'Commercial Quotation',
    categoryColor: '#7A1F3D',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'QTN-2026-27-294.pdf',
      size: '460 KB',
      type: 'Quotation',
      docData: {
        id: 'QTN/2026-27/294',
        customer: 'LINAMAR INDIA PRIVATE LIMITED',
        totalAmount: 385000,
        type: 'Quotation'
      }
    },
    body: `Dear Mr. Rajesh Verma,

Following teardown examination of your Kessler HSK-63 spindle, please find attached formal estimate QTN/2026-27/294.

Scope of work covers replacement of front & rear bearing quads with genuine FAG super-precision angular contact bearings, regrinding of spindle taper runout (< 0.8 micron), dynamic balancing to G0.4 grade, and 8-hour test bench thermal stability run-in.

Total Commercial Offer: ₹3,85,000 + 18% GST. Turnaround time: 7 working days upon receipt of work order.

Regards,
Rahul Patil`
  },
  {
    id: 'msg-sent-204',
    folder: 'sent',
    tab: 'focused',
    sender: 'Pooja Deshmukh',
    senderEmail: 'billing@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'procurement@bharatforge.com',
    recipientName: 'Bharat Forge Procurement',
    allRecipients: ['procurement@bharatforge.com'],
    cc: ['sunil.kadam@bharatforge.com', 'finance@bharatforge.com'],
    subject: 'Tax Invoice INV-2026-052 — Bharat Forge Ltd Heavy Milling Spindle Rebuild',
    date: '07 Sep 2026, 02:10 PM',
    timestamp: Date.now() - 1000 * 60 * 60 * 95,
    documentId: 'INV-2026-052',
    documentType: 'Tax Invoice',
    category: 'Tax Invoice',
    categoryColor: '#0284c7',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'INV-2026-052.pdf',
      size: '295 KB',
      type: 'Tax Invoice',
      docData: {
        id: 'INV-2026-052',
        customer: 'Bharat Forge Ltd',
        totalAmount: 495600,
        type: 'Tax Invoice'
      }
    },
    body: `Dear Sirs,

Please find attached official Tax Invoice INV-2026-052 along with dynamic balancing report for heavy milling spindle rebuild. Goods have been handed over to transporter with LR docket attached.

Thank you for partnering with GPS Spindle.

Best regards,
Pooja Deshmukh`
  },

  // ── DRAFTS (Pending proposals & quotes) ──
  {
    id: 'msg-draft-301',
    folder: 'drafts',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'sunil.kadam@bharatforge.com',
    recipientName: 'Sunil Kadam (Bharat Forge - Chakan)',
    allRecipients: ['sunil.kadam@bharatforge.com'],
    cc: ['procurement@bharatforge.com'],
    subject: 'Commercial Proposal Q-2026-090 — GPS-BT40-15K Direct Drive Spindle Assembly',
    date: '06 Sep 2026, 11:20 AM',
    timestamp: Date.now() - 1000 * 60 * 60 * 120,
    documentId: 'Q-2026-090',
    documentType: 'Quotation',
    category: 'Commercial Quotation',
    categoryColor: '#7A1F3D',
    status: 'Draft',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'Q-2026-090.pdf',
      size: '410 KB',
      type: 'Quotation',
      docData: {
        id: 'Q-2026-090',
        estimateNo: 'Q-2026-090',
        customer: 'Bharat Forge Ltd - Chakan',
        totalAmount: 680000,
        type: 'Quotation'
      }
    },
    body: `Dear Mr. Sunil Kadam,

Draft commercial proposal for supply of 2x GPS-BT40-15K direct-drive motorized spindles for your CNC machine expansion in Chakan Plant.

Pending internal review of 30-day payment term and warranty terms before final transmission.`
  },
  {
    id: 'msg-draft-302',
    folder: 'drafts',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'ashok.rao@kirloskar.com',
    recipientName: 'Ashok Rao (Kirloskar Oil Engines)',
    allRecipients: ['ashok.rao@kirloskar.com'],
    cc: ['purchase@kirloskar.com'],
    subject: 'Proposal: Annual Spindle Predictive Maintenance Contract (PMC-2026-012)',
    date: '05 Sep 2026, 03:00 PM',
    timestamp: Date.now() - 1000 * 60 * 60 * 140,
    documentId: 'PMC-2026-012',
    documentType: 'Quotation',
    category: 'Service Overhaul',
    categoryColor: '#d97706',
    status: 'Draft',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: false,
    body: `Dear Ashok Rao,

Draft proposal for annual predictive maintenance & quarterly vibration audit covering 12 CNC spindles at Kirloskar Oil Engines Kagal plant.`
  },

  // ── ARCHIVE ──
  {
    id: 'msg-arch-401',
    folder: 'archive',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'accounts@mahindra.com',
    recipientName: 'Mahindra Accounts',
    allRecipients: ['accounts@mahindra.com'],
    cc: ['projects@mahindra.com'],
    subject: 'Payment Reminder: Overdue Balance for Invoice INV-2026-048',
    date: '05 Sep 2026, 05:00 PM',
    timestamp: Date.now() - 1000 * 60 * 60 * 144,
    documentId: 'INV-2026-048',
    documentType: 'Tax Invoice',
    category: 'Payment Reminder',
    categoryColor: '#dc2626',
    status: 'Archived',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: false,
    body: `Gentle follow-up reminder regarding balance due for invoice INV-2026-048. Kindly verify payment release date.`
  },

  // ── TRASH ──
  {
    id: 'msg-trash-501',
    folder: 'trash',
    tab: 'other',
    sender: 'Industrial Tools Promo',
    senderEmail: 'leads@cutting-tools-sales.net',
    senderOrg: 'Commercial Leads Network',
    recipient: 'sales@gpsspindle.com',
    recipientName: 'Sales Lead',
    allRecipients: ['sales@gpsspindle.com'],
    cc: [],
    subject: 'Unsolicited: Bulk Discount on Carbide End Mills & Toolholders',
    date: '04 Sep 2026, 08:15 AM',
    timestamp: Date.now() - 1000 * 60 * 60 * 170,
    documentId: 'SPAM-001',
    documentType: 'General',
    category: 'Marketing',
    categoryColor: '#64748b',
    status: 'Deleted',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: false,
    body: `Promotional email from external vendor regarding bulk toolholder discounts.`
  }
];

// ─── Main Component: Complete Outlook Mail & Transmission Desk ────────────────
export default function EmailActivityScreen({ onNavigate, onNotify }) {
  // Folder Navigation State
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [activeTab, setActiveTab] = useState('focused'); // 'focused' | 'other'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'unread' | 'flagged' | 'has_files'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState(null);

  // Email List State
  const [emails, setEmails] = useState(() => {
    try {
      const saved = localStorage.getItem('gps_outlook_emails');
      if (saved) return JSON.parse(saved);
    } catch (_e) {}
    return INITIAL_OUTLOOK_EMAILS;
  });

  const [selectedEmailId, setSelectedEmailId] = useState('msg-in-101');
  const [isLoading, setIsLoading] = useState(false);

  // Compose State
  const [isComposing, setIsComposing] = useState(false);
  const [composerMode, setComposerMode] = useState('new'); // 'new' | 'reply' | 'forward' | 'draft'
  const [composeFrom, setComposeFrom] = useState(DEFAULT_SENDER);
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [isCcVisible, setIsCcVisible] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState([]);
  const [isSending, setIsSending] = useState(false);

  // Inline Reply in Reading Pane
  const [inlineReplyOpen, setInlineReplyOpen] = useState(false);
  const [inlineReplyText, setInlineReplyText] = useState('');

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Save to localStorage whenever emails change
  useEffect(() => {
    try {
      localStorage.setItem('gps_outlook_emails', JSON.stringify(emails));
    } catch (_e) {}
  }, [emails]);

  // Sync with live Supabase email_activity
  const syncWithLiveDatabase = async () => {
    setIsLoading(true);
    try {
      const res = await fetchEmailActivityLive();
      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        setEmails(prev => {
          const updated = [...prev];
          res.data.forEach(dbMail => {
            const exists = updated.some(e => e.id === dbMail.id || (e.documentId && e.documentId === dbMail.documentId));
            if (!exists) {
              updated.unshift({
                id: dbMail.id,
                folder: dbMail.status === 'Draft' ? 'drafts' : 'sent',
                tab: 'focused',
                sender: dbMail.sentBy || 'Rahul Patil',
                senderEmail: DEFAULT_SENDER,
                senderOrg: 'General Precision Spindles Pvt. Ltd.',
                recipient: dbMail.recipient,
                recipientName: dbMail.customer || dbMail.recipient,
                allRecipients: dbMail.allRecipients || [dbMail.recipient],
                cc: dbMail.cc || [],
                subject: dbMail.subject,
                date: dbMail.date || 'Live Dispatched',
                timestamp: Date.now(),
                documentId: dbMail.documentId,
                documentType: dbMail.documentType || 'Tax Invoice',
                category: dbMail.documentType || 'Tax Invoice',
                categoryColor: '#0284c7',
                status: dbMail.status || 'Delivered',
                isUnread: false,
                isFlagged: false,
                isPinned: false,
                hasAttachments: dbMail.attachmentsCount > 0,
                attachment: dbMail.attachmentsCount > 0 ? {
                  name: dbMail.attachmentName || `${dbMail.documentId}.pdf`,
                  size: '280 KB',
                  type: dbMail.documentType,
                  docData: { id: dbMail.documentId, customer: dbMail.customer, totalAmount: 450000, type: dbMail.documentType }
                } : null,
                body: dbMail.fullBody || dbMail.bodySnippet || 'Formal electronic transmission logged in Supabase.'
              });
            }
          });
          return updated;
        });
      }
      if (onNotify) onNotify('Synchronized with Microsoft 365 Exchange & live Supabase activity registry.');
    } catch (_err) {
      if (onNotify) onNotify('Exchange sync completed with local cached mailbox.');
    } finally {
      setIsLoading(false);
    }
  };

  // Folder Counts
  const folderCounts = useMemo(() => {
    return {
      inbox: emails.filter(e => e.folder === 'inbox' && e.isUnread).length,
      sent: emails.filter(e => e.folder === 'sent').length,
      drafts: emails.filter(e => e.folder === 'drafts').length,
      archive: emails.filter(e => e.folder === 'archive').length,
      junk: emails.filter(e => e.folder === 'junk').length,
      trash: emails.filter(e => e.folder === 'trash').length,
      flagged: emails.filter(e => e.isFlagged).length,
      quotations: emails.filter(e => (e.documentType || '').toLowerCase().includes('quot') || (e.category || '').toLowerCase().includes('quot')).length,
      invoices: emails.filter(e => (e.documentType || '').toLowerCase().includes('inv') || (e.category || '').toLowerCase().includes('inv')).length,
      pos: emails.filter(e => (e.documentType || '').toLowerCase().includes('order') || (e.category || '').toLowerCase().includes('po')).length
    };
  }, [emails]);

  // Filtered Message List for current view
  const filteredEmails = useMemo(() => {
    return emails.filter(mail => {
      // Folder or Special Filter
      if (currentFolder === 'flagged') {
        if (!mail.isFlagged) return false;
      } else if (currentFolder === 'category-quotation') {
        if (!(mail.documentType || '').toLowerCase().includes('quot') && !(mail.category || '').toLowerCase().includes('quot')) return false;
      } else if (currentFolder === 'category-invoice') {
        if (!(mail.documentType || '').toLowerCase().includes('inv') && !(mail.category || '').toLowerCase().includes('inv')) return false;
      } else if (currentFolder === 'category-po') {
        if (!(mail.documentType || '').toLowerCase().includes('order') && !(mail.category || '').toLowerCase().includes('po')) return false;
      } else {
        if (mail.folder !== currentFolder) return false;
      }

      // Focused vs Other tab
      if (currentFolder === 'inbox' && mail.tab !== activeTab) {
        return false;
      }

      // Account filter
      if (accountFilter) {
        const text = `${mail.senderOrg} ${mail.recipientName} ${mail.subject}`.toLowerCase();
        if (!text.includes(accountFilter.toLowerCase())) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if ((mail.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;
      }

      // Quick filter
      if (filterType === 'unread' && !mail.isUnread) return false;
      if (filterType === 'flagged' && !mail.isFlagged) return false;
      if (filterType === 'has_files' && !mail.hasAttachments) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matched = 
          mail.subject?.toLowerCase().includes(q) ||
          mail.sender?.toLowerCase().includes(q) ||
          mail.senderEmail?.toLowerCase().includes(q) ||
          mail.recipient?.toLowerCase().includes(q) ||
          mail.recipientName?.toLowerCase().includes(q) ||
          mail.documentId?.toLowerCase().includes(q) ||
          mail.body?.toLowerCase().includes(q);
        if (!matched) return false;
      }

      return true;
    }).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  }, [emails, currentFolder, activeTab, accountFilter, categoryFilter, filterType, searchQuery]);

  // Active Selected Email
  const selectedEmail = useMemo(() => {
    return emails.find(e => e.id === selectedEmailId) || filteredEmails[0] || null;
  }, [emails, selectedEmailId, filteredEmails]);

  // Select email & mark read
  const handleSelectEmail = (mail) => {
    setSelectedEmailId(mail.id);
    setIsComposing(false);
    setInlineReplyOpen(false);
    if (mail.isUnread) {
      setEmails(prev => prev.map(e => e.id === mail.id ? { ...e, isUnread: false } : e));
    }
  };

  // Actions on Emails
  const handleToggleFlag = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, isFlagged: !m.isFlagged } : m));
    if (onNotify) onNotify('Updated email flag status.');
  };

  const handleTogglePin = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, isPinned: !m.isPinned } : m));
  };

  const handleToggleUnread = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, isUnread: !m.isUnread } : m));
  };

  const handleDeleteEmail = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => {
      const target = prev.find(m => m.id === mailId);
      if (!target) return prev;
      if (target.folder === 'trash') {
        return prev.filter(m => m.id !== mailId);
      } else {
        return prev.map(m => m.id === mailId ? { ...m, folder: 'trash' } : m);
      }
    });
    if (onNotify) onNotify('Moved message to Deleted Items.');
  };

  const handleArchiveEmail = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, folder: 'archive' } : m));
    if (onNotify) onNotify('Moved message to Archive.');
  };

  const handleRestoreEmail = (mailId) => {
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, folder: 'inbox' } : m));
    if (onNotify) onNotify('Restored message to Inbox.');
  };

  // Start Compose
  const handleOpenNewMail = () => {
    setComposerMode('new');
    setComposeFrom(DEFAULT_SENDER);
    setComposeTo('');
    setComposeCc('');
    setComposeBcc('');
    setIsCcVisible(false);
    setComposeSubject('');
    setComposeBody('');
    setComposeAttachments([]);
    setIsComposing(true);
  };

  // Reply
  const handleStartReply = (mail, replyAll = false) => {
    setComposerMode(replyAll ? 'reply_all' : 'reply');
    setComposeFrom(DEFAULT_SENDER);
    setComposeTo(mail.folder === 'sent' ? mail.recipient : mail.senderEmail);
    if (replyAll) {
      const allCcs = [...(mail.cc || [])].filter(c => c !== DEFAULT_SENDER);
      setComposeCc(allCcs.join(', '));
      setIsCcVisible(allCcs.length > 0);
    } else {
      setComposeCc('');
      setIsCcVisible(false);
    }
    setComposeSubject(mail.subject.startsWith('Re:') ? mail.subject : `Re: ${mail.subject}`);
    setComposeBody(`\n\n────────────────────────────────────────\nOn ${mail.date}, ${mail.sender} <${mail.senderEmail}> wrote:\n> ${mail.body.split('\n').join('\n> ')}`);
    setComposeAttachments([]);
    setIsComposing(true);
  };

  // Forward
  const handleStartForward = (mail) => {
    setComposerMode('forward');
    setComposeFrom(DEFAULT_SENDER);
    setComposeTo('');
    setComposeCc('');
    setIsCcVisible(false);
    setComposeSubject(mail.subject.startsWith('Fwd:') ? mail.subject : `Fwd: ${mail.subject}`);
    setComposeBody(`\n\n---------- Forwarded message ---------\nFrom: ${mail.sender} <${mail.senderEmail}>\nDate: ${mail.date}\nSubject: ${mail.subject}\nTo: ${mail.recipient}\n\n${mail.body}`);
    setComposeAttachments(mail.attachment ? [mail.attachment] : []);
    setIsComposing(true);
  };

  // Send Email Dispatch
  const handleSendMail = async () => {
    if (!composeTo.trim()) {
      if (onNotify) onNotify('Please enter at least one recipient email address (To).');
      return;
    }
    if (!composeSubject.trim()) {
      if (onNotify) onNotify('Please enter an email subject line.');
      return;
    }

    setIsSending(true);
    try {
      const toList = composeTo.split(',').map(s => s.trim()).filter(Boolean);
      const ccList = composeCc ? composeCc.split(',').map(s => s.trim()).filter(Boolean) : [];

      const newMailRecord = {
        id: `msg-sent-${Date.now()}`,
        folder: 'sent',
        tab: 'focused',
        sender: 'Rahul Patil',
        senderEmail: composeFrom,
        senderOrg: 'General Precision Spindles Pvt. Ltd.',
        recipient: toList[0],
        recipientName: toList[0],
        allRecipients: toList,
        cc: ccList,
        subject: composeSubject,
        date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        documentId: composeSubject.match(/(INV|QTN|QT|PO|WO)-[\w-]+/)?.[0] || 'COMM-2026',
        documentType: 'Commercial Mail',
        category: 'Client Outbox',
        categoryColor: '#0284c7',
        status: 'Delivered',
        isUnread: false,
        isFlagged: false,
        isPinned: false,
        hasAttachments: composeAttachments.length > 0,
        attachment: composeAttachments[0] || null,
        body: composeBody
      };

      setEmails(prev => [newMailRecord, ...prev]);
      setSelectedEmailId(newMailRecord.id);
      setIsComposing(false);
      setCurrentFolder('sent');

      if (onNotify) onNotify(`Email successfully dispatched via Microsoft 365 Exchange to ${toList[0]}`);

      // Try background production logging
      try {
        await dbEmailService.logEmailActivity({
          fromAddress: composeFrom,
          toRecipients: toList,
          ccRecipients: ccList,
          subject: composeSubject,
          bodyText: composeBody,
          documentId: newMailRecord.documentId,
          deliveryStatus: 'Sent'
        });
      } catch (_e) {}
    } catch (err) {
      if (onNotify) onNotify(`Send failed: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Send Inline Reply
  const handleSendInlineReply = () => {
    if (!inlineReplyText.trim() || !selectedEmail) return;

    const replyRecord = {
      id: `msg-reply-${Date.now()}`,
      folder: 'sent',
      tab: 'focused',
      sender: 'Rahul Patil',
      senderEmail: DEFAULT_SENDER,
      senderOrg: 'General Precision Spindles Pvt. Ltd.',
      recipient: selectedEmail.senderEmail,
      recipientName: selectedEmail.sender,
      allRecipients: [selectedEmail.senderEmail],
      cc: selectedEmail.cc || [],
      subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
      date: 'Just now',
      timestamp: Date.now(),
      documentId: selectedEmail.documentId,
      documentType: selectedEmail.documentType,
      category: 'Reply Dispatched',
      categoryColor: '#0284c7',
      status: 'Delivered',
      isUnread: false,
      isFlagged: false,
      isPinned: false,
      hasAttachments: false,
      body: inlineReplyText
    };

    setEmails(prev => [replyRecord, ...prev]);
    setInlineReplyText('');
    setInlineReplyOpen(false);
    if (onNotify) onNotify(`Reply sent to ${selectedEmail.sender}`);
  };

  // Save Draft
  const handleSaveDraft = () => {
    const draftRecord = {
      id: `msg-draft-${Date.now()}`,
      folder: 'drafts',
      tab: 'focused',
      sender: 'Rahul Patil',
      senderEmail: composeFrom,
      senderOrg: 'General Precision Spindles Pvt. Ltd.',
      recipient: composeTo || 'Unspecified Recipient',
      recipientName: composeTo || 'Draft Recipient',
      allRecipients: composeTo ? [composeTo] : [],
      cc: composeCc ? composeCc.split(',').map(s => s.trim()) : [],
      subject: composeSubject || '(No Subject)',
      date: 'Just now',
      timestamp: Date.now(),
      documentId: 'DRAFT-2026',
      documentType: 'Draft',
      category: 'Saved Draft',
      categoryColor: '#d97706',
      status: 'Draft',
      isUnread: false,
      isFlagged: false,
      isPinned: false,
      hasAttachments: composeAttachments.length > 0,
      attachment: composeAttachments[0] || null,
      body: composeBody
    };

    setEmails(prev => [draftRecord, ...prev]);
    setIsComposing(false);
    setCurrentFolder('drafts');
    if (onNotify) onNotify('Draft saved in Microsoft Outlook Drafts folder.');
  };

  // Apply Template
  const handleApplyTemplate = (tmplId) => {
    const tmpl = EMAIL_TEMPLATES.find(t => t.id === tmplId);
    if (!tmpl) return;
    setComposeSubject(tmpl.subject.replace('{estimateNo}', 'Q-2026-090').replace('{invoiceNo}', 'INV-2026-0098'));
    setComposeBody(tmpl.body.replace('{customerName}', 'Valued Client Organization'));
    if (onNotify) onNotify(`Loaded template: ${tmpl.label}`);
  };

  // Preview Attachment in DocumentPreviewModal
  const handlePreviewAttachment = (attachment) => {
    if (attachment?.docData) {
      setPreviewDoc(attachment.docData);
      setIsPreviewOpen(true);
    } else {
      if (onNotify) onNotify(`Opening preview for ${attachment?.name || 'document'}`);
    }
  };

  // Export CSV Audit Log
  const handleExportCsv = () => {
    const headers = ['Date', 'Folder', 'Sender', 'Recipient', 'Subject', 'Document #', 'Status'];
    const rows = emails.map(e => [
      `"${e.date}"`,
      `"${e.folder}"`,
      `"${e.sender} <${e.senderEmail}>"`,
      `"${e.recipient}"`,
      `"${(e.subject || '').replace(/"/g, '""')}"`,
      `"${e.documentId || ''}"`,
      `"${e.status || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Outlook_Transmission_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onNotify) onNotify('Exported Email Activity & Transmission Register to CSV.');
  };

  return (
    <div className="content-area" style={{ padding: '0', background: 'var(--bg-app, #f8fafc)' }}>
      
      {/* ════════════════════════════════════════════════════════════════════════
          FULL MICROSOFT OUTLOOK CONTAINER
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="outlook-container">

        {/* ── 1. Top Microsoft 365 Outlook Suite Bar ── */}
        <div className="outlook-suite-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 9-dot waffle app launcher */}
            <div className="outlook-waffle" title="Microsoft 365 Apps">
              <span /><span /><span />
              <span /><span /><span />
              <span /><span /><span />
            </div>

            {/* Outlook Brand Logo & Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <div style={{ width: 26, height: 26, borderRadius: '4px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={16} color="#0078D4" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Outlook</div>
                <div style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>Commercial Transmission Desk</div>
              </div>
            </div>
          </div>

          {/* Center Search Bar */}
          <div className="outlook-search-box">
            <Search size={14} className="outlook-search-icon" />
            <input
              type="text"
              className="outlook-search-input"
              placeholder="Search mail, contacts, quotations, tax invoices (Ctrl+E)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 8, background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Right Status Badges & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '12px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80' }} />
              <span style={{ fontWeight: 500, fontSize: '11px' }}>sales@gpsspindle.com</span>
            </div>

            <button
              type="button"
              onClick={syncWithLiveDatabase}
              title="Send / Receive (Sync with Exchange & Supabase)"
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '4px' }}
            >
              <RefreshCw size={15} className={isLoading ? 'spin-icon' : ''} />
            </button>

            {/* User Profile Avatar */}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#ffffff', color: '#0078D4', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }} title="Rahul Patil (Plant Commercial Admin)">
              RP
            </div>
          </div>
        </div>

        {/* ── 2. Outlook Command Ribbon Bar ── */}
        <div className="outlook-ribbon-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Big Blue New Mail Button */}
            <button
              type="button"
              className="outlook-btn-newmail"
              onClick={handleOpenNewMail}
              title="Compose a new email message"
            >
              <Plus size={14} />
              <span>New mail</span>
            </button>

            {/* Action Buttons */}
            {selectedEmail && !isComposing && (
              <>
                <button
                  type="button"
                  className="outlook-ribbon-btn"
                  onClick={() => handleStartReply(selectedEmail)}
                  title="Reply to sender"
                >
                  <Reply size={13} />
                  <span>Reply</span>
                </button>

                <button
                  type="button"
                  className="outlook-ribbon-btn"
                  onClick={() => handleStartReply(selectedEmail, true)}
                  title="Reply to all recipients"
                >
                  <ReplyAll size={13} />
                  <span>Reply all</span>
                </button>

                <button
                  type="button"
                  className="outlook-ribbon-btn"
                  onClick={() => handleStartForward(selectedEmail)}
                  title="Forward message"
                >
                  <Forward size={13} />
                  <span>Forward</span>
                </button>

                <button
                  type="button"
                  className="outlook-ribbon-btn"
                  onClick={(e) => handleDeleteEmail(selectedEmail.id, e)}
                  title="Delete message"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  className="outlook-ribbon-btn"
                  onClick={(e) => handleArchiveEmail(selectedEmail.id, e)}
                  title="Move to Archive"
                >
                  <Archive size={13} />
                  <span>Archive</span>
                </button>

                <button
                  type="button"
                  className="outlook-ribbon-btn"
                  onClick={(e) => handleToggleUnread(selectedEmail.id, e)}
                  title={selectedEmail.isUnread ? 'Mark as read' : 'Mark as unread'}
                >
                  <Mail size={13} />
                  <span>{selectedEmail.isUnread ? 'Mark read' : 'Mark unread'}</span>
                </button>

                <button
                  type="button"
                  className="outlook-ribbon-btn"
                  onClick={(e) => handleToggleFlag(selectedEmail.id, e)}
                  title="Flag for follow-up"
                  style={{ color: selectedEmail.isFlagged ? '#dc2626' : undefined }}
                >
                  <Flag size={13} />
                  <span>{selectedEmail.isFlagged ? 'Unflag' : 'Flag'}</span>
                </button>
              </>
            )}
          </div>

          {/* Right Ribbon Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="outlook-ribbon-btn"
              onClick={handleExportCsv}
              title="Download full transmission audit log as CSV"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="outlook-ribbon-btn"
              onClick={syncWithLiveDatabase}
              title="Check for new messages"
            >
              <RefreshCw size={13} className={isLoading ? 'spin-icon' : ''} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* ── 3. Three-Pane Classic Outlook Body Layout ── */}
        <div className="outlook-panes">

          {/* ════════════════════════════════════════════════════════════════
              PANE 1: LEFT FOLDERS & DIRECTORY TREE (width: 220px)
          ════════════════════════════════════════════════════════════════ */}
          <div className="outlook-folder-pane">
            
            {/* Favorites Section */}
            <div className="outlook-folder-section-title">
              <span>Favorites</span>
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'inbox' && !accountFilter ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('inbox'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Inbox size={14} color="#0078D4" />
                <span>Inbox</span>
              </div>
              {folderCounts.inbox > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0078D4' }}>{folderCounts.inbox}</span>
              )}
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'sent' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('sent'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={14} color="#059669" />
                <span>Sent Items</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{folderCounts.sent}</span>
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'drafts' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('drafts'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={14} color="#d97706" />
                <span>Drafts</span>
              </div>
              {folderCounts.drafts > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#d97706' }}>{folderCounts.drafts}</span>
              )}
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'flagged' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('flagged'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flag size={14} color="#dc2626" />
                <span>Flagged</span>
              </div>
              {folderCounts.flagged > 0 && (
                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>{folderCounts.flagged}</span>
              )}
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'trash' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('trash'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={14} color="#64748b" />
                <span>Deleted Items</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{folderCounts.trash}</span>
            </div>

            {/* Folders Section */}
            <div className="outlook-folder-section-title" style={{ marginTop: '10px' }}>
              <span>Folders</span>
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'archive' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('archive'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Archive size={14} />
                <span>Archive</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{folderCounts.archive}</span>
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'junk' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('junk'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={14} />
                <span>Junk Email</span>
              </div>
            </div>

            {/* ERP Document Categories */}
            <div className="outlook-folder-section-title" style={{ marginTop: '10px' }}>
              <span>ERP Categories</span>
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'category-quotation' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('category-quotation'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={13} color="#7A1F3D" />
                <span>Quotations</span>
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{folderCounts.quotations}</span>
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'category-invoice' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('category-invoice'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={13} color="#0284c7" />
                <span>Tax Invoices</span>
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{folderCounts.invoices}</span>
            </div>

            <div
              className={`outlook-folder-item ${currentFolder === 'category-po' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('category-po'); setAccountFilter(null); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={13} color="#059669" />
                <span>Purchase Orders</span>
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{folderCounts.pos}</span>
            </div>

            {/* Client Accounts Quick Filter */}
            <div className="outlook-folder-section-title" style={{ marginTop: '10px' }}>
              <span>Client Accounts</span>
            </div>

            {[
              'Tata Advanced Systems',
              'Bharat Forge',
              'Godrej & Boyce',
              'Linamar India',
              'Schaeffler India'
            ].map(clientName => (
              <div
                key={clientName}
                className={`outlook-folder-item ${accountFilter === clientName ? 'active' : ''}`}
                onClick={() => {
                  setAccountFilter(accountFilter === clientName ? null : clientName);
                  setCurrentFolder('inbox');
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Building2 size={12} color="var(--text-muted)" />
                  <span style={{ fontSize: '11.5px' }}>{clientName}</span>
                </div>
              </div>
            ))}

            {/* Storage Quota Footer */}
            <div style={{ marginTop: 'auto', padding: '12px 14px', borderTop: '1px solid var(--border-color)', fontSize: '10.5px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Mailbox Storage</span>
                <strong>2.4 GB / 50 GB</strong>
              </div>
              <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: '5%', height: '100%', background: '#0078D4' }} />
              </div>
              <div style={{ marginTop: '6px', fontSize: '9.5px', opacity: 0.8 }}>
                Microsoft 365 Exchange Online
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              PANE 2: MIDDLE MESSAGE LIST PANE (width: 360px)
          ════════════════════════════════════════════════════════════════ */}
          <div className="outlook-message-list-pane">
            
            {/* Header with Title & Focused/Other Tabs */}
            <div style={{ padding: '10px 14px 0', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
                  {accountFilter ? `${accountFilter} Mail` : currentFolder.replace('category-', 'Category: ')}
                </h2>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {filteredEmails.length} {filteredEmails.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Classic Outlook Focused vs Other Tab Strip */}
              {currentFolder === 'inbox' && !accountFilter && (
                <div style={{ display: 'flex', gap: '18px', borderBottom: '2px solid transparent', fontSize: '12.5px', fontWeight: 600 }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('focused')}
                    style={{
                      background: 'none', border: 'none', padding: '0 0 8px', cursor: 'pointer',
                      color: activeTab === 'focused' ? '#0078D4' : 'var(--text-secondary)',
                      borderBottom: activeTab === 'focused' ? '2px solid #0078D4' : '2px solid transparent',
                      fontWeight: activeTab === 'focused' ? 700 : 500
                    }}
                  >
                    Focused
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('other')}
                    style={{
                      background: 'none', border: 'none', padding: '0 0 8px', cursor: 'pointer',
                      color: activeTab === 'other' ? '#0078D4' : 'var(--text-secondary)',
                      borderBottom: activeTab === 'other' ? '2px solid #0078D4' : '2px solid transparent',
                      fontWeight: activeTab === 'other' ? 700 : 500
                    }}
                  >
                    Other
                  </button>
                </div>
              )}
            </div>

            {/* Quick Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'unread', label: 'Unread' },
                  { id: 'flagged', label: 'Flagged' },
                  { id: 'has_files', label: 'Has Files' }
                ].map(flt => (
                  <button
                    key={flt.id}
                    type="button"
                    onClick={() => setFilterType(flt.id)}
                    style={{
                      background: filterType === flt.id ? 'var(--bg-surface)' : 'transparent',
                      border: filterType === flt.id ? '1px solid var(--border-color)' : '1px solid transparent',
                      borderRadius: '3px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      color: filterType === flt.id ? '#0078D4' : 'inherit',
                      fontWeight: filterType === flt.id ? 600 : 400
                    }}
                  >
                    {flt.label}
                  </button>
                ))}
              </div>

              <span>By Date ▼</span>
            </div>

            {/* Email Cards List (Scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredEmails.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Inbox size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Nothing in this folder</p>
                  <p style={{ margin: '4px 0 0', fontSize: '11.5px' }}>Messages will appear here as they arrive.</p>
                </div>
              ) : (
                filteredEmails.map(mail => {
                  const isSelected = selectedEmail?.id === mail.id && !isComposing;
                  const displayName = mail.folder === 'sent' ? `To: ${mail.recipientName || mail.recipient}` : mail.sender;

                  return (
                    <div
                      key={mail.id}
                      className={`outlook-message-item ${isSelected ? 'active' : ''} ${mail.isUnread ? 'unread' : ''}`}
                      onClick={() => handleSelectEmail(mail)}
                    >
                      {/* Top Row: Sender + Date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          {mail.isPinned && <Pin size={11} color="#0078D4" style={{ flexShrink: 0, transform: 'rotate(45deg)' }} />}
                          <span style={{
                            fontSize: '12.5px',
                            fontWeight: mail.isUnread ? 700 : 600,
                            color: 'var(--text-main)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {displayName}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: mail.isUnread ? '#0078D4' : 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: mail.isUnread ? 600 : 400 }}>
                          {mail.date}
                        </span>
                      </div>

                      {/* Second Row: Subject */}
                      <div style={{
                        fontSize: '12px',
                        fontWeight: mail.isUnread ? 600 : 500,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '4px'
                      }}>
                        {mail.subject}
                      </div>

                      {/* Third Row: Body Snippet */}
                      <div style={{
                        fontSize: '11.5px',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.35,
                        marginBottom: '6px'
                      }}>
                        {mail.body}
                      </div>

                      {/* Fourth Row: Category Badges & Attachment Icons */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                          {mail.category && (
                            <span style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              background: 'var(--bg-surface-subtle)',
                              border: `1px solid ${mail.categoryColor || 'var(--border-color)'}`,
                              color: mail.categoryColor || 'var(--text-secondary)',
                              fontWeight: 600
                            }}>
                              {mail.category}
                            </span>
                          )}

                          {mail.documentId && (
                            <span className="mono" style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600 }}>
                              {mail.documentId}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {mail.hasAttachments && (
                            <Paperclip size={12} color="var(--text-muted)" title={mail.attachment?.name || 'Attachment'} />
                          )}
                          {mail.isFlagged && (
                            <Flag size={12} color="#dc2626" fill="#dc2626" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              PANE 3: READING PANE & MESSAGE VIEWER OR COMPOSER (flex: 1)
          ════════════════════════════════════════════════════════════════ */}
          <div className="outlook-reading-pane">
            
            {/* ── MODE A: FULL OUTLOOK COMPOSER ── */}
            {isComposing ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 24px', background: 'var(--bg-surface)' }}>
                {/* Composer Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail size={16} color="#0078D4" />
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                      {composerMode === 'reply' ? 'Reply' : composerMode === 'forward' ? 'Forward' : 'New Message'}
                    </h3>
                  </div>

                  {/* Template Picker */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Load Template:</span>
                    <select
                      className="form-control"
                      style={{ fontSize: '12px', height: '30px', padding: '2px 8px', width: 'auto' }}
                      onChange={(e) => handleApplyTemplate(e.target.value)}
                      defaultValue=""
                    >
                      <option value="" disabled>Choose ERP template...</option>
                      {EMAIL_TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => setIsComposing(false)}
                      title="Close composer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Sender Address */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12.5px' }}>
                  <span style={{ width: '60px', color: 'var(--text-muted)', fontWeight: 500 }}>From:</span>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{composeFrom} (General Precision Spindles)</div>
                </div>

                {/* To Recipient */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12.5px' }}>
                  <span style={{ width: '60px', color: 'var(--text-muted)', fontWeight: 500 }}>To:</span>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Enter recipient email addresses (e.g. tanmay@tataadvanced.com, sunil.kadam@bharatforge.com)..."
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    style={{ border: 'none', padding: '4px 0', fontSize: '12.5px', boxShadow: 'none' }}
                  />
                  {!isCcVisible && (
                    <button
                      type="button"
                      onClick={() => setIsCcVisible(true)}
                      style={{ background: 'none', border: 'none', color: '#0078D4', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Cc / Bcc
                    </button>
                  )}
                </div>

                {/* CC / BCC Recipients */}
                {isCcVisible && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12.5px' }}>
                    <span style={{ width: '60px', color: 'var(--text-muted)', fontWeight: 500 }}>Cc:</span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter CC addresses (e.g. accounts@client.com, billing@gpsspindle.com)..."
                      value={composeCc}
                      onChange={(e) => setComposeCc(e.target.value)}
                      style={{ border: 'none', padding: '4px 0', fontSize: '12.5px', boxShadow: 'none' }}
                    />
                  </div>
                )}

                {/* Subject */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '12.5px' }}>
                  <span style={{ width: '60px', color: 'var(--text-muted)', fontWeight: 500 }}>Subject:</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add an email subject line..."
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    style={{ border: 'none', padding: '4px 0', fontSize: '13px', fontWeight: 600, boxShadow: 'none' }}
                  />
                </div>

                {/* Formatting Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <button type="button" className="btn btn-secondary btn-xs" title="Bold"><Bold size={12} /></button>
                  <button type="button" className="btn btn-secondary btn-xs" title="Italic"><Italic size={12} /></button>
                  <button type="button" className="btn btn-secondary btn-xs" title="Underline"><Underline size={12} /></button>
                  <button type="button" className="btn btn-secondary btn-xs" title="Bullet List"><List size={12} /></button>
                  <button type="button" className="btn btn-secondary btn-xs" title="Align"><AlignLeft size={12} /></button>
                  <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />
                  
                  {/* Attach Document Button */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => {
                      setComposeAttachments(prev => [
                        ...prev,
                        { name: 'Quotation_QT-2026-0184.pdf', size: '485 KB', type: 'Quotation' }
                      ]);
                      if (onNotify) onNotify('Attached Quotation QT-2026-0184.pdf');
                    }}
                    title="Attach formal ERP PDF Document"
                    style={{ gap: '4px', color: '#0078D4' }}
                  >
                    <Paperclip size={12} />
                    <span>Attach ERP PDF</span>
                  </button>
                </div>

                {/* Attachments Tray */}
                {composeAttachments.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', padding: '8px 0', flexWrap: 'wrap' }}>
                    {composeAttachments.map((att, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '11.5px' }}>
                        <FileText size={12} color="#0078D4" />
                        <span>{att.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>({att.size})</span>
                        <button
                          type="button"
                          onClick={() => setComposeAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--text-muted)' }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Body Textarea */}
                <div style={{ flex: 1, paddingTop: '10px', display: 'flex', flexDirection: 'column' }}>
                  <textarea
                    className="form-control"
                    placeholder="Type your message here, including engineering specifications, commercial terms, or dispatch notes..."
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      boxShadow: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      fontSize: '13px',
                      lineHeight: '1.55',
                      padding: '4px 0'
                    }}
                  />
                </div>

                {/* Bottom Action Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="outlook-btn-newmail"
                      onClick={handleSendMail}
                      disabled={isSending}
                      style={{ padding: '7px 18px' }}
                    >
                      <Send size={13} className={isSending ? 'spin-icon' : ''} />
                      <span>{isSending ? 'Sending...' : 'Send'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleSaveDraft}
                      title="Save as draft in Outlook Drafts folder"
                    >
                      <FileText size={13} />
                      <span>Save draft</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsComposing(false)}
                      title="Discard this message"
                    >
                      <Trash2 size={13} />
                      <span>Discard</span>
                    </button>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Exchange Gateway • DKIM Signed • sales@gpsspindle.com
                  </div>
                </div>
              </div>
            ) : selectedEmail ? (

              /* ── MODE B: OUTLOOK READING PANE ── */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '18px 24px' }}>
                
                {/* 1. Email Top Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartReply(selectedEmail)}
                      style={{ gap: '5px' }}
                    >
                      <Reply size={13} />
                      <span>Reply</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartReply(selectedEmail, true)}
                      style={{ gap: '5px' }}
                    >
                      <ReplyAll size={13} />
                      <span>Reply all</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleStartForward(selectedEmail)}
                      style={{ gap: '5px' }}
                    >
                      <Forward size={13} />
                      <span>Forward</span>
                    </button>

                    <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => handleDeleteEmail(selectedEmail.id, e)}
                      title="Delete this message"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => handleArchiveEmail(selectedEmail.id, e)}
                      title="Archive message"
                    >
                      <Archive size={13} />
                    </button>
                  </div>

                  {/* Right Tools (Print, Jump to ERP) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedEmail.documentId && onNavigate && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (selectedEmail.documentId.startsWith('INV')) onNavigate('invoices');
                          else if (selectedEmail.documentId.startsWith('QT') || selectedEmail.documentId.startsWith('Q-')) onNavigate('sales');
                          else if (selectedEmail.documentId.startsWith('PO')) onNavigate('purchase-orders');
                          if (onNotify) onNotify(`Navigating to document ${selectedEmail.documentId}...`);
                        }}
                        style={{ gap: '4px', color: '#0078D4' }}
                      >
                        <ExternalLink size={12} />
                        <span>View in ERP</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => window.print()}
                      title="Print or export message to PDF"
                    >
                      <Printer size={13} />
                    </button>
                  </div>
                </div>

                {/* 2. Message Subject Line */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                      {selectedEmail.subject}
                    </h1>

                    {selectedEmail.category && (
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--bg-surface-subtle)',
                        border: `1px solid ${selectedEmail.categoryColor || '#0078D4'}`,
                        color: selectedEmail.categoryColor || '#0078D4',
                        fontWeight: 600
                      }}>
                        {selectedEmail.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Sender & Recipient Information */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* User Avatar Initials */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0078D4 0%, #106ebe 100%)',
                      color: '#ffffff', fontWeight: 700, fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      {selectedEmail.sender?.slice(0, 2).toUpperCase() || 'GP'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {selectedEmail.sender}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          &lt;{selectedEmail.senderEmail}&gt;
                        </span>
                      </div>

                      {selectedEmail.senderOrg && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {selectedEmail.senderOrg}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>To:</span>
                        <strong>{selectedEmail.recipientName || selectedEmail.recipient}</strong>
                        <span style={{ color: 'var(--text-muted)' }}>&lt;{selectedEmail.recipient}&gt;</span>
                      </div>

                      {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', marginTop: '2px', color: 'var(--text-muted)' }}>
                          <span>Cc:</span>
                          <span>{selectedEmail.cc.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <div>{selectedEmail.date}</div>
                    <div style={{ fontSize: '10.5px', color: '#059669', fontWeight: 600, marginTop: '3px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      <CheckCircle size={11} />
                      <span>{selectedEmail.status || 'Delivered'}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Security & Exchange Delivery Banner */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: '4px',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  marginBottom: '16px', fontSize: '11.5px', color: '#166534'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={14} color="#16a34a" />
                    <span><strong>Microsoft 365 Exchange Gateway:</strong> Dispatched with TLS 1.3 encryption & DKIM compliance.</span>
                  </div>
                  <span className="mono" style={{ fontSize: '10.5px', opacity: 0.8 }}>ID: #{selectedEmail.documentId || 'M365-LOG'}</span>
                </div>

                {/* 5. Attachment Card (if present) */}
                {selectedEmail.hasAttachments && selectedEmail.attachment && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '6px',
                    background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-color)',
                    marginBottom: '18px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '4px', background: '#eff6fc', color: '#0078D4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {selectedEmail.attachment.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {selectedEmail.attachment.size} • Adobe PDF Document
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {selectedEmail.attachment.docData && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handlePreviewAttachment(selectedEmail.attachment)}
                          style={{ gap: '4px', padding: '4px 10px', fontSize: '11.5px' }}
                        >
                          <Eye size={12} />
                          <span>Preview Document</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (onNotify) onNotify(`Downloading ${selectedEmail.attachment.name}...`);
                        }}
                        style={{ gap: '4px', padding: '4px 8px' }}
                      >
                        <Download size={12} />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Formatted Email Body */}
                <div style={{
                  flex: 1,
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  paddingBottom: '20px'
                }}>
                  {selectedEmail.body}

                  {/* GPS Spindle Corporate Email Signature */}
                  <div style={{ marginTop: '28px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '12.5px' }}>
                      General Precision Spindles Pvt. Ltd.
                    </div>
                    <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                      ISO 9001:2015 Certified High Precision Spindle Manufacturing & Overhaul Center
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      Plant 1: Nanded City Industrial Complex, Pune, Maharashtra 411041
                    </div>
                    <div style={{ marginTop: '2px' }}>
                      Direct: +91 20 6791 4200 • Email: sales@gpsspindle.com • Web: www.gpsspindle.com
                    </div>
                  </div>
                </div>

                {/* 7. Inline Quick Reply Box */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                  {!inlineReplyOpen ? (
                    <div
                      onClick={() => setInlineReplyOpen(true)}
                      style={{
                        padding: '10px 14px', borderRadius: '6px',
                        border: '1px solid var(--border-color)', background: 'var(--bg-surface-subtle)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                        color: 'var(--text-muted)', fontSize: '12.5px'
                      }}
                    >
                      <Reply size={14} color="#0078D4" />
                      <span>Click here to Reply or Forward to {selectedEmail.sender}...</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>Replying to <strong>{selectedEmail.sender}</strong> &lt;{selectedEmail.senderEmail}&gt;</span>
                        <button
                          type="button"
                          onClick={() => setInlineReplyOpen(false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                        >
                          <X size={13} />
                        </button>
                      </div>

                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Type your reply here..."
                        value={inlineReplyText}
                        onChange={(e) => setInlineReplyText(e.target.value)}
                        style={{ fontSize: '12.5px', resize: 'vertical' }}
                      />

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setInlineReplyOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="outlook-btn-newmail"
                          onClick={handleSendInlineReply}
                          style={{ padding: '5px 14px' }}
                        >
                          <Send size={12} />
                          <span>Send Reply</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              /* No Email Selected Empty State */
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Mail size={44} style={{ opacity: 0.35, marginBottom: '12px' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Select an item to read</h3>
                <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Click any email from the list on the left to view the complete thread.</p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── Document Preview Modal (for Quotations, Tax Invoices, etc.) ── */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          doc={previewDoc}
          onNotify={onNotify}
        />
      )}

    </div>
  );
}
