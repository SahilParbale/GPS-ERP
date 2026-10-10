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
  Sparkles, Cog, Cpu, DollarSign, Calendar, Sliders
} from 'lucide-react';

const PRESET_SUPPLIERS = [
  {
    name: 'Schaeffler India',
    contact: 'Mr. Rajesh Nair (Sales Director - Spindle Bearings)',
    email: 'r.nair@schaeffler.com',
    phone: '+91 20 6608 4100',
    gstin: '27AAACS4821M1ZB',
    address: 'Pune Distribution Centre, Chakan MIDC Phase II, Pune - 410501, Maharashtra'
  },
  {
    name: 'Bharat Special Steel',
    contact: 'Mr. Manoj Gokhale (Head - Alloy Metallurgy)',
    email: 'sales@bharatspecialsteel.com',
    phone: '+91 20 2712 9182',
    gstin: '27AABCB9182L1ZX',
    address: 'Plot 42, Bhosari Industrial Area, Pune - 411026, Maharashtra'
  },
  {
    name: 'OTT Jakob',
    contact: 'Mr. K. S. Raman (Country Applications Manager)',
    email: 'raman@ottjakob-india.com',
    phone: '+91 80 4112 0900',
    gstin: '29AAACJ3918K1Z3',
    address: 'Bengaluru Technology Centre, 4th Phase, Peenya Industrial Area, Bengaluru - 560058'
  },
  {
    name: 'Heidenhain India',
    contact: 'Mr. Suresh Babu (Regional Head)',
    email: 'info@heidenhain.in',
    phone: '+91 22 2831 4910',
    gstin: '27AABCH4910D1Z7',
    address: 'Tech Park, Andheri East, Mumbai - 400069, Maharashtra'
  },
  {
    name: 'Sandvik Coromant India',
    contact: 'Ms. Priya Sharma (Key Accounts)',
    email: 'orders@sandvik.com',
    phone: '+91 20 6734 5000',
    gstin: '27AAACS1928F1ZG',
    address: 'Mumbai-Pune Road, Dapodi, Pune - 411012, Maharashtra'
  }
];

