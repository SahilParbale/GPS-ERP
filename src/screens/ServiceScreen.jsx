import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import PipelineVisualizer from '../components/common/PipelineVisualizer';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import {
  serviceService,
  assetService,
  maintenanceService,
  customerService,
  salesService
} from '../services/database';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportServiceJobReportPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { SERVICE_PIPELINE_STAGES, SERVICE_JOBS, CUSTOMERS, SEED_QUOTATIONS } from '../data/mockData';
import {
  Plus, Search, Wrench, AlertTriangle, Clock,
  CheckCircle, CheckCircle2, FileText, Eye, RefreshCw, AlertCircle,
  ShieldAlert, Settings, Activity, CheckSquare, Download,
  ChevronRight, Filter, X, ArrowRight, Check, Sparkles,
  Info, ShieldCheck, Gauge, Zap, ExternalLink,
  Building2, User, Phone, Mail, Tag, Hash, Calendar, Users, MessageSquare
} from 'lucide-react';

const STAGE_KEYS_ORDER = [
  'complaint',
  'inspection',
  'diagnosis',
  'estimate',
  'approval',
  'repair',
  'testing',
  'qc',
  'dispatch'
];

const STAGE_SOP_DETAILS = {
  complaint: {
    title: 'Stage 01: Inward Complaint & Symptom Logging',
    sopCode: 'SOP-SRV-01-LOG',
    gatekeeper: 'Inward Gate Specialist',
    procedure: 'Log customer-reported symptoms, verify warranty status, photograph inward packaging & serial plate, and assign shopfloor traveler barcode.',
    acceptanceCriteria: 'Formal customer failure log completed; physical barcode traveler attached to spindle casing.',
    toleranceBenchmark: 'Visual and dimensional container check'
  },
  inspection: {
    title: 'Stage 02: Incoming Runout & Vibration Audit',
    sopCode: 'SOP-SRV-02-AUDIT',
    gatekeeper: 'Metrology Inspector',
    procedure: 'Mount spindle on granite surface bench. Measure initial nose taper radial & axial runout using 0.1 µm Mitutoyo dial indicator. Record baseline vibration spectrum on Schenck rig.',
    acceptanceCriteria: 'Pre-rebuild runout logged (tolerance benchmark ≤ 0.0010 mm); vibration baseline FFT captured.',
    toleranceBenchmark: 'Radial runout target ≤ 0.0010 mm (1.0 µm)'
  },
  diagnosis: {
    title: 'Stage 03: Cleanroom Teardown & Failure Analysis',
    sopCode: 'SOP-SRV-03-TEARDOWN',
    gatekeeper: 'Senior Spindle Rebuild Tech',
    procedure: 'Disassemble front/rear bearing retainers in ISO Class 7 cleanroom. Inspect ceramic hybrid balls/raceways for micro-spalling, brinelling, or coolant wash-out. Megger stator insulation (≥ 100 MΩ).',
    acceptanceCriteria: 'Root-cause failure mode documented; Belleville spring pack fatigue verified.',
    toleranceBenchmark: 'Stator insulation resistance ≥ 100 MΩ'
  },
  estimate: {
    title: 'Stage 04: BOM & Labor Quotation Generation',
    sopCode: 'SOP-SRV-04-ESTIMATE',
    gatekeeper: 'Service Estimator & Plant Lead',
    procedure: 'Specify exact OEM replacement bearing pack (P4/ABEC-7 matched set from FAG/NSK/GMN), rotary seals, Belleville disc springs, and precision grinding labor hours.',
    acceptanceCriteria: 'Itemized formal commercial quotation submitted to customer with guaranteed 5-day delivery commitment.',
    toleranceBenchmark: '100% matched OEM bearing pack specification'
  },
  approval: {
    title: 'Stage 05: Client PO Confirmation & Kit Release',
    sopCode: 'SOP-SRV-05-APPROVE',
    gatekeeper: 'Commercial Account Manager',
    procedure: 'Obtain formal customer Purchase Order authorization. Verify commercial terms and immediately issue automated pick-list to bonded toolroom for ceramic bearing kits.',
    acceptanceCriteria: 'Signed PO / authorized confirmation on file; replacement kit staged in cleanroom assembly cell.',
    toleranceBenchmark: 'PO signed & bonded inventory allocated'
  },
  repair: {
    title: 'Stage 06: Shaft Re-grinding & Bearing Rebuild',
    sopCode: 'SOP-SRV-06-REBUILD',
    gatekeeper: 'Master Grinder & Spindle Specialist',
    procedure: 'Sub-micron cylindrical grinding of nose taper on Studer CNC grinder if taper runout > 0.0010 mm. Ultrasonic decontamination of housing. Press-fit matched bearing pack with controlled preload.',
    acceptanceCriteria: 'Taper blue-matching contact ≥ 85%; bearing preload verified by calibrated axial micrometer.',
    toleranceBenchmark: 'Shaft taper roundness ≤ 0.0006 mm'
  },
  testing: {
    title: 'Stage 07: Dynamic Balancing & 6-Hour Thermal Run-in',
    sopCode: 'SOP-SRV-07-BALANCE',
    gatekeeper: 'Balancing & Dynamics Specialist',
    procedure: 'Mount on Schenck dual-plane balancing rig. Dynamically balance to ISO 1940-1 Grade G0.4 at max operational RPM. Execute automated 6-hour thermal run-in test logging temperature rise curves.',
    acceptanceCriteria: 'Balancing grade ≤ ISO G0.4 achieved; housing temperature rise ΔT ≤ 18°C over ambient; vibration velocity ≤ 0.8 mm/s.',
    toleranceBenchmark: 'Dynamic Balance Grade ISO 1940-1 G0.4'
  },
  qc: {
    title: 'Stage 08: Final QC Certificate Sign-off',
    sopCode: 'SOP-SRV-08-QC',
    gatekeeper: 'Head of Quality Assurance',
    procedure: 'Conduct final nose taper runout check at 0 mm and 300 mm test arbor. Verify hydraulic/pneumatic tool clamping drawbar force with digital gauge. Sign off official Calibration & Overhaul Certificate.',
    acceptanceCriteria: 'Final radial runout ≤ 0.0008 mm (0.8 µm); drawbar force within ±0.5 kN of nominal; QC stamp affixed.',
    toleranceBenchmark: 'Nose taper runout ≤ 0.0008 mm (0.8 µm)'
  },
  dispatch: {
    title: 'Stage 09: Express Crated Delivery',
    sopCode: 'SOP-SRV-09-DISPATCH',
    gatekeeper: 'Logistics & Dispatch Officer',
    procedure: 'Apply high-viscosity rust inhibitor to nose taper and ground surfaces. Double-vacuum pack in vapor-corrosion-inhibiting (VCI) foil with desiccant. Secure in custom vibration-isolated wooden crate.',
    acceptanceCriteria: 'Signed test report and calibration certificate enclosed; dedicated express logistics dispatched.',
    toleranceBenchmark: 'VCI sealed & shock-isolated crating'
  }
};

const FALLBACK_PLANT_ASSETS = [];
const FALLBACK_MAINTENANCE_ORDERS = [];

export const getNormalizedStageKey = (stageStr) => {
  if (!stageStr) return 'repair';
  const s = String(stageStr).toLowerCase().trim();
  if (s.includes('complaint') || s.includes('inward assessment') || s.includes('inward request') || s.includes('logged')) return 'complaint';
  if (s.includes('inspection') || s.includes('audit') || s.includes('incoming')) return 'inspection';
  if (s.includes('diagnos') || s.includes('dismantle') || s.includes('teardown') || s.includes('decontamination') || s.includes('failure analysis')) return 'diagnosis';
  if (s.includes('estimat') || s.includes('bom') || s.includes('quotation') || s.includes('quote')) return 'estimate';
  if (s.includes('approv') || s.includes('po confirm') || s.includes('po received')) return 'approval';
  if (s.includes('repair') || s.includes('rebuild') || s.includes('grind') || s.includes('bearing replacement') || s.includes('in progress')) return 'repair';
  if (s.includes('test') || s.includes('balanc') || s.includes('run-in') || s.includes('thermal run')) return 'testing';
  if (s.includes('qc') || s.includes('sign-off') || s.includes('certification') || s.includes('pending qc')) return 'qc';
  if (s.includes('dispatch') || s.includes('packing') || s.includes('delivery') || s.includes('completed') || s.includes('crated') || s.includes('preservation')) return 'dispatch';
  return 'repair';
};

