import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Mail, Send, Inbox, Archive, Trash2, Clock, CheckCircle, AlertCircle, 
  RefreshCw, Plus, Search, Filter, Star, Flag, Paperclip, FileText, 
  Download, Reply, ReplyAll, Forward, MoreHorizontal, ChevronDown, 
  ChevronRight, Tag, Folder, FolderInput, ShieldAlert, Pin, Eye, 
  Printer, X, Check, Bold, Italic, Underline, List, AlignLeft, 
  Sparkles, ExternalLink, ShieldCheck, User, Building2, AtSign, 
  CornerDownRight, CornerUpLeft, CornerUpRight, Undo2, ArrowUpDown,
  LayoutList, Monitor, RotateCcw, Calendar, CheckSquare, HelpCircle,
  Menu, ArrowLeft, ArrowRight, Share2, Layers, CheckCheck, PenSquare,
  Settings
} from 'lucide-react';
import Modal from '../components/common/Modal';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import { 
  fetchEmailActivityLive, 
  sendEmail, 
  DEFAULT_SENDER, 
  EMAIL_TEMPLATES, 
  generateEmailContent,
  CUSTOMER_EMAILS,
  SUPPLIER_EMAILS
} from '../services/emailService';
import { emailService as dbEmailService } from '../services/database/emailService';
import { INTERNAL_GPS_CCS } from '../data/contactsData';

