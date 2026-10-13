import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';

import { workOrderService } from '../services/database/workOrderService';
import { serviceService } from '../services/database/serviceService';
import { logisticsService } from '../services/database/logisticsService';
import { WORK_ORDERS, SERVICE_JOBS, SPINDLES } from '../data/mockData';
import { exportDeliveryChallanPdf } from '../utils/pdfGenerator';
import { isCleanSlateMode } from '../utils/dataMode';

import {
  Truck, PackageCheck, Send, CheckCircle2, Clock, 
  AlertTriangle, Search, Filter, Plus, FileText, 
  Download, Eye, Phone, MapPin, ShieldCheck, Cpu, 
  Wrench, ExternalLink, RefreshCw, X, Box, Check,
  QrCode, Copy, Layers, Calendar, UserCheck
} from 'lucide-react';

// Seed Initial Dispatches if none in storage
const INITIAL_DISPATCHED_HISTORY = [
  {
    id: 'DSP-2026-0078',
    challanNo: 'DC-2026-0078',
    workOrder: 'WO-2026-098',
    stream: 'production',
    spindleSerial: 'GPS-2026-0838',
    spindleModel: 'GPS-BT40-15K Inline Direct Drive',
    customer: 'Bharat Forge Ltd',
    customerContact: 'Ajay Kulkarni (Works Head)',
    customerEmail: 'a.kulkarni@bharatforge.com',
    destination: 'Mundhwa Plant 2, Pune, Maharashtra 411036',
    transporter: 'Blue Dart Express Ltd',
    docketNo: 'BD-994829104',
    vehicleNo: 'MH-12-RN-4820',
    deliveryMode: 'Express Air Freight',
    packagingType: 'Heavy-Duty VCI Sealed Hardwood Export Crate',
    grossWeight: '46.5 kg',
    dispatchDate: '12 Oct 2026',
    estimatedArrival: '14 Oct 2026',
    status: 'In Transit',
    trackingUrl: 'https://www.bluedart.com',
    emailSent: true,
    emailSentAt: '12 Oct 2026, 16:30',
    qcVerified: true
  },
  {
    id: 'DSP-2026-0075',
    challanNo: 'DC-2026-0075',
    workOrder: 'SR-2026-038',
    stream: 'service',
    spindleSerial: 'FIS-2022-7801',
    spindleModel: 'Fischer HF 150 High-Speed Overhaul',
    customer: 'Hindustan Aeronautics Ltd (HAL)',
    customerContact: 'R. K. Raman (Plant In-charge)',
    customerEmail: 'rk.raman@hal-india.co.in',
    destination: 'Aerospace Division, Bangalore, Karnataka 560017',
    transporter: 'V-Trans India Ltd',
    docketNo: 'VT-88204910',
    vehicleNo: 'MH-14-BA-2291',
    deliveryMode: 'Dedicated Surface Express',
    packagingType: 'Shock-Sensor Hardwood Crate with Hermetic Seal',
    grossWeight: '52.0 kg',
    dispatchDate: '10 Oct 2026',
    estimatedArrival: '13 Oct 2026',
    status: 'Delivered',
    trackingUrl: 'https://vtransgroup.com',
    emailSent: true,
    emailSentAt: '10 Oct 2026, 11:15',
    qcVerified: true
  }
];

// Carrier Logistics Partners Directory
const APPROVED_CARRIERS = [
  {
    name: 'Blue Dart Express Ltd',
    type: 'Priority Air & Express Courier',
    contactPerson: 'Manoj Salunke (Account Lead)',
    phone: '+91 20 6684 9200',
    rating: '4.9 ★',
    transitPuneMumbai: 'Same Day / 12 Hours',
    transitAllIndia: '24 - 48 Hours Express Air',
    trackingUrl: 'https://www.bluedart.com',
    specialty: 'High-value precision units with shock sensor handling'
  },
  {
    name: 'V-Trans India Ltd',
    type: 'Dedicated Heavy Surface Freight',
    contactPerson: 'Sanjay Deshmukh (Logistics Mgr)',
    phone: '+91 20 2747 8820',
    rating: '4.8 ★',
    transitPuneMumbai: 'Next Day Morning',
    transitAllIndia: '48 - 72 Hours Full Truck / Part Load',
    trackingUrl: 'https://vtransgroup.com',
    specialty: 'Palletized hardwood crating & secure road transit'
  },
  {
    name: 'DTDC Priority Air Cargo',
    type: 'Express Cargo & Intercity Hubs',
    contactPerson: 'Rajiv Joshi',
    phone: '+91 20 4128 3300',
    rating: '4.7 ★',
    transitPuneMumbai: '12 - 18 Hours',
    transitAllIndia: '36 - 48 Hours',
    trackingUrl: 'https://www.dtdc.in',
    specialty: 'Door-to-door plant delivery with consignee OTP'
  },
  {
    name: 'Dedicated GPS Plant Vehicle',
    type: 'Factory Handover / Regional Delivery',
    contactPerson: 'Dattatray More (GPS Logistics Lead)',
    phone: '+91 98220 18492',
    rating: '5.0 ★ (Direct GPS Handover)',
    transitPuneMumbai: 'Immediate (4 - 6 Hours Direct)',
    transitAllIndia: 'Maharashtra & Gujarat Industrial Corridors',
    trackingUrl: '',
    specialty: 'Zero-vibration hydraulic lift truck with technician escort'
  }
];