export default function ServiceScreen({ onNavigate, onNotify }) {
  const [activeTab, setActiveTab] = useState('list');
  const [serviceJobs, setServiceJobs] = useState([]);
  const [plantAssets, setPlantAssets] = useState([]);
  const [maintenanceOrders, setMaintenanceOrders] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');
  const [inspectedStageKey, setInspectedStageKey] = useState(null);

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [customersList, setCustomersList] = useState([]);

  // Sales Quotations integration state for Quick-Fill
  const [quotationsList, setQuotationsList] = useState([]);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [quoteFilterApprovedOnly, setQuoteFilterApprovedOnly] = useState(true);

  // Technician Stage Notes Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteModalText, setNoteModalText] = useState('');
  const [noteModalStage, setNoteModalStage] = useState('');

  // Comprehensive Spindle Service Job Form State
  const [jobFormData, setJobFormData] = useState({
    ticketId: '',
    spindleSerial: '',
    spindleModel: 'GPS-HSK-A63-24K',
    customModel: '',
    taperStandard: 'HSK-A63',
    maxRpm: 24000,
    customerCompany: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    receivedDate: '',
    targetDate: '',
    initialStage: 'complaint',
    priority: 'High',
    failureDescription: '',
    scopeOfWork: [
      'Full Mechanical Teardown & Ultrasonic Wash',
      'Ceramic Hybrid P4S/ABEC-7 Bearing Pack',
      'Dynamic Balancing to ISO G0.4'
    ],
    estimatedCost: '',
    technicianName: '',
    initialRunout: '',
    drawbarForce: '',
    notes: ''
  });

  // Load Data with resilient fallback to localStorage and mock data
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load registered customers for dropdown
      try {
        const custRes = await customerService.getCustomers();
        if (custRes?.data && custRes.data.length > 0) {
          setCustomersList(custRes.data.map(c => ({
            id: c.id,
            name: c.company_name || c.name,
            contactPerson: c.primary_contact_name || c.contact_person || '',
            phone: c.primary_phone || c.phone || '',
            email: c.primary_email || c.email || ''
          })));
        } else if (CUSTOMERS && CUSTOMERS.length > 0) {
          setCustomersList(CUSTOMERS.map(c => ({
            id: c.id,
            name: c.name || c.company_name,
            contactPerson: c.contactPerson || c.contact_person || '',
            phone: c.phone || '',
            email: c.email || ''
          })));
        }
      } catch (e) {
        if (CUSTOMERS && CUSTOMERS.length > 0) {
          setCustomersList(CUSTOMERS.map(c => ({
            id: c.id,
            name: c.name || c.company_name,
            contactPerson: c.contactPerson || '',
            phone: c.phone || '',
            email: c.email || ''
          })));
        }
      }

      // Read any locally created service jobs from localStorage
      let localJobs = [];
      try {
        const stored = localStorage.getItem('gps_local_service_jobs');
        if (stored) {
          localJobs = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Could not parse local service jobs:', e);
      }

      const results = await Promise.allSettled([
        serviceService.getServiceJobs(),
        assetService.getAssets(),
        maintenanceService.getMaintenanceOrders(),
        salesService.getQuotations()
      ]);

      const jobsRes = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
      const assetsRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
      const mntRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
      const quoteRes = results[3].status === 'fulfilled' ? results[3].value : { data: [] };

      // Sales Quotations for Quick-Fill
      if (quoteRes?.data && quoteRes.data.length > 0) {
        setQuotationsList(quoteRes.data);
      } else if (SEED_QUOTATIONS && SEED_QUOTATIONS.length > 0) {
        setQuotationsList(SEED_QUOTATIONS);
      }

      // Service Jobs
      let jobs = [];
      const localJobMap = new Map();
      localJobs.forEach(j => {
        if (j.id) localJobMap.set(j.id, j);
      });

      if (jobsRes?.data && jobsRes.data.length > 0) {
        // Merge DB jobs with local jobs (local updates take precedence because assignments/stages happen in Workforce)
        const mergedDb = jobsRes.data.map(dj => {
          const match = localJobMap.get(dj.id);
          return match ? { ...dj, ...match } : dj;
        });
        const seen = new Set(mergedDb.map(j => j.id));
        const extraLocal = localJobs.filter(j => !seen.has(j.id));
        jobs = [...extraLocal, ...mergedDb];
      } else {
        // Fallback to SEED / mock data merged with local updates
        const seedJobs = (SERVICE_JOBS && SERVICE_JOBS.length > 0) ? SERVICE_JOBS : [];
        const mergedSeed = seedJobs.map(sj => {
          const match = localJobMap.get(sj.id);
          return match ? { ...sj, ...match } : sj;
        });
        const seen = new Set(mergedSeed.map(j => j.id));
        const extraLocal = localJobs.filter(j => !seen.has(j.id));
        jobs = [...extraLocal, ...mergedSeed];
      }

      setServiceJobs(jobs);
      const requestedJobId = typeof window !== 'undefined' ? localStorage.getItem('gps_active_service_job_id') : null;
      if (requestedJobId) {
        localStorage.removeItem('gps_active_service_job_id');
        const target = jobs.find(j => j.id === requestedJobId || j.spindleSerial === requestedJobId);
        if (target) {
          setSelectedJob(target);
          setActiveTab('detail');
        } else if (jobs.length > 0) {
          setSelectedJob(prev => prev ? jobs.find(j => j.id === prev.id) || jobs[0] : jobs[0]);
        }
      } else if (jobs.length > 0) {
        setSelectedJob(prev => prev ? jobs.find(j => j.id === prev.id) || jobs[0] : jobs[0]);
      }

      // Plant Assets
      if (assetsRes?.data && assetsRes.data.length > 0) {
        setPlantAssets(assetsRes.data);
      } else {
        setPlantAssets(FALLBACK_PLANT_ASSETS);
      }

      // Maintenance Orders
      if (mntRes?.data && mntRes.data.length > 0) {
        setMaintenanceOrders(mntRes.data);
      } else {
        setMaintenanceOrders(FALLBACK_MAINTENANCE_ORDERS);
      }
    } catch (err) {
      console.error('Failed to load service data, utilizing offline cache:', err);
      // Safe fallback to mock data
      const seedJobs = SERVICE_JOBS || [];
      setServiceJobs(seedJobs);
      if (seedJobs.length > 0) setSelectedJob(seedJobs[0]);
      setPlantAssets(FALLBACK_PLANT_ASSETS);
      setMaintenanceOrders(FALLBACK_MAINTENANCE_ORDERS);
      if (SEED_QUOTATIONS && SEED_QUOTATIONS.length > 0) {
        setQuotationsList(SEED_QUOTATIONS);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live updates across ERP screens (Sales, Quotations, Customers, Jobs, Workforce)
    const handleEntityUpdate = (e) => {
      const entity = e.detail?.entity;
      if (!entity || entity === 'service-jobs' || entity === 'service' || entity === 'workforce' || entity === 'quotations' || entity === 'sales' || entity === 'customers') {
        loadData();
      }
    };
    window.addEventListener('gps_entities_updated', handleEntityUpdate);
    return () => window.removeEventListener('gps_entities_updated', handleEntityUpdate);
  }, []);

  // Compute live counts per pipeline stage
  const stagesWithCounts = useMemo(() => {
    return SERVICE_PIPELINE_STAGES.map(stage => {
      const count = serviceJobs.filter(j => getNormalizedStageKey(j.currentStage) === stage.key).length;
      return {
        ...stage,
        count
      };
    });
  }, [serviceJobs]);

  // Stage click handler - toggles stage filter and inspects SOP
  const handleStageClick = (stageKey) => {
    if (selectedStageFilter === stageKey) {
      // Toggle off
      setSelectedStageFilter('all');
      setInspectedStageKey(null);
    } else {
      setSelectedStageFilter(stageKey);
      setInspectedStageKey(stageKey);
    }
  };

  // Live count of approved quotations available for job creation
  const approvedQuotesCount = useMemo(() => {
    return quotationsList.filter(q => {
      const st = (q.status || q.rawStatus || '').toLowerCase();
      return st === 'approved';
    }).length;
  }, [quotationsList]);

  // Filtered quotations matching search term and approval filter
  const filteredQuotations = useMemo(() => {
    const query = (quoteSearchQuery || '').trim().toLowerCase();
    return quotationsList.filter(q => {
      const isApproved = (q.status || q.rawStatus || '').toLowerCase() === 'approved';
      if (quoteFilterApprovedOnly && !isApproved) return false;
      if (!query) return true;

      const estNo = (q.estimateNo || q.id || '').toLowerCase();
      const cust = (q.customer || q.customer_name || '').toLowerCase();
      const serial = (q.spindleSerial || q.spindle_serial || '').toLowerCase();
      const contact = (q.contactPerson || '').toLowerCase();
      const items = (q.items || []).map(it => `${it.name || ''} ${it.desc || ''}`).join(' ').toLowerCase();
      const scope = Array.isArray(q.scopeOfWork) ? q.scopeOfWork.join(' ').toLowerCase() : (q.scopeOfWork || '').toLowerCase();

      return estNo.includes(query) ||
        cust.includes(query) ||
        serial.includes(query) ||
        contact.includes(query) ||
        items.includes(query) ||
        scope.includes(query);
    });
  }, [quotationsList, quoteSearchQuery, quoteFilterApprovedOnly]);

  // Auto-fill Spindle Service Job details from an approved commercial quotation
  const handleSelectQuotation = (quote) => {
    setSelectedQuotation(quote);

    // Parse items & description to detect spindle model, taper, and overhaul operations
    const itemsText = (quote.items || []).map(i => `${i.name || ''} ${i.desc || ''}`).join(' ');
    const scopeText = Array.isArray(quote.scopeOfWork) ? quote.scopeOfWork.join(' ') : (quote.scopeOfWork || '');
    const combinedText = `${quote.spindleSerial || ''} ${itemsText} ${scopeText}`.toLowerCase();

    // Spindle Model & Taper detection
    let detectedModel = 'GPS-HSK-A63-24K';
    let detectedCustom = '';
    let detectedTaper = 'HSK-A63';
    let detectedRpm = 24000;

    if (combinedText.includes('kesslar') || combinedText.includes('kessler')) {
      detectedModel = '__custom__';
      detectedCustom = 'Kessler HSK-63 Motorized Spindle';
      detectedTaper = 'HSK-A63';
      detectedRpm = 24000;
    } else if (combinedText.includes('hsk-a63') || combinedText.includes('hsk63') || combinedText.includes('hsk-63')) {
      detectedModel = 'GPS-HSK-A63-24K';
      detectedTaper = 'HSK-A63';
      detectedRpm = 24000;
    } else if (combinedText.includes('bt50') || combinedText.includes('bt-50')) {
      detectedModel = 'GPS-BT50-10K';
      detectedTaper = 'BT50';
      detectedRpm = 10000;
    } else if (combinedText.includes('bt40') || combinedText.includes('bt-40')) {
      detectedModel = 'GPS-BT40-15K';
      detectedTaper = 'BT40';
      detectedRpm = 15000;
    } else if (combinedText.includes('hf-60k') || combinedText.includes('60,000') || combinedText.includes('hsk-e25')) {
      detectedModel = 'GPS-HF-60K';
      detectedTaper = 'HSK-E25';
      detectedRpm = 60000;
    } else if (combinedText.includes('hsk-e40') || combinedText.includes('42,000')) {
      detectedModel = 'GPS-HSK-E40-42K';
      detectedTaper = 'HSK-E40';
      detectedRpm = 42000;
    } else if (combinedText.includes('bbt40') || combinedText.includes('bbt-40')) {
      detectedModel = 'GPS-BBT40-12K';
      detectedTaper = 'BBT40';
      detectedRpm = 12000;
    }

    // Commercial Cost calculation
    const rawCost = Number(quote.totalAmount || quote.subtotal || 0);
    const formattedCost = rawCost > 0 ? rawCost.toLocaleString('en-IN') : '1,95,000';

    // Factory Overhaul Scope tags auto-matching
    const detectedScope = ['Full Mechanical Teardown & Ultrasonic Wash'];
    if (combinedText.includes('bearing') || combinedText.includes('hc7014') || combinedText.includes('n1011') || combinedText.includes('spindle unit')) {
      detectedScope.push('Ceramic Hybrid P4S/ABEC-7 Bearing Pack');
    }
    if (combinedText.includes('sleeve') || combinedText.includes('sleeving') || combinedText.includes('grind') || combinedText.includes('taper')) {
      detectedScope.push('Shaft Nose Taper CNC Regrinding');
    }
    if (combinedText.includes('drawbar') || combinedText.includes('locknut') || combinedText.includes('clamp') || combinedText.includes('spring')) {
      detectedScope.push('Belleville Spring Pack & Drawbar Rebuild');
    }
    if (combinedText.includes('dynamic') || combinedText.includes('balanc') || combinedText.includes('test')) {
      detectedScope.push('Dynamic Balancing to ISO G0.4');
    }
    if (combinedText.includes('seal') || combinedText.includes('o-ring')) {
      detectedScope.push('Precision Rotary Seals & Viton O-Rings');
    }
    if (combinedText.includes('stator') || combinedText.includes('sensor') || combinedText.includes('encoder') || combinedText.includes('chiller')) {
      detectedScope.push('Encoder / Sensor Recalibration');
    }
    detectedScope.push('Thermal Stabilization & 6-Hour Run-in');

    // Customer Reported Symptoms & Quoted Scope description
    let failureDesc = '';
    if (Array.isArray(quote.scopeOfWork) && quote.scopeOfWork.length > 0) {
      failureDesc = `Quotation Scope: ${quote.scopeOfWork.slice(0, 5).join('; ')}`;
    } else if (quote.items && quote.items.length > 0) {
      const itemNames = quote.items.map(i => i.desc || i.name).filter(Boolean).slice(0, 3).join(', ');
      failureDesc = `Quoted Scope: ${itemNames}`;
    } else {
      failureDesc = `Factory overhaul authorized under Approved Quotation ${quote.estimateNo || quote.id}.`;
    }

    // Contact info
    const contactPerson = quote.contactPerson || '';
    const contactPhone = quote.contactNo || '';
    const contactEmail = quote.customerEmail || '';
    const spindleSerial = quote.spindleSerial || jobFormData.spindleSerial;

    setJobFormData(prev => ({
      ...prev,
      customerCompany: quote.customer || prev.customerCompany,
      contactPerson: contactPerson || prev.contactPerson,
      contactPhone: contactPhone || prev.contactPhone,
      contactEmail: contactEmail || prev.contactEmail,
      spindleSerial: spindleSerial,
      spindleModel: detectedModel,
      customModel: detectedCustom,
      taperStandard: detectedTaper,
      maxRpm: detectedRpm,
      estimatedCost: formattedCost,
      initialStage: 'approval', // Since quote is already approved by client, jump directly to Stage 05 (Client PO / Kit Release)
      failureDescription: failureDesc,
      scopeOfWork: detectedScope.length > 0 ? detectedScope : prev.scopeOfWork,
      notes: `Imported from Approved Quotation ${quote.estimateNo || quote.id}. Quoted Total: ₹${rawCost.toLocaleString('en-IN')}. Date: ${quote.date || 'Recent'}.`
    }));

    if (onNotify) {
      onNotify(`Auto-filled service job details from Quotation ${quote.estimateNo || quote.id} (${quote.customer})`, 'info');
    }
  };

  // Clear selected quotation link
  const handleClearSelectedQuotation = () => {
    setSelectedQuotation(null);
  };

  // Open Add Spindle Job Modal with computed ticket defaults
  const handleOpenAddJobModal = () => {
    setSelectedQuotation(null);
    setQuoteSearchQuery('');
    setQuoteFilterApprovedOnly(true);

    const existingNums = serviceJobs
      .map(j => {
        const m = (j.id || '').match(/SR-\d+-(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : (serviceJobs.length + 40);
    const nextTicketNum = `SR-2026-${String(maxNum + 1).padStart(3, '0')}`;
    const nextSerialNum = `GPS-2025-${String(720 + maxNum + 1).padStart(4, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const target = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];

    const defaultCustomer = customersList[0]?.name || 'Tata Advanced Systems Ltd';
    const defaultCustObj = customersList[0] || {};

    setJobFormData({
      ticketId: nextTicketNum,
      spindleSerial: nextSerialNum,
      spindleModel: 'GPS-HSK-A63-24K',
      customModel: '',
      taperStandard: 'HSK-A63',
      maxRpm: 24000,
      customerCompany: defaultCustomer,
      contactPerson: defaultCustObj.contactPerson || 'Rajesh Khurana',
      contactPhone: defaultCustObj.phone || '+91 98230 44102',
      contactEmail: defaultCustObj.email || 'procurement@tasl.co.in',
      receivedDate: today,
      targetDate: target,
      initialStage: 'complaint',
      priority: 'High',
      failureDescription: '',
      scopeOfWork: [
        'Full Mechanical Teardown & Ultrasonic Wash',
        'Ceramic Hybrid P4S/ABEC-7 Bearing Pack',
        'Dynamic Balancing to ISO G0.4'
      ],
      estimatedCost: '1,95,000',
      technicianName: 'Vikram Shinde (Sr. Spindle Specialist)',
      initialRunout: '0.0050',
      drawbarForce: '16.5',
      notes: ''
    });
    setIsAddJobModalOpen(true);
  };

  // Customer dropdown select handler
  const handleCustomerSelect = (customerName) => {
    if (customerName === '__custom__') {
      setJobFormData(prev => ({
        ...prev,
        customerCompany: '',
        contactPerson: '',
        contactPhone: '',
        contactEmail: ''
      }));
      return;
    }
    const matched = customersList.find(c => (c.name || '').toLowerCase() === (customerName || '').toLowerCase());
    if (matched) {
      setJobFormData(prev => ({
        ...prev,
        customerCompany: matched.name,
        contactPerson: matched.contactPerson || prev.contactPerson,
        contactPhone: matched.phone || prev.contactPhone,
        contactEmail: matched.email || prev.contactEmail
      }));
    } else {
      setJobFormData(prev => ({ ...prev, customerCompany: customerName }));
    }
  };

  // Toggle Overhaul Scope operations tag
  const toggleScopeTag = (tag) => {
    setJobFormData(prev => {
      const exists = prev.scopeOfWork.includes(tag);
      return {
        ...prev,
        scopeOfWork: exists
          ? prev.scopeOfWork.filter(t => t !== tag)
          : [...prev.scopeOfWork, tag]
      };
    });
  };

  // Quick append symptom chip
  const appendSymptom = (symptom) => {
    setJobFormData(prev => {
      const current = (prev.failureDescription || '').trim();
      if (!current) return { ...prev, failureDescription: symptom };
      if (current.includes(symptom)) return prev;
      return { ...prev, failureDescription: `${current}; ${symptom}` };
    });
  };

  // Create Service Job handler
  const handleCreateServiceJob = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!jobFormData.customerCompany.trim()) {
      if (onNotify) onNotify('Please enter or select a customer company.', 'warning');
      return;
    }
    if (!jobFormData.spindleSerial.trim()) {
      if (onNotify) onNotify('Please enter a spindle serial number.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const ticketId = jobFormData.ticketId.trim() || `SR-2026-${Math.floor(100 + Math.random() * 900)}`;
      const resolvedModel = jobFormData.spindleModel === '__custom__' ? (jobFormData.customModel || 'Custom Spindle') : jobFormData.spindleModel;
      const initialStageKey = jobFormData.initialStage || 'complaint';
      const stageIdx = STAGE_KEYS_ORDER.indexOf(initialStageKey) + 1;
      const cleanCostNum = Number(String(jobFormData.estimatedCost).replace(/[^0-9]/g, '')) || 195000;
      const formattedCost = `₹${cleanCostNum.toLocaleString('en-IN')}`;

      const newJobRecord = {
        id: ticketId,
        dbId: `job-${Date.now()}`,
        quotationNo: selectedQuotation ? (selectedQuotation.estimateNo || selectedQuotation.id) : null,
        linkedQuotationId: selectedQuotation ? selectedQuotation.id : null,
        spindleSerial: jobFormData.spindleSerial.trim(),
        spindleModel: resolvedModel,
        taperStandard: jobFormData.taperStandard,
        maxRpm: Number(jobFormData.maxRpm) || 24000,
        customer: jobFormData.customerCompany.trim(),
        customerContact: jobFormData.contactPerson,
        customerPhone: jobFormData.contactPhone,
        customerEmail: jobFormData.contactEmail,
        complaint: jobFormData.failureDescription.trim() || 'Inward spindle overhaul, teardown & precision dynamic balancing.',
        technician: jobFormData.technicianName,
        receivedDate: jobFormData.receivedDate || new Date().toISOString().split('T')[0],
        targetDate: jobFormData.targetDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        currentStage: initialStageKey,
        stageIndex: stageIdx > 0 ? stageIdx : 1,
        priority: jobFormData.priority,
        status: initialStageKey === 'dispatch' ? 'Completed' : (initialStageKey === 'qc' ? 'QC Pending' : 'In Progress'),
        estimatedCost: formattedCost,
        taperRunoutInitial: Number(jobFormData.initialRunout) || 0.0050,
        taperRunoutFinal: null,
        balancingGrade: 'ISO G0.4',
        bearingLot: 'LOT-FAG-2026-X99',
        drawbarForce: `${jobFormData.drawbarForce || '16.5'} kN`,
        scopeOfWork: jobFormData.scopeOfWork,
        notes: selectedQuotation
          ? (jobFormData.notes?.trim()
            ? `[Linked Quote: ${selectedQuotation.estimateNo || selectedQuotation.id}] ${jobFormData.notes.trim()}`
            : `Linked to Approved Quotation ${selectedQuotation.estimateNo || selectedQuotation.id}.`)
          : (jobFormData.notes?.trim() || `Inward job ticket logged for ${jobFormData.customerCompany}. Symptoms: ${jobFormData.failureDescription || 'Factory overhaul requested'}`),
        findings: {
          taperCondition: `Initial runout measured at ${jobFormData.initialRunout || '0.0050'} mm. Standard benchmark: ≤ 0.0010 mm.`,
          bearingState: "Inward inspection staged; awaiting cleanroom teardown.",
          drawbarForce: `${jobFormData.drawbarForce || '16.5'} kN clamping force logged.`,
          statorInsulation: "Stator megger insulation audit scheduled."
        },
        lifecycle: [
          {
            name: "Complaint Logged",
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            done: true,
            note: `Logged for ${jobFormData.customerCompany} by ${jobFormData.technicianName.split(' ')[0]}`
          },
          { name: "Incoming Inspection", date: "Pending", done: initialStageKey !== 'complaint', note: "Incoming runout & baseline vibration audit" },
          { name: "Teardown & Diagnosis", date: "Pending", done: ['diagnosis', 'estimate', 'approval', 'repair', 'testing', 'qc', 'dispatch'].includes(initialStageKey), note: "Cleanroom teardown & failure analysis" },
          { name: "Cost Estimation", date: "Pending", done: ['estimate', 'approval', 'repair', 'testing', 'qc', 'dispatch'].includes(initialStageKey), note: "BOM & labor quotation generation" },
          { name: "Customer Approval", date: "Pending", done: ['approval', 'repair', 'testing', 'qc', 'dispatch'].includes(initialStageKey), note: "Client PO confirmation & kit release" },
          { name: "Rebuild & Grinding", date: "Pending", done: ['repair', 'testing', 'qc', 'dispatch'].includes(initialStageKey), note: "Shaft re-grinding & bearing rebuild" },
          { name: "Balancing & Run-in", date: "Pending", done: ['testing', 'qc', 'dispatch'].includes(initialStageKey), note: "Dynamic balancing to ISO G0.4 & thermal run-in" },
          { name: "Final QC Certification", date: "Pending", done: ['qc', 'dispatch'].includes(initialStageKey), note: "Final nose taper runout & drawbar check" },
          { name: "Express Dispatch", date: "Pending", done: initialStageKey === 'dispatch', note: "Express crated delivery" }
        ]
      };

      // Try database insert in background
      try {
        await serviceService.createServiceRequest({
          sr_number: ticketId,
          serial_number: newJobRecord.spindleSerial,
          spindle_model: newJobRecord.spindleModel,
          customer_name: newJobRecord.customer,
          failure_description: newJobRecord.complaint,
          priority: newJobRecord.priority,
          status: newJobRecord.status
        });
      } catch (dbErr) {
        console.warn('Backend DB insert skipped, saving locally:', dbErr);
      }

      // Update local state
      const updatedJobs = [newJobRecord, ...serviceJobs];
      setServiceJobs(updatedJobs);
      setSelectedJob(newJobRecord);

      try {
        const stored = JSON.parse(localStorage.getItem('gps_local_service_jobs') || '[]');
        localStorage.setItem('gps_local_service_jobs', JSON.stringify([newJobRecord, ...stored]));
      } catch (e) {
        console.warn('Could not save to localStorage:', e);
      }

      // Emit global entity sync
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gps_entities_updated', {
          detail: { entity: 'service-jobs', jobId: newJobRecord.id }
        }));
      }

      setIsAddJobModalOpen(false);
      setIsLogOpen(false);
      const linkedQuoteNo = selectedQuotation ? (selectedQuotation.estimateNo || selectedQuotation.id) : null;
      setSelectedQuotation(null);

      if (onNotify) {
        if (linkedQuoteNo) {
          onNotify(`Spindle Service Job ${ticketId} generated with Case File from Quote ${linkedQuoteNo}! To assign technicians and workstations, proceed to Staff & Workforce.`, 'success');
        } else {
          onNotify(`Spindle Service Job ${ticketId} generated with Case File! To assign technicians and workstations, proceed to Staff & Workforce.`, 'success');
        }
      }
    } catch (err) {
      console.error('Failed to create spindle service job:', err);
      if (onNotify) onNotify(err.message || 'Failed to add service job', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Advance Pipeline Stage sequentially (complaint -> inspection -> ... -> dispatch)
  const handleAdvanceStep = async () => {
    if (!selectedJob) return;
    try {
      const currentStageKey = getNormalizedStageKey(selectedJob.currentStage);
      const currentIndex = STAGE_KEYS_ORDER.indexOf(currentStageKey);
      const nextIndex = currentIndex < STAGE_KEYS_ORDER.length - 1 ? currentIndex + 1 : STAGE_KEYS_ORDER.length - 1;
      const nextKey = STAGE_KEYS_ORDER[nextIndex];
      const nextStageObj = SERVICE_PIPELINE_STAGES.find(s => s.key === nextKey) || SERVICE_PIPELINE_STAGES[0];

      // Update state immediately
      const updatedJob = {
        ...selectedJob,
        currentStage: nextKey,
        status: nextKey === 'dispatch' ? 'Completed' : (nextKey === 'qc' ? 'QC Pending' : 'In Progress')
      };

      const nextJobs = serviceJobs.map(j => j.id === selectedJob.id ? updatedJob : j);
      setServiceJobs(nextJobs);
      setSelectedJob(updatedJob);

      // Persist to localStorage
      try {
        localStorage.setItem('gps_local_service_jobs', JSON.stringify(nextJobs));
      } catch (e) {
        console.warn('Could not persist updated stage:', e);
      }

      // Call database if dbId is a valid UUID
      if (selectedJob.dbId && typeof selectedJob.dbId === 'string' && selectedJob.dbId.length > 20) {
        try {
          await serviceService.advanceServiceJobStage(selectedJob.dbId, nextStageObj.name, {
            findings: `Advanced rebuild stage to ${nextStageObj.name}`,
            actionsTaken: `Executed ${nextStageObj.name} procedure according to spindle overhaul SOP.`
          });
        } catch (dbErr) {
          console.warn('Live DB update skipped:', dbErr);
        }
      }

      if (onNotify) {
        onNotify(`Advanced ${selectedJob.id} to ${nextStageObj.name} stage.`);
      }
    } catch (err) {
      console.error('Failed to advance rebuild step:', err);
      if (onNotify) onNotify(err.message || 'Failed to advance stage', 'error');
    }
  };

  // Jump/Transition Spindle to a specific pipeline stage directly
  const handleTransitionToStage = async (targetStageKey) => {
    if (!selectedJob) return;
    try {
      const targetStageObj = SERVICE_PIPELINE_STAGES.find(s => s.key === targetStageKey);
      if (!targetStageObj) return;

      const updatedJob = {
        ...selectedJob,
        currentStage: targetStageKey,
        status: targetStageKey === 'dispatch' ? 'Completed' : (targetStageKey === 'qc' ? 'QC Pending' : 'In Progress')
      };

      const nextJobs = serviceJobs.map(j => j.id === selectedJob.id ? updatedJob : j);
      setServiceJobs(nextJobs);
      setSelectedJob(updatedJob);

      try {
        localStorage.setItem('gps_local_service_jobs', JSON.stringify(nextJobs));
      } catch (e) {
        console.warn('Could not persist stage transition:', e);
      }

      if (selectedJob.dbId && typeof selectedJob.dbId === 'string' && selectedJob.dbId.length > 20) {
        try {
          await serviceService.advanceServiceJobStage(selectedJob.dbId, targetStageObj.name, {
            findings: `Transitioned stage to ${targetStageObj.name}`,
            actionsTaken: `Direct overhaul stage adjustment.`
          });
        } catch (dbErr) {
          console.warn('Live DB update skipped:', dbErr);
        }
      }

      if (onNotify) {
        onNotify(`Transitioned ${selectedJob.id} to ${targetStageObj.name} stage.`);
      }
    } catch (err) {
      console.error('Failed to transition stage:', err);
      if (onNotify) onNotify('Failed to transition stage', 'error');
    }
  };

  // Complete Rebuild Step with final QC Sign-off
  const handleCompleteRebuild = async () => {
    if (!selectedJob) return;
    try {
      const updatedJob = {
        ...selectedJob,
        currentStage: 'dispatch',
        status: 'Completed',
        taperRunoutFinal: 0.0008,
        balancingGrade: 'ISO G0.4',
        notes: 'Final QC sign-off complete. Nose taper runout ≤ 0.0008 mm, dynamically balanced to ISO G0.4.'
      };

      const nextJobs = serviceJobs.map(j => j.id === selectedJob.id ? updatedJob : j);
      setServiceJobs(nextJobs);
      setSelectedJob(updatedJob);

      try {
        localStorage.setItem('gps_local_service_jobs', JSON.stringify(nextJobs));
      } catch (e) {
        console.warn('Could not persist complete status:', e);
      }

      if (selectedJob.dbId && typeof selectedJob.dbId === 'string' && selectedJob.dbId.length > 20) {
        try {
          await serviceService.completeServiceJob(selectedJob.dbId, {
            taperRunoutFinal: 0.0008,
            balancingGrade: 'ISO G0.4',
            notes: 'Final QC sign-off complete. Nose taper runout ≤ 0.0008 mm, dynamically balanced.'
          });
        } catch (dbErr) {
          console.warn('Live DB update skipped:', dbErr);
        }
      }

      if (onNotify) {
        onNotify(`Completed rebuild and QC sign-off for ${selectedJob.id}. Nose runout: 0.0008 mm, ISO G0.4.`);
      }
    } catch (err) {
      console.error('Failed to complete rebuild:', err);
      if (onNotify) onNotify(err.message || 'Failed to complete rebuild', 'error');
    }
  };

  // Save Technician Note & Update Stage for Service Job
  const handleSaveServiceNote = async () => {
    if (!selectedJob) return;
    const text = (noteModalText || '').trim();
    const targetStageKey = noteModalStage || selectedJob.currentStage || 'repair';
    const targetStageObj = SERVICE_PIPELINE_STAGES.find(s => s.key === targetStageKey) || { name: targetStageKey };

    const timestampStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const stageChanged = getNormalizedStageKey(selectedJob.currentStage) !== getNormalizedStageKey(targetStageKey);

    const newNoteEntry = text ? {
      id: `note-${Date.now()}`,
      stageKey: getNormalizedStageKey(targetStageKey),
      stageName: targetStageObj.name || targetStageKey,
      author: selectedJob.technician || selectedJob.assignedTo || 'Service Technician',
      text,
      timestamp: timestampStr
    } : null;

    const existingHistory = Array.isArray(selectedJob.notesHistory) ? selectedJob.notesHistory : [];
    const updatedHistory = newNoteEntry ? [newNoteEntry, ...existingHistory] : existingHistory;

    const updatedJob = {
      ...selectedJob,
      currentStage: targetStageKey,
      status: targetStageKey === 'dispatch' ? 'Completed' : (targetStageKey === 'qc' ? 'QC Pending' : (selectedJob.status === 'Completed' && !stageChanged ? 'Completed' : 'In Progress')),
      ...(text ? {
        notes: text,
        technicianNotes: text,
        lastNoteBy: selectedJob.technician || 'Service Technician',
        lastNoteAt: timestampStr,
        notesHistory: updatedHistory
      } : {
        notesHistory: updatedHistory
      })
    };

    const nextJobs = serviceJobs.map(j => j.id === selectedJob.id ? updatedJob : j);
    setServiceJobs(nextJobs);
    setSelectedJob(updatedJob);

    try {
      localStorage.setItem('gps_local_service_jobs', JSON.stringify(nextJobs));
    } catch (e) {
      console.warn('Could not persist updated service job:', e);
    }

    if (selectedJob.dbId && typeof selectedJob.dbId === 'string' && selectedJob.dbId.length > 20) {
      try {
        if (stageChanged) {
          await serviceService.advanceServiceJobStage(selectedJob.dbId, targetStageObj.name, {
            findings: text || `Stage updated to ${targetStageObj.name}`,
            actionsTaken: text || 'Technician stage update with notes'
          });
        }
      } catch (dbErr) {
        console.warn('DB update skipped:', dbErr);
      }
    }

    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'service' } }));

    setIsNoteModalOpen(false);
    if (onNotify) {
      if (stageChanged && text) {
        onNotify(`Updated ${selectedJob.id} to ${targetStageObj.name} with technician note.`);
      } else if (stageChanged) {
        onNotify(`Updated ${selectedJob.id} stage to ${targetStageObj.name}.`);
      } else {
        onNotify(`Technician note saved on ${selectedJob.id}.`);
      }
    }
  };

  // Complete Maintenance Order
  const handleCompleteMaintenance = async (orderId) => {
    try {
      const updatedOrders = maintenanceOrders.map(m => {
        if (m.id === orderId || m.dbId === orderId) {
          return { ...m, status: 'Completed' };
        }
        return m;
      });
      setMaintenanceOrders(updatedOrders);

      // Call database if applicable
      if (orderId && typeof orderId === 'string' && orderId.length > 20) {
        try {
          await maintenanceService.completeMaintenanceOrder(orderId, {
            actionsTaken: 'Routine preventive maintenance & sensor calibration completed.',
            maintenanceCost: 12000,
            downtimeHours: 1.5
          });
        } catch (dbErr) {
          console.warn('Live maintenance DB update skipped:', dbErr);
        }
      }

      if (onNotify) onNotify(`Maintenance order ${orderId} marked as Completed.`);
    } catch (err) {
      console.error('Failed to complete maintenance order:', err);
      if (onNotify) onNotify(err.message || 'Failed to complete maintenance order', 'error');
    }
  };

  // Direct PDF Download
  const handleDirectDownloadPdf = (job) => {
    try {
      const doc = exportServiceJobReportPdf(job);
      if (doc && doc.save) {
        doc.save(`GPS_Service_Report_${job.id || 'SR-2026'}.pdf`);
      }
      if (onNotify) onNotify(`Service Report PDF downloaded for ${job.id}.`);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      if (onNotify) onNotify('Error generating Service Report PDF', 'error');
    }
  };

  // Filter jobs by search query AND pipeline stage selection
  const filteredJobs = useMemo(() => {
    return serviceJobs.filter((job) => {
      // 1. Stage filter
      if (selectedStageFilter !== 'all') {
        const jobStageKey = getNormalizedStageKey(job.currentStage);
        if (jobStageKey !== selectedStageFilter) return false;
      }

      // 2. Search query filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        job.id.toLowerCase().includes(q) ||
        (job.spindleSerial && job.spindleSerial.toLowerCase().includes(q)) ||
        (job.customer && job.customer.toLowerCase().includes(q)) ||
        (job.complaint && job.complaint.toLowerCase().includes(q)) ||
        (job.technician && job.technician.toLowerCase().includes(q))
      );
    });
  }, [serviceJobs, searchQuery, selectedStageFilter]);


  // Metrics
  const activeOverhaulsCount = serviceJobs.filter(j => j.status !== 'Completed').length;
  const criticalCount = serviceJobs.filter(j => j.priority === 'Critical').length;
  const balancingQcCount = serviceJobs.filter(j => ['testing', 'qc'].includes(getNormalizedStageKey(j.currentStage))).length;
  const activeAssetsCount = plantAssets.filter(a => a.status === 'Active').length;

  if (isLoading) {
    return <TablePageSkeleton columns={['100px', '140px', '160px', '220px', '120px', '90px', '80px', '70px']} rows={6} />;
  }

  return (
    <div className="content-area">
      <PageHeader
        title="Spindle Overhaul, Rebuilding & Service"
        subtitle="Log overhaul intake & inspect spindle case files across 9-stage lifecycle • Technician assignment & stage progress managed in Staff & Workforce"
        badge={`${serviceJobs.length} In System (${activeOverhaulsCount} Active)`}
      >
        {onNavigate && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigate('workforce')}
            title="Manage technician assignments and stage progress in Staff & Workforce"
          >
            <Users size={14} />
            <span className="desktop-only-inline">Staff & Workforce (Assign & Stages)</span>
            <span className="mobile-only-inline">Workforce</span>
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (selectedJob) {
              setPreviewDoc({
                ...selectedJob,
                type: 'Service Report',
                id: selectedJob.id || 'SRV-2026-0041'
              });
              setIsPreviewOpen(true);
            } else if (serviceJobs.length > 0) {
              setPreviewDoc({
                ...serviceJobs[0],
                type: 'Service Report',
                id: serviceJobs[0].id
              });
              setIsPreviewOpen(true);
            }
          }}
          title="Preview official overhaul & metrology report"
        >
          <FileText size={14} />
          <span className="desktop-only-inline">Service Report (PDF)</span>
          <span className="mobile-only-inline">Report (PDF)</span>
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleOpenAddJobModal}
        >
          <Plus size={14} />
          <span className="desktop-only-inline">Add Spindle Service Job</span>
          <span className="mobile-only-inline">+ Add Job</span>
        </button>
      </PageHeader>

      <div className="content-body">

        {/* Top KPI Metrics Strip (Standard GPS ERP .metrics-grid) */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Active Spindle Overhauls</span>
              <div className="metric-icon-wrap" style={{ color: 'var(--primary)' }}>
                <Wrench size={16} />
              </div>
            </div>
            <div className="metric-value">{activeOverhaulsCount}</div>
            <div className="metric-footer" style={{ color: 'var(--primary)' }}>
              9-stage shopfloor pipeline
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Critical Urgency</span>
              <div className="metric-icon-wrap" style={{ color: '#dc2626' }}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="metric-value">{criticalCount}</div>
            <div className="metric-footer" style={{ color: '#dc2626' }}>
              Machine line-down priority
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Dynamic Balancing & QC</span>
              <div className="metric-icon-wrap" style={{ color: '#0284c7' }}>
                <Activity size={16} />
              </div>
            </div>
            <div className="metric-value">{balancingQcCount}</div>
            <div className="metric-footer" style={{ color: '#0284c7' }}>
              ISO G0.4 & runout sign-off
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Plant Assets Active</span>
              <div className="metric-icon-wrap" style={{ color: '#16a34a' }}>
                <Settings size={16} />
              </div>
            </div>
            <div className="metric-value">{activeAssetsCount}</div>
            <div className="metric-footer" style={{ color: '#16a34a' }}>
              Balancing rigs & CNC grinders
            </div>
          </div>
        </div>

        {/* 9-Stage Service Restoration Pipeline Banner */}
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Wrench size={16} color="#7A1F3D" />
              <span>9-Stage Spindle Restoration & Recalibration Pipeline</span>
              <span className="badge badge-neutral" style={{ fontSize: '11px', fontWeight: 500 }}>
                Click any stage to filter or inspect SOP
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${selectedStageFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setSelectedStageFilter('all');
                  setInspectedStageKey(null);
                }}
              >
                <span>All Stages ({serviceJobs.length})</span>
              </button>
              {selectedStageFilter !== 'all' && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedStageFilter('all');
                    setInspectedStageKey(null);
                  }}
                  title="Clear stage filter"
                  style={{ color: 'var(--primary)' }}
                >
                  <X size={13} />
                  <span>Clear Filter</span>
                </button>
              )}
              <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} />
                <span>Target TAT: &lt; 5 Days</span>
              </span>
            </div>
          </div>

          <div style={{ padding: '14px 16px 16px' }}>
            <PipelineVisualizer
              stages={stagesWithCounts}
              activeStage={selectedStageFilter !== 'all' ? selectedStageFilter : (activeTab === 'detail' && selectedJob ? getNormalizedStageKey(selectedJob.currentStage) : null)}
              onSelectStage={(stageKey) => handleStageClick(stageKey)}
            />
          </div>

          {/* Interactive SOP Details Card */}
          {inspectedStageKey && STAGE_SOP_DETAILS[inspectedStageKey] && (
            <div style={{
              margin: '0 16px 14px 16px',
              padding: '12px 14px',
              background: '#fffafb',
              border: '1px solid #f2d2dc',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(122, 31, 61, 0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#7A1F3D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={15} />
                    {STAGE_SOP_DETAILS[inspectedStageKey].title}
                  </span>
                  <span className="badge badge-primary mono" style={{ fontSize: '10.5px', padding: '2px 7px' }}>
                    {STAGE_SOP_DETAILS[inspectedStageKey].sopCode}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Gatekeeper: <strong style={{ color: 'var(--text-main)' }}>{STAGE_SOP_DETAILS[inspectedStageKey].gatekeeper}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedStageKey(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  title="Close SOP preview"
                >
                  <X size={14} />
                </button>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 8px', lineHeight: 1.5 }}>
                {STAGE_SOP_DETAILS[inspectedStageKey].procedure}
              </p>
              <div style={{ display: 'flex', gap: '8px 16px', flexWrap: 'wrap', fontSize: '11px', paddingTop: '6px', borderTop: '1px dashed #e2ccd5' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Acceptance Criteria: </span>
                  <span style={{ color: 'var(--text-main)' }}>{STAGE_SOP_DETAILS[inspectedStageKey].acceptanceCriteria}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Tolerance Benchmark: </span>
                  <strong className="mono" style={{ color: '#7A1F3D' }}>{STAGE_SOP_DETAILS[inspectedStageKey].toleranceBenchmark}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <Tabs
          tabs={[
            { id: 'list', label: 'Active Service & Repair Jobs', count: filteredJobs.length },
            { id: 'detail', label: selectedJob ? `Case File: ${selectedJob.id}` : 'Case File' },
            { id: 'assets', label: 'Plant Assets Registry', count: plantAssets.length },
            { id: 'maintenance', label: 'Maintenance Orders', count: maintenanceOrders.length }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab 1: Service Jobs List */}
        {activeTab === 'list' && (
          <div className="section-card">
            <div className="filter-bar">
              <div className="filter-group">
                <div className="search-input-wrap">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search ticket, serial, customer, technician..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="search-clear-btn"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {selectedStageFilter !== 'all' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="badge badge-primary mono" style={{ padding: '6px 10px', fontSize: '12px' }}>
                      Filter: {SERVICE_PIPELINE_STAGES.find(s => s.key === selectedStageFilter)?.name || selectedStageFilter} ({filteredJobs.length} Jobs)
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedStageFilter('all')}
                    >
                      <X size={12} />
                      <span>Clear</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleOpenAddJobModal}
                title="Add a new spindle service or overhaul job"
              >
                <Plus size={13} />
                <span>Add Spindle Job</span>
              </button>
            </div>

            <div className="table-responsive desktop-table-view">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job Ticket</th>
                    <th>Spindle Serial</th>
                    <th>Customer</th>
                    <th>Customer Complaint / Symptoms</th>
                    <th>Pipeline Stage</th>
                    <th>Assigned Specialist</th>
                    <th>Received Date</th>
                    <th>Est. Cost</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan="11" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        <div>No active service or repair jobs match the current filter or search criteria.</div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ marginTop: '12px' }}
                          onClick={handleOpenAddJobModal}
                        >
                          <Plus size={13} />
                          <span>Add Spindle Job</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => {
                      const stageKey = getNormalizedStageKey(job.currentStage);
                      const stageObj = SERVICE_PIPELINE_STAGES.find(s => s.key === stageKey);
                      return (
                        <tr key={job.id}>
                          <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {job.id}
                            {job.quotationNo && (
                              <span
                                className="badge badge-neutral mono"
                                style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 5px', color: '#7A1F3D', border: '1px solid #e2ccd5' }}
                                title={`Linked to Quotation ${job.quotationNo}`}
                              >
                                Quote: {job.quotationNo}
                              </span>
                            )}
                          </td>
                          <td className="mono" style={{ fontWeight: 500 }}>{job.spindleSerial}</td>
                          <td style={{ fontWeight: 500 }}>{job.customer}</td>
                          <td style={{ maxWidth: '260px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {job.complaint}
                          </td>
                          <td>
                            <span
                              className="badge badge-neutral mono"
                              style={{ cursor: 'pointer', fontSize: '11px' }}
                              onClick={() => handleStageClick(stageKey)}
                              title="Filter by this stage"
                            >
                              {stageObj ? `0${stageObj.id} ${stageObj.name}` : job.currentStage}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px' }}>
                            <div
                              style={{ fontWeight: 600, color: 'var(--text-main)', cursor: (job.technician || job.assignedTo) ? 'pointer' : 'default' }}
                              onClick={() => {
                                if ((job.technician || job.assignedTo) && onNavigate) {
                                  localStorage.setItem('gps_active_workforce_job_id', job.id);
                                  localStorage.setItem('gps_workforce_action', 'assign');
                                  onNavigate('workforce');
                                }
                              }}
                              title={(job.technician || job.assignedTo) ? 'Manage in Staff & Workforce' : ''}
                            >
                              {(job.technician || job.assignedTo) || <span style={{ color: '#dc2626', fontWeight: 600 }}>Unassigned</span>}
                            </div>
                            {!(job.technician || job.assignedTo) && onNavigate && (
                              <div
                                style={{ fontSize: '10px', color: 'var(--primary)', cursor: 'pointer', marginTop: '2px', fontWeight: 600 }}
                                onClick={() => {
                                  localStorage.setItem('gps_active_workforce_job_id', job.id);
                                  localStorage.setItem('gps_workforce_action', 'assign');
                                  onNavigate('workforce');
                                }}
                                title="Assign specialist in Staff & Workforce"
                              >
                                Assign in Workforce →
                              </div>
                            )}
                          </td>
                          <td className="mono" style={{ fontSize: '12px' }}>{job.receivedDate}</td>
                          <td className="mono" style={{ fontWeight: 600 }}>{job.estimatedCost}</td>
                          <td><StatusBadge status={job.priority} size="sm" /></td>
                          <td><StatusBadge status={job.status} /></td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 12px', gap: '5px', fontWeight: 600, color: 'var(--primary)', borderColor: 'var(--border-color)' }}
                              onClick={() => {
                                setSelectedJob(job);
                                setActiveTab('detail');
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('gps_active_service_job_id', job.id);
                                }
                              }}
                              title={`Open Spindle Service Diagnostics & Overhaul Case File for ${job.id}`}
                            >
                              <FileText size={13} color="#7A1F3D" />
                              <span>Case File</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Feed View (≤ 768px) */}
            <div className="mobile-card-view">
              {filteredJobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                  <div>No active service or repair jobs match the current filter or search criteria.</div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '12px' }}
                    onClick={handleOpenAddJobModal}
                  >
                    <Plus size={13} />
                    <span>Add Spindle Job</span>
                  </button>
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const stageKey = getNormalizedStageKey(job.currentStage);
                  const stageObj = SERVICE_PIPELINE_STAGES.find(s => s.key === stageKey);
                  const isAssigned = Boolean(job.technician || job.assignedTo);

                  return (
                    <div
                      key={job.id}
                      className="service-mobile-card"
                      onClick={() => {
                        setSelectedJob(job);
                        setActiveTab('detail');
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('gps_active_service_job_id', job.id);
                        }
                      }}
                      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      {/* Top Header: Ticket ID + Status Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                              {job.id}
                            </span>
                            {job.quotationNo && (
                              <span
                                className="badge badge-neutral mono"
                                style={{ fontSize: '10px', padding: '1px 5px', color: '#7A1F3D', border: '1px solid #e2ccd5' }}
                              >
                                Quote: {job.quotationNo}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-main)', fontWeight: 600, marginTop: '2px' }}>
                            {job.customer}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                          <StatusBadge status={job.priority} size="sm" />
                          <StatusBadge status={job.status} size="sm" />
                        </div>
                      </div>

                      {/* Serial, Model & Stage Bar */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'var(--bg-surface-subtle, #f8fafc)',
                        borderRadius: '6px',
                        fontSize: '11.5px'
                      }}>
                        <div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spindle Serial</div>
                          <div className="mono" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {job.spindleSerial}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pipeline Stage</div>
                          <span
                            className="badge badge-neutral mono"
                            style={{ display: 'inline-block', fontSize: '10.5px', padding: '2px 6px', marginTop: '1px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStageClick(stageKey);
                            }}
                            title="Filter by this stage"
                          >
                            {stageObj ? `0${stageObj.id} ${stageObj.name}` : job.currentStage}
                          </span>
                        </div>
                      </div>

                      {/* Complaint Snippet */}
                      {job.complaint && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4, background: '#ffffff', padding: '6px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                          <strong style={{ color: 'var(--text-main)', fontSize: '11px' }}>Symptom: </strong>
                          {job.complaint}
                        </div>
                      )}

                      {/* Assigned Specialist & Bottom Bar */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        paddingTop: '6px',
                        borderTop: '1px solid var(--border-color)',
                        fontSize: '11px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                          <User size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: isAssigned ? 600 : 400,
                            color: isAssigned ? 'var(--text-main)' : '#dc2626'
                          }}>
                            {isAssigned ? (job.technician || job.assignedTo) : 'Unassigned'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div className="mono" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '12px' }}>
                              {job.estimatedCost}
                            </div>
                            <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {job.receivedDate}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', gap: '4px', height: '26px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                              setActiveTab('detail');
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('gps_active_service_job_id', job.id);
                              }
                            }}
                          >
                            <FileText size={11} color="#7A1F3D" />
                            <span>Case File</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Service Detail Case File */}
        {activeTab === 'detail' && selectedJob && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="section-card">
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm mobile-only-inline"
                      onClick={() => setActiveTab('list')}
                      style={{ height: '26px', fontSize: '11px', padding: '0 8px', gap: '4px' }}
                      title="Back to Active Jobs List"
                    >
                      <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} />
                      <span>Jobs</span>
                    </button>
                    <h2 className="mono" style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{selectedJob.id}</h2>
                    <StatusBadge status={selectedJob.status} />
                    <StatusBadge status={selectedJob.priority} size="sm" />
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                    Serial: <strong className="mono">{selectedJob.spindleSerial}</strong> ({selectedJob.spindleModel || 'GPS-HSK-A63-24K'}) • Customer: <strong>{selectedJob.customer}</strong> • Current Stage: <strong className="mono font-bold" style={{ color: 'var(--primary)' }}>{selectedJob.currentStage}</strong>
                    {selectedJob.quotationNo && (
                      <> • Linked Quote: <strong className="mono" style={{ color: '#7A1F3D' }}>{selectedJob.quotationNo}</strong></>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDirectDownloadPdf(selectedJob)}
                    title="Direct download official overhaul & metrology diagnostics report (PDF)"
                    style={{ flex: '1 1 auto' }}
                  >
                    <Download size={14} />
                    <span className="desktop-only-inline">Download PDF</span>
                    <span className="mobile-only-inline">PDF</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setPreviewDoc({
                        ...selectedJob,
                        type: 'Service Report',
                        id: selectedJob.id || 'SRV-2026-0041'
                      });
                      setIsPreviewOpen(true);
                    }}
                    title="Preview official overhaul & metrology diagnostics report (PDF)"
                    style={{ flex: '1 1 auto' }}
                  >
                    <FileText size={14} />
                    <span className="desktop-only-inline">Preview Report</span>
                    <span className="mobile-only-inline">Preview</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAdvanceStep}
                    title="Advance to next stage in 9-stage pipeline"
                    style={{ flex: '1 1 auto' }}
                  >
                    <Wrench size={14} />
                    <span className="desktop-only-inline">Advance Pipeline Stage</span>
                    <span className="mobile-only-inline">Advance Stage</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setNoteModalText(selectedJob.notes || '');
                      setIsNoteModalOpen(true);
                    }}
                    title="Add or update technician notes for this overhaul job"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flex: '1 1 auto' }}
                  >
                    <MessageSquare size={14} color="#7A1F3D" />
                    <span className="desktop-only-inline">Technician Note</span>
                    <span className="mobile-only-inline">Note</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleCompleteRebuild}
                    title="Sign off rebuild with final QC tolerance (ISO G0.4, 0.0008 mm)"
                    style={{ flex: '1 1 auto' }}
                  >
                    <CheckCircle size={14} />
                    <span className="desktop-only-inline">Complete Rebuild Step</span>
                    <span className="mobile-only-inline">Complete</span>
                  </button>
                </div>
              </div>

              {/* Assigned Overhaul Specialist & Service Workforce Lead Banner */}
              {(() => {
                let localStaff = [];
                try { localStaff = JSON.parse(localStorage.getItem('gps_local_workforce_staff') || '[]'); } catch (e) { }
                const techName = selectedJob.technician || selectedJob.assignedTo;
                const assignedTech = techName ? (
                  localStaff.find(s => s.workOrder === selectedJob.id || (s.name && techName.toLowerCase().includes(s.name.toLowerCase()))) || {
                    name: techName,
                    role: 'Service Overhaul Specialist',
                    bay: selectedJob.bay || 'Station 2 - Grinding & Assembly',
                    machine: selectedJob.machine || 'Studer S33 CNC Grinder',
                    status: 'Working',
                    started: '08:30 AM',
                    initials: techName.split(' ').map(n => n[0]).join('').slice(0, 2)
                  }
                ) : null;

                return (
                  <div style={{
                    margin: '14px 16px 0 16px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: assignedTech ? '#f8fafc' : '#fffbeb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: assignedTech ? (assignedTech.avatarColor || '#7A1F3D') : '#fef3c7',
                        color: assignedTech ? '#fff' : '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        flexShrink: 0
                      }}>
                        {assignedTech ? (assignedTech.initials || assignedTech.name.split(' ').map(n => n[0]).join('').slice(0, 2)) : <User size={20} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 700 }}>
                            Assigned Service Specialist & Workforce Lead
                          </span>
                          {assignedTech && (
                            <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>
                              {assignedTech.status || 'Working'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                          {assignedTech ? assignedTech.name : <span style={{ color: '#d97706' }}>Unassigned · Manage in Staff & Workforce</span>}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span>Service Bay: <strong className="mono">{assignedTech?.bay || selectedJob.bay || 'Station 2 - Grinding & Assembly'}</strong></span>
                          <span>Equipment: <strong className="mono">{assignedTech?.machine || selectedJob.machine || 'Studer S33 / Schenck Rig'}</strong></span>
                          {assignedTech?.started && <span>Active Since: <strong className="mono">{assignedTech.started}</strong></span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontWeight: 600 }}
                        onClick={() => {
                          localStorage.setItem('gps_active_workforce_job_id', selectedJob.id);
                          localStorage.setItem('gps_workforce_action', assignedTech ? 'stage' : 'assign');
                          if (onNavigate) onNavigate('workforce');
                        }}
                        title="Manage stage progression, staff assignment and metrology updates in Workforce"
                      >
                        <Users size={14} />
                        <span>{assignedTech ? 'Manage in Staff & Workforce →' : '+ Assign Staff in Workforce →'}</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Stage Quick Jumper Bar */}
              <div style={{
                padding: '10px 16px',
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin',
                marginTop: '16px'
              }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                  Set Stage Directly:
                </span>
                {SERVICE_PIPELINE_STAGES.map(s => {
                  const isCurrent = getNormalizedStageKey(selectedJob.currentStage) === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => handleTransitionToStage(s.key)}
                      className={`btn btn-sm mono ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '11px', padding: '3px 8px', height: '26px', flexShrink: 0 }}
                    >
                      0{s.id} {s.name}
                    </button>
                  );
                })}
              </div>

              {/* Diagnostic Findings Grid */}
              <div style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Disassembly & Metrology Diagnostic Overview</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#b91c1c' }}>Spindle Taper & Runout Condition</div>
                    <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px' }}>
                      Initial Runout: <span className="mono font-bold">{selectedJob.taperRunoutInitial ? `${selectedJob.taperRunoutInitial} mm` : '0.0058 mm'}</span> (Tolerance limit: 0.0010 mm).
                    </div>
                    {(selectedJob.taperRunoutFinal || selectedJob.runoutMetric) && (
                      <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px', fontWeight: 600 }}>
                        Final Runout Achieved: <span className="mono">{selectedJob.taperRunoutFinal || selectedJob.runoutMetric}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#b45309' }}>Bearing Raceways & Balls Inspection</div>
                    <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>
                      {selectedJob.findings?.bearingState || "Front ceramic hybrid bearings suffered coolant wash-out; raceway spalling on #2 bearing."}
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>Balancing & Dynamic Target</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Balancing Target: <strong className="mono">{selectedJob.balancingGrade || 'ISO G0.4'}</strong>. Bearing Pack Lot: <strong className="mono">{selectedJob.bearingLot || 'LOT-FAG-2026-B88'}</strong>.
                    </div>
                  </div>

                  {(selectedJob.runoutMetric || selectedJob.vibrationMetric || selectedJob.tempMetric) && (
                    <div style={{ padding: '14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#047857' }}>Live Shop Floor Metrology & Telemetry (Workforce Logged)</div>
                      <div style={{ fontSize: '12px', color: '#065f46', marginTop: '6px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                        <div>Runout: <strong className="mono">{selectedJob.runoutMetric || '0.0008 mm'}</strong></div>
                        <div>Vibration FFT: <strong className="mono">{selectedJob.vibrationMetric || '0.35 mm/s'}</strong></div>
                        <div>Thermal: <strong className="mono">{selectedJob.tempMetric || '32.5 °C'}</strong></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dedicated Service Notes & Additional Issues Card in Case File */}
                <div style={{ marginTop: '14px', padding: '14px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '12.5px', color: '#7A1F3D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} />
                      <span>Technician Notes, Observations & SOP Handover Log</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {selectedJob.quotationNo && (
                        <span className="badge badge-neutral mono" style={{ fontSize: '10px' }}>
                          Quote: {selectedJob.quotationNo}
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px', gap: '4px', height: '26px' }}
                        onClick={() => {
                          setNoteModalText(selectedJob.notes || selectedJob.technicianNotes || '');
                          setNoteModalStage(selectedJob.currentStage);
                          setIsNoteModalOpen(true);
                        }}
                      >
                        <Plus size={12} />
                        <span>{selectedJob.notes ? 'Edit / Add Note' : 'Add Note'}</span>
                      </button>
                    </div>
                  </div>

                  {selectedJob.notes ? (
                    <div style={{ fontSize: '12.5px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-line', padding: '8px 12px', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: selectedJob.notesHistory?.length ? '10px' : '0' }}>
                      {selectedJob.notes}
                      {selectedJob.lastNoteAt && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          — {selectedJob.lastNoteBy || 'Technician'}, {selectedJob.lastNoteAt}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: selectedJob.notesHistory?.length ? '10px' : '0' }}>
                      No technician notes logged yet for this service job. Click "Add Note" to log metrology readings, teardown observations, or shop-floor handover remarks.
                    </div>
                  )}

                  {selectedJob.notesHistory && selectedJob.notesHistory.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                        Stage Notes & Handover Trail ({selectedJob.notesHistory.length}):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                        {selectedJob.notesHistory.map((nh, nIdx) => (
                          <div key={nh.id || nIdx} style={{ fontSize: '11.5px', padding: '6px 10px', background: '#fff', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                              <span><strong style={{ color: '#7A1F3D' }}>{nh.stageName || nh.stageKey}</strong> · {nh.author}</span>
                              <span className="mono">{nh.timestamp}</span>
                            </div>
                            <div style={{ color: 'var(--text-main)' }}>{nh.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Workforce Overhaul Execution & Telemetry Trail */}
                {(() => {
                  let localLogs = [];
                  try { localLogs = JSON.parse(localStorage.getItem('gps_local_work_logs') || '[]'); } catch (e) { }
                  const jobLogs = localLogs.filter(l => l.workOrder === selectedJob.id);

                  return (
                    <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#7A1F3D', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={15} />
                          <span>Workforce Overhaul Execution & Telemetry Logs ({jobLogs.length})</span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11px', gap: '4px', height: '26px' }}
                          onClick={() => {
                            localStorage.setItem('gps_active_workforce_job_id', selectedJob.id);
                            localStorage.setItem('gps_workforce_action', 'stage');
                            if (onNavigate) onNavigate('workforce');
                          }}
                        >
                          <Users size={12} />
                          <span>Update in Workforce →</span>
                        </button>
                      </div>

                      {jobLogs.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
                          No staff work logs recorded yet for {selectedJob.id}. Overhaul technicians log stage execution, work duration, and precision metrology in Staff & Workforce.
                        </div>
                      ) : (
                        <>
                          <div className="table-responsive desktop-table-view">
                            <table className="data-table" style={{ fontSize: '12px' }}>
                              <thead>
                                <tr>
                                  <th>Log ID</th>
                                  <th>Technician</th>
                                  <th>Timestamp</th>
                                  <th>Duration</th>
                                  <th>Stage / Task</th>
                                  <th>Bay & Machine</th>
                                  <th>Status</th>
                                  <th>Operational Remarks & Metrology</th>
                                </tr>
                              </thead>
                              <tbody>
                                {jobLogs.map(log => (
                                  <tr key={log.id}>
                                    <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '11px' }}>{log.id}</td>
                                    <td style={{ fontWeight: 600 }}>{log.employeeName}</td>
                                    <td className="mono" style={{ fontSize: '11px' }}>{log.date} {log.startTime}</td>
                                    <td className="mono" style={{ fontSize: '11px' }}>{log.duration || '—'}</td>
                                    <td style={{ fontWeight: 500 }}>{log.task}</td>
                                    <td style={{ fontSize: '11px' }}>
                                      <div>{log.bay || 'Station 2'}</div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{log.machine || 'Studer Grinder'}</div>
                                    </td>
                                    <td><StatusBadge status={log.status || 'Completed'} size="sm" /></td>
                                    <td style={{ maxWidth: '280px', lineHeight: 1.4 }}>{log.remarks}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="mobile-card-view">
                            {jobLogs.map(log => (
                              <div key={log.id} style={{
                                padding: '10px 12px',
                                background: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>{log.id}</span>
                                  <StatusBadge status={log.status || 'Completed'} size="sm" />
                                </div>
                                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                  {log.employeeName} · <span style={{ fontWeight: 500 }}>{log.task}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', flexWrap: 'wrap' }}>
                                  <span>Time: <strong className="mono">{log.date} {log.startTime}</strong> ({log.duration || '—'})</span>
                                  <span>Station: <strong className="mono">{log.bay || 'Station 2'}</strong></span>
                                </div>
                                {log.remarks && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-surface-subtle, #f8fafc)', padding: '6px 8px', borderRadius: '4px' }}>
                                    {log.remarks}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'detail' && !selectedJob && (
          <div className="section-card" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Wrench size={48} style={{ opacity: 0.25, margin: '0 auto 16px', color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>No Service Ticket Selected</h3>
            <p style={{ fontSize: '13px', maxWidth: '380px', margin: '0 auto' }}>
              Select a service ticket from the Active Service Jobs list or log a new service overhaul request.
            </p>
          </div>
        )}

        {/* Tab 3: Plant Assets Registry */}
        {activeTab === 'assets' && (
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <Settings size={16} color="#7A1F3D" />
                <span>Plant Machinery, Balancing Rigs & Metrology Assets</span>
              </div>
              <span className="badge badge-neutral mono">{plantAssets.length} Assets</span>
            </div>

            <div className="table-responsive desktop-table-view">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset Tag</th>
                    <th>Machine Name</th>
                    <th>Category</th>
                    <th>Station Location</th>
                    <th>Purchase Date</th>
                    <th>Capital Cost</th>
                    <th>Calibration Cycle</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {plantAssets.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No plant machinery or balancing assets registered.
                      </td>
                    </tr>
                  ) : (
                    plantAssets.map((ast) => (
                      <tr key={ast.id}>
                        <td className="mono font-bold" style={{ color: 'var(--primary)' }}>{ast.assetTag}</td>
                        <td style={{ fontWeight: 500 }}>{ast.name}</td>
                        <td><span className="badge badge-neutral">{ast.category}</span></td>
                        <td>{ast.station}</td>
                        <td className="mono" style={{ fontSize: '12px' }}>{ast.purchaseDate}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{ast.costFormatted}</td>
                        <td className="mono" style={{ fontSize: '12px' }}>{ast.calibrationCycleDays} Days</td>
                        <td><StatusBadge status={ast.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Feed View (≤ 768px) */}
            <div className="mobile-card-view">
              {plantAssets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                  No plant machinery or balancing assets registered.
                </div>
              ) : (
                plantAssets.map((ast) => (
                  <div key={ast.id} className="service-mobile-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono font-bold" style={{ color: 'var(--primary)', fontSize: '13px' }}>{ast.assetTag}</span>
                      <StatusBadge status={ast.status} size="sm" />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{ast.name}</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>{ast.category}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Location: <strong>{ast.station}</strong></span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-color)'
                    }}>
                      <span className="mono" style={{ color: 'var(--text-muted)' }}>Cycle: {ast.calibrationCycleDays} Days ({ast.purchaseDate})</span>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>{ast.costFormatted}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Maintenance Orders */}
        {activeTab === 'maintenance' && (
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <Activity size={16} color="#7A1F3D" />
                <span>Preventive, Breakdown & Calibration Maintenance Orders</span>
              </div>
              <span className="badge badge-neutral mono">{maintenanceOrders.length} Orders</span>
            </div>

            <div className="table-responsive desktop-table-view">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Machine Asset</th>
                    <th>Order Type</th>
                    <th>Scheduled Date</th>
                    <th>Assigned Tech</th>
                    <th>Downtime</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceOrders.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No maintenance orders recorded.
                      </td>
                    </tr>
                  ) : (
                    maintenanceOrders.map((mnt) => (
                      <tr key={mnt.id}>
                        <td className="mono font-bold" style={{ color: 'var(--primary)' }}>{mnt.orderNumber}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{mnt.assetName}</div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mnt.assetTag}</div>
                        </td>
                        <td><span className="badge badge-neutral">{mnt.orderType}</span></td>
                        <td className="mono" style={{ fontSize: '12px' }}>{mnt.scheduledDate}</td>
                        <td style={{ fontSize: '12px' }}>{mnt.technician}</td>
                        <td className="mono" style={{ fontSize: '12px' }}>{mnt.downtimeHours} hrs</td>
                        <td className="mono" style={{ fontWeight: 600 }}>{mnt.costFormatted}</td>
                        <td><StatusBadge status={mnt.status} /></td>
                        <td>
                          {mnt.status !== 'Completed' ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCompleteMaintenance(mnt.dbId || mnt.id)}
                              title="Execute SOP and sign off maintenance order"
                            >
                              <CheckSquare size={13} />
                              <span>Complete</span>
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Completed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Feed View (≤ 768px) */}
            <div className="mobile-card-view">
              {maintenanceOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                  No maintenance orders recorded.
                </div>
              ) : (
                maintenanceOrders.map((mnt) => (
                  <div key={mnt.id} className="service-mobile-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono font-bold" style={{ color: 'var(--primary)', fontSize: '13px' }}>{mnt.orderNumber}</span>
                      <StatusBadge status={mnt.status} size="sm" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)' }}>{mnt.assetName}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{mnt.assetTag}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>{mnt.orderType}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tech: <strong>{mnt.technician}</strong></span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-color)'
                    }}>
                      <div>
                        <div className="mono" style={{ color: 'var(--text-muted)' }}>{mnt.scheduledDate}</div>
                        <div className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>{mnt.costFormatted} ({mnt.downtimeHours} hrs)</div>
                      </div>
                      {mnt.status !== 'Completed' ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleCompleteMaintenance(mnt.dbId || mnt.id)}
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                        >
                          <CheckSquare size={12} />
                          <span>Complete</span>
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Completed</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Add Spindle Service & Overhaul Job Modal */}
        <Modal
          isOpen={isAddJobModalOpen || isLogOpen}
          onClose={() => {
            setIsAddJobModalOpen(false);
            setIsLogOpen(false);
          }}
          title="Add Spindle Service & Overhaul Job"
          maxWidth="920px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', flex: '1 1 200px' }}>
                Ticket: <strong className="mono" style={{ color: '#7A1F3D' }}>{jobFormData.ticketId}</strong> • Serial: <strong className="mono">{jobFormData.spindleSerial}</strong>
                {selectedQuotation && (
                  <span style={{ marginLeft: '8px', color: '#15803d', fontWeight: 600 }}>
                    • Linked: <strong className="mono">{selectedQuotation.estimateNo || selectedQuotation.id}</strong>
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsAddJobModalOpen(false);
                    setIsLogOpen(false);
                  }}
                  disabled={isSubmitting}
                  style={{ flex: '1 1 auto', minWidth: '80px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateServiceJob}
                  disabled={isSubmitting}
                  style={{ background: '#7A1F3D', borderColor: '#7A1F3D', flex: '1 1 auto', minWidth: '140px' }}
                >
                  <Plus size={14} />
                  <span>{isSubmitting ? 'Registering...' : '+ Add Spindle Job'}</span>
                </button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleCreateServiceJob} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Job Generation & Case File Notice */}
            <div style={{
              padding: '10px 14px',
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <FileText size={18} color="#7A1F3D" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text-main)' }}>Spindle Service Job Intake:</strong> Submitting this ticket logs the spindle into the factory and generates its <strong>Service Diagnostics Case File</strong>. Specialist technician allocation, rebuild workstation routing, and stage progression are managed centrally in <strong>Staff & Workforce</strong>.
              </div>
            </div>

            {/* Quick-Fill from Approved Quotation (Sales & Quotes) */}
            <div style={{
              border: '1.5px solid #e2ccd5',
              borderRadius: '8px',
              padding: '14px 16px',
              background: '#fdfafb',
              boxShadow: '0 1px 3px rgba(122, 31, 61, 0.04)'
            }}>
              {/* Header with Title & Approved Counter */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: '#F5E8ED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7A1F3D'
                  }}>
                    <FileText size={15} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#7A1F3D', fontWeight: 700, fontSize: '13px' }}>
                        Quick-Fill from Approved Quotation (Sales & Quotes)
                      </span>
                      <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 7px' }}>
                        <CheckCircle2 size={11} style={{ marginRight: '3px' }} />
                        {approvedQuotesCount} Approved Available
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                      Import customer, spindle serial, overhaul scope & commercial pricing directly from an approved quotation
                    </div>
                  </div>
                </div>

                {selectedQuotation && (
                  <button
                    type="button"
                    onClick={handleClearSelectedQuotation}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '3px 8px', height: '26px', color: '#b91c1c', borderColor: '#fca5a5' }}
                    title="Unlink and clear quotation data"
                  >
                    <X size={12} />
                    <span>Clear Linked Quote</span>
                  </button>
                )}
              </div>

              {/* Active Linked Quotation Confirmation Banner */}
              {selectedQuotation ? (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CheckCircle2 size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#14532d', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Linked Quote: <strong className="mono">{selectedQuotation.estimateNo || selectedQuotation.id}</strong></span>
                        <span className="badge badge-success" style={{ fontSize: '10px' }}>Approved</span>
                        <span style={{ fontSize: '11px', color: '#166534', fontWeight: 500 }}>
                          • Quoted: <strong>₹{Number(selectedQuotation.totalAmount || selectedQuotation.subtotal || 0).toLocaleString('en-IN')}</strong>
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                        Customer: <strong>{selectedQuotation.customer}</strong> • Spindle Serial: <strong className="mono">{selectedQuotation.spindleSerial || 'Pending'}</strong> • Date: {selectedQuotation.date || 'Recent'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedQuotation(null)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '4px 9px', height: '28px', background: '#ffffff' }}
                    >
                      <Search size={12} />
                      <span>Pick Another Quote</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Quotation Search & Select Browser */
                <div>
                  {/* Search Input & Filter Toggle */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px' }}>
                      <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-control"
                        style={{
                          height: '32px',
                          paddingLeft: '30px',
                          paddingRight: quoteSearchQuery ? '28px' : '10px',
                          fontSize: '11.5px',
                          borderColor: '#e2ccd5'
                        }}
                        placeholder="Search quotations by Quote #, Customer, Serial, Spindle Model, or Scope..."
                        value={quoteSearchQuery}
                        onChange={(e) => setQuoteSearchQuery(e.target.value)}
                      />
                      {quoteSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setQuoteSearchQuery('')}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Filter Toggle: Approved Only vs All Quotations */}
                    <div style={{ display: 'flex', borderRadius: '4px', border: '1px solid #e2ccd5', overflow: 'hidden', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => setQuoteFilterApprovedOnly(true)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: quoteFilterApprovedOnly ? '#7A1F3D' : '#ffffff',
                          color: quoteFilterApprovedOnly ? '#ffffff' : 'var(--text-secondary)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCircle2 size={11} />
                        <span>Approved Only ({approvedQuotesCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuoteFilterApprovedOnly(false)}
                        style={{
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: !quoteFilterApprovedOnly ? '#7A1F3D' : '#ffffff',
                          color: !quoteFilterApprovedOnly ? '#ffffff' : 'var(--text-secondary)',
                          border: 'none',
                          borderLeft: '1px solid #e2ccd5',
                          cursor: 'pointer'
                        }}
                      >
                        All Quotes ({quotationsList.length})
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Quotation Cards List */}
                  <div style={{
                    maxHeight: '190px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingRight: '2px'
                  }}>
                    {filteredQuotations.length === 0 ? (
                      <div style={{
                        padding: '16px',
                        textAlign: 'center',
                        background: '#ffffff',
                        borderRadius: '6px',
                        border: '1px dashed #d1d5db',
                        color: 'var(--text-muted)',
                        fontSize: '11.5px'
                      }}>
                        {quoteSearchQuery ? (
                          <>No quotations matching "<strong>{quoteSearchQuery}</strong>". Try clearing search or toggling "All Quotes".</>
                        ) : quoteFilterApprovedOnly ? (
                          <>
                            No quotations currently marked as "Approved". Toggle to <strong>All Quotes ({quotationsList.length})</strong> or approve quotes in Sales & Quotes.
                          </>
                        ) : (
                          <>No quotations found in the system.</>
                        )}
                      </div>
                    ) : (
                      filteredQuotations.map((quote) => {
                        const isApproved = (quote.status || quote.rawStatus || '').toLowerCase() === 'approved';
                        const totalCost = Number(quote.totalAmount || quote.subtotal || 0);
                        const itemsSummary = (quote.items || []).map(i => i.desc || i.name).filter(Boolean).slice(0, 2).join(' • ');

                        return (
                          <div
                            key={quote.id || quote.estimateNo}
                            onClick={() => handleSelectQuotation(quote)}
                            style={{
                              padding: '9px 12px',
                              background: '#ffffff',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#7A1F3D';
                              e.currentTarget.style.background = '#FDF6F8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                              e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                <span className="mono" style={{ fontWeight: 700, fontSize: '12px', color: '#7A1F3D' }}>
                                  {quote.estimateNo || quote.id}
                                </span>
                                <span className={`badge ${isApproved ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '10px', padding: '1px 6px' }}>
                                  {quote.status || 'Quote'}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {quote.date || '2026'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: 'var(--text-main)', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600 }}>
                                  {quote.customer}
                                </span>
                                {quote.spindleSerial && (
                                  <span className="mono" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                    Serial: <strong>{quote.spindleSerial}</strong>
                                  </span>
                                )}
                                {quote.contactPerson && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                    Attn: {quote.contactPerson}
                                  </span>
                                )}
                              </div>

                              {itemsSummary && (
                                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {itemsSummary}
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div className="mono" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-main)' }}>
                                ₹{totalCost.toLocaleString('en-IN')}
                              </div>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{
                                  marginTop: '4px',
                                  fontSize: '10.5px',
                                  padding: '2px 8px',
                                  height: '24px',
                                  background: '#7A1F3D',
                                  borderColor: '#7A1F3D'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectQuotation(quote);
                                }}
                              >
                                <Plus size={11} />
                                <span>Use This Quote</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div style={{ marginTop: '6px', fontSize: '10.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Click any quotation above to auto-fill the form, or scroll down to enter spindle service job details manually.
                  </div>
                </div>
              )}
            </div>

            {/* Section 1: Ticket & Schedule */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                <Hash size={14} />
                <span>Service Ticket & Pipeline Scheduling</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Job Ticket ID *</label>
                  <input
                    type="text"
                    className="form-control mono"
                    style={{ height: '32px', fontSize: '12px', fontWeight: 700, color: '#7A1F3D' }}
                    value={jobFormData.ticketId}
                    onChange={(e) => setJobFormData({ ...jobFormData, ticketId: e.target.value })}
                    placeholder="e.g. SR-2026-045"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Inward Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px' }}
                    value={jobFormData.receivedDate}
                    onChange={(e) => setJobFormData({ ...jobFormData, receivedDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Promised TAT Target *</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px' }}
                    value={jobFormData.targetDate}
                    onChange={(e) => setJobFormData({ ...jobFormData, targetDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Initial Stage *</label>
                  <select
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px' }}
                    value={jobFormData.initialStage}
                    onChange={(e) => setJobFormData({ ...jobFormData, initialStage: e.target.value })}
                  >
                    {SERVICE_PIPELINE_STAGES.map(s => (
                      <option key={s.key} value={s.key}>
                        0{s.id} {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Urgency Priority</label>
                  <select
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px', fontWeight: 600 }}
                    value={jobFormData.priority}
                    onChange={(e) => setJobFormData({ ...jobFormData, priority: e.target.value })}
                  >
                    <option value="Critical">Critical (Line Down)</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium (Scheduled)</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Customer Particulars */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                  <Building2 size={14} />
                  <span>Customer & Client Particulars</span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Select registered customer or enter unlisted company
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Customer Account *</label>
                  <select
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px', borderColor: '#7A1F3D', fontWeight: 600 }}
                    value={customersList.some(c => c.name.toLowerCase() === (jobFormData.customerCompany || '').toLowerCase()) ? jobFormData.customerCompany : (jobFormData.customerCompany ? '__custom__' : '')}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                  >
                    <option value="">-- Choose Registered Customer --</option>
                    {customersList.map((c, idx) => (
                      <option key={idx} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__custom__">+ Enter New / Unlisted Customer Manually...</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Customer / Company Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '32px', fontSize: '12px', fontWeight: 600 }}
                    value={jobFormData.customerCompany}
                    onChange={(e) => setJobFormData({ ...jobFormData, customerCompany: e.target.value })}
                    placeholder="e.g. Tata Advanced Systems Ltd"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Contact Person</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px' }}
                    value={jobFormData.contactPerson}
                    onChange={(e) => setJobFormData({ ...jobFormData, contactPerson: e.target.value })}
                    placeholder="e.g. Rajesh Khurana"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Phone / Email</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px' }}
                    value={jobFormData.contactPhone || jobFormData.contactEmail}
                    onChange={(e) => setJobFormData({ ...jobFormData, contactPhone: e.target.value, contactEmail: e.target.value })}
                    placeholder="+91 98230 44102"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Spindle Specifications */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                <Wrench size={14} />
                <span>Spindle Asset & Metrology Specifications</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: jobFormData.spindleModel === '__custom__' ? '8px' : '0' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Spindle Serial Number *</label>
                  <input
                    type="text"
                    className="form-control mono"
                    style={{ height: '32px', fontSize: '12px', fontWeight: 600 }}
                    value={jobFormData.spindleSerial}
                    onChange={(e) => setJobFormData({ ...jobFormData, spindleSerial: e.target.value })}
                    placeholder="e.g. GPS-2025-0745"
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Spindle Model *</label>
                  <select
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px', fontWeight: 600 }}
                    value={jobFormData.spindleModel}
                    onChange={(e) => {
                      const val = e.target.value;
                      let taper = jobFormData.taperStandard;
                      let rpm = jobFormData.maxRpm;
                      if (val === 'GPS-HSK-A63-24K') { taper = 'HSK-A63'; rpm = 24000; }
                      else if (val === 'GPS-BT40-15K') { taper = 'BT40'; rpm = 15000; }
                      else if (val === 'GPS-BT50-10K') { taper = 'BT50'; rpm = 10000; }
                      else if (val === 'GPS-HF-60K') { taper = 'HSK-E25'; rpm = 60000; }
                      else if (val === 'GPS-HSK-E40-42K') { taper = 'HSK-E40'; rpm = 42000; }
                      else if (val === 'GPS-BBT40-12K') { taper = 'BBT40'; rpm = 12000; }
                      setJobFormData(prev => ({ ...prev, spindleModel: val, taperStandard: taper, maxRpm: rpm }));
                    }}
                  >
                    <option value="GPS-HSK-A63-24K">GPS-HSK-A63-24K (24,000 RPM Motorized)</option>
                    <option value="GPS-BT40-15K">GPS-BT40-15K (15,000 RPM Direct Drive)</option>
                    <option value="GPS-BT50-10K">GPS-BT50-10K (10,000 RPM Heavy-Duty)</option>
                    <option value="GPS-HF-60K">GPS-HF-60K (60,000 RPM Micro Milling)</option>
                    <option value="GPS-HSK-E40-42K">GPS-HSK-E40-42K (42,000 RPM Graphite)</option>
                    <option value="GPS-BBT40-12K">GPS-BBT40-12K (12,000 RPM Dual Contact)</option>
                    <option value="__custom__">+ Other / Custom Spindle Model...</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Taper Standard</label>
                  <select
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px' }}
                    value={jobFormData.taperStandard}
                    onChange={(e) => setJobFormData({ ...jobFormData, taperStandard: e.target.value })}
                  >
                    <option value="HSK-A63">HSK-A63</option>
                    <option value="BT40">BT40</option>
                    <option value="BT50">BT50</option>
                    <option value="HSK-E40">HSK-E40</option>
                    <option value="BBT40">BBT40</option>
                    <option value="ISO 30">ISO 30</option>
                    <option value="Other">Other Custom</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Max RPM</label>
                  <input
                    type="number"
                    className="form-control mono"
                    style={{ height: '32px', fontSize: '11.5px' }}
                    value={jobFormData.maxRpm}
                    onChange={(e) => setJobFormData({ ...jobFormData, maxRpm: e.target.value })}
                    placeholder="24000"
                  />
                </div>
              </div>

              {jobFormData.spindleModel === '__custom__' && (
                <div style={{ marginTop: '8px' }}>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Custom Model / OEM Make *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ height: '32px', fontSize: '12px' }}
                    value={jobFormData.customModel}
                    onChange={(e) => setJobFormData({ ...jobFormData, customModel: e.target.value })}
                    placeholder="e.g. Kessler HSK-63 / Fischer 30,000 RPM"
                    required
                  />
                </div>
              )}
            </div>

            {/* Section 4: Symptoms, Scope & Assignment */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                <AlertTriangle size={14} />
                <span>Failure Symptoms, Scope of Overhaul & Commercials</span>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>
                  Customer Reported Symptoms / Failure Description *
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  style={{ height: '54px', padding: '6px 8px', fontSize: '12px' }}
                  value={jobFormData.failureDescription}
                  onChange={(e) => setJobFormData({ ...jobFormData, failureDescription: e.target.value })}
                  placeholder="Describe failure symptoms: vibration velocity, bearing chatter, overheating, crash damage, or coolant ingress..."
                  required
                />

                {/* Quick Symptom Injection Tags */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Quick append:</span>
                  {[
                    'Vibration >4.5 mm/s',
                    'Bearing Noise',
                    'Thermal Trip >70°C',
                    'Coolant Ingress',
                    'Taper Fretting',
                    'Low Drawbar Force (<14 kN)',
                    'Machine Crash',
                    'Scheduled Rebuild'
                  ].map((symptom, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => appendSymptom(symptom)}
                      style={{
                        background: '#F8FAF9',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        color: '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      + {symptom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope of Work Multi-Select */}
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '5px' }}>
                  Factory Overhaul Scope (Select Planned Work Operations)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px' }}>
                  {[
                    'Full Mechanical Teardown & Ultrasonic Wash',
                    'Ceramic Hybrid P4S/ABEC-7 Bearing Pack',
                    'Shaft Nose Taper CNC Regrinding',
                    'Belleville Spring Pack & Drawbar Rebuild',
                    'Dynamic Balancing to ISO G0.4',
                    'Precision Rotary Seals & Viton O-Rings',
                    'Encoder / Sensor Recalibration',
                    'Thermal Stabilization & 6-Hour Run-in'
                  ].map((scopeItem, idx) => {
                    const isSelected = jobFormData.scopeOfWork.includes(scopeItem);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleScopeTag(scopeItem)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #7A1F3D' : '1px solid var(--border-color)',
                          background: isSelected ? '#F5E8ED' : '#ffffff',
                          color: isSelected ? '#7A1F3D' : 'var(--text-main)',
                          fontWeight: isSelected ? 600 : 400
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          style={{ cursor: 'pointer', accentColor: '#7A1F3D' }}
                        />
                        <span>{scopeItem}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Commercials & Baseline Metrology */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Estimated Overhaul Cost (₹)</label>
                  <input
                    type="text"
                    className="form-control mono"
                    style={{ height: '32px', fontSize: '12px', fontWeight: 600 }}
                    value={jobFormData.estimatedCost}
                    onChange={(e) => setJobFormData({ ...jobFormData, estimatedCost: e.target.value })}
                    placeholder="1,95,000"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Assigned Lead Specialist *</label>
                  <select
                    className="form-control"
                    style={{ height: '32px', fontSize: '11.5px', fontWeight: 600 }}
                    value={jobFormData.technicianName}
                    onChange={(e) => setJobFormData({ ...jobFormData, technicianName: e.target.value })}
                  >
                    <option value="Vikram Shinde (Sr. Spindle Specialist)">Vikram Shinde (Sr. Spindle Specialist)</option>
                    <option value="Suresh Sawant (Master Grinder)">Suresh Sawant (Master Grinder)</option>
                    <option value="Ramesh Deshmukh (Metrology & QC)">Ramesh Deshmukh (Metrology & QC)</option>
                    <option value="Ganesh Pawar (Assembly Lead)">Ganesh Pawar (Assembly Lead)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Inward Runout (mm)</label>
                  <input
                    type="text"
                    className="form-control mono"
                    style={{ height: '32px', fontSize: '11.5px' }}
                    value={jobFormData.initialRunout}
                    onChange={(e) => setJobFormData({ ...jobFormData, initialRunout: e.target.value })}
                    placeholder="0.0050"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>Drawbar Force (kN)</label>
                  <input
                    type="text"
                    className="form-control mono"
                    style={{ height: '32px', fontSize: '11.5px' }}
                    value={jobFormData.drawbarForce}
                    onChange={(e) => setJobFormData({ ...jobFormData, drawbarForce: e.target.value })}
                    placeholder="16.5"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Additional Notes, Observed Issues & Customer Instructions */}
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7A1F3D', fontWeight: 700, fontSize: '12px' }}>
                  <FileText size={14} />
                  <span>Job Notes, Other Issues & Special Instructions</span>
                </div>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Log any additional defects, secondary issues, or client special requests
                </span>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '11px', marginBottom: '3px' }}>
                  Notes / Other Issues / Special Instructions
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  style={{ height: '70px', padding: '8px 10px', fontSize: '12px', resize: 'vertical' }}
                  value={jobFormData.notes}
                  onChange={(e) => setJobFormData({ ...jobFormData, notes: e.target.value })}
                  placeholder="Write any other issue, observed defects, or special instructions (e.g., Return replaced bearings to client; Customer witnessing dynamic balancing run; Inspect stator coolant jacket for micro-cracks; Urgent delivery required by Friday)..."
                />

                {/* Quick-Append Note Suggestions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Quick append:</span>
                  {[
                    'Return replaced bearings to client',
                    'Customer witnessing dynamic balance run',
                    'Inspect stator coolant jacket for leakage',
                    'Inspect drawbar gripper fingers for fretting',
                    'Pre-dispatch balancing FFT spectrum report required',
                    'Vibration baseline exceeded 4.5 mm/s on arrival',
                    'Urgent delivery required (line-down breakdown)'
                  ].map((noteTag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setJobFormData(prev => {
                          const cur = (prev.notes || '').trim();
                          if (!cur) return { ...prev, notes: noteTag };
                          if (cur.includes(noteTag)) return prev;
                          return { ...prev, notes: `${cur}\n• ${noteTag}` };
                        });
                      }}
                      style={{
                        background: '#F8FAF9',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        color: '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      + {noteTag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </Modal>

        {/* Service Overhaul Report Pop-up Preview Modal */}
        <DocumentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          doc={previewDoc}
          onNotify={onNotify}
        />

        {/* Technician Stage Note Modal */}
        {isNoteModalOpen && selectedJob && (
          <Modal
            isOpen={isNoteModalOpen}
            onClose={() => setIsNoteModalOpen(false)}
            title={`Technician Notes & Stage Update — ${selectedJob.id}`}
            maxWidth="600px"
            footer={
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsNoteModalOpen(false)}
                  style={{ flex: '1 1 auto', minWidth: '80px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveServiceNote}
                  style={{ background: '#7A1F3D', borderColor: '#7A1F3D', flex: '1 1 auto', minWidth: '160px' }}
                >
                  <Check size={14} />
                  <span>Save Note & Update Stage</span>
                </button>
              </div>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '3px' }}>
                  <span className="mono">{selectedJob.id}</span> · {selectedJob.spindleModel} ({selectedJob.spindleSerial})
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Client: <strong>{selectedJob.customer}</strong> • Assigned Tech: <strong>{selectedJob.technician || 'Shop Floor Team'}</strong>
                </div>
              </div>

              {/* Overhaul Pipeline Stage Selection */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Wrench size={13} color="#7A1F3D" />
                  <span>Service Overhaul Pipeline Stage / Status</span>
                </label>
                <select
                  className="form-control"
                  value={noteModalStage || selectedJob.currentStage || 'repair'}
                  onChange={e => setNoteModalStage(e.target.value)}
                  style={{ fontSize: '13px', fontWeight: 600 }}
                >
                  {SERVICE_PIPELINE_STAGES.map(s => (
                    <option key={s.key} value={s.key}>
                      0{s.id} {s.name} {getNormalizedStageKey(selectedJob.currentStage) === s.key ? '(Current Stage)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MessageSquare size={13} color="#7A1F3D" />
                  <span>Technician & Overhaul Findings Note</span>
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>

                <textarea
                  className="form-control"
                  rows={3}
                  style={{ fontSize: '12px', lineHeight: '1.5' }}
                  value={noteModalText}
                  onChange={e => setNoteModalText(e.target.value)}
                  placeholder="Log disassembly findings, measured runout, bearing clearance, torque applied, shaft grinding tolerances, or cleanroom notes..."
                  autoFocus
                />

                <div style={{ marginTop: '6px' }}>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    Quick Preset Chips:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {[
                      '✓ Incoming runout ≤ 0.001 mm audit passed',
                      '✓ Cleanroom teardown complete; bearings de-staged',
                      '✓ Shaft journal reground within ±0.002 mm tolerance',
                      '✓ Ceramic hybrid bearing pack preloaded to 12.5 kN',
                      '✓ Dynamic balancing achieved ISO 1940 G0.4',
                      '✓ 6h thermal run-in test temp rise normal (≤ 15°C)',
                      '⚠ Awaiting customer PO / approval for drawbar collet',
                      '✓ Final nose taper runout 0.0008 mm certified'
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '10.5px',
                          padding: '2px 7px',
                          borderRadius: '12px',
                          background: '#f8fafc',
                          borderColor: '#e2e8f0'
                        }}
                        onClick={() => {
                          setNoteModalText(prev => prev ? `${prev} • ${preset}` : preset);
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chronological Notes History */}
              {selectedJob.notesHistory && selectedJob.notesHistory.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Past Stage Notes History ({selectedJob.notesHistory.length})
                  </div>
                  <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedJob.notesHistory.map((nh, idx) => (
                      <div key={nh.id || idx} style={{ padding: '7px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '2px', fontSize: '10px' }}>
                          <span><strong style={{ color: '#7A1F3D' }}>{nh.stageName || nh.stageKey}</strong> · {nh.author}</span>
                          <span className="mono">{nh.timestamp}</span>
                        </div>
                        <div style={{ color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{nh.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
