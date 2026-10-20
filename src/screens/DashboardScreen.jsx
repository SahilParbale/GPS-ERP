import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import PipelineVisualizer from '../components/common/PipelineVisualizer';
import PageHeader from '../components/common/PageHeader';
import { dashboardService } from '../services/database';
import { workOrderService } from '../services/database/workOrderService';
import { DashboardSkeleton } from '../components/common/Skeleton';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { isCleanSlateMode, toggleCleanSlateMode } from '../utils/dataMode';
import {
  purchaseOrderService,
  saveRaisedMaterial,
  isMaterialPoRaised
} from '../services/database/purchaseOrderService';
import {
  ArrowUpRight, AlertTriangle, Clock, Eye,
  CheckCircle2, Plus, Download, RefreshCw, Loader2,
  AlertCircle, ShoppingCart, ShieldCheck, Truck,
  Search, X, Factory, FileText, Receipt, Package, Building2, Wrench, ArrowRight,
  Activity, Gauge, Flame, Thermometer, Radio, Check, ChevronRight, Layers,
  Sparkles, Cog, Cpu, DollarSign, Calendar, Sliders, Users, UserCheck, Briefcase, Mail, Send
} from 'lucide-react';
import { fetchEmailActivityLive } from '../services/emailService';

const PRESET_SUPPLIERS = [];

const SPINDLE_MODELS = [
  { code: 'GPS-HSK-A63-24K', name: 'GPS-HSK-A63-24K (24,000 RPM Motorized Spindle)' },
  { code: 'GPS-BT50-10K', name: 'GPS-BT50-10K (10,000 RPM Heavy-Duty Direct Spindle)' },
  { code: 'GPS-BT40-12K', name: 'GPS-BT40-12K (12,000 RPM Belt-Driven VMC Spindle)' },
  { code: 'GPS-HF-60K', name: 'GPS-HF-60K (60,000 RPM Ultra-High-Speed Micro Spindle)' },
  { code: 'GPS-HSK-E40-42K', name: 'GPS-HSK-E40-42K (42,000 RPM Graphite/Die Milling)' }
];

const DEFAULT_WORKING_STAFF = [
  {
    id: 'GPS-EMP-104',
    employeeCode: 'GPS-EMP-104',
    name: 'Rahul Patil',
    role: 'Master Machinist & Plant Operations',
    department: 'Production Machining',
    designation: 'Master Machinist',
    status: 'Working',
    avatarColor: '#7A1F3D',
    initials: 'RP',
    bay: 'Station 1 - Machining',
    machine: 'CNC-01 / Okuma LB3000 Lathe',
    workOrder: 'WO-2026-104',
    spindleSerial: 'GPS-2026-0842',
    currentTask: 'Shaft CNC Turning & Boring',
    started: '08:30 AM',
    duration: '2h 15m',
    progress: 75,
    stream: 'production'
  },
  {
    id: 'GPS-EMP-105',
    employeeCode: 'GPS-EMP-105',
    name: 'Suresh Sawant',
    role: 'Sr. Precision Machining Lead',
    department: 'Production Machining',
    designation: 'Precision Grinder Lead',
    status: 'Working',
    avatarColor: '#0284c7',
    initials: 'SS',
    bay: 'Station 2 - Grinding',
    machine: 'GRD-01 / Studer S33 Cylindrical Grinder',
    workOrder: 'WO-2026-105',
    spindleSerial: 'GPS-2026-0845',
    currentTask: 'Bearing Journal Micro-Finish Grinding',
    started: '07:45 AM',
    duration: '3h 00m',
    progress: 85,
    stream: 'production'
  },
  {
    id: 'GPS-EMP-106',
    employeeCode: 'GPS-EMP-106',
    name: 'Ganesh Kadam',
    role: 'Cleanroom Assembly Specialist',
    department: 'Cleanroom Assembly',
    designation: 'Cleanroom Specialist',
    status: 'Working',
    avatarColor: '#7c3aed',
    initials: 'GK',
    bay: 'Station 4 - Cleanroom Assembly',
    machine: 'ASM-01 / Class 1000 Laminar Flow Hood',
    workOrder: 'WO-2026-107',
    spindleSerial: 'GPS-2026-0847',
    currentTask: 'Ceramic Bearing Pack Assembly & Pre-load',
    started: '08:15 AM',
    duration: '2h 45m',
    progress: 65,
    stream: 'production'
  },
  {
    id: 'GPS-EMP-107',
    employeeCode: 'GPS-EMP-107',
    name: 'Sachin Jadhav',
    role: 'Dynamic Balancing Specialist',
    department: 'Balancing & Testing',
    designation: 'Balancing Specialist',
    status: 'Working',
    avatarColor: '#b45309',
    initials: 'SJ',
    bay: 'Station 5 - Dynamic Balancing',
    machine: 'BAL-01 / Schenck SmartBalancing Rig',
    workOrder: 'WO-2026-108',
    spindleSerial: 'GPS-2026-0848',
    currentTask: 'Dual-Plane High-Speed Balancing (ISO G0.4)',
    started: '09:30 AM',
    duration: '1h 00m',
    progress: 40,
    stream: 'production'
  },
  {
    id: 'GPS-EMP-109',
    employeeCode: 'GPS-EMP-109',
    name: 'Vikram Shinde',
    role: 'Sr. Spindle Service Overhaul Lead',
    department: 'Service & Spindle Repair',
    designation: 'Service Lead',
    status: 'Working',
    avatarColor: '#ea580c',
    initials: 'VS',
    bay: 'Station 6 - Dynamic Run-in & Testing',
    machine: 'RUN-01 / Computerized Test Bench',
    workOrder: 'SRV-2026-0041',
    spindleSerial: 'GPS-2025-0740',
    currentTask: '4h High-Speed Run-in & Thermal Equilibrium Test',
    started: '07:00 AM',
    duration: '3h 30m',
    progress: 90,
    stream: 'service'
  },
  {
    id: 'GPS-EMP-102',
    employeeCode: 'GPS-EMP-102',
    name: 'Milind Joshi',
    role: 'Quality Assurance Lead Inspector',
    department: 'Quality Assurance',
    designation: 'QA Metrology Lead',
    status: 'Working',
    avatarColor: '#059669',
    initials: 'MJ',
    bay: 'Station 6 - QC Metrology',
    machine: 'Zeiss CMM & Air Gauges',
    workOrder: 'WO-2026-102',
    spindleSerial: 'GPS-2026-0840',
    currentTask: 'Sub-Micron Runout & CMM Final Inspection',
    started: '08:45 AM',
    duration: '2h 00m',
    progress: 95,
    stream: 'production'
  }
];