// ─────────────────────────────────────────────────────────────────────────────
// COMPREHENSIVE ENTERPRISE MAIL DATABASE (REALISTIC OUTLOOK TEST DATA)
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_OUTLOOK_EMAILS = [
  // ── Sent Items ──
  {
    id: 'msg-sent-1',
    folder: 'sent',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'tanmay@tataadvanced.com',
    recipientName: 'Mr. Tanmay Sharma',
    customer: 'Tata Advanced Systems Ltd',
    allRecipients: ['tanmay@tataadvanced.com'],
    cc: ['purchase@tataadvanced.com', 'accounts@tataadvanced.com', 'sales.west@gpsspindle.com'],
    subject: 'Quotation QTN-2026-0184: 4x BT-40 24,000 RPM Spindle Overhaul & Drive Pack',
    date: 'Today, 11:45 AM',
    timestamp: Date.now() - 3600000 * 2,
    documentId: 'QTN-2026-0184',
    documentType: 'Quotation',
    category: 'Quotation',
    categoryColor: '#7A1F3D',
    status: 'Delivered',
    isUnread: false,
    isFlagged: true,
    isPinned: true,
    hasAttachments: true,
    attachment: {
      name: 'Quotation_QT-2026-0184.pdf',
      size: '485 KB',
      type: 'Quotation',
      docData: {
        id: 'QTN-2026-0184',
        estimateNo: 'QTN-2026-0184',
        type: 'Quotation',
        customer: 'Tata Advanced Systems Ltd',
        customerContact: 'Mr. Tanmay Sharma (DGM - Procurement)',
        billingAddress: 'Plot 41, Aerospace SEZ, Chakan Phase II, Pune - 410501',
        gstin: '27AABCT2934K1Z4',
        date: '20 Oct 2026',
        validUntil: '19 Nov 2026',
        items: [
          { description: 'BT-40 24,000 RPM High Precision Motorized Spindle Overhaul with Hybrid Ceramic Bearings', quantity: 4, rate: 85000, amount: 340000 },
          { description: 'Dynamic Balancing G0.4, Runout Inspection & Vibration Analysis Certificate', quantity: 4, rate: 12500, amount: 50000 },
          { description: 'Pneumatic Tool Clamping Collet & Rotary Union Precision Replacement Kit', quantity: 4, rate: 15000, amount: 60000 }
        ],
        subtotal: 450000,
        cgst: 40500,
        sgst: 40500,
        totalAmount: 531000,
        terms: 'Delivery within 14 working days. 100% tested under load. 12 months comprehensive spindle warranty.'
      }
    },
    body: `Dear Mr. Tanmay Sharma,\n\nWe are pleased to submit our formal commercial quotation QTN-2026-0184 for the complete precision overhaul and balancing of 4 units of BT-40 24,000 RPM Motorized Spindles for your CNC machining center at Aerospace SEZ, Chakan.\n\nPlease find the detailed techno-commercial quotation attached as an Adobe PDF document. The overhaul will include OEM-grade high-precision hybrid ceramic bearings, ISO 1940-1 Grade G0.4 dynamic balancing, and complete vibration analysis.\n\nAll systematic billing and commercial contacts have been CC'd for fast procurement clearance.\n\nWarm regards,\nRahul Patil\nCommercial Head & Technical Sales\nGeneral Precision Spindles Pvt. Ltd.\nPlant: Plot 12, S-Block, MIDC Bhosari, Pune - 411026`
  },
  {
    id: 'msg-sent-2',
    folder: 'sent',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'procurement@bharatforge.com',
    recipientName: 'Mr. Sunil Kadam',
    customer: 'Bharat Forge Ltd',
    allRecipients: ['procurement@bharatforge.com'],
    cc: ['sunil.kadam@bharatforge.com', 'finance@bharatforge.com', 'billing@gpsspindle.com'],
    subject: 'Tax Invoice INV-2026-0098 & E-Way Bill: High-Speed Spindle Overhaul Completed',
    date: 'Today, 09:15 AM',
    timestamp: Date.now() - 3600000 * 5,
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
      name: 'Tax_Invoice_INV-2026-0098.pdf',
      size: '520 KB',
      type: 'Tax Invoice',
      docData: {
        id: 'INV-2026-0098',
        invoiceNumber: 'INV-2026-0098',
        type: 'Tax Invoice',
        customer: 'Bharat Forge Ltd',
        customerContact: 'Mr. Sunil Kadam (DGM - Maintenance & Tooling)',
        billingAddress: 'Mundhwa, Pune Cantonment, Pune - 411036',
        gstin: '27AAACB0128C1Z6',
        date: '20 Oct 2026',
        dueDate: '19 Nov 2026',
        refOrder: 'PO-BF-2026-8812',
        items: [
          { description: 'HSK-A63 Direct Drive Motorized Spindle Complete Overhaul & Dynamic Balancing', quantity: 2, rate: 120000, amount: 240000 },
          { description: 'Hydraulic Tool Release Drawbar Assembly Calibration & Gripper Overhaul', quantity: 2, rate: 22000, amount: 44000 }
        ],
        subtotal: 284000,
        cgst: 25560,
        sgst: 25560,
        totalAmount: 335120,
        ewbNumber: '241829402914',
        paymentStatus: 'Pending'
      }
    },
    body: `Dear Mr. Sunil Kadam,\n\nGreetings from General Precision Spindles Pvt. Ltd.\n\nWe have completed the dynamic balancing and full load testing of your 2 units of HSK-A63 motorized spindles under your purchase order PO-BF-2026-8812. Both spindles are packed in wooden export crates and dispatched via SafeExpress Logistics.\n\nPlease find attached the formal GST Tax Invoice INV-2026-0098 along with the corresponding E-Way Bill (241829402914) for inward gate clearance.\n\nThank you for your valued partnership.\n\nBest regards,\nAccounts & Logistics Team\nGeneral Precision Spindles Pvt. Ltd.`
  },
  {
    id: 'msg-sent-3',
    folder: 'sent',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'r.nair@schaeffler.com',
    recipientName: 'Mr. Rajesh Nair',
    customer: 'Schaeffler India',
    allRecipients: ['r.nair@schaeffler.com'],
    cc: ['orders@schaeffler.com', 'accounts@schaeffler.com'],
    subject: 'Purchase Order PO-2026-0052: Super Precision Angular Contact Spindle Bearings',
    date: 'Yesterday, 05:30 PM',
    timestamp: Date.now() - 3600000 * 20,
    documentId: 'PO-2026-0052',
    documentType: 'Purchase Order',
    category: 'Purchase Order',
    categoryColor: '#059669',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'PO_PO-2026-0052.pdf',
      size: '340 KB',
      type: 'Purchase Order',
      docData: {
        id: 'PO-2026-0052',
        poNumber: 'PO-2026-0052',
        type: 'Purchase Order',
        supplier: 'Schaeffler India',
        supplierContact: 'Mr. Rajesh Nair (Sales Director - Spindle Bearings)',
        supplierAddress: 'Maneja, Vadodara, Gujarat - 390013',
        supplierGstin: '24AAACS3829L1Z5',
        date: '19 Oct 2026',
        items: [
          { description: 'FAG B7008-C-2RSD-T-P4S-UL Super Precision Angular Contact Spindle Bearings (Matched Set of 4)', quantity: 12, rate: 18500, amount: 222000 },
          { description: 'FAG HCB7006-E-2RSD-T-P4S-UL Ceramic Hybrid Bearings Matched Pairs', quantity: 8, rate: 26000, amount: 208000 }
        ],
        subtotal: 430000,
        igst: 77400,
        totalAmount: 507400
      }
    },
    body: `Dear Mr. Rajesh Nair,\n\nPlease find attached our formal Purchase Order PO-2026-0052 for matched sets of FAG B7008 and ceramic hybrid HCB7006 P4S precision spindle bearings required for our upcoming aerospace spindle batch.\n\nKindly acknowledge receipt and confirm delivery schedule to our Bhosari plant, Pune.\n\nRegards,\nProcurement Desk\nGeneral Precision Spindles Pvt. Ltd.`
  },
  {
    id: 'msg-sent-4',
    folder: 'sent',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'maintenance@godrejaerospace.com',
    recipientName: 'Ms. Anita Saxena',
    customer: 'Godrej & Boyce Aerospace',
    allRecipients: ['maintenance@godrejaerospace.com'],
    cc: ['anita.s@godrej.com', 'finance@godrej.com'],
    subject: 'Proforma Invoice PI-2026-0031: 5-Axis Direct Drive Spindle Replacement Project',
    date: '19 Oct 2026, 02:10 PM',
    timestamp: Date.now() - 3600000 * 24,
    documentId: 'PI-2026-0031',
    documentType: 'Proforma Invoice',
    category: 'Proforma Invoice',
    categoryColor: '#0d9488',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'Proforma_Invoice_PI-2026-0031.pdf',
      size: '410 KB',
      type: 'Proforma Invoice',
      docData: {
        id: 'PI-2026-0031',
        piNumber: 'PI-2026-0031',
        type: 'Proforma Invoice',
        customer: 'Godrej & Boyce Aerospace',
        customerContact: 'Ms. Anita Saxena (Lead - Aerospace Tooling)',
        billingAddress: 'Plant 14, Pirojshanagar, Vikhroli West, Mumbai - 400079',
        gstin: '27AAACG0821M1ZT',
        date: '19 Oct 2026',
        dueDate: '02 Nov 2026',
        items: [
          { description: 'Custom Direct Drive High Torque Spindle for Inconel Machining (30,000 RPM)', quantity: 1, rate: 380000, amount: 380000 },
          { description: 'Heidenhain EnDat 2.2 Rotary Encoder Pre-installed & Tuned', quantity: 1, rate: 95000, amount: 95000 }
        ],
        subtotal: 475000,
        cgst: 42750,
        sgst: 42750,
        totalAmount: 560500
      }
    },
    body: `Dear Ms. Anita Saxena,\n\nFollowing our technical alignment meeting, please find attached Proforma Invoice PI-2026-0031 for the 30,000 RPM Direct Drive Spindle with EnDat 2.2 encoder for your 5-axis aerospace machining cell.\n\nUpon release of the 30% commercial advance, production allocation and material procurement will be initiated immediately.\n\nWarm regards,\nRahul Patil\nGeneral Precision Spindles Pvt. Ltd.`
  },
  {
    id: 'msg-sent-5',
    folder: 'sent',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'purchase@linamar.com',
    recipientName: 'Mr. Rajesh Verma',
    customer: 'LINAMAR INDIA PRIVATE LIMITED',
    allRecipients: ['purchase@linamar.com'],
    cc: ['plant.head@linamar.com', 'accounts@linamar.com'],
    subject: 'Service Teardown Inspection Report SRV-2026-0019: Bearing Raceway Failure Analysis',
    date: '18 Oct 2026, 04:45 PM',
    timestamp: Date.now() - 3600000 * 44,
    documentId: 'SRV-2026-0019',
    documentType: 'Service Report',
    category: 'Service Report',
    categoryColor: '#7c3aed',
    status: 'Delivered',
    isUnread: false,
    isFlagged: true,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'Service_Report_SRV-2026-0019.pdf',
      size: '640 KB',
      type: 'Service Report',
      docData: {
        id: 'SRV-2026-0019',
        type: 'Service Report',
        customer: 'LINAMAR INDIA PRIVATE LIMITED',
        customerContact: 'Mr. Rajesh Verma (Materials & Plant Maintenance)',
        failureDescription: 'High vibration (>6.2 mm/s RMS) and temperature spike at front bearing journal during rough milling.',
        date: '18 Oct 2026'
      }
    },
    body: `Dear Mr. Rajesh Verma,\n\nOur service engineering team has dismantled your received Makino spindle (Serial # MK-8821) and conducted comprehensive metrology inspection. The root cause of abnormal vibration has been confirmed as electrical discharge pitting and coolant ingress in the front duplex bearing pack.\n\nPlease find attached the complete Service Teardown Report SRV-2026-0019 with microscopic imagery and overhaul recommendations.\n\nSincerely,\nService & Diagnostics Department\nGeneral Precision Spindles Pvt. Ltd.`
  },
  {
    id: 'msg-sent-6',
    folder: 'sent',
    tab: 'other',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'logistics@bluedart.com',
    recipientName: 'Blue Dart Logistics Desk',
    customer: 'Blue Dart Express Ltd',
    allRecipients: ['logistics@bluedart.com'],
    cc: ['dispatch@gpsspindle.com'],
    subject: 'Outward Consignment Gate Pass & Delivery Challan DC-2026-0042',
    date: '18 Oct 2026, 11:15 AM',
    timestamp: Date.now() - 3600000 * 50,
    documentId: 'DC-2026-0042',
    documentType: 'Delivery Challan',
    category: 'Delivery Challan',
    categoryColor: '#d97706',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'Delivery_Challan_DC-2026-0042.pdf',
      size: '290 KB',
      type: 'Delivery Challan'
    },
    body: `Please note that 2 crates containing calibrated precision spindles have been loaded onto vehicle MH-12-RN-4820 under Delivery Challan DC-2026-0042 for express air delivery to Bangalore.`
  },

  // ── Inbox Items ──
  {
    id: 'msg-inbox-1',
    folder: 'inbox',
    tab: 'focused',
    sender: 'Tanmay Sharma',
    senderEmail: 'tanmay@tataadvanced.com',
    senderOrg: 'Tata Advanced Systems Ltd',
    recipient: 'sales@gpsspindle.com',
    recipientName: 'Rahul Patil',
    customer: 'Tata Advanced Systems Ltd',
    allRecipients: ['sales@gpsspindle.com'],
    cc: ['purchase.lead@tataadvanced.com'],
    subject: 'Purchase Order Released: PO-TASL-2026-0491 against QTN-2026-0184',
    date: 'Today, 12:30 PM',
    timestamp: Date.now() - 3600000 * 1,
    documentId: 'PO-TASL-0491',
    documentType: 'Purchase Order',
    category: 'Purchase Order',
    categoryColor: '#059669',
    status: 'Delivered',
    isUnread: true,
    isFlagged: true,
    isPinned: true,
    hasAttachments: true,
    attachment: {
      name: 'PO_TASL_2026_0491.pdf',
      size: '512 KB',
      type: 'Purchase Order'
    },
    body: `Dear Rahul,\n\nWe are pleased to issue our formal Purchase Order PO-TASL-2026-0491 for the complete precision overhaul of 4 units of BT-40 24,000 RPM motorized spindles as per your quoted technical terms.\n\nPlease find the signed and approved PO copy attached. Kindly acknowledge receipt and advise estimated dispatch date.\n\nBest regards,\nTanmay Sharma\nDGM - Strategic Sourcing & Procurement\nTata Advanced Systems Ltd`
  },
  {
    id: 'msg-inbox-2',
    folder: 'inbox',
    tab: 'focused',
    sender: 'Sunil Kadam',
    senderEmail: 'procurement@bharatforge.com',
    senderOrg: 'Bharat Forge Ltd',
    recipient: 'sales@gpsspindle.com',
    recipientName: 'Rahul Patil',
    customer: 'Bharat Forge Ltd',
    allRecipients: ['sales@gpsspindle.com'],
    cc: ['accounts@bharatforge.com'],
    subject: 'Payment Advice: NEFT UTR #ICIC99482019 cleared against INV-2026-0098',
    date: 'Today, 10:15 AM',
    timestamp: Date.now() - 3600000 * 3,
    documentId: 'INV-2026-0098',
    documentType: 'Tax Invoice',
    category: 'Tax Invoice',
    categoryColor: '#0284c7',
    status: 'Delivered',
    isUnread: true,
    isFlagged: false,
    isPinned: false,
    hasAttachments: false,
    body: `Dear Accounts Team,\n\nWe have initiated NEFT payment of ₹3,35,120/- toward your Tax Invoice INV-2026-0098 for the HSK-A63 spindle overhaul. UTR Reference: ICIC99482019.\n\nKindly update your ledgers and share formal receipt.\n\nRegards,\nSunil Kadam\nBharat Forge Ltd`
  },
  {
    id: 'msg-inbox-3',
    folder: 'inbox',
    tab: 'focused',
    sender: 'Vikram Joshi',
    senderEmail: 'v.joshi@lt-heavy.com',
    senderOrg: 'Larsen & Toubro Heavy Engineering',
    recipient: 'sales@gpsspindle.com',
    recipientName: 'Rahul Patil',
    customer: 'L&T Heavy Engineering',
    allRecipients: ['sales@gpsspindle.com'],
    cc: ['tooling.head@lt-heavy.com'],
    subject: 'Urgent RFQ: In-situ Hydrostatic Spindle Reconditioning (3-Meter Borer)',
    date: 'Yesterday, 04:20 PM',
    timestamp: Date.now() - 3600000 * 21,
    documentId: 'RFQ-LT-2026-09',
    documentType: 'Quotation',
    category: 'Quotation',
    categoryColor: '#7A1F3D',
    status: 'Delivered',
    isUnread: false,
    isFlagged: true,
    isPinned: false,
    hasAttachments: true,
    attachment: {
      name: 'Technical_Spec_Hydrostatic_Spindle.pdf',
      size: '1.2 MB',
      type: 'Quotation'
    },
    body: `Dear Rahul,\n\nWe require urgent on-site diagnostic inspection and potential rebuild quotation for our heavy horizontal floor borer hydrostatic spindle at Hazira Manufacturing Complex. Journal radial play has exceeded 0.015 mm.\n\nPlease review attached technical drawings and confirm if your specialized cleanroom technician can visit our site this Thursday.\n\nRegards,\nVikram Joshi\nLead - Plant Reliability\nL&T Heavy Engineering`
  },
  {
    id: 'msg-inbox-4',
    folder: 'inbox',
    tab: 'other',
    sender: 'Microsoft 365 Security',
    senderEmail: 'alerts@microsoft.com',
    senderOrg: 'Microsoft 365 Exchange Gateway',
    recipient: 'sales@gpsspindle.com',
    recipientName: 'GPS Exchange Admin',
    customer: 'Microsoft Exchange Online',
    allRecipients: ['sales@gpsspindle.com'],
    cc: [],
    subject: 'Weekly Electronic Transmission Gateway Delivery Digest: 99.8% Success Rate',
    date: '18 Oct 2026, 08:00 AM',
    timestamp: Date.now() - 3600000 * 52,
    documentId: 'M365-DIGEST',
    documentType: 'Commercial Mail',
    category: 'Exchange Notice',
    categoryColor: '#605e5c',
    status: 'Delivered',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: false,
    body: `Microsoft 365 Exchange Online Report:\nTotal Outward Transmissions: 148\nDKIM Validated: 100%\nTLS 1.3 Handshake Rate: 100%\nBounce Rate: 0.2%\nAll commercial invoices, quotations, and challans successfully delivered to customer mail exchanges.`
  },

  // ── Drafts ──
  {
    id: 'msg-draft-1',
    folder: 'drafts',
    tab: 'focused',
    sender: 'Rahul Patil',
    senderEmail: 'sales@gpsspindle.com',
    senderOrg: 'General Precision Spindles Pvt. Ltd.',
    recipient: 'procurement@kirloskar.com',
    recipientName: 'Mr. Arvind Kirloskar',
    customer: 'Kirloskar Oil Engines Ltd',
    allRecipients: ['procurement@kirloskar.com'],
    cc: ['engineering@gpsspindle.com'],
    subject: 'Draft: Commercial Proposal for Annual Comprehensive Spindle Maintenance Contract (CMC)',
    date: 'Today, 11:00 AM',
    timestamp: Date.now() - 3600000 * 2.5,
    documentId: 'CMC-PROP-2026',
    documentType: 'Quotation',
    category: 'Quotation',
    categoryColor: '#7A1F3D',
    status: 'Draft',
    isUnread: false,
    isFlagged: false,
    isPinned: false,
    hasAttachments: false,
    body: `Dear Mr. Arvind Kirloskar,\n\nFurther to our plant audit, we are preparing our comprehensive maintenance proposal covering your 18 CNC machining center spindles...`
  }
];