const SPINDLE_MODELS = [
  { code: 'GPS-HSK-A63-24K', name: 'GPS-HSK-A63-24K (24,000 RPM Motorized Spindle)' },
  { code: 'GPS-BT50-10K', name: 'GPS-BT50-10K (10,000 RPM Heavy-Duty Direct Spindle)' },
  { code: 'GPS-BT40-12K', name: 'GPS-BT40-12K (12,000 RPM Belt-Driven VMC Spindle)' },
  { code: 'GPS-HF-60K', name: 'GPS-HF-60K (60,000 RPM Ultra-High-Speed Micro Spindle)' },
  { code: 'GPS-HSK-E40-42K', name: 'GPS-HSK-E40-42K (42,000 RPM Graphite/Die Milling)' }
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
  const [shopBays, setShopBays] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [operationalSummary, setOperationalSummary] = useState(null);

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
  const [selectedBayTelemetry, setSelectedBayTelemetry] = useState(null);
  const [isNewWoModalOpen, setIsNewWoModalOpen] = useState(false);
  const [isCreatingWo, setIsCreatingWo] = useState(false);
  const [newWoForm, setNewWoForm] = useState({
    spindleModel: 'GPS-HSK-A63-24K',
    customer: 'Tata Advanced Systems Ltd',
    serial: `GPS-2026-${Math.floor(850 + Math.random() * 100)}`,
    priority: 'High',
    dueDate: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0],
    initialStage: 'machining',
    notes: 'Precision spindle batch for aerospace machining workcell'
  });

  // Raise PO Modal State
  const [selectedMaterialForPo, setSelectedMaterialForPo] = useState(null);
  const [isRaisingPo, setIsRaisingPo] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierName: 'Schaeffler India',
    supplierContact: '',
    supplierEmail: '',
    supplierPhone: '',
    supplierGstin: '',
    supplierAddress: '',
    quantity: 5,
    unitPrice: 38500,
    deliveryDays: 14,
    priority: 'High',
    notes: ''
  });

  const isClean = isCleanSlateMode();

  const handleOpenRaisePo = (material) => {
    const itemSku = (material.sku || '').toUpperCase();
    const itemName = (material.name || '').toUpperCase();
    let defaultSupplier = PRESET_SUPPLIERS[0]; // Schaeffler
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
      supplierName: defaultSupplier.name,
      supplierContact: defaultSupplier.contact,
      supplierEmail: defaultSupplier.email,
      supplierPhone: defaultSupplier.phone,
      supplierGstin: defaultSupplier.gstin,
      supplierAddress: defaultSupplier.address,
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
        baysRes,
        activityRes,
        summaryRes
      ] = await Promise.all([
        dashboardService.getDashboardMetrics(),
        dashboardService.getProductionPipelineStages(),
        dashboardService.getServicePipelineStages(),
        dashboardService.getRecentWorkOrders(6),
        dashboardService.getCriticalMaterials(10),
        dashboardService.getUpcomingDeliveries(4),
        dashboardService.getShopBayUtilization(6),
        dashboardService.getRecentActivityFeed(6),
        dashboardService.getPlantOperationalSummary()
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
      setShopBays(baysRes.data || []);
      setRecentActivity(activityRes.data || []);
      setOperationalSummary(summaryRes || null);

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
  }, [onNotify]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Synchronize dashboard whenever entities change
  useEffect(() => {
    const handleEntityUpdate = (e) => {
      if (['purchase-orders', 'work-orders', 'spindles', 'invoices'].includes(e?.detail?.entity)) {
        fetchDashboardData(false);
      }
    };
    window.addEventListener('gps_entities_updated', handleEntityUpdate);
    return () => {
      window.removeEventListener('gps_entities_updated', handleEntityUpdate);
    };
  }, [fetchDashboardData]);

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
      if (woFilter === 'machining') return (wo.currentStage || '').toLowerCase().includes('machin') || (wo.shopBay || '').toLowerCase().includes('turn');
      if (woFilter === 'grinding') return (wo.currentStage || '').toLowerCase().includes('grind');
      if (woFilter === 'assembly') return (wo.currentStage || '').toLowerCase().includes('assembl') || (wo.shopBay || '').toLowerCase().includes('clean');
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
        title="Manufacturing Operations Command Center"
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
              reportTitle: 'SHOP FLOOR PRODUCTION & SHIFT OPERATIONS REPORT',
              id: `SHIFT-REP-${new Date().toISOString().split('T')[0]}`,
              metrics: [
                { label: 'Active Spindle Orders', value: totalWoCount || workOrders.length },
                { label: 'Critical Deliveries', value: upcomingDeliveries.length },
                { label: 'Active Shop Cells', value: `${shopBays.filter(b => b.status === 'Active' || b.status === 'Operating').length} Bays` }
              ],
              headers: ['#', 'WO Number', 'Spindle Model & Serial', 'Customer', 'Current Cell', 'Target Date', 'Status'],
              rows: workOrders.map((wo, idx) => [
                idx + 1,
                wo.id || wo.workOrderNumber,
                `${wo.spindleModel} (${wo.spindleSerial || wo.serial || '—'})`,
                wo.customer,
                wo.currentStage || wo.shopBay || 'Machining',
                wo.dueDate || '—',
                wo.status || 'In Progress'
              ])
            });
            setIsPreviewOpen(true);
          }}
        >
          <Download size={14} />
          <span>Shift Report (PDF)</span>
        </button>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsNewWoModalOpen(true)}
          title="Launch new work order on shop floor"
        >
          <Plus size={14} />
          <span>Launch Work Order</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* Plant Environment & Shift Operations Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '10px 16px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '18px',
          boxShadow: 'var(--shadow-xs)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.2)' }} />
              <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>Plant 1 Active</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• Shift A (06:00 - 14:30)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span className="nav-badge" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 600 }}>
                ISO 9001:2015 Certified
              </span>
              <span className="nav-badge" style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontWeight: 600 }}>
                Class 1000 Cleanroom
              </span>
              <span className="nav-badge" style={{ background: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff', fontWeight: 600 }}>
                ISO 1940-1 G0.4 Balancing
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Lead Supervisor: <strong style={{ color: 'var(--text-main)' }}>Rameshwar Kulkarni</strong>
            </span>
            <button
              type="button"
              onClick={() => toggleCleanSlateMode(true)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '12px',
                background: isClean ? '#ecfdf5' : '#fef3c7',
                color: isClean ? '#047857' : '#92400e',
                border: isClean ? '1px solid #a7f3d0' : '1px solid #fde68a',
                cursor: 'pointer'
              }}
              title="Click to toggle between clean slate and demo dataset"
            >
              {isClean ? '🌿 Clean Slate View' : '📦 Demo Mode Loaded'}
            </button>
          </div>
        </div>

        {/* Clean Slate Onboarding Launchpad Banner (When Zero Data) */}
        {isClean && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            border: '1px solid #a7f3d0',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#059669" />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#065f46', margin: 0 }}>
                    Fresh Clean Slate Active: All Demonstration Data Hidden
                  </h3>
                </div>
                <p style={{ fontSize: '12.5px', color: '#047857', marginTop: '6px', maxWidth: '680px', lineHeight: '1.5' }}>
                  Your ERP software is in a clean, production-ready zero-record state without permanently deleting any configuration. Launch shop floor operations below or switch to demo mode anytime.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setIsNewWoModalOpen(true)}
                  style={{ background: '#059669', color: '#fff', border: 'none', fontWeight: 600 }}
                >
                  <Plus size={13} />
                  <span>Launch First Work Order</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate && onNavigate('sales')}
                >
                  <Plus size={13} />
                  <span>Create Quotation</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => toggleCleanSlateMode(true)}
                  style={{ background: '#fff', borderColor: '#a7f3d0', color: '#065f46' }}
                >
                  <span>Restore Demo Dataset</span>
                </button>
              </div>
            </div>

            {/* Quick Setup Shortcuts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <div 
                onClick={() => setIsNewWoModalOpen(true)}
                style={{ background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d1fae5', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>1. MANUFACTURING</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>+ New Spindle Job Traveler</div>
              </div>
              <div 
                onClick={() => onNavigate && onNavigate('spindles')}
                style={{ background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d1fae5', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>2. ASSET REGISTRY</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>+ Register Spindle Serial</div>
              </div>
              <div 
                onClick={() => onNavigate && onNavigate('service')}
                style={{ background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d1fae5', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>3. RMA SERVICE</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>+ Inward Spindle for Repair</div>
              </div>
              <div 
                onClick={() => onNavigate && onNavigate('inventory')}
                style={{ background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1px solid #d1fae5', cursor: 'pointer' }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>4. STORES CONTROL</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>+ Add Bearing Stock / Material</div>
              </div>
            </div>
          </div>
        )}

        {/* The 4 Core GPS ERP Operational Pillars Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px',
          marginBottom: '20px'
        }}>
          {/* Pillar 1: Manufacturing & Shop Floor */}
          <div 
            className="section-card" 
            style={{ marginBottom: 0, padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onClick={() => onNavigate && onNavigate('production')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A1F3D' }}>
                  <Cog size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Pillar 1 · Manufacturing</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Production Rotation</div>
                </div>
              </div>
              <ArrowUpRight size={14} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '14px' }}>
              <span className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#7A1F3D' }}>
                {isClean ? '0' : (workOrders.length || '18')}
              </span>
              <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                {isClean ? '0 active work orders' : 'Floor bays operating'}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              CNC Lathes, Studer Grinding & Cleanroom Assembly
            </div>
          </div>

          {/* Pillar 2: RMA Spindle Service & Overhaul */}
          <div 
            className="section-card" 
            style={{ marginBottom: 0, padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onClick={() => onNavigate && onNavigate('service')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
                  <Wrench size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Pillar 2 · Overhaul & RMA</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Service Workshop</div>
                </div>
              </div>
              <ArrowUpRight size={14} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '14px' }}>
              <span className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#ea580c' }}>
                {isClean ? '0' : '7'}
              </span>
              <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                {isClean ? '0 repair dockets' : 'Avg TAT: 4.2 Days'}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Teardown diagnosis, ceramic bearing replacement
            </div>
          </div>

          {/* Pillar 3: Metrology & Quality Acceptance */}
          <div 
            className="section-card" 
            style={{ marginBottom: 0, padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onClick={() => onNavigate && onNavigate('quality')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Pillar 3 · Quality & Lab</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Metrology Acceptance</div>
                </div>
              </div>
              <ArrowUpRight size={14} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '14px' }}>
              <span className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>
                {isClean ? '0' : '98.4%'}
              </span>
              <span style={{ fontSize: '11.5px', color: isClean ? 'var(--text-muted)' : '#b45309', fontWeight: 600 }}>
                {isClean ? '0 pending sign-offs' : '4 Pending Sign-offs'}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Taper runout &lt;1.0 µm • ISO 1940-1 G0.4 verified
            </div>
          </div>

          {/* Pillar 4: Commercial & Billing Stream */}
          <div 
            className="section-card" 
            style={{ marginBottom: 0, padding: '16px', cursor: 'pointer', transition: 'all 0.15s ease' }}
            onClick={() => onNavigate && onNavigate('invoices')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <DollarSign size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>Pillar 4 · Commercial</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>Billing & Receivables</div>
                </div>
              </div>
              <ArrowUpRight size={14} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '14px' }}>
              <span className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb' }}>
                {isClean ? '₹0' : '₹18.4L'}
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {isClean ? '0 pending invoices' : '₹48.6L in quotes'}
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
              GST 18% Tax Invoices with UPI QR & ICICI Bank
            </div>
          </div>
        </div>

        {/* Standard 7 KPI Cards Grid */}
        <div className="metrics-grid">
          {metrics.map((metric) => (
            <MetricCard 
              key={metric.id}
              label={metric.label}
              value={metric.value}
              trend={metric.trend}
              isUp={metric.isUp}
              alert={metric.alert}
              icon={metric.icon}
              onClick={() => {
                if (!onNavigate) return;
                if (metric.id === 'pending_qc') onNavigate('quality');
                else if (metric.id === 'low_stock') onNavigate('inventory');
                else if (metric.id === 'active_service') onNavigate('service');
                else if (metric.id === 'receivables') onNavigate('invoices');
                else onNavigate('production');
              }}
            />
          ))}
        </div>

        {/* Dual Pipeline Visualizer (Manufacturing vs Service Overhaul) */}
        <div className="section-card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="card-title">
                <span>Precision Spindle Routing Pipeline</span>
              </div>
              <div style={{ display: 'flex', background: 'var(--bg-surface-subtle)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setActivePipelineType('manufacturing')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activePipelineType === 'manufacturing' ? '#ffffff' : 'transparent',
                    color: activePipelineType === 'manufacturing' ? '#7A1F3D' : 'var(--text-muted)',
                    boxShadow: activePipelineType === 'manufacturing' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  ⚙️ OEM Manufacturing (8 Stages)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePipelineType('service')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activePipelineType === 'service' ? '#ffffff' : 'transparent',
                    color: activePipelineType === 'service' ? '#7A1F3D' : 'var(--text-muted)',
                    boxShadow: activePipelineType === 'service' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  🔧 RMA Service Overhaul (9 Stages)
                </button>
              </div>
            </div>

            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate && onNavigate(activePipelineType === 'manufacturing' ? 'production' : 'service')}
            >
              <span>View Full {activePipelineType === 'manufacturing' ? 'Production Board' : 'Service Board'}</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
          <div style={{ padding: '8px 16px' }}>
            <PipelineVisualizer 
              stages={activePipelineType === 'manufacturing' ? pipelineStages : servicePipelineStages} 
              activeStage={activePipelineType === 'manufacturing' ? 'grinding' : 'balancing'}
              onSelectStage={() => onNavigate && onNavigate(activePipelineType === 'manufacturing' ? 'production' : 'service')}
            />
          </div>
        </div>

        {/* Interactive Shop Floor Bays (6 Precision Workcells) */}
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Factory size={16} color="#7A1F3D" />
              <span>Shop Floor Workcells & Machine Bay Telemetry (6 Active Precision Cells)</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate && onNavigate('production')}
            >
              <span>Manage Bays</span>
              <ArrowUpRight size={13} />
            </button>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {shopBays.map((bay) => (
                <div 
                  key={bay.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                        {bay.name ? bay.name.split(' - ')[0] : `Bay ${bay.id}`}
                      </span>
                      <span 
                        className="nav-badge"
                        style={{
                          background: bay.status === 'Active' || bay.status === 'Operating' ? '#ecfdf5' : '#fef3c7',
                          color: bay.status === 'Active' || bay.status === 'Operating' ? '#047857' : '#92400e',
                          fontWeight: 600,
                          fontSize: '10px'
                        }}
                      >
                        {bay.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {bay.machine || 'Precision Rig'} • {bay.operator || 'Master Machinist'}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Cell Load / Capacity</span>
                      <strong className="mono" style={{ color: 'var(--primary)' }}>{bay.utilization || bay.load || '0%'}</strong>
                    </div>
                    <ProgressBar progress={parseInt(bay.utilization || bay.load, 10) || 0} showLabel={false} height={6} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed var(--border-color)', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Active: <strong className="mono" style={{ color: 'var(--text-main)' }}>{bay.spindleSerial || bay.workOrder || 'Standby'}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBayTelemetry(bay)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title="Inspect live temperature, vibration, and runout sensors"
                    >
                      <Activity size={12} />
                      <span>Telemetry</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Two-Column Layout */}
        <div className="grid-2col">
          {/* Left Column: Recent Work Orders & Low Stock Alert */}
          <div className="grid-col">
            {/* Active Work Orders in Floor Rotation */}
            <div className="section-card">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <div className="card-title">
                  <Cog size={16} color="#7A1F3D" />
                  <span>Active Work Orders in Floor Rotation</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onNavigate && onNavigate('production')}
                  >
                    <span>All Orders ({totalWoCount})</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsNewWoModalOpen(true)}
                  >
                    <Plus size={13} />
                    <span>New WO</span>
                  </button>
                </div>
              </div>

              {/* Quick Filter Bar */}
              <div style={{ padding: '8px 16px', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'all', label: 'All Jobs' },
                    { id: 'machining', label: 'Machining' },
                    { id: 'grinding', label: 'Grinding' },
                    { id: 'assembly', label: 'Assembly' },
                    { id: 'balancing', label: 'Balancing' },
                    { id: 'qc', label: 'In QC' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setWoFilter(f.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid',
                        cursor: 'pointer',
                        borderColor: woFilter === f.id ? 'var(--primary)' : 'var(--border-color)',
                        background: woFilter === f.id ? '#FAF0F3' : '#ffffff',
                        color: woFilter === f.id ? 'var(--primary)' : 'var(--text-secondary)'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative', width: '160px' }}>
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={woSearch}
                    onChange={(e) => setWoSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '4px 8px 4px 24px',
                      fontSize: '11.5px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: '#fff'
                    }}
                  />
                  <Search size={12} style={{ position: 'absolute', left: '7px', top: '7px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>WO Number</th>
                      <th>Spindle Model & Serial</th>
                      <th>Customer</th>
                      <th>Bay / Operation</th>
                      <th>Due Date</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkOrders.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                          <Cog size={32} style={{ opacity: 0.3, margin: '0 auto 8px', color: 'var(--primary)' }} />
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>
                            {isClean ? 'No Active Work Orders in System' : 'No work orders match the filter'}
                          </div>
                          <div style={{ fontSize: '12px', marginTop: '4px' }}>
                            {isClean ? 'Create your first production job traveler using the button below.' : 'Try selecting another stage filter or clearing the search term.'}
                          </div>
                          {isClean && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => setIsNewWoModalOpen(true)}
                              style={{ marginTop: '12px' }}
                            >
                              <Plus size={13} />
                              <span>Launch First Work Order</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredWorkOrders.map((wo) => (
                        <tr key={wo.id || wo.workOrderNo}>
                          <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {wo.id || wo.workOrderNo}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{wo.spindleModel}</div>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {wo.spindleSerial || wo.serial || '—'}
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', maxWidth: '140px' }}>
                            {wo.customer}
                          </td>
                          <td style={{ fontSize: '12px' }}>
                            {wo.shopBay || wo.currentStage || 'Bay 1 - Machining'}
                          </td>
                          <td className="mono" style={{ fontSize: '12px' }}>
                            {wo.dueDate}
                          </td>
                          <td>
                            <div style={{ minWidth: '90px' }}>
                              <ProgressBar progress={wo.progress} height={6} />
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={wo.status} size="sm" />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => {
                                if (onSelectWorkOrder) onSelectWorkOrder(wo);
                                if (onNavigate) onNavigate('work-order-detail');
                              }}
                              title="Open Job Traveler"
                            >
                              <Eye size={12} />
                              <span>Traveler</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Critical Materials & Bearings Alert */}
            <div className="section-card">
              <div className="card-header" style={{ borderLeft: '3px solid #f59e0b' }}>
                <div className="card-title" style={{ color: '#b45309' }}>
                  <AlertTriangle size={16} />
                  <span>Critical Materials & Spindle Bearings Shortage Alert</span>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate && onNavigate('inventory')}
                >
                  <span>Open Stores</span>
                </button>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Part Name & SKU</th>
                      <th>Category</th>
                      <th>In Stock</th>
                      <th>Reserved</th>
                      <th>Min Threshold</th>
                      <th>Status</th>
                      <th>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          <CheckCircle2 size={24} style={{ opacity: 0.4, margin: '0 auto 6px', color: '#059669' }} />
                          <div>All critical bearings, alloy shafts, and sensors meet safety thresholds.</div>
                        </td>
                      </tr>
                    ) : (
                      criticalMaterials.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.sku}</div>
                          </td>
                          <td style={{ fontSize: '12px' }}>{item.category}</td>
                          <td className="mono" style={{ fontWeight: 700, color: item.status.includes('Critical') ? '#dc2626' : '#b45309' }}>
                            {item.availableQty} {item.unit}
                          </td>
                          <td className="mono" style={{ color: 'var(--text-secondary)' }}>{item.reservedQty}</td>
                          <td className="mono">{item.minStock}</td>
                          <td>
                            <StatusBadge status={item.status} size="sm" />
                          </td>
                          <td>
                            <button 
                              type="button" 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenRaisePo(item)}
                              title={`Raise Purchase Order for ${item.sku}`}
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                            >
                              Raise PO
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Upcoming Deliveries, Telemetry & Plant Activity */}
          <div className="grid-col">
            {/* Upcoming Deliveries & Logistics */}
            <div className="section-card">
              <div className="card-header">
                <div className="card-title">
                  <Truck size={16} color="#059669" />
                  <span>Upcoming Dispatch Schedule & Logistics Intimations</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate && onNavigate('e-way-bills')}
                >
                  <span>E-Way Bills</span>
                </button>
              </div>
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {upcomingDeliveries.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No upcoming dispatches scheduled.
                  </div>
                ) : (
                  upcomingDeliveries.map((del) => (
                    <div 
                      key={del.id}
                      style={{
                        padding: '10px 12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{del.customer}</div>
                        <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {del.serial} • {del.model}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '2px' }}>
                          Target: {del.date}
                        </div>
                      </div>
                      <StatusBadge status={del.status} size="sm" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Plant Activity Feed */}
            <div className="section-card">
              <div className="card-header">
                <div className="card-title">
                  <Clock size={16} />
                  <span>Real-Time Plant Operations Activity Feed</span>
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                {recentActivity.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No recent audit log activity recorded.
                  </div>
                ) : (
                  <div className="timeline">
                    {recentActivity.map((act) => (
                      <div key={act.id} className="timeline-item">
                        <div className="timeline-point active" />
                        <div className="timeline-content">
                          <div className="timeline-title" style={{ fontSize: '12px', fontWeight: 500 }}>
                            {act.text}
                          </div>
                          <div className="timeline-meta" style={{ marginTop: '2px' }}>
                            <span className="mono">{act.time}</span> • {act.user}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                  { value: 'machining', label: '02. CNC Lathe Turning & Boring (Bay 1)' },
                  { value: 'grinding', label: '03. Studer Precision Cylindrical Grinding (Bay 2)' },
                  { value: 'assembly', label: '04. Class 1000 Cleanroom Bearing Assembly (Bay 4)' }
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

      {/* Bay Sensor Telemetry Modal */}
      {selectedBayTelemetry && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBayTelemetry(null)}
          title={`Shop Cell Sensor Telemetry: ${selectedBayTelemetry.name || selectedBayTelemetry.bayName || 'Bay Inspection'}`}
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Live IoT Telemetry • Sensor update every 1,000ms
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setSelectedBayTelemetry(null)}
              >
                Close Telemetry
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header info */}
            <div style={{ padding: '12px 14px', background: 'var(--bg-surface-subtle)', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px' }}>{selectedBayTelemetry.machine || 'Okuma LB3000 Lathe'}</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Operator: <strong>{selectedBayTelemetry.operator || 'Master Machinist'}</strong> • Status: <span style={{ color: '#059669', fontWeight: 600 }}>{selectedBayTelemetry.status}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="mono" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                  {selectedBayTelemetry.utilization || selectedBayTelemetry.load || '88%'}
                </span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Workcell Load</div>
              </div>
            </div>

            {/* Live Sensor Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <Gauge size={18} color="#7A1F3D" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spindle Speed</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>24,000 RPM</div>
                <span style={{ fontSize: '10px', color: '#059669' }}>Synchronized</span>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <Thermometer size={18} color="#dc2626" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Front Bearing</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>31.4 °C</div>
                <span style={{ fontSize: '10px', color: '#059669' }}>Delta &lt;15°C</span>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <Thermometer size={18} color="#ea580c" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rear Bearing</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>29.8 °C</div>
                <span style={{ fontSize: '10px', color: '#059669' }}>Optimal</span>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <Activity size={18} color="#059669" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vibration RMS</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>0.28 mm/s</div>
                <span style={{ fontSize: '10px', color: '#059669' }}>ISO G0.4</span>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <Sliders size={18} color="#2563eb" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Air-Oil Mist</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>4.8 Bar</div>
                <span style={{ fontSize: '10px', color: '#059669' }}>Regulated</span>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <Radio size={18} color="#9333ea" style={{ margin: '0 auto 4px' }} />
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Motor Current</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700 }}>8.4 A</div>
                <span style={{ fontSize: '10px', color: '#059669' }}>Nominal</span>
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '12px', color: '#166534' }}>
              ✓ Cell is calibrated and operating within micron tolerances. No thermal runout spikes detected during current shift rotation.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