export default function DashboardScreen({ onNavigate, onSelectWorkOrder, onNotify }) {
  // Live Dashboard Data States
  const [metrics, setMetrics] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [servicePipelineStages, setServicePipelineStages] = useState([]);
  const [activePipelineType, setActivePipelineType] = useState('manufacturing'); // 'manufacturing' | 'service'
  const [workOrders, setWorkOrders] = useState([]);
  const [totalWoCount, setTotalWoCount] = useState(0);
  const [criticalMaterials, setCriticalMaterials] = useState([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [operationalSummary, setOperationalSummary] = useState(null);
  const [workingStaff, setWorkingStaff] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);

  // Filters & Sub-states
  const [woFilter, setWoFilter] = useState('all');
  const [woSearch, setWoSearch] = useState('');

  // Lifecycle States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Quick Modal States
  const [isNewWoModalOpen, setIsNewWoModalOpen] = useState(false);
  const [isCreatingWo, setIsCreatingWo] = useState(false);
  const [newWoForm, setNewWoForm] = useState({
    spindleModel: 'GPS-HSK-A63-24K',
    customer: '',
    serial: '',
    priority: 'Normal',
    dueDate: '',
    initialStage: 'material',
    notes: ''
  });

  // Raise PO Modal State
  const [selectedMaterialForPo, setSelectedMaterialForPo] = useState(null);
  const [isRaisingPo, setIsRaisingPo] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierName: '',
    supplierContact: '',
    supplierEmail: '',
    supplierPhone: '',
    supplierGstin: '',
    supplierAddress: '',
    quantity: 1,
    unitPrice: 0,
    deliveryDays: 7,
    priority: 'Normal',
    notes: ''
  });

  const isClean = isCleanSlateMode();

  const handleOpenRaisePo = (material) => {
    const itemSku = (material.sku || '').toUpperCase();
    const itemName = (material.name || '').toUpperCase();
    let defaultSupplier = PRESET_SUPPLIERS[0] || {}; // Schaeffler
    let defaultRate = material.unitCost || 38500;

    if (itemSku.includes('STL') || itemName.includes('STEEL') || itemName.includes('SHAFT') || itemName.includes('42CR') || itemName.includes('18CR')) {
      defaultSupplier = PRESET_SUPPLIERS[1]; // Bharat Special Steel
      defaultRate = material.unitCost || 18500;
    } else if (itemSku.includes('OTT') || itemName.includes('COLLET') || itemName.includes('DRAWBAR') || itemName.includes('SPRING')) {
      defaultSupplier = PRESET_SUPPLIERS[2]; // OTT Jakob
      defaultRate = material.unitCost || 42000;
    } else if (itemSku.includes('ENC') || itemName.includes('SENSOR') || itemName.includes('SCALE')) {
      defaultSupplier = PRESET_SUPPLIERS[3]; // Heidenhain
      defaultRate = material.unitCost || 56000;
    }

    const deficit = Math.max(1, (material.minStock * 2) - material.availableQty);

    setSelectedMaterialForPo(material);
    setPoForm({
      supplierName: defaultSupplier.name || '',
      supplierContact: defaultSupplier.contact || '',
      supplierEmail: defaultSupplier.email || '',
      supplierPhone: defaultSupplier.phone || '',
      supplierGstin: defaultSupplier.gstin || '',
      supplierAddress: defaultSupplier.address || '',
      quantity: deficit,
      unitPrice: defaultRate,
      deliveryDays: 14,
      priority: material.status.includes('Critical') ? 'Critical Stockout' : 'High Replenishment',
      notes: `Replenishment order for critical inventory shortage: current on-hand ${material.availableQty} ${material.unit} vs safety minimum ${material.minStock}.`
    });
  };

  const handleSupplierSelect = (supplierName) => {
    const matched = PRESET_SUPPLIERS.find(s => s.name === supplierName);
    if (matched) {
      setPoForm(prev => ({
        ...prev,
        supplierName: matched.name,
        supplierContact: matched.contact,
        supplierEmail: matched.email,
        supplierPhone: matched.phone,
        supplierGstin: matched.gstin,
        supplierAddress: matched.address
      }));
    } else {
      setPoForm(prev => ({ ...prev, supplierName }));
    }
  };

  const handleConfirmRaisePo = async (navigateAfter = true) => {
    if (!selectedMaterialForPo) return;
    setIsRaisingPo(true);

    try {
      const poNum = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
      const qty = Number(poForm.quantity) || 1;
      const rate = Number(poForm.unitPrice) || 0;
      const subtotal = qty * rate;
      const total = Math.round(subtotal * 1.18);
      const deliveryDate = new Date(Date.now() + (Number(poForm.deliveryDays) || 14) * 86400000).toISOString().split('T')[0];

      const poPayload = {
        poNumber: poNum,
        supplierName: poForm.supplierName,
        supplierEmail: poForm.supplierEmail,
        supplierPhone: poForm.supplierPhone,
        supplierGstin: poForm.supplierGstin,
        supplierAddress: poForm.supplierAddress,
        expectedDeliveryDate: deliveryDate,
        paymentTerms: 'Net 30 Days from GRN Inspection',
        subtotal: subtotal,
        totalAmount: total,
        status: 'Sent',
        notes: poForm.notes,
        items: [
          {
            productId: selectedMaterialForPo.productId,
            name: selectedMaterialForPo.name,
            desc: `${selectedMaterialForPo.name} (${selectedMaterialForPo.sku}) - Precision Spindle Replenishment`,
            sku: selectedMaterialForPo.sku,
            qty: qty,
            unit: selectedMaterialForPo.unit || 'PCS',
            rate: rate,
            gst: 18,
            total: total
          }
        ]
      };

      await purchaseOrderService.createPurchaseOrder(poPayload);
      saveRaisedMaterial(selectedMaterialForPo, poNum);

      if (onNotify) {
        onNotify(`Purchase Order ${poNum} successfully generated for ${selectedMaterialForPo.sku} (Total: ₹${total.toLocaleString('en-IN')})`);
      }

      const targetMat = selectedMaterialForPo;
      setCriticalMaterials(prev => prev.filter(m =>
        m.id !== targetMat.id &&
        (!targetMat.sku || m.sku !== targetMat.sku) &&
        (!targetMat.productId || m.productId !== targetMat.productId)
      ));

      setMetrics(prev => prev.map(m => {
        if (m.id === 'low_stock') {
          const count = Math.max(0, (parseInt(m.value, 10) || 0) - 1);
          return {
            ...m,
            value: String(count),
            trend: count > 0 ? `${count} below threshold` : 'Inventory healthy',
            alert: count > 0,
            isUp: count === 0
          };
        }
        return m;
      }));

      setSelectedMaterialForPo(null);

      if (navigateAfter && onNavigate) {
        onNavigate('purchase-orders');
      }
    } catch (err) {
      console.error('[DashboardScreen] Failed to raise PO:', err);
      if (onNotify) onNotify(`Failed to create PO: ${err.message}`);
    } finally {
      setIsRaisingPo(false);
    }
  };

  // Launch New Work Order from Dashboard
  const handleLaunchWorkOrder = async (e) => {
    e.preventDefault();
    setIsCreatingWo(true);

    try {
      const generatedWoNo = `WO-2026-${Math.floor(110 + Math.random() * 890)}`;
      const woPayload = {
        work_order_no: generatedWoNo,
        customer_name: newWoForm.customer,
        spindle_model: newWoForm.spindleModel,
        spindle_serial: newWoForm.serial,
        priority: newWoForm.priority,
        target_delivery_date: newWoForm.dueDate,
        current_stage: newWoForm.initialStage,
        status: 'In Progress',
        notes: newWoForm.notes
      };

      await workOrderService.createWorkOrder(woPayload);

      if (onNotify) {
        onNotify(`Work Order ${generatedWoNo} launched successfully! Spindle ${newWoForm.serial} assigned to shop floor.`);
      }

      setIsNewWoModalOpen(false);
      // Refresh dashboard
      await fetchDashboardData(false);
    } catch (err) {
      console.error('[DashboardScreen] Failed to create work order:', err);
      if (onNotify) onNotify(`Failed to create work order: ${err.message}`);
    } finally {
      setIsCreatingWo(false);
    }
  };

  // Load real-time workforce staff actively working on shop floor
  const loadWorkingStaff = useCallback(() => {
    if (isClean) {
      return [];
    }

    let localStaff = [];
    try {
      localStaff = JSON.parse(localStorage.getItem('gps_local_workforce_staff') || '[]');
    } catch (e) {
      localStaff = [];
    }

    // Merge baseline staff with local storage updates
    const merged = DEFAULT_WORKING_STAFF.map(base => {
      const match = localStaff.find(s => s.id === base.id || s.name === base.name || s.employeeCode === base.employeeCode);
      if (match) {
        return {
          ...base,
          ...match,
          status: match.status || base.status,
          currentTask: match.currentTask || match.task || base.currentTask,
          workOrder: match.workOrder || base.workOrder,
          machine: match.machine || base.machine,
          bay: match.bay || base.bay,
          duration: match.duration || base.duration,
          progress: match.progress !== undefined ? match.progress : base.progress
        };
      }
      return base;
    });

    // Also include any other local staff marked as Working
    localStaff.forEach(s => {
      if (!merged.some(m => m.id === s.id || m.name === s.name || m.employeeCode === s.id)) {
        if (s.status === 'Working' || s.status === 'Operating') {
          merged.push({
            id: s.id,
            employeeCode: s.id || 'GPS-EMP',
            name: s.name || 'Technician',
            role: s.role || s.designation || 'Specialist',
            department: s.department || 'Production',
            designation: s.designation || 'Specialist',
            status: 'Working',
            avatarColor: s.avatarColor || '#7A1F3D',
            initials: s.initials || (s.name ? s.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'OP'),
            bay: s.bay || 'Station 1 - Machining',
            machine: s.machine || 'CNC Lathe',
            workOrder: s.workOrder || 'WO-2026-110',
            spindleSerial: s.spindleSerial || s.spindle || 'Spindle Unit',
            currentTask: s.currentTask || s.task || 'Active Operation',
            started: s.started || '08:30 AM',
            duration: s.duration || '1h 30m',
            progress: s.progress || 50,
            stream: s.stream || (s.workOrder && s.workOrder.startsWith('SR') ? 'service' : 'production')
          });
        }
      }
    });

    return merged.filter(s => s.status === 'Working' || s.status === 'Operating');
  }, [isClean]);

  // Fetch all live dashboard data in parallel from PostgreSQL
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [
        metricsRes,
        pipelineRes,
        srvPipelineRes,
        woRes,
        materialsRes,
        deliveriesRes,
        activityRes,
        summaryRes,
        emailsRes
      ] = await Promise.all([
        dashboardService.getDashboardMetrics(),
        dashboardService.getProductionPipelineStages(),
        dashboardService.getServicePipelineStages(),
        dashboardService.getRecentWorkOrders(6),
        dashboardService.getCriticalMaterials(10),
        dashboardService.getUpcomingDeliveries(4),
        dashboardService.getRecentActivityFeed(6),
        dashboardService.getPlantOperationalSummary(),
        fetchEmailActivityLive().catch(() => ({ data: [] }))
      ]);

      if (metricsRes.error) {
        throw new Error(metricsRes.error.message || 'Failed to load KPI metrics');
      }

      const rawMaterials = materialsRes.data || [];
      const unaddressedMaterials = rawMaterials.filter(m => !isMaterialPoRaised(m));
      const displayMaterials = unaddressedMaterials.slice(0, 5);

      const raisedCount = rawMaterials.length - unaddressedMaterials.length;
      const adjustedMetrics = (metricsRes.data || []).map(metric => {
        if (metric.id === 'low_stock') {
          const currentVal = parseInt(metric.value, 10) || 0;
          const adjustedVal = Math.max(0, currentVal - raisedCount);
          return {
            ...metric,
            value: String(adjustedVal),
            trend: adjustedVal > 0 ? `${adjustedVal} below threshold` : 'Inventory healthy',
            alert: adjustedVal > 0,
            isUp: adjustedVal === 0
          };
        }
        return metric;
      });

      setMetrics(adjustedMetrics);
      setPipelineStages(pipelineRes.data || []);
      setServicePipelineStages(srvPipelineRes.data || []);
      setWorkOrders(woRes.data || []);
      setTotalWoCount(woRes.totalCount || (woRes.data ? woRes.data.length : 0));
      setCriticalMaterials(displayMaterials);
      setUpcomingDeliveries(deliveriesRes.data || []);
      setRecentActivity(activityRes.data || []);
      setOperationalSummary(summaryRes || null);
      setWorkingStaff(loadWorkingStaff());
      setEmailLogs(emailsRes?.data || []);

      if (isRefresh && onNotify) {
        onNotify('Manufacturing Operations Dashboard updated with live metrics');
      }
    } catch (err) {
      console.warn('[GPS-ERP Dashboard] Error loading dashboard:', err.message);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onNotify, loadWorkingStaff]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Synchronize dashboard whenever entities change
  useEffect(() => {
    const handleEntityUpdate = (e) => {
      if (['purchase-orders', 'work-orders', 'spindles', 'invoices', 'workforce', 'production', 'service'].includes(e?.detail?.entity)) {
        fetchDashboardData(false);
        setWorkingStaff(loadWorkingStaff());
      }
    };
    window.addEventListener('gps_entities_updated', handleEntityUpdate);
    return () => {
      window.removeEventListener('gps_entities_updated', handleEntityUpdate);
    };
  }, [fetchDashboardData, loadWorkingStaff]);

  // Filtered work orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const q = woSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        (wo.id || '').toLowerCase().includes(q) ||
        (wo.spindleSerial || '').toLowerCase().includes(q) ||
        (wo.spindleModel || '').toLowerCase().includes(q) ||
        (wo.customer || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (woFilter === 'all') return true;
      if (woFilter === 'machining') return (wo.currentStage || '').toLowerCase().includes('machin');
      if (woFilter === 'grinding') return (wo.currentStage || '').toLowerCase().includes('grind');
      if (woFilter === 'assembly') return (wo.currentStage || '').toLowerCase().includes('assembl');
      if (woFilter === 'balancing') return (wo.currentStage || '').toLowerCase().includes('balanc');
      if (woFilter === 'qc') return (wo.status || '').toLowerCase() === 'qc' || (wo.currentStage || '').toLowerCase().includes('qc');
      return true;
    });
  }, [workOrders, woFilter, woSearch]);

  // Loading Skeleton State
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Error State with Retry
  if (error) {
    return (
      <div className="content-area">
        <PageHeader
          title="Manufacturing Operations Dashboard"
          subtitle="GPS Spindle Nanded City Unit 1 • High-Precision Industrial Spindle Facility"
        />
        <div className="section-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Database Notice</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
            {error}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fetchDashboardData(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      {/* Top Header with Plant Information and Actions */}
      <PageHeader
        title="Dashboard"
        subtitle="General Precision Spindles • Nanded City Unit 1 • CNC/VMC/HMC Precision Engineering"
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fetchDashboardData(true)}
          disabled={isRefreshing}
          title="Refresh live metrics from database"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setPreviewDoc({
              type: 'Report',
              reportTitle: 'SHOP FLOOR PRODUCTION & DAILY OPERATIONS REPORT',
              id: `DAILY-REP-${new Date().toISOString().split('T')[0]}`,
              metrics: [
                { label: 'Active Spindle Orders', value: totalWoCount || workOrders.length },
                { label: 'Critical Deliveries', value: upcomingDeliveries.length },
                { label: 'Manufacturing Pipeline', value: '8 Stages' }
              ],
              headers: ['#', 'WO Number', 'Spindle Model & Serial', 'Customer', 'Current Stage', 'Target Date', 'Status'],
              rows: workOrders.map((wo, idx) => [
                idx + 1,
                wo.id || wo.workOrderNumber,
                `${wo.spindleModel} (${wo.spindleSerial || wo.serial || '—'})`,
                wo.customer,
                wo.currentStage || wo.currentOperation || 'Machining',
                wo.dueDate || '—',
                wo.status || 'In Progress'
              ])
            });
            setIsPreviewOpen(true);
          }}
        >
          <Download size={14} />
          <span className="desktop-only-inline">Daily Operations Report (PDF)</span>
          <span className="mobile-only-inline">Daily Report (PDF)</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsNewWoModalOpen(true)}
          title="Launch new work order on shop floor"
        >
          <Plus size={14} />
          <span className="desktop-only-inline">Launch Work Order</span>
          <span className="mobile-only-inline">New WO</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* Plant Environment & Shop Floor Operations Bar */}


        {/* Clean Production Launchpad Banner */}


        {/* Operational Overview: Manufacturing & Service */}
        <div className="dashboard-overview-grid">
          {/* Card 1: Manufacturing & Shop Floor */}
          <div
            className="section-card dashboard-overview-card"
            style={{ marginBottom: 0, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onClick={() => onNavigate && onNavigate('production')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A1F3D', flexShrink: 0 }}>
                  <Cog size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Manufacturing</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Production Rotation</div>
                </div>
              </div>
              <ArrowUpRight size={15} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <span className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#7A1F3D' }}>
                {isClean ? '0' : (workOrders.length || '18')}
              </span>
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                {isClean ? '0 active work orders' : 'Shop floor operating'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              CNC Lathes, Studer Grinding & Cleanroom Assembly
            </div>
          </div>

          {/* Card 2: RMA Spindle Service & Overhaul */}
          <div
            className="section-card dashboard-overview-card"
            style={{ marginBottom: 0, padding: '18px 20px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onClick={() => onNavigate && onNavigate('service')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', flexShrink: 0 }}>
                  <Wrench size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Service & Overhaul</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>Service Workshop</div>
                </div>
              </div>
              <ArrowUpRight size={15} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '16px' }}>
              <span className="mono" style={{ fontSize: '26px', fontWeight: 800, color: '#ea580c' }}>
                {isClean ? '0' : '7'}
              </span>
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                {isClean ? '0 repair dockets' : 'Avg TAT: 4.2 Days'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Teardown diagnosis, ceramic bearing replacement
            </div>
          </div>
        </div>

        {/* Shop Floor Workforce — Staff Working Now Card */}
        <div className="section-card" style={{ marginTop: '10px' }}>
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <Users size={16} color="#7c3aed" style={{ flexShrink: 0 }} />
              <span className="desktop-only-inline">Staff Working Now — Live Shop Floor Roster</span>
              <span className="mobile-only-inline">Staff Working Now</span>
              {workingStaff.length > 0 && !isClean && (
                <span className="badge badge-success mono" style={{ fontSize: '11px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  {workingStaff.length} On Duty
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate && onNavigate('workforce')}
              style={{ flexShrink: 0 }}
            >
              <span className="desktop-only-inline">View Full Workforce Desk</span>
              <span className="mobile-only-inline">Workforce Desk</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Desktop & Tablet: Full 8-Column Data Table */}
          <div className="table-responsive desktop-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Member</th>
                  <th>Department & Role</th>
                  <th>Currently Working On</th>
                  <th>Work Order / Spindle</th>
                  <th>Machine / Workstation</th>
                  <th>Time On Job</th>
                  <th>Stage Progress</th>
                  <th style={{ textAlign: 'center' }}>Live Status</th>
                </tr>
              </thead>
              <tbody>
                {isClean || workingStaff.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                      <Users size={32} style={{ opacity: 0.3, margin: '0 auto 8px', color: '#7c3aed' }} />
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>
                        No Staff Currently Working on Floor
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        Assign technicians to CNC lathes, grinding stations, cleanroom assembly, or service teardowns.
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onNavigate && onNavigate('workforce')}
                        style={{ marginTop: '12px' }}
                      >
                        <UserCheck size={13} />
                        <span>Open Workforce Desk</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  workingStaff.map((staff) => {
                    const isService = staff.stream === 'service' || (staff.workOrder && staff.workOrder.startsWith('SR'));
                    return (
                      <tr
                        key={staff.id || staff.employeeCode || staff.name}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onNavigate && onNavigate('workforce')}
                      >
                        {/* Staff Avatar + Name */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: staff.avatarColor || '#7A1F3D',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '12px',
                                flexShrink: 0
                              }}
                            >
                              {staff.initials || (staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'OP')}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                                {staff.name}
                              </div>
                              <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {staff.employeeCode || staff.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department & Role */}
                        <td>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {staff.role || staff.designation}
                          </div>
                          <span style={{
                            fontSize: '10.5px',
                            padding: '1px 7px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                            fontWeight: 600,
                            display: 'inline-block',
                            marginTop: '2px'
                          }}>
                            {staff.department}
                          </span>
                        </td>

                        {/* Currently Working On (Task) */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <span style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              background: isService ? '#ede9fe' : '#dbeafe',
                              color: isService ? '#6d28d9' : '#1d4ed8',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              {isService ? <Wrench size={9} /> : <Cpu size={9} />}
                              {isService ? 'SERVICE' : 'MANUFACTURING'}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)' }}>
                            {staff.currentTask || staff.operation || 'Shop Floor Operation'}
                          </div>
                        </td>

                        {/* Work Order / Spindle */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span className="badge badge-neutral mono" style={{ fontSize: '11px', fontWeight: 700, width: 'fit-content' }}>
                              {staff.workOrder || 'WO-2026-104'}
                            </span>
                            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {staff.spindleSerial || 'Spindle Unit'}
                            </span>
                          </div>
                        </td>

                        {/* Machine & Workstation */}
                        <td>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {staff.machine || 'Workcell'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {staff.bay || 'Station 1'}
                          </div>
                        </td>

                        {/* Time On Job */}
                        <td>
                          <div className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                            {staff.duration || '2h 15m'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Started {staff.started || '08:30 AM'}
                          </div>
                        </td>

                        {/* Stage Progress */}
                        <td style={{ minWidth: '120px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {staff.progress || 75}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${staff.progress || 75}%`,
                                height: '100%',
                                background: (staff.progress || 75) >= 80 ? '#10b981' : (staff.progress || 75) >= 50 ? '#3b82f6' : '#f59e0b',
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                        </td>

                        {/* Live Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: '11px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontWeight: 700
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                            Working
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile & Small Screens: Dedicated Responsive Card Roster */}
          <div className="staff-mobile-list mobile-card-view">
            {isClean || workingStaff.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ opacity: 0.3, margin: '0 auto 8px', color: '#7c3aed' }} />
                <div style={{ fontWeight: 600, fontSize: '13px' }}>
                  No Staff Currently Working on Floor
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Assign technicians to CNC lathes, grinding stations, cleanroom assembly, or service teardowns.
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate && onNavigate('workforce')}
                  style={{ marginTop: '12px' }}
                >
                  <UserCheck size={13} />
                  <span>Open Workforce Desk</span>
                </button>
              </div>
            ) : (
              workingStaff.map((staff) => {
                const isService = staff.stream === 'service' || (staff.workOrder && staff.workOrder.startsWith('SR'));
                return (
                  <div
                    key={staff.id || staff.employeeCode || staff.name}
                    className="staff-mobile-item-card"
                    onClick={() => onNavigate && onNavigate('workforce')}
                  >
                    {/* Top Row: Avatar + Name + Employee Code + Working Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: staff.avatarColor || '#7A1F3D',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          {staff.initials || (staff.name ? staff.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'OP')}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {staff.name}
                          </div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {staff.employeeCode || staff.id} • {staff.department}
                          </div>
                        </div>
                      </div>

                      <span
                        className="badge"
                        style={{
                          fontSize: '10.5px',
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          flexShrink: 0
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                        Working
                      </span>
                    </div>

                    {/* Second Row: Role & Stream Pill + Current Task */}
                    <div style={{
                      padding: '10px 12px',
                      background: 'var(--bg-surface-subtle)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      marginBottom: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                        <span style={{
                          fontSize: '9.5px',
                          padding: '1px 6px',
                          borderRadius: '3px',
                          background: isService ? '#ede9fe' : '#dbeafe',
                          color: isService ? '#6d28d9' : '#1d4ed8',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          {isService ? <Wrench size={9} /> : <Cpu size={9} />}
                          {isService ? 'SERVICE' : 'MANUFACTURING'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {staff.role || staff.designation}
                        </span>
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                        {staff.currentTask || staff.operation || 'Shop Floor Operation'}
                      </div>
                    </div>

                    {/* Third Row: 2-Column Details Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      fontSize: '11.5px',
                      marginBottom: '10px'
                    }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10.5px' }}>Work Order & Spindle</span>
                        <span className="mono" style={{ fontWeight: 700, color: '#7A1F3D' }}>
                          {staff.workOrder || 'WO-2026-104'}
                        </span>
                        <span className="mono" style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10.5px' }}>
                          {staff.spindleSerial || 'Spindle Unit'}
                        </span>
                      </div>

                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10.5px' }}>Machine & Station</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {staff.machine || 'Workcell'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '10.5px' }}>
                          {staff.bay || 'Station 1'}
                        </span>
                      </div>
                    </div>

                    {/* Fourth Row: Time on Job + Stage Progress Bar */}
                    <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Duration: <strong style={{ color: 'var(--text-main)' }}>{staff.duration || '2h 15m'}</strong> (started {staff.started || '08:30 AM'})
                        </span>
                        <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {staff.progress || 75}%
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${staff.progress || 75}%`,
                            height: '100%',
                            background: (staff.progress || 75) >= 80 ? '#10b981' : (staff.progress || 75) >= 50 ? '#3b82f6' : '#f59e0b',
                            borderRadius: '3px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Email Activity Log Card */}
        <div className="section-card" style={{ marginTop: '10px' }}>
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <Mail size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <span className="desktop-only-inline">Recent Email Activity</span>
              <span className="mobile-only-inline">Email Activity</span>
              {emailLogs.length > 0 && !isClean && (
                <span className="badge badge-primary mono" style={{ fontSize: '11px', padding: '2px 8px', flexShrink: 0 }}>
                  {emailLogs.length} Transmissions
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate && onNavigate('email-activity')}
              style={{ flexShrink: 0 }}
            >
              <span className="desktop-only-inline">View All Email Activity</span>
              <span className="mobile-only-inline">Email Desk</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {/* Desktop & Tablet: Full 6-Column Data Table */}
          <div className="table-responsive desktop-table-view">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Recipient / Customer</th>
                  <th>Subject</th>
                  <th>Document Ref</th>
                  <th>Delivery Status</th>
                  <th>Sent By</th>
                </tr>
              </thead>
              <tbody>
                {isClean || emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                      <Mail size={32} style={{ opacity: 0.3, margin: '0 auto 8px', color: '#2563eb' }} />
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>
                        No Email Activity Recorded
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        Customer quotations, invoices, service teardown reports, and dispatch notifications sent via email will log here.
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onNavigate && onNavigate('email-activity')}
                        style={{ marginTop: '12px' }}
                      >
                        <Send size={13} />
                        <span>Open Email Activity Desk</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  emailLogs.slice(0, 6).map((item) => (
                    <tr
                      key={item.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate && onNavigate('email-activity')}
                    >
                      <td className="mono" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {item.date || '—'}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{item.customer || item.recipient}</div>
                        <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {item.recipient}
                        </div>
                      </td>
                      <td style={{ fontSize: '12.5px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.subject}
                      </td>
                      <td>
                        {item.documentId ? (
                          <span className="badge badge-neutral mono" style={{ fontSize: '11px' }}>
                            {item.documentId}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Direct Communication</span>
                        )}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            fontSize: '11px',
                            background: item.status === 'Delivered' ? '#ecfdf5' : item.status === 'Sent' ? '#eff6ff' : '#fff7ed',
                            color: item.status === 'Delivered' ? '#059669' : item.status === 'Sent' ? '#2563eb' : '#ea580c'
                          }}
                        >
                          {item.status || 'Delivered'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {item.sentBy || 'Rahul Patil'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile & Small Screens: Dedicated Responsive Card Feed */}
          <div className="email-mobile-list mobile-card-view">
            {isClean || emailLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 16px', color: 'var(--text-muted)' }}>
                <Mail size={32} style={{ opacity: 0.3, margin: '0 auto 8px', color: '#2563eb' }} />
                <div style={{ fontWeight: 600, fontSize: '13px' }}>
                  No Email Activity Recorded
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Customer quotations, invoices, service teardown reports, and dispatch notifications sent via email will log here.
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate && onNavigate('email-activity')}
                  style={{ marginTop: '12px' }}
                >
                  <Send size={13} />
                  <span>Open Email Activity Desk</span>
                </button>
              </div>
            ) : (
              emailLogs.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="email-mobile-item-card"
                  onClick={() => onNavigate && onNavigate('email-activity')}
                >
                  {/* Top Row: Customer/Recipient + Delivery Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.customer || item.recipient}
                      </div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.recipient}
                      </div>
                    </div>

                    <span
                      className="badge"
                      style={{
                        fontSize: '10.5px',
                        background: item.status === 'Delivered' ? '#ecfdf5' : item.status === 'Sent' ? '#eff6ff' : '#fff7ed',
                        color: item.status === 'Delivered' ? '#059669' : item.status === 'Sent' ? '#2563eb' : '#ea580c',
                        fontWeight: 700,
                        padding: '2px 7px',
                        flexShrink: 0
                      }}
                    >
                      {item.status || 'Delivered'}
                    </span>
                  </div>

                  {/* Subject */}
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    margin: '6px 0',
                    lineHeight: '1.3'
                  }}>
                    {item.subject}
                  </div>

                  {/* Bottom: Date & Doc Ref & Sent By */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono">{item.date || '—'}</span>
                      {item.documentId && (
                        <span className="badge badge-neutral mono" style={{ fontSize: '10px', padding: '1px 5px' }}>
                          {item.documentId}
                        </span>
                      )}
                    </div>
                    <span>Sent by {item.sentBy || 'Rahul Patil'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Production Shift Report Pop-up Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />

      {/* Raise Purchase Order Modal */}
      {selectedMaterialForPo && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedMaterialForPo(null)}
          title={`Raise Purchase Order: ${selectedMaterialForPo.sku}`}
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedMaterialForPo(null)}
                disabled={isRaisingPo}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleConfirmRaisePo(true)}
                disabled={isRaisingPo}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ShoppingCart size={14} />
                <span>{isRaisingPo ? 'Generating PO...' : 'Confirm & Raise PO'}</span>
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '12px 16px',
              background: '#fef2f2',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#991b1b' }}>
                  {selectedMaterialForPo.name}
                </div>
                <div className="mono" style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
                  SKU: {selectedMaterialForPo.sku} • Category: {selectedMaterialForPo.category}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '14px', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#7f1d1d' }}>Current Available</div>
                  <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>
                    {selectedMaterialForPo.availableQty} {selectedMaterialForPo.unit}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7f1d1d' }}>Safety Threshold</div>
                  <div className="mono" style={{ fontSize: '15px', fontWeight: 600, color: '#991b1b' }}>
                    {selectedMaterialForPo.minStock} {selectedMaterialForPo.unit}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Approved OEM / Authorized Supplier</label>
                <CustomSelect
                  value={poForm.supplierName}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  options={PRESET_SUPPLIERS.map(s => ({ value: s.name, label: `${s.name} (${s.contact.split('(')[0].trim()})` }))}
                />
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  GSTIN: <strong>{poForm.supplierGstin}</strong> • Delivery Hub: {poForm.supplierAddress?.split(',')[0]}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Order Quantity ({selectedMaterialForPo.unit || 'PCS'})</label>
                <input
                  type="number"
                  className="form-control mono"
                  min="1"
                  value={poForm.quantity}
                  onChange={(e) => setPoForm({ ...poForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contracted Unit Rate (INR)</label>
                <input
                  type="number"
                  className="form-control mono"
                  value={poForm.unitPrice}
                  onChange={(e) => setPoForm({ ...poForm, unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lead Time / Delivery Window</label>
                <CustomSelect
                  value={String(poForm.deliveryDays)}
                  onChange={(e) => setPoForm({ ...poForm, deliveryDays: parseInt(e.target.value) || 14 })}
                  options={[
                    { value: '7', label: '7 Days (Air Expedited Emergency)' },
                    { value: '14', label: '14 Days (Standard Priority)' },
                    { value: '21', label: '21 Days (Routine Batch Supply)' },
                    { value: '30', label: '30 Days (Scheduled Monthly Intake)' }
                  ]}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Requisition Urgency</label>
                <input
                  type="text"
                  className="form-control"
                  value={poForm.priority}
                  readOnly
                  style={{ background: 'var(--bg-surface-subtle)', fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-surface-subtle)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimated Commercial Total</div>
                <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '2px' }}>
                  Subtotal: ₹{((Number(poForm.quantity) || 0) * (Number(poForm.unitPrice) || 0)).toLocaleString('en-IN')} + 18% GST
                </div>
              </div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{Math.round(((Number(poForm.quantity) || 0) * (Number(poForm.unitPrice) || 0)) * 1.18).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Launch New Work Order Modal */}
      {isNewWoModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsNewWoModalOpen(false)}
          title="Launch New Spindle Manufacturing Work Order"
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsNewWoModalOpen(false)}
                disabled={isCreatingWo}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleLaunchWorkOrder}
                disabled={isCreatingWo}
              >
                {isCreatingWo ? 'Creating...' : 'Launch Work Order'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleLaunchWorkOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Spindle Engineering Model</label>
              <CustomSelect
                value={newWoForm.spindleModel}
                onChange={(e) => setNewWoForm({ ...newWoForm, spindleModel: e.target.value })}
                options={SPINDLE_MODELS.map(m => ({ value: m.code, label: m.name }))}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Assigned Spindle Serial Number</label>
                <input
                  type="text"
                  className="form-control mono"
                  value={newWoForm.serial}
                  onChange={(e) => setNewWoForm({ ...newWoForm, serial: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priority Rating</label>
                <CustomSelect
                  value={newWoForm.priority}
                  onChange={(e) => setNewWoForm({ ...newWoForm, priority: e.target.value })}
                  options={[
                    { value: 'Normal', label: 'Normal Priority' },
                    { value: 'High', label: 'High Priority (Standard Batch)' },
                    { value: 'Urgent', label: 'Urgent (Line-Down Emergency)' }
                  ]}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Customer Legal Entity</label>
                <input
                  type="text"
                  className="form-control"
                  value={newWoForm.customer}
                  onChange={(e) => setNewWoForm({ ...newWoForm, customer: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Completion & Delivery Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newWoForm.dueDate}
                  onChange={(e) => setNewWoForm({ ...newWoForm, dueDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Initial Manufacturing Stage</label>
              <CustomSelect
                value={newWoForm.initialStage}
                onChange={(e) => setNewWoForm({ ...newWoForm, initialStage: e.target.value })}
                options={[
                  { value: 'material', label: '01. Material Sawing & Inspection' },
                  { value: 'machining', label: '02. CNC Lathe Turning & Boring' },
                  { value: 'grinding', label: '03. Studer Precision Cylindrical Grinding' },
                  { value: 'assembly', label: '04. Class 1000 Cleanroom Bearing Assembly' }
                ]}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Technical Notes & Specification Details</label>
              <textarea
                className="form-control"
                rows="2"
                value={newWoForm.notes}
                onChange={(e) => setNewWoForm({ ...newWoForm, notes: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
}