export default function EmailActivityScreen({ onNavigate, onNotify }) {
  // Folder & View Navigation
  const [currentFolder, setCurrentFolder] = useState('sent'); // 'sent' | 'inbox' | 'drafts' | 'archive' | 'deleted' | 'junk' | 'flagged' | 'category-*'
  const [activeTab, setActiveTab] = useState('focused'); // 'focused' | 'other'
  const [outlookQuickFilter, setOutlookQuickFilter] = useState('all'); // 'all' | 'unread' | 'flagged' | 'has_files'
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState(null);
  const [selectedEmailId, setSelectedEmailId] = useState('msg-sent-1');
  const [sortDescending, setSortDescending] = useState(true);

  // Mobile App Experience States (Master-Detail & Drawer)
  const [isMobileReaderOpen, setIsMobileReaderOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Email Master State with localStorage persistence
  const [emails, setEmails] = useState(() => {
    try {
      const saved = localStorage.getItem('gps_outlook_emails');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}
    return INITIAL_OUTLOOK_EMAILS;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Modal Dialog States
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDocData, setComposerDocData] = useState(null);
  const [composerDocType, setComposerDocType] = useState('quotation');

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Inline Quick Reply inside Reading Pane
  const [inlineReplyOpen, setInlineReplyOpen] = useState(false);
  const [inlineReplyText, setInlineReplyText] = useState('');

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gps_outlook_emails', JSON.stringify(emails));
    } catch (_e) {}
  }, [emails]);

  // Sync with Live Supabase Database
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
                customer: dbMail.customer || dbMail.recipient,
                allRecipients: dbMail.allRecipients || [dbMail.recipient],
                cc: dbMail.cc || [],
                subject: dbMail.subject,
                date: dbMail.date || 'Today',
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
                  size: '320 KB',
                  type: dbMail.documentType,
                  docData: { id: dbMail.documentId, customer: dbMail.customer, totalAmount: 450000, type: dbMail.documentType }
                } : null,
                body: dbMail.fullBody || dbMail.bodySnippet || 'Electronic transmission successfully logged in Microsoft Exchange registry.'
              });
            }
          });
          return updated;
        });
      }
      if (onNotify) onNotify('Synchronized with Microsoft 365 Exchange Gateway.');
    } catch (_err) {
      if (onNotify) onNotify('Exchange sync completed with local cached records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncWithLiveDatabase();
  }, []);

  // Filtered Messages for Outlook 3-Pane View
  const filteredEmails = useMemo(() => {
    return emails.filter(mail => {
      // 1. Folder Matching
      if (currentFolder === 'flagged') {
        if (!mail.isFlagged) return false;
      } else if (currentFolder === 'category-quotation') {
        if (!(mail.documentType || '').toLowerCase().includes('quot') && !(mail.category || '').toLowerCase().includes('quot')) return false;
      } else if (currentFolder === 'category-invoice') {
        if (!(mail.documentType || '').toLowerCase().includes('inv') && !(mail.category || '').toLowerCase().includes('inv')) return false;
      } else if (currentFolder === 'category-po') {
        if (!(mail.documentType || '').toLowerCase().includes('order') && !(mail.category || '').toLowerCase().includes('po')) return false;
      } else if (currentFolder === 'category-proforma') {
        if (!(mail.documentType || '').toLowerCase().includes('proforma') && !(mail.category || '').toLowerCase().includes('proforma')) return false;
      } else if (currentFolder === 'category-service') {
        if (!(mail.documentType || '').toLowerCase().includes('serv') && !(mail.category || '').toLowerCase().includes('serv')) return false;
      } else if (currentFolder === 'category-dispatch') {
        if (!(mail.documentType || '').toLowerCase().includes('challan') && !(mail.category || '').toLowerCase().includes('challan') && !(mail.documentType || '').toLowerCase().includes('dispatch')) return false;
      } else {
        if (mail.folder !== currentFolder) return false;
      }

      // 2. Focused vs Other tab matching (applicable to inbox and sent)
      if (activeTab && mail.tab && mail.tab !== activeTab) {
        // allow fallback if nothing matches
      }

      // 3. Client Account Filter
      if (accountFilter) {
        const text = `${mail.senderOrg} ${mail.recipientName} ${mail.customer || ''} ${mail.subject}`.toLowerCase();
        if (!text.includes(accountFilter.toLowerCase())) return false;
      }

      // 4. Quick Filter Pills
      if (outlookQuickFilter === 'unread' && !mail.isUnread) return false;
      if (outlookQuickFilter === 'flagged' && !mail.isFlagged) return false;
      if (outlookQuickFilter === 'has_files' && !mail.hasAttachments) return false;

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matched = 
          mail.subject?.toLowerCase().includes(q) ||
          mail.sender?.toLowerCase().includes(q) ||
          mail.recipient?.toLowerCase().includes(q) ||
          mail.customer?.toLowerCase().includes(q) ||
          mail.documentId?.toLowerCase().includes(q) ||
          mail.body?.toLowerCase().includes(q);
        if (!matched) return false;
      }

      return true;
    }).sort((a, b) => {
      const diff = (b.timestamp || 0) - (a.timestamp || 0);
      return sortDescending ? diff : -diff;
    });
  }, [emails, currentFolder, activeTab, accountFilter, outlookQuickFilter, searchQuery, sortDescending]);

  // Active Selected Email
  const selectedEmail = useMemo(() => {
    return emails.find(e => e.id === selectedEmailId) || filteredEmails[0] || null;
  }, [emails, selectedEmailId, filteredEmails]);

  // Actions
  const handleSelectEmail = (mail) => {
    setSelectedEmailId(mail.id);
    setIsMobileReaderOpen(true);
    setInlineReplyOpen(false);
    if (mail.isUnread) {
      setEmails(prev => prev.map(e => e.id === mail.id ? { ...e, isUnread: false } : e));
    }
  };

  const handleToggleFlag = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, isFlagged: !m.isFlagged } : m));
    if (onNotify) onNotify('Updated follow-up flag.');
  };

  const handleTogglePin = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, isPinned: !m.isPinned } : m));
  };

  const handleToggleRead = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, isUnread: !m.isUnread } : m));
  };

  const handleDeleteEmail = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, folder: 'deleted' } : m));
    if (onNotify) onNotify('Moved message to Deleted Items.');
    if (selectedEmailId === mailId) {
      const remaining = filteredEmails.filter(m => m.id !== mailId);
      setSelectedEmailId(remaining[0]?.id || null);
    }
  };

  const handleArchiveEmail = (mailId, e) => {
    if (e) e.stopPropagation();
    setEmails(prev => prev.map(m => m.id === mailId ? { ...m, folder: 'archive' } : m));
    if (onNotify) onNotify('Archived conversation.');
    if (selectedEmailId === mailId) {
      const remaining = filteredEmails.filter(m => m.id !== mailId);
      setSelectedEmailId(remaining[0]?.id || null);
    }
  };

  // Preview Document in Modal
  const handlePreviewDoc = (mail) => {
    if (mail.attachment?.docData) {
      setPreviewDoc(mail.attachment.docData);
      setIsPreviewOpen(true);
    } else {
      const fallbackDoc = {
        id: mail.documentId || 'DOC-2026',
        type: mail.documentType || 'Tax Invoice',
        customer: mail.customer || mail.recipientName || 'Valued Client',
        customerContact: mail.recipientName || 'Procurement Desk',
        billingAddress: 'Client Manufacturing Facility, MIDC Industrial Area, Pune',
        date: mail.date || '20 Oct 2026',
        items: [
          { description: mail.subject || 'Precision Spindle Overhaul Services', quantity: 1, rate: 285000, amount: 285000 }
        ],
        subtotal: 285000,
        cgst: 25650,
        sgst: 25650,
        totalAmount: 336300
      };
      setPreviewDoc(fallbackDoc);
      setIsPreviewOpen(true);
    }
  };

  // Resend / Reply opens OutlookEmailComposer
  const handleResend = (mail) => {
    setComposerDocData({
      id: mail.documentId || 'DOC-2026',
      customer: mail.customer || mail.recipientName || 'Client',
      customerContact: mail.recipientName,
      customerEmail: mail.recipient,
      totalAmount: 350000,
      subject: `Re: ${mail.subject}`,
      items: [{ description: mail.subject, quantity: 1, rate: 350000, amount: 350000 }]
    });
    setComposerDocType(mail.documentType?.toLowerCase().includes('inv') ? 'invoice' : 'quotation');
    setIsComposerOpen(true);
  };

  // Reply All opens OutlookEmailComposer with CCs preserved
  const handleReplyAll = (mail) => {
    setComposerDocData({
      id: mail.documentId || 'DOC-2026',
      customer: mail.customer || mail.recipientName || 'Client',
      customerContact: mail.recipientName,
      customerEmail: mail.recipient,
      cc: mail.cc || [],
      totalAmount: 350000,
      subject: `Re: ${mail.subject}`,
      items: [{ description: mail.subject, quantity: 1, rate: 350000, amount: 350000 }]
    });
    setComposerDocType(mail.documentType?.toLowerCase().includes('inv') ? 'invoice' : 'quotation');
    setIsComposerOpen(true);
  };

  // Compose new email
  const handleOpenNewTransmission = () => {
    setComposerDocData({
      id: `COMM-${Date.now().toString().slice(-4)}`,
      customer: 'Tata Advanced Systems Ltd',
      customerContact: 'Mr. Tanmay Sharma',
      customerEmail: 'tanmay@tataadvanced.com',
      totalAmount: 450000,
      subject: 'Commercial Intimation: Spindle Inspection & Overhaul Dispatch',
      items: [{ description: 'High Precision Motorized Spindle Overhaul Services', quantity: 1, rate: 450000, amount: 450000 }]
    });
    setComposerDocType('quotation');
    setIsComposerOpen(true);
  };

  // Callback when email is sent
  const handleComposerSent = (sentData) => {
    setIsComposerOpen(false);
    const newRecord = {
      id: `msg-sent-${Date.now()}`,
      folder: 'sent',
      tab: 'focused',
      sender: 'Rahul Patil',
      senderEmail: DEFAULT_SENDER,
      senderOrg: 'General Precision Spindles Pvt. Ltd.',
      recipient: sentData?.to?.[0] || 'client@customer.com',
      recipientName: sentData?.customer || sentData?.to?.[0] || 'Client Organization',
      customer: sentData?.customer || 'Client Organization',
      allRecipients: sentData?.to || ['client@customer.com'],
      cc: sentData?.cc || [],
      subject: sentData?.subject || 'Commercial Electronic Dispatch',
      date: 'Today, Just now',
      timestamp: Date.now(),
      documentId: sentData?.documentId || `TX-${Date.now().toString().slice(-4)}`,
      documentType: sentData?.documentType || 'Tax Invoice',
      category: sentData?.documentType || 'Tax Invoice',
      categoryColor: '#0284c7',
      status: 'Delivered',
      isUnread: false,
      isFlagged: false,
      isPinned: false,
      hasAttachments: true,
      attachment: {
        name: `${sentData?.documentId || 'Document'}.pdf`,
        size: '320 KB',
        type: sentData?.documentType || 'Tax Invoice',
        docData: sentData?.docData || null
      },
      body: sentData?.body || 'Electronic transmission successfully dispatched via Microsoft 365 Exchange Gateway.'
    };

    setEmails(prev => [newRecord, ...prev]);
    setSelectedEmailId(newRecord.id);
    if (onNotify) onNotify(`Transmission dispatched via Exchange to ${newRecord.customer}`);
  };

  // Send quick inline reply
  const handleSendQuickReply = () => {
    if (!inlineReplyText.trim()) return;
    const newRecord = {
      id: `msg-reply-${Date.now()}`,
      folder: 'sent',
      tab: 'focused',
      sender: 'Rahul Patil',
      senderEmail: DEFAULT_SENDER,
      senderOrg: 'General Precision Spindles Pvt. Ltd.',
      recipient: selectedEmail.recipient || selectedEmail.senderEmail,
      recipientName: selectedEmail.recipientName || selectedEmail.sender,
      customer: selectedEmail.customer,
      allRecipients: [selectedEmail.recipient || selectedEmail.senderEmail],
      cc: selectedEmail.cc || [],
      subject: selectedEmail.subject.startsWith('Re:') ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
      date: 'Today, Just now',
      timestamp: Date.now(),
      documentId: selectedEmail.documentId,
      documentType: selectedEmail.documentType,
      category: selectedEmail.category,
      categoryColor: selectedEmail.categoryColor,
      status: 'Delivered',
      isUnread: false,
      isFlagged: false,
      isPinned: false,
      hasAttachments: false,
      body: inlineReplyText
    };

    setEmails(prev => [newRecord, ...prev]);
    setInlineReplyText('');
    setInlineReplyOpen(false);
    if (onNotify) onNotify('Quick reply sent via Exchange Gateway.');
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['Date', 'Document Ref', 'Category', 'Customer / Recipient', 'Primary Email', 'CC Recipients', 'Subject', 'Status', 'Sent By'];
    const rows = emails.map(e => [
      `"${e.date}"`,
      `"${e.documentId || ''}"`,
      `"${e.documentType || e.category || ''}"`,
      `"${(e.customer || e.recipientName || '').replace(/"/g, '""')}"`,
      `"${e.recipient || ''}"`,
      `"${(e.cc || []).join('; ')}"`,
      `"${(e.subject || '').replace(/"/g, '""')}"`,
      `"${e.status || 'Delivered'}"`,
      `"${e.sender || 'Rahul Patil'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `GPS_Outlook_Transmission_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onNotify) onNotify('Exported transmissions to CSV.');
  };

  // Format folder title
  const getFolderTitle = () => {
    if (accountFilter) return accountFilter;
    if (currentFolder === 'inbox') return 'Inbox';
    if (currentFolder === 'sent') return 'Sent Items';
    if (currentFolder === 'drafts') return 'Drafts';
    if (currentFolder === 'flagged') return 'Flagged Items';
    if (currentFolder === 'archive') return 'Archive';
    if (currentFolder === 'deleted') return 'Deleted Items';
    if (currentFolder === 'junk') return 'Junk Email';
    if (currentFolder.startsWith('category-')) {
      const cat = currentFolder.replace('category-', '');
      return cat.charAt(0).toUpperCase() + cat.slice(1) + 's';
    }
    return currentFolder;
  };

  const unreadInboxCount = emails.filter(e => e.folder === 'inbox' && e.isUnread).length;
  const sentCount = emails.filter(e => e.folder === 'sent').length;
  const draftsCount = emails.filter(e => e.folder === 'drafts').length;
  const flaggedCount = emails.filter(e => e.isFlagged).length;

  return (
    <div className={`outlook-root-wrapper ${isMobileReaderOpen ? 'mobile-reader-view' : 'mobile-list-view'} ${isMobileSearchOpen ? 'mobile-search-active' : ''}`}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SCOPED AUTHENTIC MICROSOFT OUTLOOK STYLES (DESKTOP + MOBILE)         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <style>{`
        .outlook-root-wrapper {
          display: flex;
          flex-direction: column;
          flex: 1;
          height: 100%;
          min-height: 0;
          max-height: calc(100vh - var(--header-height, 54px));
          width: 100%;
          background: #ffffff;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #242424;
          box-sizing: border-box;
          position: relative;
        }

        /* ── Top Blue Suite Bar ── */
        .outlook-top-bar {
          height: 48px;
          background: #0078D4;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          flex-shrink: 0;
          z-index: 20;
          box-sizing: border-box;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        .outlook-waffle-btn {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          display: grid;
          grid-template-columns: repeat(3, 4px);
          gap: 2.5px;
          align-content: center;
          justify-content: center;
          cursor: pointer;
          background: transparent;
          border: none;
          transition: background 0.15s;
        }
        .outlook-waffle-btn:hover {
          background: rgba(255, 255, 255, 0.18);
        }
        .outlook-waffle-btn span {
          width: 4px;
          height: 4px;
          background: #ffffff;
          border-radius: 0.5px;
        }
        .outlook-top-search {
          flex: 1;
          max-width: 520px;
          margin: 0 20px;
          position: relative;
        }
        .outlook-top-search input {
          width: 100%;
          height: 32px;
          background: rgba(255, 255, 255, 0.22);
          border: 1px solid transparent;
          border-radius: 4px;
          padding: 0 32px 0 34px;
          font-size: 13px;
          color: #ffffff;
          outline: none;
          transition: all 0.15s ease;
          box-sizing: border-box;
        }
        .outlook-top-search input::placeholder {
          color: rgba(255, 255, 255, 0.78);
        }
        .outlook-top-search input:focus {
          background: #ffffff;
          color: #242424;
          box-shadow: 0 2px 8px rgba(0,0,0,0.22);
        }
        .outlook-top-search input:focus + .search-icon-svg {
          color: #0078D4;
        }

        /* ── Main Outlook Workspace ── */
        .outlook-main-layout {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          background: #ffffff;
        }

        /* ── Left App Rail (Desktop 48px) ── */
        .outlook-app-rail {
          width: 48px;
          min-width: 48px;
          background: #f3f2f1;
          border-right: 1px solid #e1dfdd;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 0;
          gap: 6px;
          user-select: none;
          box-sizing: border-box;
        }
        .outlook-rail-item {
          width: 36px;
          height: 36px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #605e5c;
          cursor: pointer;
          background: transparent;
          border: none;
          position: relative;
          transition: all 0.15s;
        }
        .outlook-rail-item:hover {
          background: #edebe9;
          color: #201f1e;
        }
        .outlook-rail-item.active {
          color: #0078D4;
          background: #ffffff;
        }
        .outlook-rail-item.active::before {
          content: '';
          position: absolute;
          left: -6px;
          top: 6px;
          bottom: 6px;
          width: 3px;
          border-radius: 0 2px 2px 0;
          background: #0078D4;
        }

        /* ── Desktop Workspace Column ── */
        .outlook-desk-body {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }

        /* ── Ribbon Command Bar (Desktop 44px) ── */
        .outlook-command-ribbon {
          height: 44px;
          background: #faf9f8;
          border-bottom: 1px solid #edebe9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          flex-shrink: 0;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .outlook-command-ribbon::-webkit-scrollbar {
          display: none;
        }
        .outlook-btn-compose {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0078D4;
          color: #ffffff;
          border: 1px solid #0078D4;
          border-radius: 4px;
          height: 30px;
          padding: 0 14px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.12s;
          white-space: nowrap;
        }
        .outlook-btn-compose:hover {
          background: #106ebe;
        }
        .outlook-ribbon-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          height: 30px;
          padding: 0 8px;
          font-size: 12px;
          color: #424242;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.12s;
        }
        .outlook-ribbon-action-btn:hover {
          background: #edebe9;
          color: #201f1e;
        }
        .outlook-ribbon-action-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ── 3 Panes Layout ── */
        .outlook-three-panes {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* ── Pane 1: Folders Tree (220px) ── */
        .outlook-folders-pane {
          width: 220px;
          min-width: 220px;
          background: #f8fafc;
          border-right: 1px solid #edebe9;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          user-select: none;
          box-sizing: border-box;
        }
        .outlook-section-header {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8a8886;
          padding: 12px 14px 4px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .outlook-folder-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 12px;
          font-size: 12px;
          color: #424242;
          cursor: pointer;
          border-radius: 4px;
          margin: 1px 8px;
          transition: background 0.1s;
        }
        .outlook-folder-row:hover {
          background: #edebe9;
          color: #201f1e;
        }
        .outlook-folder-row.active {
          background: #eff6fc;
          color: #0078D4;
          font-weight: 600;
        }

        /* ── Pane 2: Message List (350px) ── */
        .outlook-messages-pane {
          width: 350px;
          min-width: 320px;
          background: #ffffff;
          border-right: 1px solid #edebe9;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-sizing: border-box;
        }
        .outlook-tabs-strip {
          display: flex;
          align-items: center;
          border-bottom: 1px solid #edebe9;
          background: #ffffff;
          padding: 0 12px;
          height: 38px;
          gap: 16px;
          flex-shrink: 0;
        }
        .outlook-tab-btn {
          background: transparent;
          border: none;
          height: 38px;
          font-size: 13px;
          font-weight: 600;
          color: #605e5c;
          cursor: pointer;
          position: relative;
          padding: 0 4px;
        }
        .outlook-tab-btn.active {
          color: #0078D4;
        }
        .outlook-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: #0078D4;
          border-radius: 2px 2px 0 0;
        }

        .outlook-filter-chips-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 14px;
          background: #faf9f8;
          border-bottom: 1px solid #edebe9;
          font-size: 11px;
          color: #605e5c;
          flex-shrink: 0;
        }
        .outlook-filter-pill {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 11px;
          color: #605e5c;
          cursor: pointer;
          transition: all 0.12s;
        }
        .outlook-filter-pill:hover {
          background: #edebe9;
        }
        .outlook-filter-pill.active {
          background: #eff6fc;
          border-color: #0078D4;
          color: #0078D4;
          font-weight: 600;
        }

        .outlook-items-scroll-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .outlook-msg-card {
          position: relative;
          padding: 10px 14px 10px 16px;
          border-bottom: 1px solid #f3f2f1;
          cursor: pointer;
          transition: background 0.1s;
          user-select: none;
        }
        .outlook-msg-card:hover {
          background: #f8fafc;
        }
        .outlook-msg-card.active {
          background: #eff6fc;
          border-left: 3px solid #0078D4;
        }
        .outlook-msg-card.unread::before {
          content: '';
          position: absolute;
          left: 4px;
          top: 14px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #0078D4;
        }

        /* Card Hover Quick Actions */
        .outlook-msg-card .outlook-card-quick-actions {
          display: none;
          align-items: center;
          gap: 2px;
          position: absolute;
          right: 10px;
          top: 8px;
          background: #ffffff;
          padding: 2px 4px;
          border-radius: 4px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.14);
          z-index: 5;
        }
        .outlook-msg-card:hover .outlook-card-quick-actions {
          display: flex;
        }
        .outlook-msg-card:hover .outlook-card-date {
          opacity: 0;
        }
        .outlook-quick-action-btn {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 3px;
          color: #605e5c;
          cursor: pointer;
          transition: background 0.1s, color 0.1s;
        }
        .outlook-quick-action-btn:hover {
          background: #edebe9;
          color: #201f1e;
        }

        /* ── Pane 3: Reading Pane (Flex 1) ── */
        .outlook-viewer-pane {
          flex: 1;
          min-width: 0;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        /* ── Mobile FAB ── */
        .outlook-mobile-fab {
          display: none;
        }

        /* ── Mobile Layout (< 769px) ── */
        @media (max-width: 768px) {
          .outlook-root-wrapper {
            max-height: 100vh;
            height: 100vh;
          }
          .outlook-app-rail {
            display: none !important;
          }
          .outlook-command-ribbon {
            display: none !important;
          }
          .outlook-folders-pane {
            display: none !important;
          }
          .mobile-list-view .outlook-messages-pane {
            display: flex !important;
            width: 100% !important;
            min-width: 100% !important;
            border-right: none !important;
          }
          .mobile-list-view .outlook-viewer-pane {
            display: none !important;
          }
          .mobile-reader-view .outlook-messages-pane {
            display: none !important;
          }
          .mobile-reader-view .outlook-viewer-pane {
            display: flex !important;
            width: 100% !important;
            height: 100% !important;
          }
          .outlook-top-search {
            display: none !important;
          }
          .mobile-search-active .outlook-top-search {
            display: block !important;
            position: absolute !important;
            left: 8px !important;
            right: 8px !important;
            max-width: none !important;
            margin: 0 !important;
            z-index: 25 !important;
          }
          .mobile-list-view .outlook-mobile-fab {
            display: flex !important;
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #0078D4;
            color: #ffffff;
            border: none;
            box-shadow: 0 4px 16px rgba(0, 120, 212, 0.45);
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 50;
            transition: transform 0.15s, background 0.15s;
          }
          .outlook-mobile-fab:active {
            transform: scale(0.94);
            background: #106ebe;
          }
          .mobile-reader-view .outlook-mobile-fab {
            display: none !important;
          }
        }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP SUITE BAR (MICROSOFT 365 BLUE #0078D4)                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <header className="outlook-top-bar">
        {/* Left: App Launcher & Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mobile hamburger menu */}
          <button 
            type="button" 
            className="mobile-only-flex" 
            onClick={() => setIsMobileDrawerOpen(prev => !prev)}
            title="Open Outlook Folders"
            aria-label="Open Folders"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <Menu size={18} />
          </button>

          {/* Desktop waffle app launcher */}
          <button 
            type="button" 
            className="outlook-waffle-btn desktop-only-flex" 
            onClick={() => setIsMobileDrawerOpen(prev => !prev)}
            title="Microsoft 365 App Launcher & Folders"
            aria-label="Open Folders"
          >
            <span /><span /><span />
            <span /><span /><span />
            <span /><span /><span />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 26, height: 26, borderRadius: '4px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={16} color="#0078D4" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.1 }}>Outlook</span>
                <span className="mobile-only-inline" style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9 }}>
                  • {getFolderTitle()}
                </span>
              </div>
              <div className="desktop-only-inline" style={{ fontSize: '10px', opacity: 0.88, fontWeight: 500 }}>
                Microsoft 365 Exchange Gateway
              </div>
            </div>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="outlook-top-search">
          <Search size={14} className="search-icon-svg" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.85)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search in mailbox, customers, documents (Ctrl+E)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setIsMobileSearchOpen(false); }}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#605e5c', cursor: 'pointer' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Right: Sync Status, Actions & Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Mobile search toggle button */}
          <button
            type="button"
            className="mobile-only-inline"
            onClick={() => setIsMobileSearchOpen(prev => !prev)}
            style={{ background: 'none', border: 'none', color: '#ffffff', padding: '6px', cursor: 'pointer' }}
            title="Search Mail"
          >
            <Search size={17} />
          </button>

          <button
            type="button"
            onClick={syncWithLiveDatabase}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '5px 10px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer'
            }}
            title="Send / Receive: Sync with Exchange"
          >
            <RefreshCw size={12} className={isLoading ? 'spin-icon' : ''} />
            <span className="desktop-only-inline">Send / Receive</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="desktop-only-inline"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '5px 8px',
              fontSize: '11.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Export CSV Transmission Log"
          >
            <Download size={13} />
            <span>CSV</span>
          </button>

          {/* Help icon button (Desktop) */}
          <button
            type="button"
            className="desktop-only-inline"
            onClick={() => onNotify && onNotify('Microsoft 365 Exchange Gateway: TLS 1.3 Active, Supabase Real-time Sync Active.')}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title="Help & Exchange Gateway Status"
          >
            <HelpCircle size={16} />
          </button>

          {/* Settings icon button (Desktop) */}
          <button
            type="button"
            className="desktop-only-inline"
            onClick={() => onNavigate && onNavigate('settings')}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title="Mail & System Settings"
          >
            <Settings size={16} />
          </button>

          {/* User Profile Avatar with Online Status */}
          <div 
            onClick={() => setIsMobileDrawerOpen(prev => !prev)}
            style={{ 
              width: 30, height: 30, borderRadius: '50%', 
              background: '#ffffff', color: '#0078D4', 
              fontWeight: 700, fontSize: '12px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative', flexShrink: 0
            }}
            title="Rahul Patil (sales@gpsspindle.com)"
          >
            RP
            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#107c41', border: '1.5px solid #0078D4' }} />
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. MAIN OUTLOOK BODY WORKSPACE                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="outlook-main-layout">
        {/* Leftmost App Rail (Desktop) */}
        <aside className="outlook-app-rail" aria-label="Microsoft 365 Apps">
          <button type="button" className="outlook-rail-item active" title="Mail">
            <Mail size={18} />
          </button>
          <button type="button" className="outlook-rail-item" title="Calendar" onClick={() => onNotify && onNotify('Opening Exchange Calendar schedule...')}>
            <Calendar size={18} />
          </button>
          <button type="button" className="outlook-rail-item" title="People / Contacts" onClick={() => onNavigate && onNavigate('contacts')}>
            <User size={18} />
          </button>
          <button type="button" className="outlook-rail-item" title="To Do Tasks" onClick={() => onNotify && onNotify('Opening Microsoft To-Do task checklist...')}>
            <CheckSquare size={18} />
          </button>
          <button type="button" className="outlook-rail-item" title="OneDrive Documents" onClick={() => onNavigate && onNavigate('documents')}>
            <Folder size={18} />
          </button>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button type="button" className="outlook-rail-item" title="Exchange Settings" onClick={() => onNavigate && onNavigate('settings')}>
              <ShieldCheck size={18} />
            </button>
          </div>
        </aside>

        {/* Desktop Workspace: Ribbon Bar + 3 Panes */}
        <div className="outlook-desk-body">
          {/* ── Ribbon Command Bar (Desktop) ── */}
          <div className="outlook-command-ribbon">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                type="button" 
                className="outlook-btn-compose"
                onClick={handleOpenNewTransmission}
                title="Compose new official transmission email"
              >
                <Plus size={14} />
                <span>New mail</span>
              </button>

              <button
                type="button"
                className="outlook-ribbon-action-btn"
                onClick={() => selectedEmail && handleDeleteEmail(selectedEmail.id)}
                disabled={!selectedEmail}
                title="Delete message"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>

              <button
                type="button"
                className="outlook-ribbon-action-btn"
                onClick={() => selectedEmail && handleArchiveEmail(selectedEmail.id)}
                disabled={!selectedEmail}
                title="Archive message"
              >
                <Archive size={13} />
                <span>Archive</span>
              </button>

              <button
                type="button"
                className="outlook-ribbon-action-btn"
                onClick={() => selectedEmail && handleToggleRead(selectedEmail.id)}
                disabled={!selectedEmail}
                title="Mark as read / unread"
              >
                <Mail size={13} />
                <span>{selectedEmail?.isUnread ? 'Mark read' : 'Mark unread'}</span>
              </button>

              <button
                type="button"
                className="outlook-ribbon-action-btn"
                onClick={() => selectedEmail && handleTogglePin(selectedEmail.id)}
                disabled={!selectedEmail}
                title="Pin to top of folder"
              >
                <Pin size={13} />
                <span>{selectedEmail?.isPinned ? 'Unpin' : 'Pin'}</span>
              </button>

              <button
                type="button"
                className="outlook-ribbon-action-btn"
                onClick={() => selectedEmail && handleToggleFlag(selectedEmail.id)}
                disabled={!selectedEmail}
                title="Flag for follow-up"
                style={{ color: selectedEmail?.isFlagged ? '#dc2626' : undefined }}
              >
                <Flag size={13} />
                <span>{selectedEmail?.isFlagged ? 'Unflag' : 'Flag'}</span>
              </button>

              <div style={{ width: 1, height: 18, background: '#edebe9', margin: '0 4px' }} />

              <button
                type="button"
                className="outlook-ribbon-action-btn"
                onClick={() => selectedEmail && handleResend(selectedEmail)}
                disabled={!selectedEmail}
                title="Reply to sender"
              >
                <Reply size={13} />
                <span>Reply</span>
              </button>

              <button
                type="button"
                className="outlook-ribbon-action-btn"
                onClick={() => selectedEmail && handleReplyAll(selectedEmail)}
                disabled={!selectedEmail}
                title="Reply to all recipients"
              >
                <ReplyAll size={13} />
                <span>Reply all</span>
              </button>

              <button
                type="button"
                className="outlook-ribbon-action-btn"
                onClick={() => selectedEmail && handleResend(selectedEmail)}
                disabled={!selectedEmail}
                title="Forward message"
              >
                <Forward size={13} />
                <span>Forward</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: '#605e5c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#107c41' }} />
                <span>Exchange Connected</span>
              </div>
            </div>
          </div>

          {/* ── Three-Pane Classic Outlook Body ── */}
          <div className="outlook-three-panes">
            {/* PANE 1: FOLDERS NAVIGATION TREE */}
            <nav className="outlook-folders-pane" aria-label="Mail Folders">
              <div className="outlook-section-header">
                <span>Favorites</span>
              </div>

              <div
                className={`outlook-folder-row ${currentFolder === 'sent' && !accountFilter ? 'active' : ''}`}
                onClick={() => { setCurrentFolder('sent'); setAccountFilter(null); setIsMobileReaderOpen(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Send size={13} color="#059669" />
                  <span>Sent Items</span>
                </div>
                <span style={{ fontSize: '11px', color: '#605e5c', fontWeight: 600 }}>{sentCount}</span>
              </div>

              <div
                className={`outlook-folder-row ${currentFolder === 'inbox' && !accountFilter ? 'active' : ''}`}
                onClick={() => { setCurrentFolder('inbox'); setAccountFilter(null); setIsMobileReaderOpen(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Inbox size={13} color="#0078D4" />
                  <span>Inbox</span>
                </div>
                {unreadInboxCount > 0 && (
                  <span style={{ fontSize: '10.5px', background: '#0078D4', color: '#ffffff', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                    {unreadInboxCount}
                  </span>
                )}
              </div>

              <div
                className={`outlook-folder-row ${currentFolder === 'drafts' && !accountFilter ? 'active' : ''}`}
                onClick={() => { setCurrentFolder('drafts'); setAccountFilter(null); setIsMobileReaderOpen(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PenSquare size={13} color="#d97706" />
                  <span>Drafts</span>
                </div>
                <span style={{ fontSize: '11px', color: '#605e5c' }}>{draftsCount}</span>
              </div>

              <div
                className={`outlook-folder-row ${currentFolder === 'flagged' ? 'active' : ''}`}
                onClick={() => { setCurrentFolder('flagged'); setAccountFilter(null); setIsMobileReaderOpen(false); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flag size={13} color="#dc2626" />
                  <span>Flagged</span>
                </div>
                {flaggedCount > 0 && (
                  <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>{flaggedCount}</span>
                )}
              </div>

              {/* ERP Document Categories */}
              <div className="outlook-section-header" style={{ marginTop: '10px' }}>
                <span>ERP Categories</span>
              </div>

              {[
                { id: 'category-quotation', label: 'Quotations', color: '#7A1F3D', type: 'Quot' },
                { id: 'category-invoice', label: 'Tax Invoices', color: '#0284c7', type: 'Inv' },
                { id: 'category-proforma', label: 'Proforma Invoices', color: '#0d9488', type: 'Proforma' },
                { id: 'category-po', label: 'Purchase Orders', color: '#059669', type: 'Order' },
                { id: 'category-service', label: 'Service Reports', color: '#7c3aed', type: 'Serv' },
                { id: 'category-dispatch', label: 'Delivery Challans', color: '#d97706', type: 'Challan' }
              ].map(cat => (
                <div
                  key={cat.id}
                  className={`outlook-folder-row ${currentFolder === cat.id ? 'active' : ''}`}
                  onClick={() => { setCurrentFolder(cat.id); setAccountFilter(null); setIsMobileReaderOpen(false); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '2px', background: cat.color }} />
                    <span>{cat.label}</span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#605e5c' }}>
                    {emails.filter(e => (e.documentType || '').toLowerCase().includes(cat.type.toLowerCase()) || (e.category || '').toLowerCase().includes(cat.type.toLowerCase())).length}
                  </span>
                </div>
              ))}

              {/* Client Accounts */}
              <div className="outlook-section-header" style={{ marginTop: '10px' }}>
                <span>Client Accounts</span>
              </div>

              {[
                'Tata Advanced Systems',
                'Bharat Forge',
                'Godrej Aerospace',
                'LINAMAR INDIA',
                'Schaeffler India'
              ].map(clientName => (
                <div
                  key={clientName}
                  className={`outlook-folder-row ${accountFilter === clientName ? 'active' : ''}`}
                  onClick={() => {
                    setAccountFilter(accountFilter === clientName ? null : clientName);
                    setCurrentFolder('sent');
                    setIsMobileReaderOpen(false);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Building2 size={12} color="#8a8886" />
                    <span style={{ fontSize: '11.5px' }}>{clientName}</span>
                  </div>
                </div>
              ))}

              {/* Mailbox Storage Meter */}
              <div style={{ marginTop: 'auto', padding: '12px 14px', borderTop: '1px solid #edebe9', fontSize: '10.5px', color: '#605e5c' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Mailbox Storage</span>
                  <strong>2.4 GB / 50 GB</strong>
                </div>
                <div style={{ height: '4px', background: '#edebe9', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: '5%', height: '100%', background: '#0078D4' }} />
                </div>
                <div style={{ marginTop: '5px', fontSize: '9.5px', opacity: 0.8 }}>
                  Exchange Online • TLS 1.3 Active
                </div>
              </div>
            </nav>

            {/* PANE 2: MESSAGE LIST */}
            <section className="outlook-messages-pane" aria-label="Message List">
              {/* Focused vs Other Tabs */}
              <div className="outlook-tabs-strip">
                <button
                  type="button"
                  className={`outlook-tab-btn ${activeTab === 'focused' ? 'active' : ''}`}
                  onClick={() => setActiveTab('focused')}
                >
                  Focused
                </button>
                <button
                  type="button"
                  className={`outlook-tab-btn ${activeTab === 'other' ? 'active' : ''}`}
                  onClick={() => setActiveTab('other')}
                >
                  Other
                </button>

                <div style={{ marginLeft: 'auto', fontSize: '11px', color: '#605e5c' }}>
                  <strong>{filteredEmails.length}</strong> items
                </div>
              </div>

              {/* Quick Filter Chips */}
              <div className="outlook-filter-chips-bar">
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'unread', label: 'Unread' },
                    { id: 'flagged', label: 'Flagged' },
                    { id: 'has_files', label: 'Has Files' }
                  ].map(flt => (
                    <button
                      key={flt.id}
                      type="button"
                      className={`outlook-filter-pill ${outlookQuickFilter === flt.id ? 'active' : ''}`}
                      onClick={() => setOutlookQuickFilter(flt.id)}
                    >
                      {flt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSortDescending(prev => !prev)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '11px',
                    color: '#605e5c',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 4px',
                    borderRadius: '3px'
                  }}
                  title={sortDescending ? "Sorted newest first. Click to reverse." : "Sorted oldest first. Click to reverse."}
                >
                  <span>Date</span>
                  <ArrowUpDown size={11} color="#0078D4" />
                  <span style={{ fontSize: '9px', fontWeight: 600, color: '#0078D4' }}>{sortDescending ? 'Newest' : 'Oldest'}</span>
                </button>
              </div>

              {/* Message Cards Scroll Area */}
              <div className="outlook-items-scroll-area">
                {filteredEmails.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: '#8a8886' }}>
                    <Inbox size={34} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: '#323130' }}>No messages found</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11.5px' }}>There are no transmissions matching your filter criteria.</p>
                  </div>
                ) : (
                  filteredEmails.map(mail => {
                    const isSelected = selectedEmail?.id === mail.id;
                    const displayName = mail.customer || mail.recipientName || mail.sender;

                    return (
                      <article
                        key={mail.id}
                        className={`outlook-msg-card ${isSelected ? 'active' : ''} ${mail.isUnread ? 'unread' : ''}`}
                        onClick={() => handleSelectEmail(mail)}
                      >
                        {/* Top Row: Name, Pin, Date */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden' }}>
                            {mail.isPinned && <Pin size={11} color="#0078D4" style={{ flexShrink: 0, transform: 'rotate(45deg)' }} />}
                            <span style={{ fontSize: '12.5px', fontWeight: mail.isUnread ? 700 : 600, color: '#242424', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {displayName}
                            </span>
                          </div>

                          {/* Date (Fades on card hover for quick actions) */}
                          <span className="outlook-card-date" style={{ fontSize: '11px', color: '#8a8886', flexShrink: 0, transition: 'opacity 0.15s' }}>
                            {mail.date}
                          </span>

                          {/* Quick Actions Bar (Visible on card hover) */}
                          <div className="outlook-card-quick-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="outlook-quick-action-btn"
                              title={mail.isPinned ? "Unpin" : "Pin"}
                              onClick={(e) => handleTogglePin(mail.id, e)}
                            >
                              <Pin size={12} color={mail.isPinned ? "#0078D4" : "#605e5c"} />
                            </button>
                            <button
                              type="button"
                              className="outlook-quick-action-btn"
                              title={mail.isFlagged ? "Unflag" : "Flag"}
                              onClick={(e) => handleToggleFlag(mail.id, e)}
                            >
                              <Flag size={12} color={mail.isFlagged ? "#dc2626" : "#605e5c"} fill={mail.isFlagged ? "#dc2626" : "none"} />
                            </button>
                            <button
                              type="button"
                              className="outlook-quick-action-btn"
                              title={mail.isUnread ? "Mark read" : "Mark unread"}
                              onClick={(e) => handleToggleRead(mail.id, e)}
                            >
                              <Mail size={12} color="#605e5c" />
                            </button>
                            <button
                              type="button"
                              className="outlook-quick-action-btn"
                              title="Delete"
                              onClick={(e) => handleDeleteEmail(mail.id, e)}
                            >
                              <Trash2 size={12} color="#dc2626" />
                            </button>
                          </div>
                        </div>

                        {/* Subject */}
                        <div style={{ fontSize: '12px', fontWeight: mail.isUnread ? 700 : 600, color: '#323130', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>
                          {mail.subject}
                        </div>

                        {/* 2-line snippet preview */}
                        <div style={{ fontSize: '11.5px', color: '#605e5c', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.35, marginBottom: '6px' }}>
                          {mail.body}
                        </div>

                        {/* Footer Chips & Icons */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {mail.category && (
                              <span style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                background: '#f8fafc',
                                border: `1px solid ${mail.categoryColor || '#0078D4'}`,
                                color: mail.categoryColor || '#0078D4',
                                fontWeight: 600
                              }}>
                                {mail.category}
                              </span>
                            )}
                            {mail.documentId && (
                              <span className="mono" style={{ fontSize: '10px', color: '#7A1F3D', fontWeight: 600 }}>
                                {mail.documentId}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {mail.hasAttachments && (
                              <Paperclip size={12} color="#8a8886" />
                            )}
                            {mail.isFlagged && (
                              <Flag size={12} color="#dc2626" fill="#dc2626" />
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            {/* PANE 3: READING PANE (FULL EMAIL VIEWER) */}
            <main className="outlook-viewer-pane" aria-label="Reading Pane">
              {selectedEmail ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 20px', overflowY: 'auto', boxSizing: 'border-box' }}>
                  {/* Reading Pane Header Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #edebe9', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    {/* Mobile Back Button to Inbox List */}
                    <button
                      type="button"
                      className="mobile-only-inline"
                      onClick={() => setIsMobileReaderOpen(false)}
                      style={{
                        background: '#eff6fc',
                        border: '1px solid #c7e0f4',
                        color: '#0078D4',
                        borderRadius: '4px',
                        padding: '5px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowLeft size={13} />
                      <span>Back to list</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResend(selectedEmail)}
                        style={{ gap: '5px', fontSize: '11.5px', height: '30px' }}
                      >
                        <Reply size={13} />
                        <span>Reply</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReplyAll(selectedEmail)}
                        style={{ gap: '5px', fontSize: '11.5px', height: '30px' }}
                      >
                        <ReplyAll size={13} />
                        <span>Reply all</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResend(selectedEmail)}
                        style={{ gap: '5px', fontSize: '11.5px', height: '30px' }}
                      >
                        <Forward size={13} />
                        <span>Forward</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => handleDeleteEmail(selectedEmail.id, e)}
                        title="Delete message"
                        style={{ height: '30px', padding: '0 8px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {selectedEmail.hasAttachments && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handlePreviewDoc(selectedEmail)}
                          style={{ gap: '5px', fontSize: '11.5px', height: '30px' }}
                        >
                          <Eye size={12} />
                          <span>Preview Document</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => window.print()}
                        title="Print message"
                        style={{ height: '30px', padding: '0 8px' }}
                      >
                        <Printer size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Subject Line & Categories */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#242424', letterSpacing: '-0.01em', wordBreak: 'break-word' }}>
                        {selectedEmail.subject}
                      </h1>
                      {selectedEmail.category && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#f8fafc',
                          border: `1px solid ${selectedEmail.categoryColor || '#0078D4'}`,
                          color: selectedEmail.categoryColor || '#0078D4',
                          fontWeight: 600
                        }}>
                          {selectedEmail.category}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '2px 7px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <ShieldCheck size={11} />
                        <span>Exchange TLS 1.3 Verified</span>
                      </span>
                    </div>
                  </div>

                  {/* Sender & Recipient Details */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f2f1', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0078D4 0%, #106ebe 100%)',
                        color: '#ffffff', fontWeight: 700, fontSize: '13px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {selectedEmail.sender?.slice(0, 2).toUpperCase() || 'GP'}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#242424' }}>
                            {selectedEmail.sender}
                          </span>
                          <span style={{ fontSize: '12px', color: '#605e5c' }}>
                            &lt;{selectedEmail.senderEmail}&gt;
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#605e5c', marginTop: '2px' }}>
                          To: <strong>{selectedEmail.recipientName || selectedEmail.recipient}</strong> &lt;{selectedEmail.recipient}&gt;
                        </div>
                        {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#605e5c', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#8a8886' }}>Cc:</span>
                            {selectedEmail.cc.map((ccItem, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: '#f3f2f1',
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  fontSize: '10.5px',
                                  color: '#323130',
                                  border: '1px solid #edebe9'
                                }}
                              >
                                {ccItem}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '11.5px', color: '#8a8886', textAlign: 'right' }}>
                      <div>{selectedEmail.date}</div>
                      <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px' }}>● Delivered & Logged</div>
                    </div>
                  </div>

                  {/* Official Attached Document Box */}
                  {selectedEmail.attachment && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                      border: '1px solid #edebe9',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: 32, height: 38, borderRadius: '4px',
                          background: '#dc2626', color: '#ffffff',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '9px', flexShrink: 0
                        }}>
                          PDF
                        </div>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#242424' }}>
                            {selectedEmail.attachment.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8a8886' }}>
                            {selectedEmail.attachment.size || '380 KB'} • Certified Commercial Document
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handlePreviewDoc(selectedEmail)}
                          style={{ gap: '4px', fontSize: '11.5px' }}
                        >
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handlePreviewDoc(selectedEmail)}
                          style={{ gap: '4px', fontSize: '11.5px' }}
                        >
                          <Download size={12} />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Formatted Email Body */}
                  <div style={{
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: '#323130',
                    whiteSpace: 'pre-wrap',
                    background: '#ffffff',
                    padding: '8px 0',
                    flex: 1
                  }}>
                    {selectedEmail.body}
                  </div>

                  {/* Quick Inline Reply Card */}
                  <div style={{
                    marginTop: '20px',
                    border: '1px solid #edebe9',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    background: '#faf9f8'
                  }}>
                    {!inlineReplyOpen ? (
                      <div 
                        onClick={() => setInlineReplyOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#605e5c', fontSize: '12.5px' }}
                      >
                        <Reply size={14} color="#0078D4" />
                        <span>Reply to {selectedEmail.sender || selectedEmail.recipientName}...</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#605e5c' }}>
                          <span>Reply to: <strong>{selectedEmail.senderEmail || selectedEmail.recipient}</strong></span>
                          <button type="button" onClick={() => setInlineReplyOpen(false)} style={{ background: 'none', border: 'none', color: '#605e5c', cursor: 'pointer' }}>
                            <X size={13} />
                          </button>
                        </div>

                        <textarea
                          rows={3}
                          className="form-control"
                          placeholder="Type your reply message..."
                          value={inlineReplyText}
                          onChange={(e) => setInlineReplyText(e.target.value)}
                          autoFocus
                          style={{ fontSize: '12.5px' }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleResend(selectedEmail)}
                            style={{ fontSize: '11px', gap: '4px' }}
                          >
                            <ExternalLink size={12} />
                            <span>Open in Full Composer</span>
                          </button>

                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setInlineReplyOpen(false)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={handleSendQuickReply}
                              disabled={!inlineReplyText.trim()}
                              style={{ background: '#0078D4', borderColor: '#0078D4', gap: '5px' }}
                            >
                              <Send size={12} />
                              <span>Send</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8a8886', padding: '40px' }}>
                  <Mail size={48} style={{ opacity: 0.35, marginBottom: '12px' }} />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#323130' }}>Select an item to read</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Click on any conversation from the list to preview details and documents.</p>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. MOBILE FLOATING ACTION BUTTON (COMPOSE NEW MAIL)                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <button
        type="button"
        className="outlook-mobile-fab"
        onClick={handleOpenNewTransmission}
        title="Compose New Mail"
        aria-label="Compose New Mail"
      >
        <PenSquare size={22} />
      </button>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. MOBILE SLIDE-OUT FOLDER DRAWER (< 769px)                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isMobileDrawerOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex' }}
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div 
            style={{ width: '280px', maxWidth: '82vw', height: '100%', background: '#ffffff', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 12px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Account Header */}
            <div style={{ background: '#0078D4', color: '#ffffff', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ffffff', color: '#0078D4', fontWeight: 800, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                RP
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Rahul Patil</div>
                <div style={{ fontSize: '11px', opacity: 0.88, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>sales@gpsspindle.com</div>
              </div>
            </div>

            {/* Drawer Folders List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8a8886', padding: '8px 16px 4px' }}>
                Mail Folders
              </div>

              {[
                { id: 'sent', label: 'Sent Items', icon: Send, color: '#059669', count: sentCount },
                { id: 'inbox', label: 'Inbox', icon: Inbox, color: '#0078D4', count: unreadInboxCount },
                { id: 'drafts', label: 'Drafts', icon: PenSquare, color: '#d97706', count: draftsCount },
                { id: 'flagged', label: 'Flagged', icon: Flag, color: '#dc2626', count: flaggedCount },
                { id: 'archive', label: 'Archive', icon: Archive, color: '#605e5c' },
                { id: 'deleted', label: 'Deleted Items', icon: Trash2, color: '#605e5c' }
              ].map(f => (
                <div
                  key={f.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px', fontSize: '13px', color: currentFolder === f.id ? '#0078D4' : '#242424',
                    background: currentFolder === f.id ? '#eff6fc' : 'transparent',
                    cursor: 'pointer', fontWeight: currentFolder === f.id ? 700 : 500
                  }}
                  onClick={() => {
                    setCurrentFolder(f.id);
                    setAccountFilter(null);
                    setIsMobileReaderOpen(false);
                    setIsMobileDrawerOpen(false);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <f.icon size={15} color={f.color} />
                    <span>{f.label}</span>
                  </div>
                  {f.count !== undefined && (
                    <span style={{ fontSize: '11px', color: '#8a8886', fontWeight: 600 }}>{f.count}</span>
                  )}
                </div>
              ))}

              <div style={{ height: 1, background: '#edebe9', margin: '8px 16px' }} />

              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#8a8886', padding: '8px 16px 4px' }}>
                ERP Categories
              </div>

              {[
                { id: 'category-quotation', label: 'Quotations', color: '#7A1F3D' },
                { id: 'category-invoice', label: 'Tax Invoices', color: '#0284c7' },
                { id: 'category-proforma', label: 'Proforma Invoices', color: '#0d9488' },
                { id: 'category-po', label: 'Purchase Orders', color: '#059669' },
                { id: 'category-service', label: 'Service Reports', color: '#7c3aed' },
                { id: 'category-dispatch', label: 'Delivery Challans', color: '#d97706' }
              ].map(cat => (
                <div
                  key={cat.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 16px', fontSize: '12.5px', color: currentFolder === cat.id ? '#0078D4' : '#242424',
                    background: currentFolder === cat.id ? '#eff6fc' : 'transparent',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setCurrentFolder(cat.id);
                    setAccountFilter(null);
                    setIsMobileReaderOpen(false);
                    setIsMobileDrawerOpen(false);
                  }}
                >
                  <span style={{ width: 9, height: 9, borderRadius: '2px', background: cat.color }} />
                  <span>{cat.label}</span>
                </div>
              ))}
            </div>

            {/* Drawer Bottom Close */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #edebe9' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsMobileDrawerOpen(false)}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Close Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. OUTLOOK EMAIL COMPOSER MODAL                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isComposerOpen && (
        <OutlookEmailComposer
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          documentData={composerDocData}
          documentType={composerDocType}
          onSent={handleComposerSent}
          onNotify={onNotify}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. DOCUMENT PREVIEW MODAL                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isPreviewOpen && previewDoc && (
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