export default function DispatchScreen({ onNavigate, onSelectWorkOrder, onSelectSpindle, onNotify }) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState('ready'); // 'ready' | 'history' | 'carriers'

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('all'); // 'all' | 'production' | 'service'
  const [statusFilter, setStatusFilter] = useState('all');
  const [transporterFilter, setTransporterFilter] = useState('all');

  // Core Data States
  const [readySpindles, setReadySpindles] = useState([]);
  const [dispatchedHistory, setDispatchedHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Email Composer State
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [emailTargetSpindle, setEmailTargetSpindle] = useState(null);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Dispatch / Ship Modal State
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [shipTargetItem, setShipTargetItem] = useState(null);
  const [shipForm, setShipForm] = useState({
    transporter: 'Blue Dart Express Ltd',
    docketNo: '',
    vehicleNo: 'MH-12-RN-4820',
    driverName: 'Suresh More',
    driverPhone: '+91 98224 81920',
    deliveryMode: 'Express Dedicated Transit',
    packagingType: 'Heavy-Duty VCI Sealed Hardwood Export Crate',
    grossWeight: '48.5 kg',
    destination: '',
    challanNo: '',
    sendEmailNow: true,
    estimatedDays: '2'
  });

  // Pre-Dispatch Quality Verification Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyTargetItem, setVerifyTargetItem] = useState(null);
  const [checklist, setChecklist] = useState({
    runoutVerified: true,
    balancingPassed: true,
    runInStabilized: true,
    vciCushioning: true,
    shockSensorArmed: true,
    manualEnclosed: true,
    warrantyCardInserted: true
  });

  // New Outward Entry Modal
  const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
  const [newEntryForm, setNewEntryForm] = useState({
    stream: 'production',
    jobRef: '',
    spindleSerial: '',
    spindleModel: 'GPS-HSK-A63-24K',
    customer: 'Tata Motors Limited',
    destination: 'Pune Plant 1 Industrial Premises',
    packagingType: 'Hardwood Export Crate with Hermetic VCI Seal',
    weight: '45.0 kg'
  });

  // Load Dispatch Ready Units from both Production & Service
  const loadDispatchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Production Work Orders
      const wosRes = await workOrderService.getWorkOrders().catch(() => ({ data: [] }));
      const allWos = (wosRes.data && wosRes.data.length > 0) ? wosRes.data : WORK_ORDERS;

      // Filter work orders that are ready for dispatch (Stage 8 / progress 100% / status Ready or Dispatch Ready)
      const prodReady = allWos
        .filter(wo => {
          const stg = (wo.currentStage || '').toLowerCase();
          const stat = (wo.status || '').toLowerCase();
          return stg === 'dispatch' || stat === 'ready' || stat.includes('dispatch') || (wo.progress || 0) >= 95;
        })
        .map(wo => ({
          id: wo.id || wo.workOrderNo,
          workOrder: wo.id || wo.workOrderNo,
          stream: 'production',
          streamLabel: 'Production (OEM New)',
          spindleSerial: wo.spindleSerial || `GPS-2026-0${Math.floor(800 + Math.random() * 99)}`,
          spindleModel: wo.spindleModel || 'GPS High-Precision Spindle',
          customer: wo.customer || 'Tata Advanced Systems Ltd',
          customerContact: 'Rajesh Sharma (Plant Head)',
          customerEmail: 'r.sharma@tata.com',
          destination: 'Pune & Sanand Industrial Complex',
          targetDate: wo.dueDate || '28 Feb 2026',
          status: 'Dispatch Ready',
          packagingType: 'Anti-Corrosion VCI Sealed Hardwood Crate',
          grossWeight: '48.0 kg',
          qcCertificateId: `QC-CERT-2026-${(wo.id || '').replace(/\D/g, '') || '0102'}`,
          runoutMetric: '0.0007 mm (Pass)',
          balanceGrade: 'ISO G0.4 (Passed)',
          emailSent: false,
          packagingDone: true,
          verified: true
        }));

      // 2. Fetch Service & Overhaul Jobs
      const srvRes = await serviceService.getServiceJobs().catch(() => ({ data: [] }));
      let localSrv = [];
      try { localSrv = JSON.parse(localStorage.getItem('gps_local_service_jobs') || '[]'); } catch (e) { }
      const allSrv = [...localSrv, ...(srvRes.data || []), ...SERVICE_JOBS];

      // Service jobs that have completed repair/QC and are at dispatch stage or status Ready
      const srvReady = allSrv
        .filter(sr => {
          const stg = (sr.currentStage || '').toLowerCase();
          const stat = (sr.status || '').toLowerCase();
          return stg === 'dispatch' || stg === 'qc' || stat === 'ready' || stat.includes('dispatch') || (sr.stageIndex || 0) >= 8;
        })
        .map(sr => ({
          id: sr.id,
          workOrder: sr.id,
          stream: 'service',
          streamLabel: 'Service Repair (RMA Overhaul)',
          spindleSerial: sr.spindleSerial || 'GPS-2025-0721',
          spindleModel: sr.spindleModel || 'GPS-HSK-A63-24K',
          customer: sr.customer || 'Kirloskar Oil Engines Ltd',
          customerContact: 'Ashok Ranade (Sr. Plant Eng.)',
          customerEmail: 'ashok.ranade@koel.co.in',
          destination: 'Khadki Works, Pune 411003',
          targetDate: sr.targetDate || sr.dueDate || '28 Feb 2026',
          status: 'Dispatch Ready',
          packagingType: 'Shock-Sensor Hardwood Export Crate with VCI',
          grossWeight: '51.5 kg',
          qcCertificateId: `QC-SRV-2026-${(sr.id || '').replace(/\D/g, '') || '041'}`,
          runoutMetric: '0.0008 mm (Restored)',
          balanceGrade: 'ISO G0.35 (Restored)',
          emailSent: false,
          packagingDone: true,
          verified: true
        }));

      // Merge and deduplicate
      const mergedReady = [...prodReady, ...srvReady];
      const uniqueReady = Array.from(new Map(mergedReady.map(item => [item.id, item])).values());
      setReadySpindles(uniqueReady);

      // 3. Load Dispatched History
      let savedHistory = [];
      try {
        savedHistory = JSON.parse(localStorage.getItem('gps_dispatched_history') || '[]');
      } catch (e) { }

      if (savedHistory.length === 0) {
        setDispatchedHistory(INITIAL_DISPATCHED_HISTORY);
        localStorage.setItem('gps_dispatched_history', JSON.stringify(INITIAL_DISPATCHED_HISTORY));
      } else {
        setDispatchedHistory(savedHistory);
      }

    } catch (err) {
      console.error('[DispatchScreen] Error loading dispatch data:', err);
      setReadySpindles([]);
      setDispatchedHistory(INITIAL_DISPATCHED_HISTORY);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDispatchData();
  }, []);

  // Filtered Ready Spindles
  const filteredReady = useMemo(() => {
    return readySpindles.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (item.id || '').toLowerCase().includes(q) ||
        (item.spindleSerial || '').toLowerCase().includes(q) ||
        (item.spindleModel || '').toLowerCase().includes(q) ||
        (item.customer || '').toLowerCase().includes(q) ||
        (item.destination || '').toLowerCase().includes(q)
      );

      const matchesStream = streamFilter === 'all' || item.stream === streamFilter;
      const matchesStatus = statusFilter === 'all' || item.status.toLowerCase().includes(statusFilter.toLowerCase());

      return matchesSearch && matchesStream && matchesStatus;
    });
  }, [readySpindles, searchQuery, streamFilter, statusFilter]);

  // Filtered Dispatched History
  const filteredHistory = useMemo(() => {
    return dispatchedHistory.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (item.id || '').toLowerCase().includes(q) ||
        (item.challanNo || '').toLowerCase().includes(q) ||
        (item.spindleSerial || '').toLowerCase().includes(q) ||
        (item.spindleModel || '').toLowerCase().includes(q) ||
        (item.customer || '').toLowerCase().includes(q) ||
        (item.transporter || '').toLowerCase().includes(q) ||
        (item.docketNo || '').toLowerCase().includes(q) ||
        (item.vehicleNo || '').toLowerCase().includes(q)
      );

      const matchesStream = streamFilter === 'all' || item.stream === streamFilter;
      const matchesTransporter = transporterFilter === 'all' || item.transporter === transporterFilter;
      const matchesStatus = statusFilter === 'all' || item.status.toLowerCase().includes(statusFilter.toLowerCase());

      return matchesSearch && matchesStream && matchesTransporter && matchesStatus;
    });
  }, [dispatchedHistory, searchQuery, streamFilter, transporterFilter, statusFilter]);

  // Executive Metric Counts
  const kpiData = useMemo(() => {
    const totalReady = readySpindles.length;
    const prodCount = readySpindles.filter(s => s.stream === 'production').length;
    const srvCount = readySpindles.filter(s => s.stream === 'service').length;
    const inTransitCount = dispatchedHistory.filter(d => d.status === 'In Transit').length;
    const deliveredCount = dispatchedHistory.filter(d => d.status === 'Delivered').length;

    return [
      {
        id: 'ready_queue',
        label: 'Dispatch Ready Spindles',
        value: totalReady.toString(),
        trend: `${prodCount} Production · ${srvCount} Service RMA`,
        isUp: true,
        icon: 'PackageCheck'
      },
      {
        id: 'packaged_crates',
        label: 'VCI Sealed & Crated',
        value: totalReady.toString(),
        trend: 'QC Certified with G0.4 Dynamic',
        isUp: true,
        icon: 'ShieldCheck'
      },
      {
        id: 'in_transit',
        label: 'In Transit / Dispatched',
        value: inTransitCount.toString(),
        trend: `${inTransitCount} Active Courier Dockets`,
        isUp: true,
        icon: 'Truck'
      },
      {
        id: 'challans_issued',
        label: 'Delivery Challans Issued',
        value: (dispatchedHistory.length).toString(),
        trend: `${deliveredCount} Delivered to Plant`,
        isUp: true,
        icon: 'FileText'
      }
    ];
  }, [readySpindles, dispatchedHistory]);

  // Handle Triggering the Customer "Parcel is Ready / Dispatched" Email
  const handleOpenEmailComposer = (spindleItem) => {
    const emailDocPayload = {
      id: spindleItem.workOrder || spindleItem.id,
      estimateNo: spindleItem.workOrder || spindleItem.id,
      customer: spindleItem.customer,
      spindleModel: spindleItem.spindleModel,
      serial: spindleItem.spindleSerial,
      spindleSerial: spindleItem.spindleSerial,
      docketNo: spindleItem.docketNo || 'Docket to be allocated upon pickup',
      transporter: spindleItem.transporter || 'Blue Dart Express / Dedicated Fleet',
      vehicleNo: spindleItem.vehicleNo || 'MH-12-RN-4820',
      destination: spindleItem.destination,
      date: new Date().toLocaleDateString('en-GB')
    };

    setEmailTargetSpindle(emailDocPayload);
    setIsEmailComposerOpen(true);
  };

  // Callback when email is successfully sent
  const handleEmailSentSuccess = () => {
    if (emailTargetSpindle) {
      // Mark as emailSent in readySpindles or dispatchedHistory
      const targetId = emailTargetSpindle.id;
      setReadySpindles(prev => prev.map(s => {
        if (s.id === targetId || s.workOrder === targetId) {
          return { ...s, emailSent: true, emailSentAt: new Date().toLocaleDateString('en-GB') };
        }
        return s;
      }));

      setDispatchedHistory(prev => {
        const updated = prev.map(d => {
          if (d.id === targetId || d.workOrder === targetId) {
            return { ...d, emailSent: true, emailSentAt: new Date().toLocaleDateString('en-GB') };
          }
          return d;
        });
        localStorage.setItem('gps_dispatched_history', JSON.stringify(updated));
        return updated;
      });
    }

    if (onNotify) {
      onNotify('Customer dispatch & parcel notification email sent successfully!');
    }
  };

  // Open Ship / Mark as Dispatched Modal
  const handleOpenShipModal = (spindle) => {
    const nextChallanNumber = `DC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setShipTargetItem(spindle);
    setShipForm({
      transporter: 'Blue Dart Express Ltd',
      docketNo: `BD-${Math.floor(100000000 + Math.random() * 900000000)}`,
      vehicleNo: 'MH-12-RN-4820',
      driverName: 'Suresh More',
      driverPhone: '+91 98224 81920',
      deliveryMode: 'Express Dedicated Transit',
      packagingType: spindle.packagingType || 'Heavy-Duty VCI Sealed Hardwood Export Crate',
      grossWeight: spindle.grossWeight || '48.5 kg',
      destination: spindle.destination || 'Customer Industrial Plant',
      challanNo: nextChallanNumber,
      sendEmailNow: true,
      estimatedDays: '2'
    });
    setIsShipModalOpen(true);
  };

  // Save Dispatch & Move Spindle to Dispatched History
  const handleConfirmShipment = async (e) => {
    e.preventDefault();
    if (!shipTargetItem) return;

    const dispatchRecord = {
      id: `DSP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      challanNo: shipForm.challanNo,
      workOrder: shipTargetItem.workOrder || shipTargetItem.id,
      stream: shipTargetItem.stream,
      spindleSerial: shipTargetItem.spindleSerial,
      spindleModel: shipTargetItem.spindleModel,
      customer: shipTargetItem.customer,
      customerContact: shipTargetItem.customerContact,
      customerEmail: shipTargetItem.customerEmail,
      destination: shipForm.destination,
      transporter: shipForm.transporter,
      docketNo: shipForm.docketNo,
      vehicleNo: shipForm.vehicleNo,
      deliveryMode: shipForm.deliveryMode,
      packagingType: shipForm.packagingType,
      grossWeight: shipForm.grossWeight,
      dispatchDate: new Date().toLocaleDateString('en-GB'),
      estimatedArrival: new Date(Date.now() + parseInt(shipForm.estimatedDays || '2') * 86400000).toLocaleDateString('en-GB'),
      status: 'In Transit',
      trackingUrl: shipForm.transporter.includes('Blue Dart') ? 'https://www.bluedart.com' : 'https://vtransgroup.com',
      emailSent: false,
      qcVerified: true
    };

    // 1. Add to Dispatched History
    const updatedHistory = [dispatchRecord, ...dispatchedHistory];
    setDispatchedHistory(updatedHistory);
    localStorage.setItem('gps_dispatched_history', JSON.stringify(updatedHistory));

    // 2. Remove from Ready Queue
    setReadySpindles(prev => prev.filter(s => s.id !== shipTargetItem.id));

    // 3. Try to save to Supabase via logisticsService
    try {
      await logisticsService.createDispatch({
        dispatch_number: dispatchRecord.id,
        destination: dispatchRecord.destination,
        packaging_type: dispatchRecord.packagingType,
        status: 'In Transit'
      }, [{
        product_name: dispatchRecord.spindleModel,
        spindle_serial: dispatchRecord.spindleSerial,
        gross_weight_kg: parseFloat(dispatchRecord.grossWeight) || 48.0
      }]).catch(() => { });
    } catch (err) { }

    setIsShipModalOpen(false);

    if (onNotify) {
      onNotify(`Consignment dispatched under Challan ${dispatchRecord.challanNo} via ${dispatchRecord.transporter}`);
    }

    // 4. If user wanted to send email immediately, open email composer
    if (shipForm.sendEmailNow) {
      handleOpenEmailComposer(dispatchRecord);
    }
  };

  // Open Pre-Dispatch Verification Checklist
  const handleOpenVerifyModal = (spindle) => {
    setVerifyTargetItem(spindle);
    setChecklist({
      runoutVerified: true,
      balancingPassed: true,
      runInStabilized: true,
      vciCushioning: true,
      shockSensorArmed: true,
      manualEnclosed: true,
      warrantyCardInserted: true
    });
    setIsVerifyModalOpen(true);
  };

  // Print / Download Delivery Challan PDF
  const handleDownloadChallan = (item) => {
    try {
      exportDeliveryChallanPdf(item);
      if (onNotify) onNotify(`Delivery Challan ${item.challanNo || 'DC-2026-0042'} downloaded.`);
    } catch (err) {
      console.error('[DispatchScreen] Error generating Challan PDF:', err);
      if (onNotify) onNotify('Error generating Delivery Challan PDF.', 'danger');
    }
  };

  // Open Document Preview Modal
  const handlePreviewTraveler = (spindle) => {
    setPreviewDoc({
      id: spindle.workOrder || spindle.id,
      customer: spindle.customer,
      spindleSerial: spindle.spindleSerial,
      spindleModel: spindle.spindleModel,
      documentType: 'Job Traveler',
      type: 'Job Traveler',
      date: spindle.targetDate
    });
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="content-area">
      {/* 1. TOP PAGE HEADER */}
      <PageHeader
        title="Dispatch & Logistics"
        subtitle="Central Dispatch Control • Unified outward clearance for new OEM production spindles & reconditioned service overhauls"
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {onNavigate && (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate('production')}
                title="Go to Production Flow"
                style={{ fontSize: '11px', padding: '5px 10px' }}
              >
                <Cpu size={13} />
                <span>Production</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onNavigate('service')}
                title="Go to Service & Repair"
                style={{ fontSize: '11px', padding: '5px 10px' }}
              >
                <Wrench size={13} />
                <span>Service</span>
              </button>
            </>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (dispatchedHistory.length > 0) {
                handleDownloadChallan(dispatchedHistory[0]);
              } else if (readySpindles.length > 0) {
                handleDownloadChallan(readySpindles[0]);
              }
            }}
            title="Download Latest Delivery Challan PDF"
          >
            <Download size={14} />
            <span>Delivery Challan (PDF)</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsNewEntryModalOpen(true)}
            title="Add a spindle unit directly to the dispatch clearance queue"
          >
            <Plus size={14} />
            <span>New Dispatch Entry</span>
          </button>
        </div>
      </PageHeader>

      <div className="content-body">
        {/* 2. TOP 4 EXECUTIVE OPERATIONAL KPI CARDS */}
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          {kpiData.map((kpi) => (
            <MetricCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              trend={kpi.trend}
              isUp={kpi.isUp}
              icon={kpi.icon}
            />
          ))}
        </div>

        {/* 3. MAIN NAVIGATION TABS */}
        <Tabs
          tabs={[
            { id: 'ready', label: 'Dispatch Ready Queue', count: readySpindles.length },
            { id: 'history', label: 'Dispatched & Transit History', count: dispatchedHistory.length },
            { id: 'carriers', label: 'Logistics Partners & Couriers', count: APPROVED_CARRIERS.length }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* 4. UNIVERSAL SEARCH & STREAM FILTER BAR */}
        <div className="workforce-filter-bar" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {/* Quick Stream Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
            <button
              type="button"
              className={`btn btn-sm ${streamFilter === 'all' && statusFilter === 'all' && transporterFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setStreamFilter('all'); setStatusFilter('all'); setTransporterFilter('all'); setSearchQuery(''); }}
              style={{ height: '28px', fontSize: '11px', padding: '0 10px', borderRadius: '4px' }}
            >
              All Consignments ({readySpindles.length + dispatchedHistory.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${streamFilter === 'production' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStreamFilter(streamFilter === 'production' ? 'all' : 'production')}
              style={{ height: '28px', fontSize: '11px', padding: '0 10px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Cpu size={11} />
              Production OEM ({readySpindles.filter(s => s.stream === 'production').length + dispatchedHistory.filter(s => s.stream === 'production').length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${streamFilter === 'service' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStreamFilter(streamFilter === 'service' ? 'all' : 'service')}
              style={{ height: '28px', fontSize: '11px', padding: '0 10px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Wrench size={11} />
              Service RMA Overhauls ({readySpindles.filter(s => s.stream === 'service').length + dispatchedHistory.filter(s => s.stream === 'service').length})
            </button>

            {activeTab === 'history' && (
              <button
                type="button"
                className={`btn btn-sm ${statusFilter === 'in transit' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(statusFilter === 'in transit' ? 'all' : 'in transit')}
                style={{ height: '28px', fontSize: '11px', padding: '0 10px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Truck size={11} />
                In Transit Only ({dispatchedHistory.filter(d => d.status === 'In Transit').length})
              </button>
            )}

            <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
              Showing <strong>{activeTab === 'ready' ? filteredReady.length : (activeTab === 'history' ? filteredHistory.length : APPROVED_CARRIERS.length)}</strong> items
            </div>
          </div>

          {/* Search Input & Select Controls */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search spindle serial, customer, job order, docket number, model..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', height: '32px', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Stream:</span>
              <CustomSelect
                value={streamFilter}
                onChange={e => setStreamFilter(e.target.value)}
                style={{ minWidth: '130px' }}
                options={[
                  { value: 'all', label: 'All Streams' },
                  { value: 'production', label: 'Production (OEM)' },
                  { value: 'service', label: 'Service (RMA)' }
                ]}
              />
            </div>

            {activeTab === 'history' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Courier:</span>
                <CustomSelect
                  value={transporterFilter}
                  onChange={e => setTransporterFilter(e.target.value)}
                  style={{ minWidth: '150px' }}
                  options={[
                    { value: 'all', label: 'All Couriers' },
                    { value: 'Blue Dart Express Ltd', label: 'Blue Dart Express' },
                    { value: 'V-Trans India Ltd', label: 'V-Trans Logistics' },
                    { value: 'DTDC Priority Air Cargo', label: 'DTDC Priority' },
                    { value: 'Dedicated GPS Plant Vehicle', label: 'Dedicated Fleet' }
                  ]}
                />
              </div>
            )}

            {(searchQuery || streamFilter !== 'all' || statusFilter !== 'all' || transporterFilter !== 'all') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setStreamFilter('all');
                  setStatusFilter('all');
                  setTransporterFilter('all');
                }}
                style={{ height: '32px', fontSize: '11px' }}
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DISPATCH READY QUEUE (BOTH PRODUCTION & SERVICE)                   */}
        {/* ========================================================================= */}
        {activeTab === 'ready' && (
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <PackageCheck size={16} color="#7A1F3D" />
                <span>Dispatch Ready Queue — Production & Service Spindles</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Units that have completed final balancing & metrology sign-off • Ready for packaging, gate pass & carrier pickup
              </span>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job Order & Stream</th>
                    <th>Spindle Serial & Model</th>
                    <th>Customer & Delivery Location</th>
                    <th>QC Clearance Status</th>
                    <th>Packaging Spec</th>
                    <th>Customer Notification</th>
                    <th style={{ textAlign: 'center' }}>Outward Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReady.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No spindles currently waiting in the dispatch queue. Click "+ New Dispatch Entry" to allocate a unit.
                      </td>
                    </tr>
                  ) : (
                    filteredReady.map((item) => (
                      <tr key={item.id}>
                        {/* 1. Job Order & Stream */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                              {item.workOrder || item.id}
                            </span>
                            <span style={{
                              fontSize: '9.5px',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              background: item.stream === 'production' ? '#dbeafe' : '#ede9fe',
                              color: item.stream === 'production' ? '#1d4ed8' : '#6d28d9',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              width: 'fit-content'
                            }}>
                              {item.stream === 'production' ? <Cpu size={9} /> : <Wrench size={9} />}
                              {item.stream === 'production' ? 'PROD · OEM NEW' : 'SERVICE · RMA OVERHAUL'}
                            </span>
                          </div>
                        </td>

                        {/* 2. Spindle Serial & Model */}
                        <td>
                          <div>
                            <div className="mono" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-main)' }}>
                              {item.spindleSerial}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {item.spindleModel}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              Target Delivery: <strong style={{ color: '#b45309' }}>{item.targetDate}</strong>
                            </div>
                          </div>
                        </td>

                        {/* 3. Customer & Delivery Location */}
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                              {item.customer}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <MapPin size={10} color="#64748b" /> {item.destination}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              Attn: {item.customerContact}
                            </div>
                          </div>
                        </td>

                        {/* 4. QC Clearance Status */}
                        <td>
                          <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', padding: '2px 7px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700, marginBottom: '2px' }}>
                              <ShieldCheck size={11} color="#166534" /> QC Certified
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              Runout: {item.runoutMetric}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              Balance: {item.balanceGrade}
                            </div>
                          </div>
                        </td>

                        {/* 5. Packaging Spec */}
                        <td>
                          <div>
                            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                              VCI Hermetic Seal
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              Hardwood Export Crate
                            </div>
                            <div className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                              Gross: {item.grossWeight}
                            </div>
                          </div>
                        </td>

                        {/* 6. Customer Notification ("Parcel is Ready") */}
                        <td>
                          <div>
                            {item.emailSent ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#15803d', fontSize: '11px', fontWeight: 600 }}>
                                <CheckCircle2 size={12} color="#15803d" />
                                <span>Email Sent</span>
                              </div>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEmailComposer(item)}
                                title="Send official 'Your Spindle Parcel is Ready' notification email to customer"
                                style={{ padding: '3px 8px', fontSize: '11px', borderColor: '#7A1F3D', color: '#7A1F3D', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Send size={11} color="#7A1F3D" />
                                <span>Send Ready Email</span>
                              </button>
                            )}
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {item.customerEmail}
                            </div>
                          </div>
                        </td>

                        {/* 7. Outward Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenShipModal(item)}
                              title="Mark Spindle as Dispatched & Book Carrier"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                            >
                              <Truck size={12} />
                              <span>Ship Consignment</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDownloadChallan(item)}
                              title="Generate and Download Delivery Challan PDF"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                            >
                              <Download size={12} color="#7A1F3D" />
                              <span>Challan</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenVerifyModal(item)}
                              title="Inspect Pre-Dispatch Quality Checklist"
                              style={{ padding: '4px 7px', fontSize: '11px' }}
                            >
                              <ShieldCheck size={12} color="#059669" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DISPATCHED & TRANSIT HISTORY                                       */}
        {/* ========================================================================= */}
        {activeTab === 'history' && (
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <Truck size={16} color="#7A1F3D" />
                <span>Dispatched Consignments & Tracking Registry</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Archive of outward shipments • Transporter dockets, vehicle numbers, Delivery Challans & transit tracking
              </span>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Challan & Dispatch No</th>
                    <th>Spindle Serial & Model</th>
                    <th>Customer & Destination</th>
                    <th>Carrier & Docket No</th>
                    <th>Vehicle & Mode</th>
                    <th>Dispatch Date & ETA</th>
                    <th>Transit Status</th>
                    <th style={{ textAlign: 'center' }}>Tracking & Challan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No dispatched consignments match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <tr key={item.id}>
                        {/* 1. Challan & Dispatch No */}
                        <td>
                          <div>
                            <div className="mono" style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--primary)' }}>
                              {item.challanNo}
                            </div>
                            <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              {item.id} · Ref: {item.workOrder}
                            </div>
                            <span style={{
                              fontSize: '9px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              background: item.stream === 'production' ? '#dbeafe' : '#ede9fe',
                              color: item.stream === 'production' ? '#1d4ed8' : '#6d28d9',
                              fontWeight: 700,
                              textTransform: 'uppercase'
                            }}>
                              {item.stream === 'production' ? 'OEM NEW' : 'RMA REPAIR'}
                            </span>
                          </div>
                        </td>

                        {/* 2. Spindle Serial & Model */}
                        <td>
                          <div>
                            <div className="mono" style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>
                              {item.spindleSerial}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {item.spindleModel}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              Gross Wt: {item.grossWeight}
                            </div>
                          </div>
                        </td>

                        {/* 3. Customer & Destination */}
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)' }}>
                              {item.customer}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              {item.destination}
                            </div>
                          </div>
                        </td>

                        {/* 4. Carrier & Docket No */}
                        <td>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)' }}>
                              {item.transporter}
                            </div>
                            <div className="mono" style={{ fontWeight: 700, fontSize: '11px', color: '#1e40af' }}>
                              Docket: {item.docketNo}
                            </div>
                          </div>
                        </td>

                        {/* 5. Vehicle & Mode */}
                        <td>
                          <div>
                            <div className="mono" style={{ fontWeight: 600, fontSize: '11.5px', color: 'var(--text-main)' }}>
                              {item.vehicleNo}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {item.deliveryMode}
                            </div>
                          </div>
                        </td>

                        {/* 6. Dispatch Date & ETA */}
                        <td>
                          <div>
                            <div className="mono" style={{ fontSize: '11.5px', fontWeight: 600 }}>
                              {item.dispatchDate}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#b45309' }}>
                              ETA: {item.estimatedArrival}
                            </div>
                          </div>
                        </td>

                        {/* 7. Transit Status */}
                        <td>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: item.status === 'Delivered' ? '#f0fdf4' : '#eff6ff',
                            color: item.status === 'Delivered' ? '#15803d' : '#1d4ed8',
                            border: `1px solid ${item.status === 'Delivered' ? '#86efac' : '#93c5fd'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {item.status === 'Delivered' ? <CheckCircle2 size={11} /> : <Truck size={11} />}
                            {item.status}
                          </span>
                        </td>

                        {/* 8. Tracking & Challan Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDownloadChallan(item)}
                              title="Download Delivery Challan PDF"
                              style={{ padding: '3px 7px', fontSize: '11px' }}
                            >
                              <Download size={11} color="#7A1F3D" />
                              <span>Challan</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEmailComposer(item)}
                              title="Resend Dispatch Notification / Tracking Email to Customer"
                              style={{ padding: '3px 7px', fontSize: '11px' }}
                            >
                              <Send size={11} color="#1d4ed8" />
                              <span>Tracking Email</span>
                            </button>

                            {item.trackingUrl && (
                              <a
                                href={item.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary btn-sm"
                                title="Open Carrier Live Tracking Portal"
                                style={{ padding: '3px 6px', fontSize: '11px' }}
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: APPROVED TRANSPORTERS & LOGISTICS PARTNERS                         */}
        {/* ========================================================================= */}
        {activeTab === 'carriers' && (
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <Truck size={16} color="#7A1F3D" />
                <span>Approved Logistics & Courier Partners</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Dedicated industrial freight, air cargo, and high-precision spindle transporters
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', padding: '16px' }}>
              {APPROVED_CARRIERS.map((carrier, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '14px',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)' }}>
                        {carrier.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {carrier.type}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '4px' }}>
                      {carrier.rating}
                    </span>
                  </div>

                  <div style={{ fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Account POC:</span> <strong>{carrier.contactPerson}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={11} color="#059669" />
                      <span className="mono" style={{ fontWeight: 600, color: '#059669' }}>{carrier.phone}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Pune - Mumbai TAT:</span> <strong>{carrier.transitPuneMumbai}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>All-India Express TAT:</span> <strong>{carrier.transitAllIndia}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {carrier.specialty}
                  </div>

                  {carrier.trackingUrl && (
                    <a
                      href={carrier.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <ExternalLink size={12} />
                      <span>Open Carrier Web Portal</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: SHIP CONSIGNMENT / MARK AS DISPATCHED                            */}
      {/* ========================================================================= */}
      {isShipModalOpen && shipTargetItem && (
        <Modal
          isOpen={isShipModalOpen}
          onClose={() => setIsShipModalOpen(false)}
          title={`Outward Dispatch Clearance — ${shipTargetItem.spindleSerial}`}
          maxWidth="620px"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setIsShipModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirmShipment}>
                <Truck size={14} />
                <span>Confirm Outward Dispatch & Issue Gate Pass</span>
              </button>
            </>
          }
        >
          <form onSubmit={handleConfirmShipment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SPINDLE CONSIGNMENT</div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                  {shipTargetItem.spindleModel}
                </div>
                <div className="mono" style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                  Serial: {shipTargetItem.spindleSerial} · Order: {shipTargetItem.workOrder}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CONSIGNEE</div>
                <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)' }}>
                  {shipTargetItem.customer}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Delivery Challan No *</label>
                <input
                  type="text"
                  className="form-control mono"
                  value={shipForm.challanNo}
                  onChange={e => setShipForm(prev => ({ ...prev, challanNo: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Approved Transporter / Carrier *</label>
                <select
                  className="form-control"
                  value={shipForm.transporter}
                  onChange={e => setShipForm(prev => ({ ...prev, transporter: e.target.value }))}
                  required
                >
                  <option value="Blue Dart Express Ltd">Blue Dart Express Ltd (Air Freight)</option>
                  <option value="V-Trans India Ltd">V-Trans India Ltd (Dedicated Surface)</option>
                  <option value="DTDC Priority Air Cargo">DTDC Priority Air Cargo</option>
                  <option value="Dedicated GPS Plant Vehicle">Dedicated GPS Factory Vehicle</option>
                  <option value="Customer Factory Pickup">Customer Representative Pickup</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Docket / AWB / LR Tracking No *</label>
                <input
                  type="text"
                  className="form-control mono"
                  value={shipForm.docketNo}
                  onChange={e => setShipForm(prev => ({ ...prev, docketNo: e.target.value }))}
                  placeholder="e.g. BD-892819201"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Carrier Vehicle / Truck No *</label>
                <input
                  type="text"
                  className="form-control mono"
                  value={shipForm.vehicleNo}
                  onChange={e => setShipForm(prev => ({ ...prev, vehicleNo: e.target.value }))}
                  placeholder="e.g. MH-12-RN-4820"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Mode</label>
                <select
                  className="form-control"
                  value={shipForm.deliveryMode}
                  onChange={e => setShipForm(prev => ({ ...prev, deliveryMode: e.target.value }))}
                >
                  <option value="Express Dedicated Transit">Express Dedicated Transit</option>
                  <option value="Priority Air Cargo">Priority Air Cargo</option>
                  <option value="Surface Road Transport">Surface Road Transport</option>
                  <option value="Hand Delivery With Engineer">Hand Delivery With Engineer</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Gross Consignment Weight</label>
                <input
                  type="text"
                  className="form-control"
                  value={shipForm.grossWeight}
                  onChange={e => setShipForm(prev => ({ ...prev, grossWeight: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Destination Plant Address *</label>
              <input
                type="text"
                className="form-control"
                value={shipForm.destination}
                onChange={e => setShipForm(prev => ({ ...prev, destination: e.target.value }))}
                required
              />
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                <input
                  type="checkbox"
                  checked={shipForm.sendEmailNow}
                  onChange={e => setShipForm(prev => ({ ...prev, sendEmailNow: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: '#166534' }}
                />
                <span>Automatically open Email Composer to send "Parcel is Ready & Dispatched" email to customer</span>
              </label>
              <div style={{ fontSize: '11px', color: '#15803d', paddingLeft: '24px', marginTop: '2px' }}>
                Will pre-fill notification to {shipTargetItem.customerEmail} with docket tracking info.
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRE-DISPATCH QUALITY VERIFICATION CHECKLIST                      */}
      {/* ========================================================================= */}
      {isVerifyModalOpen && verifyTargetItem && (
        <Modal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          title={`Pre-Dispatch Verification Station — ${verifyTargetItem.spindleSerial}`}
          maxWidth="540px"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setIsVerifyModalOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  if (onNotify) onNotify('Pre-dispatch quality gate certified & sealed.');
                }}
              >
                <Check size={14} />
                <span>Certify Quality Gate & Seal Crate</span>
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Mandatory quality assurance protocol before sealing anti-corrosion crating and handing over to freight transporter:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {[
                { key: 'runoutVerified', label: 'Taper Radial Runout verified ≤ 0.0008 mm in Cleanroom Metrology', metric: verifyTargetItem.runoutMetric },
                { key: 'balancingPassed', label: 'Dynamic Dual-Plane Balancing certified to ISO 1940 Grade G0.4', metric: verifyTargetItem.balanceGrade },
                { key: 'runInStabilized', label: '4-Hour thermal run-in test completed with temperature rise < 15°C', metric: 'Passed' },
                { key: 'vciCushioning', label: 'VCI anti-corrosion barrier wrap & active moisture desiccant bags inserted', metric: 'Sealed' },
                { key: 'shockSensorArmed', label: 'Shock-Watch & Tilt-Watch impact indicators armed on wooden crate exterior', metric: 'Armed' },
                { key: 'manualEnclosed', label: 'Commissioning, lubrication & preventive maintenance manual enclosed', metric: 'Included' },
                { key: 'warrantyCardInserted', label: 'GPS Official Warranty Certificate & Test Sheet placed in crate document pouch', metric: 'Signed' }
              ].map((item) => (
                <label
                  key={item.key}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12px', cursor: 'pointer', padding: '4px 0' }}
                >
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={e => setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    style={{ marginTop: '2px', width: '15px', height: '15px', accentColor: '#7A1F3D' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.label}</div>
                    <div style={{ fontSize: '10.5px', color: '#059669' }}>Status: {item.metric}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: NEW OUTWARD DISPATCH ENTRY                                       */}
      {/* ========================================================================= */}
      {isNewEntryModalOpen && (
        <Modal
          isOpen={isNewEntryModalOpen}
          onClose={() => setIsNewEntryModalOpen(false)}
          title="Create New Outward Dispatch Clearance"
          maxWidth="540px"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setIsNewEntryModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const newSpindle = {
                    id: newEntryForm.jobRef || `WO-2026-${Math.floor(100 + Math.random() * 900)}`,
                    workOrder: newEntryForm.jobRef || `WO-2026-${Math.floor(100 + Math.random() * 900)}`,
                    stream: newEntryForm.stream,
                    streamLabel: newEntryForm.stream === 'production' ? 'Production (OEM New)' : 'Service Repair (RMA)',
                    spindleSerial: newEntryForm.spindleSerial || `GPS-2026-SP-${Math.floor(100 + Math.random() * 900)}`,
                    spindleModel: newEntryForm.spindleModel,
                    customer: newEntryForm.customer,
                    customerContact: 'Plant Procurement Desk',
                    customerEmail: 'procurement@client.com',
                    destination: newEntryForm.destination,
                    targetDate: new Date().toLocaleDateString('en-GB'),
                    status: 'Dispatch Ready',
                    packagingType: newEntryForm.packagingType,
                    grossWeight: newEntryForm.weight,
                    qcCertificateId: 'QC-CERT-2026-NEW',
                    runoutMetric: '0.0008 mm (Certified)',
                    balanceGrade: 'ISO G0.4 (Passed)',
                    emailSent: false,
                    packagingDone: true,
                    verified: true
                  };

                  setReadySpindles([newSpindle, ...readySpindles]);
                  setIsNewEntryModalOpen(false);
                  if (onNotify) onNotify(`Unit ${newSpindle.spindleSerial} added to Dispatch Ready Queue.`);
                }}
              >
                <Plus size={14} />
                <span>Add to Dispatch Queue</span>
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Production Stream *</label>
              <select
                className="form-control"
                value={newEntryForm.stream}
                onChange={e => setNewEntryForm(prev => ({ ...prev, stream: e.target.value }))}
              >
                <option value="production">Production — New OEM Manufacturing Spindle (8 Stages)</option>
                <option value="service">Service & Repair — Reconditioned Overhaul Spindle (9 Stages)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Job / Work Order No *</label>
                <input
                  type="text"
                  className="form-control mono"
                  value={newEntryForm.jobRef}
                  onChange={e => setNewEntryForm(prev => ({ ...prev, jobRef: e.target.value }))}
                  placeholder="e.g. WO-2026-0150 / SR-2026-045"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Spindle Serial No *</label>
                <input
                  type="text"
                  className="form-control mono"
                  value={newEntryForm.spindleSerial}
                  onChange={e => setNewEntryForm(prev => ({ ...prev, spindleSerial: e.target.value }))}
                  placeholder="e.g. GPS-2026-0850"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Spindle Model *</label>
              <input
                type="text"
                className="form-control"
                value={newEntryForm.spindleModel}
                onChange={e => setNewEntryForm(prev => ({ ...prev, spindleModel: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Customer / Client Name *</label>
              <input
                type="text"
                className="form-control"
                value={newEntryForm.customer}
                onChange={e => setNewEntryForm(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Destination Plant</label>
              <input
                type="text"
                className="form-control"
                value={newEntryForm.destination}
                onChange={e => setNewEntryForm(prev => ({ ...prev, destination: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 5. OUTLOOK EMAIL COMPOSER MODAL ("PARCEL IS READY" NOTIFICATION)          */}
      {/* ========================================================================= */}
      {isEmailComposerOpen && emailTargetSpindle && (
        <OutlookEmailComposer
          isOpen={isEmailComposerOpen}
          onClose={() => setIsEmailComposerOpen(false)}
          documentData={emailTargetSpindle}
          documentType="dispatch_notification"
          onSent={handleEmailSentSuccess}
          onNotify={onNotify}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. DOCUMENT PREVIEW MODAL                                                 */}
      {/* ========================================================================= */}
      {isPreviewModalOpen && previewDoc && (
        <DocumentPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          doc={previewDoc}
          onNotify={onNotify}
        />
      )}
    </div>
  );
}
